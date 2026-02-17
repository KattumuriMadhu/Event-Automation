"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getUser, getToken, loginUser } from "@/utils/auth";
import styles from "./socialPost.module.scss";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import CustomDateTimePicker from "@/app/components/CustomDateTimePicker";
import { FaInstagram, FaFacebook } from "react-icons/fa";
import { Calendar } from "lucide-react";
import { API_BASE_URL } from "@/utils/config";

export default function AdminSocialPostPage() {
  const { eventId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [published, setPublished] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const togglePlatform = (p) => {
    if (selectedPlatforms.includes(p)) {
      setSelectedPlatforms(selectedPlatforms.filter(item => item !== p));
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const [mode, setMode] = useState("NOW");
  const [scheduleTime, setScheduleTime] = useState("");
  const [minDateTime, setMinDateTime] = useState("");

  useEffect(() => {
    const handleAuth = async () => {
      setMinDateTime(new Date().toISOString().slice(0, 16));

      // 1. Check for Magic Link Token
      const magicToken = searchParams.get("token");
      if (magicToken) {
        try {
          // Verify token with backend
          const res = await fetch(`${API_BASE_URL}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${magicToken}` }
          });

          if (res.ok) {
            const data = await res.json();
            // Log user in
            loginUser(magicToken, data.user);

            // Remove token from URL for security
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            return; // Auth success, stay on page
          }
        } catch (err) {
          console.error("Magic link failed", err);
        }
      }

      // Check Admin
      const user = getUser();
      if (!user) {
        // Redirect to login with return url
        const returnUrl = encodeURIComponent(window.location.pathname);
        router.push(`/login?redirect=${returnUrl}`);
        return;
      }

      if (user.role !== "ADMIN") {
        router.push("/dashboard");
      }
    };

    handleAuth();
  }, [router, searchParams]);

  /* ================= FETCH EVENT ================= */
  useEffect(() => {
    if (!eventId) return;

    const token = getToken();

    const fetchEvent = async () => {
      try {
        if (token) {
          const res = await fetch(
            `${API_BASE_URL}/api/events/${eventId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              },
              cache: 'no-store'
            }
          );

          if (res.ok) {
            const data = await res.json();
            setEvent(data);

            // Check if fully posted
            const ig = data?.socialMedia?.instagram?.posted;
            const fb = data?.socialMedia?.facebook?.posted;

            if (ig && fb) {
              setPublished(true);
              setShowSuccess(true); // Auto-close if already fully published
            }
            // If partially posted, we stay on page to allow posting to others
            setLoading(false);
            return;
          }
        }

        const publicRes = await fetch(
          `${API_BASE_URL}/api/events/public/${eventId}`,
          { cache: 'no-store' }
        );

        if (!publicRes.ok) throw new Error();

        const publicData = await publicRes.json();
        setEvent(publicData);
        if (publicData?.socialMedia?.instagram?.posted && publicData?.socialMedia?.facebook?.posted) {
          setPublished(true);
          setShowSuccess(true);
        }
        setLoading(false);
      } catch {
        setEvent(null);
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  /* ================= PUBLISH ================= */
  /* ================= AUTO-CLOSE EFFECT ================= */
  useEffect(() => {
    if (!showSuccess) return;

    // Trigger fade-out at 2500ms
    const fadeTimer = setTimeout(() => setIsClosing(true), 2500);

    // Close/Redirect at 3000ms
    const timer = setTimeout(() => {
      try { window.close(); } catch (e) { console.log(e); }
      router.push("/dashboard");
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(timer);
    };
  }, [showSuccess, router]);

  const publish = async () => {
    const token = getToken();

    if (!token) {
      toast.error("Session expired. Please login again.");
      router.push("/login");
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform to publish!", {
        duration: 4000,
        position: "top-center"
      });
      return;
    }

    if (mode === "SCHEDULE" && !scheduleTime) {
      toast.error("Please select a date and time for scheduling!", {
        duration: 4000,
        position: "top-center"
      });
      return;
    }

    setPosting(true);

    try {
      // Create an array of promises where each handles its own error
      const results = await Promise.all(
        selectedPlatforms.map(async (p) => {
          try {
            let endpoint = "";
            let options = {};

            if (mode === "SCHEDULE") {
              if (!scheduleTime) throw new Error("Time required");
              endpoint = p === "facebook"
                ? `${API_BASE_URL}/api/social/facebook/schedule/${eventId}`
                : `${API_BASE_URL}/api/social/instagram/schedule/${eventId}`;

              options = {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  scheduledAt: new Date(scheduleTime).toISOString(),
                }),
              };
            } else {
              endpoint = p === "facebook"
                ? `${API_BASE_URL}/api/social/facebook/${eventId}`
                : `${API_BASE_URL}/api/social/instagram/${eventId}`;

              options = {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              };
            }

            const res = await fetch(endpoint, options);
            const data = await res.json();

            if (!res.ok) {
              return { platform: p, success: false, error: data.message || "Failed" };
            }

            return { platform: p, success: true };

          } catch (err) {
            return { platform: p, success: false, error: err.message };
          }
        })
      );

      // Analyze results
      const failures = results.filter(r => !r.success);
      const successes = results.filter(r => r.success);

      if (failures.length > 0) {
        // Log errors
        console.error("Publishing errors:", failures);

        failures.forEach(f => {
          toast.error(`${f.platform}: ${f.error}`);
        });

        // If ALL failed, don't show success screen
        if (successes.length === 0) {
          throw new Error("Publishing failed for all selected platforms.");
        }
      }

      if (successes.length > 0) {
        const msg = mode === "SCHEDULE" ? "⏰ Scheduled successfully" : "Published successfully";
        toast.success(`${msg} on ${successes.map(s => s.platform).join(" & ")}`);
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });

        // Update local state to reflect success
        const updatedEvent = { ...event };
        if (!updatedEvent.socialMedia) updatedEvent.socialMedia = { instagram: {}, facebook: {} };

        successes.forEach(s => {
          if (s.platform === 'instagram') {
            if (!updatedEvent.socialMedia.instagram) updatedEvent.socialMedia.instagram = {};
            updatedEvent.socialMedia.instagram.posted = true;
          }
          if (s.platform === 'facebook') {
            if (!updatedEvent.socialMedia.facebook) updatedEvent.socialMedia.facebook = {};
            updatedEvent.socialMedia.facebook.posted = true;
          }
        });
        setEvent(updatedEvent);

        // Check if fully complete
        const igDone = updatedEvent.socialMedia?.instagram?.posted;
        const fbDone = updatedEvent.socialMedia?.facebook?.posted;

        // Show success and auto-close even if only one platform was posted
        setPublished(igDone && fbDone);
        setShowSuccess(true);
        setSelectedPlatforms([]);
      }

    } catch (err) {
      // General error (or if all failed)
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  /* ================= UI STATES ================= */
  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (!event) return <p className={styles.loading}>Event not found</p>;

  return (
    <div className={styles.page}>
      <div className={`${styles.card} ${isClosing ? styles.fadeOut : ""}`}>
        {/* ================= HEADER ================= */}
        <header className={styles.header}>
          <h1>{event.title}</h1>
          <span className={styles.status}>
            {published ? "📣 Published" : "✔ Approved"}
          </span>
        </header>

        {/* ================= EVENT DETAILS ================= */}
        <section className={styles.meta}>
          <div>
            <label>Department</label>
            <span>{event.department}</span>
          </div>

          <div>
            <label>Event Type</label>
            <span>{event.type}</span>
          </div>

          <div>
            <label>Date</label>
            <span>{new Date(event.date).toDateString()}</span>
          </div>

          <div>
            <label>Audience</label>
            <span>{event.audience}</span>
          </div>

          <div>
            <label>Resource Person</label>
            <span>{event.resourcePerson}</span>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Event Description</h2>
          <p>{event.details || "No description provided."}</p>
        </section>

        {event.images?.length > 0 && (
          <div className={styles.images}>
            {event.images.map((img, i) => (
              img ? (
                <img
                  key={i}
                  src={img.startsWith?.("http") ? img : `${API_BASE_URL}${img}`}
                  alt="Event"
                  className={styles.image}
                />
              ) : null
            ))}
          </div>
        )}

        {/* ================= PUBLISH PANEL ================= */}
        {!published && (
          <section className={styles.publish}>
            <h2>Publish on Official Platforms</h2>

            <div className={styles.mode}>
              <label>
                <input
                  type="radio"
                  checked={mode === "NOW"}
                  onChange={() => setMode("NOW")}
                />
                Publish Now
              </label>

              <label>
                <input
                  type="radio"
                  checked={mode === "SCHEDULE"}
                  onChange={() => setMode("SCHEDULE")}
                />
                Schedule for later
              </label>
            </div>
            {mode === "SCHEDULE" && (
              <div className={styles.scheduleRow}>
                <div className={styles.dateWrapper}>
                  <CustomDateTimePicker
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>

              </div>
            )}


            <div className={styles.platforms}>
              {/* INSTAGRAM CARD */}
              <label
                className={`
                  ${styles.platformCard} 
                  ${selectedPlatforms.includes("instagram") && !event?.socialMedia?.instagram?.posted && event?.socialMedia?.instagram?.status !== 'SCHEDULED' ? styles.platformActive : ""}
                  ${event?.socialMedia?.instagram?.posted ? styles.platformPosted : ""}
                  ${event?.socialMedia?.instagram?.status === 'SCHEDULED' ? styles.platformScheduled : ""}
                `}
                onClick={() => !event?.socialMedia?.instagram?.posted && event?.socialMedia?.instagram?.status !== 'SCHEDULED' && togglePlatform("instagram")}
              >
                <div className={`${styles.platformIcon} ${styles.igIcon}`}><FaInstagram /></div>
                <div className={styles.platformInfo}>
                  <span className={styles.platformName}>Instagram</span>
                  {event?.socialMedia?.instagram?.posted ? (
                    <span className={styles.postedLabel}>✔ Published</span>
                  ) : event?.socialMedia?.instagram?.status === 'SCHEDULED' ? (
                    <span className={styles.scheduledLabel}>⏰ Scheduled</span>
                  ) : (
                    selectedPlatforms.includes("instagram") && <span className={styles.checkIcon}>✔</span>
                  )}
                </div>
              </label>

              {/* FACEBOOK CARD */}
              <label
                className={`
                  ${styles.platformCard} 
                  ${selectedPlatforms.includes("facebook") && !event?.socialMedia?.facebook?.posted && event?.socialMedia?.facebook?.status !== 'SCHEDULED' ? styles.platformActive : ""}
                  ${event?.socialMedia?.facebook?.posted ? styles.platformPosted : ""}
                  ${event?.socialMedia?.facebook?.status === 'SCHEDULED' ? styles.platformScheduled : ""}
                `}
                onClick={() => !event?.socialMedia?.facebook?.posted && event?.socialMedia?.facebook?.status !== 'SCHEDULED' && togglePlatform("facebook")}
              >
                <div className={`${styles.platformIcon} ${styles.fbIcon}`}><FaFacebook /></div>
                <div className={styles.platformInfo}>
                  <span className={styles.platformName}>Facebook</span>
                  {event?.socialMedia?.facebook?.posted ? (
                    <span className={styles.postedLabel}>✔ Published</span>
                  ) : event?.socialMedia?.facebook?.status === 'SCHEDULED' ? (
                    <span className={styles.scheduledLabel}>⏰ Scheduled</span>
                  ) : (
                    selectedPlatforms.includes("facebook") && <span className={styles.checkIcon}>✔</span>
                  )}
                </div>
              </label>
            </div>

            <button
              className={styles.publishBtn}
              onClick={publish}
              disabled={posting}
            >
              {posting
                ? "Processing..."
                : mode === "SCHEDULE"
                  ? "Schedule Post"
                  : "Publish Post"}
            </button>
          </section>
        )}

        {/* ================= SUCCESS INLINE ================= */}
        {showSuccess && (
          <div className={styles.inlineSuccess}>
            <div className={styles.inlineSuccessCard}>
              <div className={styles.icon}>✔</div>
              <div>
                <h3>Event Published Successfully</h3>
                <p className={styles.successMeta}>
                  <strong>{event.title}</strong>
                </p>
                <p className={styles.successSub}>
                  {selectedPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" & ")} • {new Date().toLocaleString()}
                </p>
                <span className={styles.badge}>PUBLISHED</span>
                <p className={styles.redirectText}>
                  This page will close automatically…
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  );
}
