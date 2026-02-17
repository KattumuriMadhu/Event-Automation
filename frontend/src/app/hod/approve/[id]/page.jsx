"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./approve.module.scss";
import confetti from "canvas-confetti";

export default function HodApprovalPage() {
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
  const [activeImage, setActiveImage] = useState(null);

  /* ================= FETCH EVENT ================= */
  useEffect(() => {
    fetch(`http://localhost:5001/api/approval/event/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setEvent(data);

        if (data.approvalStatus === "APPROVED") setStatus("APPROVED");
        if (data.approvalStatus === "REJECTED") setStatus("REJECTED");
        // Don't auto-set status on load, so we can show details instead of auto-closing

        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  /* ================= CLOSE MODAL ON ESC KEY ================= */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && activeImage) {
        setActiveImage(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [activeImage]);

  /* ================= HANDLE ACTION ================= */
  const handleAction = async (action) => {
    if (submitting) return;

    if (action === "reject" && !rejectReason.trim()) {
      setShowRejectError(true);
      setTimeout(() => setShowRejectError(false), 3000);
      return;
    }

    setSubmitting(true);

    await fetch(`http://localhost:5001/api/approval/${action}/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:
        action === "reject"
          ? JSON.stringify({ reason: rejectReason })
          : null,
    });

    setShowReject(false);
    setRejectReason("");
    setStatus(action === "approve" ? "APPROVED" : "REJECTED");
    setSubmitting(false);

    if (action === "approve") {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  };

  if (loading) return <p className={styles.loading}>Loading event…</p>;
  if (!event) return <p className={styles.loading}>Event not found</p>;

  return (
    <div className={`${styles.page} ${isClosing ? styles.fadeOut : ''}`}>
      <div className={styles.container}>

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
                    ? "Event Approved Successfully"
                    : "Event Rejected"}
                </h3>
                <p className={styles.successMeta}>
                  <strong>{event.title}</strong>
                </p>
                <p className={styles.successSub}>
                  Action recorded • {new Date().toLocaleString()}
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
        {!status && !event.isExpired && (
          <div className={styles.content}>
            <h1 className={styles.title}>{event.title}</h1>

            <div className={styles.meta}>
              <p><strong>Department:</strong> {event.department}</p>
              <p><strong>Type:</strong> {event.type}</p>
              <p><strong>Date:</strong> {new Date(event.date).toDateString()}</p>
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
                    : `http://localhost:5001${img}`;

                  return (
                    <img
                      key={i}
                      src={imageUrl}
                      alt="Event"
                      loading="lazy"
                      onClick={() => setActiveImage(imageUrl)}
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
              <h3>Reject Event</h3>

              <textarea
                placeholder="Please provide a reason for rejection"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />

              <div className={styles.rejectActions}>
                <button onClick={() => setShowReject(false)}>Cancel</button>
                <button
                  className={styles.reject}
                  onClick={() => handleAction("reject")}
                >
                  Submit Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= IMAGE LIGHTBOX MODAL ================= */}
        {activeImage && (
          <div
            className={styles.imageModal}
            onClick={() => setActiveImage(null)}
          >
            <button
              className={styles.closeButton}
              onClick={() => setActiveImage(null)}
              aria-label="Close"
            >
              ×
            </button>
            <div
              className={styles.imageWrapper}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={activeImage}
                alt="Full view"
                className={styles.modalImage}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
