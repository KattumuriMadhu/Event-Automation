"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./approve.module.scss";
import confetti from "canvas-confetti";
import { API_BASE_URL } from "@/utils/config";

export default function CoordinatorApprovalPage() {
  const { id } = useParams();
  const router = useRouter();

  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [showRejectError, setShowRejectError] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(null);
  const [serverError, setServerError] = useState(false);

  /* ================= FETCH EVENT (WITH POLLING) ================= */
  useEffect(() => {
    const fetchEventData = () => {
      fetch(`${API_BASE_URL}/api/approval/event/${id}`)
        .then(async (res) => {
          if (!res.ok) {
            if (res.status === 404) {
              return null; // Return null instead of throwing error
            }
            throw new Error(`HTTP Error: ${res.status}`);
          }
          const text = await res.text();
          return text ? JSON.parse(text) : null;
        })
        .then((data) => {
          setEvent(data);
          setServerError(false);

          if (data) {
            if (data.approvalStatus === "APPROVED") setStatus("APPROVED");
            if (data.approvalStatus === "REJECTED") setStatus("REJECTED");
          }

          setLoading(false);
        })
        .catch((error) => {
          console.error("Fetch error:", error);
          setEvent(null);
          setServerError(true);
          setLoading(false);
        });
    };

    // Initial fetch
    fetchEventData();

    // Poll every 5 seconds to catch if it was approved on another tab
    const intervalId = setInterval(fetchEventData, 5000);

    return () => clearInterval(intervalId);
  }, [id]);

  /* ================= AUTO-LOCK (RETURN TO EMAIL) ================= */
  useEffect(() => {
    if (!status) return;

    // Fade out shortly before closing
    const fadeTimer = setTimeout(() => {
      setIsClosing(true);
    }, 3500);

    const closeTimer = setTimeout(() => {
      // Try to close the tab
      try {
        window.close();
      } catch (e) {
        console.log("Window close blocked");
      }

      // Fallback: Redirect if not closed (e.g. to home/login)
      router.push("/");
    }, 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [status, router]);

  /* ================= CLOSE/NAVIGATE MODAL ON KEYS ================= */
  useEffect(() => {
    const handleKeydown = (e) => {
      if (activeImageIndex === null || !event?.images?.length) return;
      
      if (e.key === 'Escape') {
        setActiveImageIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : event.images.length - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev < event.images.length - 1 ? prev + 1 : 0));
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [activeImageIndex, event]);

  /* ================= HANDLE ACTION ================= */
  const handleAction = async (action) => {
    if (submitting) return;

    if (action === "reject" && !rejectReason.trim()) {
      setShowRejectError(true);
      setTimeout(() => setShowRejectError(false), 3000);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/approval/${action}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          action === "reject"
            ? JSON.stringify({ reason: rejectReason })
            : null,
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error("Action failed:", errData);
        alert(`Failed to ${action} event. Please try again.`);
        setSubmitting(false);
        return;
      }

      setShowReject(false);
      setRejectReason("");
      setStatus(action === "approve" ? "APPROVED" : "REJECTED");

      if (action === "approve") {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }
    } catch (error) {
      console.error("Error during action:", error);
      alert(`Network error during ${action}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container} style={{ textAlign: "center", padding: "50px" }}>
          <h2>Loading event details...</h2>
        </div>
      </div>
    );
  }

  if (serverError) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h2>Cannot Connect to Server</h2>
          <p style={{ marginTop: '10px', color: '#64748b' }}>Please check if the backend server is running and try again.</p>
          <button className={styles.approve} style={{ marginTop: '20px' }} onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.page}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', textAlign: "center", padding: "50px" }}>
          <div className={styles.failureIcon} style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', color: '#64748b', boxShadow: '0 10px 20px rgba(100, 116, 139, 0.2)' }}>
            <span style={{ fontSize: '36px' }}>🔍</span>
          </div>
          <h2 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '10px', fontWeight: '700' }}>Event Not Found</h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '30px', maxWidth: '400px', lineHeight: '1.6' }}>
            We couldn't find the event you're looking for. It may have been removed or the link might be incorrect.
          </p>
          <button
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s ease-in-out'
            }}
            onClick={() => router.push("/")}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(37, 99, 235, 0.4)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 99, 235, 0.3)'; }}
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${isClosing ? styles.fadeOut : ''}`}>
      {/* ================= RESULT SCREEN (MATCHING ADMIN FLOW) ================= */}
      {status && (
        <div className={styles.inlineSuccess}>
          <div className={styles.inlineSuccessCard}>
            <div
              className={styles.icon}
              style={status === "REJECTED" ? { background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)", color: "#b91c1c" } : {}}
            >
              {status === "APPROVED" ? "✔" : "✖"}
            </div>
            <div>
              <h3>
                {status === "APPROVED"
                  ? (event?.approvalStatus === "APPROVED" ? "This event is already approved" : "Event Approved Successfully")
                  : (event?.approvalStatus === "REJECTED" ? "This event is already rejected" : "Event Rejected")}
              </h3>
              <p className={styles.successMeta}>
                <strong>{event.title}</strong>
              </p>
              <p className={styles.successSub}>
                {event.approvedAt ? `Approved on ${new Date(event.approvedAt).toLocaleString()}` :
                  event.rejectedAt ? `Rejected on ${new Date(event.rejectedAt).toLocaleString()}` :
                    `Action recorded • ${new Date().toLocaleString()}`}
              </p>

              <span
                className={styles.badge}
                style={status === "REJECTED" ? { background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" } : {}}
              >
                {status}
              </span>

              <p className={styles.redirectText}>
                This page will close automatically…
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT ================= */}
      {!status && (
        <div className={styles.container}>
          {!event.isExpired && (
            <div className={styles.content}>
              <h1 className={styles.title}>{event.title}</h1>

              <div className={styles.meta}>
                <p><strong>Department:</strong> {event.department}</p>
                <p><strong>Type:</strong> {event.type}</p>
                <p><strong>Date{event.dates && event.dates.length > 1 ? 's' : ''}:</strong> {event.dates && event.dates.length > 1 ? event.dates.map(d => new Date(d).toDateString()).join(', ') : new Date(event.date).toDateString()}</p>
                <p><strong>Audience:</strong> {event.audience}</p>
                <p><strong>Resource Person:</strong> {event.resourcePerson}</p>
              </div>

              {event.details && (
                <div className={styles.details}>
                  <h3>Event Description</h3>
                  <p>{event.details}</p>
                </div>
              )}

              {event.images?.length > 0 && (
                <div className={styles.images}>
                  {event.images.map((img, i) => {
                    const imageUrl = img.startsWith("http")
                      ? img
                      : `${API_BASE_URL}${img}`;

                    return (
                      <img
                        key={i}
                        src={imageUrl}
                        alt="Event"
                        loading="lazy"
                        onClick={() => setActiveImageIndex(i)}
                      />
                    );
                  })}
                </div>
              )}

              {event.approvalStatus === "SENT" ? (
                <div className={styles.actions}>
                  <button
                    className={styles.approve}
                    disabled={submitting}
                    onClick={() => handleAction("approve")}
                  >
                    {submitting ? "Processing…" : "Approve"}
                  </button>

                  <button
                    className={styles.reject}
                    disabled={submitting}
                    onClick={() => setShowReject(true)}
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div className={styles.result} style={{ position: 'relative', height: 'auto', marginTop: '30px', padding: '0' }}>
                  <div className={styles.statusCard} style={{ margin: '0', maxWidth: '100%' }}>
                    <div
                      className={
                        event.approvalStatus === "APPROVED"
                          ? styles.successIcon
                          : styles.failureIcon
                      }
                    >
                      {event.approvalStatus === "APPROVED" ? "✔" : "✖"}
                    </div>
                    <h2 className={styles.statusTitle} style={{ fontSize: '1.2rem' }}>
                      This event is already {event.approvalStatus.toLowerCase()}
                    </h2>
                    <p className={styles.statusMessage} style={{ marginBottom: '0' }}>
                      No further action is required.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= EXPIRED LINK ================= */}
          {event.isExpired && (
            <div className={styles.result} style={{ position: 'relative', height: 'auto', marginTop: '30px', padding: '0', width: '100%' }}>
              <div className={styles.statusCard} style={{ margin: '0', maxWidth: '100%', borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}>
                <div
                  className={styles.failureIcon}
                  style={{ backgroundColor: '#f59e0b', color: 'white' }}
                >
                  ⚠️
                </div>
                <h2 className={styles.statusTitle} style={{ fontSize: '1.2rem', color: '#b45309' }}>
                  Link Expired
                </h2>
                <p className={styles.statusMessage} style={{ marginBottom: '0', color: '#92400e' }}>
                  This approval link has expired (valid for 5 hours). Please contact the admin to resend the request.
                </p>
              </div>
            </div>
          )}

          {/* ================= VALIDATION ERROR ================= */}
          {showRejectError && (
            <div className={styles.validationOverlay}>
              <div className={styles.validationCard}>
                <div className={styles.validationIcon}>⚠️</div>
                <h2>Rejection reason required</h2>
                <p>
                  Please enter a clear and valid reason before submitting the
                  rejection.
                </p>
                <button
                  className={styles.validationBtn}
                  onClick={() => setShowRejectError(false)}
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* ================= REJECT MODAL ================= */}
          {showReject && (
            <div className={styles.overlay}>
              <div className={styles.rejectCard}>
                <div className={styles.modalIconWrapper}>
                   ✕
                </div>
                <h3>Reject Event</h3>
                <p>Please provide a reason for rejection. This will be sent directly to the event submitter.</p>

                <textarea
                  className={styles.premiumTextarea}
                  placeholder="e.g., The event details are incomplete..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAction("reject");
                    }
                  }}
                />

                <div className={styles.rejectActions}>
                  <button className={styles.cancelBtn} onClick={() => setShowReject(false)}>Cancel</button>
                  <button
                    className={styles.submitRejectBtn}
                    onClick={() => handleAction("reject")}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit Rejection"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= IMAGE LIGHTBOX MODAL ================= */}
          {activeImageIndex !== null && event?.images && (
            <div
              className={styles.imageModal}
              onClick={() => setActiveImageIndex(null)}
            >
              <button
                className={styles.closeButton}
                onClick={() => setActiveImageIndex(null)}
                aria-label="Close"
              >
                ×
              </button>
              
              {event.images.length > 1 && (
                <button 
                  className={styles.navButton} 
                  style={{ left: '20px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : event.images.length - 1));
                  }}
                  aria-label="Previous image"
                >
                  &#10094;
                </button>
              )}

              <div
                className={styles.imageWrapper}
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={event.images[activeImageIndex].startsWith("http") ? event.images[activeImageIndex] : `${API_BASE_URL}${event.images[activeImageIndex]}`}
                  alt="Full view"
                  className={styles.modalImage}
                />
              </div>

              {event.images.length > 1 && (
                <button 
                  className={styles.navButton} 
                  style={{ right: '20px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex((prev) => (prev < event.images.length - 1 ? prev + 1 : 0));
                  }}
                  aria-label="Next image"
                >
                  &#10095;
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
