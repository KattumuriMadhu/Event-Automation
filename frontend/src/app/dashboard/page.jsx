"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.scss";
import { logoutUser, getUser, getToken } from "@/utils/auth";
import Loader from "../components/Loader";

import loadingAnimation from "../lottie/loading.json";

import CustomDatePicker from "../components/CustomDatePicker";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import { FaUserTimes, FaPen, FaList, FaTimes, FaCheck } from "react-icons/fa";
import { API_BASE_URL } from "@/utils/config";
import useKeyboardShortcut from "@/hooks/useKeyboardShortcut";


export default function Dashboard() {
  const router = useRouter();

  /* ================= STATE ================= */
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showPromptModal, setShowPromptModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [tempPrompt, setTempPrompt] = useState("");
  const [isCustomType, setIsCustomType] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);

  const [imageError, setImageError] = useState("");
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    type: "",
    details: "",
    department: "",
    date: "",
    audience: "",
    resourcePerson: "",
    images: [],
    tone: "formal",
  });

  /* ================= SHORTCUTS ================= */
  useKeyboardShortcut({
    onSave: () => {
      // Trigger submit manually since event object is needed by handleSubmit usually? 
      // Actually handleSubmit asks for 'e'. We can mock it or adjust handleSubmit.
      // Let's mock a minimal event object.
      handleSubmit({ preventDefault: () => { } });
    }
  });

  /* ================= AUTH ================= */
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    // Local check first
    const localUser = getUser();
    setUser(localUser);
    // REMOVED: setIsCheckingAuth(false); -> Wait for verification

    const checkStatus = () => {
      fetch(`${API_BASE_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(async (res) => {
          if (res.ok) {
            // Success - NOW we show the UI
            setIsCheckingAuth(false);
          } else if (res.status === 403 || res.status === 401) {
            const data = await res.json();

            if (data.message === "User not found") {
              setShowDeletedModal(true);
              if (sessionStorage.getItem("token")) sessionStorage.clear();
              else { localStorage.removeItem("token"); localStorage.removeItem("user"); }
              setTimeout(() => { window.location.href = "/login"; }, 4000);
              return;
            }

            if (data.message === "Account is blocked" || res.status === 403) {
              setShowBlockedModal(true);
              if (sessionStorage.getItem("token")) {
                sessionStorage.clear();
              } else {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
              }
              setTimeout(() => {
                window.location.href = "/login";
              }, 3000);
              return;
            }

            // Fallback for other auto-fails
            logoutUser();
            window.location.href = "/login";
          } else {
            // 500 or other errors - treat as auth fail
            window.location.href = "/login";
          }
        })
        .catch(() => {
          // Network error - treat as auth fail
          window.location.href = "/login";
        });
    };

    // Initial check
    checkStatus();

    // Poll every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);

  }, [isMounted, router]);

  /* ================= IMAGE COMPRESSION ================= */
  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1024; // Resize to max 1024px width
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, "image/jpeg", 0.7); // 70% quality
        };
      };
    });
  };

  /* ================= FORM CHANGE ================= */
  const handleChange = async (e) => {
    const { name, value, files } = e.target;

    if (name === "images") {
      if (!files || files.length === 0) {
        return;
      }

      if (formData.images.length + files.length > 50) {
        setImageError("⚠️ Maximum 50 images allowed");
        return;
      }

      // Compress Images
      const compressedFiles = await Promise.all(
        Array.from(files).map((file) => compressImage(file))
      );

      setImageError("");
      setFormError("");

      // Append new images and previews
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...compressedFiles],
      }));

      const newUrls = compressedFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newUrls]);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  /* ================= REMOVE IMAGE ================= */
  const removeImage = (index) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);

    // Revoke URL for removed image
    URL.revokeObjectURL(previewUrls[index]);

    const newPreviews = [...previewUrls];
    newPreviews.splice(index, 1);

    setFormData(prev => ({ ...prev, images: newImages }));
    setPreviewUrls(newPreviews);
  };

  /* ================= SAVE EVENT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);

    /* ================= VALIDATION ================= */
    if (!formData.title || !formData.type || !formData.department || !formData.date || !formData.details) {
      setFormError("⚠️ Please fill all required details");
      toast.error("Please fill all required details");
      setSubmitting(false);
      return;
    }

    if (!formData.images || formData.images.length === 0) {
      setImageError("⚠️ At least one image is required");
      setSubmitting(false); // Fix infinite loading
      return;
    }

    if (formData.images.length > 50) {
      setImageError("⚠️ Maximum 50 images allowed");
      setSubmitting(false);
      return;
    }

    const token = getToken();
    if (!token) {
      setSubmitting(false);
      return router.push("/login");
    }

    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === "images") value.forEach((img) => form.append("images", img));
      else form.append(key, value);
    });

    try {
      const res = await fetch(`${API_BASE_URL}/api/events`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json();

      if (res.status === 403 && data.message === "Account is blocked") {
        setShowBlockedModal(true);
        logoutUser();
        setTimeout(() => {
          router.push("/login");
        }, 3000);
        return;
      }

      if (!res.ok) throw new Error(data.message || "Failed to save event");

      // ✨ Trigger Confetti ✨
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b']
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      setFormData({
        title: "",
        type: "",
        details: "",
        department: "",
        date: "",
        audience: "",
        resourcePerson: "",
        images: [],
        tone: "formal",
      });
      setPreviewUrls([]);
    } catch (err) {
      setFormError(err.message || "❌ Failed to save event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= 🤖 GENERATE EVENT DETAILS ================= */
  const generateSocialPost = async () => {
    if (!formData.title || !formData.type || !formData.department) {
      setFormError("⚠️ Please fill event title, type, and department first");
      return;
    }

    const token = getToken();
    if (!token) return router.push("/login");

    setLoadingAI(true);
    setFormError("");

    try {
      let imageBase64 = null;
      if (formData.images && formData.images.length > 0) {
        // Convert first image to base64
        const file = formData.images[0];
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      }

      const res = await fetch(`${API_BASE_URL}/api/ai/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          imageBase64,
          customPrompt: useCustomPrompt ? customPrompt : null
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error();

      const text = `${data.instagram}\n\n${data.hashtags
        .map((t) => `#${t}`)
        .join(" ")}`;

      setFormData((prev) => ({ ...prev, details: text }));
    } catch {
      setFormError("❌ AI generation failed. Please try again.");
    } finally {
      setLoadingAI(false);
    }
  };

  /* ================= LOGOUT ================= */
  const confirmLogout = () => {
    logoutUser();
    router.push("/login");
  };

  /* ================= UI ================= */
  // Show simple white screen instantly to prevent header flash before hydration and hide loading spinner
  // Max z-index (2147483647) to cover EVERYTHING including Chatbot
  if (!isMounted || isCheckingAuth) {
    return <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 2147483647 }} />;
  }

  return (
    <div className={styles.page}>
      {(submitting || loadingAI) && <Loader />}
      {/* HEADER */}
      <header className={styles.header}>
        <h1>{user?.role === "ADMIN" ? "Admin Dashboard" : "Dashboard"}</h1>
        <div className={styles.headerActions}>
          {user?.role === "ADMIN" && (
            <button className={styles.view} onClick={() => router.push("/admin/users")}>
              Manage Users
            </button>
          )}
          <button className={styles.view} onClick={() => router.push("/events")}>
            View Events
          </button>

        </div>
      </header>

      {/* SUCCESS */}
      {showSuccess && (
        <div className={styles.successModalOverlay}>
          <div className={styles.successModalCard}>
            <div className={styles.successIconWrapper}>
              <FaCheck />
            </div>
            <h2>Event Created!</h2>
            <p>Your event has been saved successfully.</p>
          </div>
        </div>
      )}

      {/* FORM */}
      <div className={styles.card}>
        <h2>Create New Event</h2>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <input name="title" placeholder="Event Title" value={formData.title} onChange={handleChange} required />
            {/* Event Type - Switchable to Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              {!isCustomType ? (
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', paddingRight: '3rem' }} // Space for button
                >
                  <option value="">Type of Event</option>
                  <option>Workshop</option>
                  <option>Seminar</option>
                  <option>Guest Lecture</option>
                  <option>Conference</option>
                  <option>Culturals</option>
                </select>
              ) : (
                <input
                  name="type"
                  placeholder="Enter custom event type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', paddingRight: '3rem' }} // Space for button
                />
              )}


              <button
                type="button"
                onClick={() => setIsCustomType(!isCustomType)}
                className={styles.toggleTypeBtn}
                title={isCustomType ? "Switch to list" : "Type manually"}
              >
                {isCustomType ? <FaList size={14} /> : <FaPen size={14} />}
              </button>
            </div>

            <select name="department" value={formData.department} onChange={handleChange} required>
              <option value="">Department</option>
              <option value="ALL">All Departments</option>
              <option>CSE</option>
              <option>CSD</option>
              <option>CSE(AIML)</option>
              <option>ECE</option>
              <option>EEE</option>
              <option>MECH</option>
              <option>CIVIL</option>
            </select>

            {/* <input type="date" name="date" value={formData.date} onChange={handleChange} required /> */}
            <CustomDatePicker
              value={formData.date}
              onChange={handleChange}
            />

            <select name="audience" value={formData.audience} onChange={handleChange} required>
              <option value="">Audience</option>
              <option>Students</option>
              <option>Faculty</option>
              <option>Students & Faculty</option>
            </select>

            <input name="resourcePerson" placeholder="Resource Person (Optional)" value={formData.resourcePerson} onChange={handleChange} />

            <textarea className={styles.full} name="details" placeholder="Event Details" value={formData.details} onChange={handleChange} required />

            <div className={styles.full}>
              <input
                type="file"
                id="eventImages"
                name="images"
                accept="image/*"
                multiple
                onChange={handleChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="eventImages" className={styles.uploadLabel}>
                <div className={styles.uploadIcon}>📁</div>
                <span>{formData.images.length > 0 ? `${formData.images.length} image(s) selected` : "Click to upload event images"}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '400', opacity: 0.7 }}>Supports JPG, PNG (Max 50 images)</span>
              </label>

              {/* Image Previews */}
              {previewUrls.length > 0 && (
                <div className={styles.imagePreviews}>
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className={styles.previewItem}>
                      <img src={url} alt={`Preview ${idx}`} />
                      <button
                        type="button"
                        className={styles.removeImageBtn}
                        onClick={() => removeImage(idx)}
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {imageError && <p className={styles.imageError}>{imageError}</p>}
          </div>

          {/* ACTION ROW */}
          <div className={styles.actionRow}>
            {/* LEFT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="customPromptCheck"
                  checked={useCustomPrompt}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setTempPrompt(customPrompt);
                      setShowPromptModal(true);
                    } else {
                      setUseCustomPrompt(false);
                      setCustomPrompt("");
                    }
                  }}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="customPromptCheck" style={{ fontSize: '13px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Add custom instructions
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>(Check to give specific details to AI)</span>
                </label>
              </div>

              <div className={styles.aiGroup}>
                <button
                  type="button"
                  className={`${styles.aiBtn} ${styles[formData.tone]} ${loadingAI ? styles.loading : ""
                    }`}
                  onClick={generateSocialPost}
                  disabled={loadingAI}
                >
                  {loadingAI ? "Generating..." : (
                    `${formData.tone === "formal"
                      ? "🎓"
                      : formData.tone === "promo"
                        ? "🚀"
                        : "🔥"
                    } Generate Event Details`
                  )}
                </button>

                <select
                  name="tone"
                  value={formData.tone}
                  onChange={handleChange}
                  className={styles.toneSelect}
                >
                  <option value="formal">🎓 Formal</option>
                  <option value="promo">🚀 Promotional</option>
                  <option value="exciting">🔥 Exciting</option>
                </select>
              </div>
            </div>

            {/* RIGHT */}
            <button type="submit" className={styles.submit}>
              Save Event
            </button>
          </div>
        </form>
      </div>

      {/* LOGOUT MODAL */}
      {showLogoutConfirm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>

            <div className={styles.actions}>
              <button
                className={styles.cancel}
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirm}
                onClick={confirmLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETED ACCOUNT MODAL */}
      {showDeletedModal && (
        <div className={styles.blockedOverlay}>
          <div className={styles.blockedModal}>
            <div className={styles.deletedIcon}>
              <FaUserTimes />
            </div>
            <h3>Account Deactivated</h3>
            <p>Your account has been removed by the administrator. Access is no longer available.</p>
            <div className={styles.redirectText}>Redirecting to login...</div>
          </div>
        </div>
      )}

      {/* BLOCKED/EXPIRED MODAL */}
      {showBlockedModal && (
        <div className={styles.blockedOverlay}>
          <div className={styles.blockedModal}>
            <div className={styles.lockIcon}>🔒</div>
            <h3>Access Revoked</h3>
            <p>Your session has expired or your account has been blocked by the administrator.</p>
            <p className={styles.redirectText}>Redirecting to login...</p>
          </div>
        </div>
      )}

      {/* CUSTOM PROMPT MODAL */}
      {showPromptModal && (
        <div className={styles.overlay}>
          <div className={styles.modal} style={{ width: '500px' }}>
            <h3>Custom AI Instructions</h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>
              Tell the AI exactly what you want (e.g., "Mention that lunch is provided" or "Focus on the coding competition aspect").
            </p>

            <textarea
              value={tempPrompt}
              onChange={(e) => setTempPrompt(e.target.value)}
              placeholder="Enter your custom instructions here..."
              rows={5}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                marginBottom: '20px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />

            <div className={styles.actions}>
              <button
                className={styles.cancel}
                onClick={() => {
                  setShowPromptModal(false);
                  if (!customPrompt) setUseCustomPrompt(false); // Uncheck if nothing was saved properly
                }}
              >
                Cancel
              </button>
              <button
                className={styles.confirm}
                onClick={() => {
                  setCustomPrompt(tempPrompt);
                  setUseCustomPrompt(true);
                  setShowPromptModal(false);
                }}
              >
                Save Instructions
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
