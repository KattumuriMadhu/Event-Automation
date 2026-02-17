"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaInstagram, FaFacebook, FaExternalLinkAlt } from "react-icons/fa";
import styles from "./events.module.scss";
import Loader from "../components/Loader";
import ImageSlider from "../components/ImageSlider";
import CustomDatePicker from "../components/CustomDatePicker";
import { API_BASE_URL } from "@/utils/config";
import { getUser, getToken, logoutUser } from "@/utils/auth";
import toast from "react-hot-toast";
import useKeyboardShortcut from "@/hooks/useKeyboardShortcut";

export default function EventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [sendingApprovalId, setSendingApprovalId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set()); // Track IDs animating out
  const [loading, setLoading] = useState(true);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [hodEmails, setHodEmails] = useState("");

  const [editingEvent, setEditingEvent] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  /* Pop-out Card State */
  const [activeEvent, setActiveEvent] = useState(null);

  /* ================= AUTH + FETCH ================= */
  /* ================= AUTH + POLL FETCH ================= */
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

    // Auth check passed locally
    setUser(getUser());
    // REMOVED: setIsCheckingAuth(false); -> Wait for fetch

    const saved = localStorage.getItem("hod_emails");
    if (saved) setHodEmails(saved);

    const fetchEvents = () => {
      fetch(`${API_BASE_URL}/api/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      })
        .then(async (r) => {
          if (r.status === 403 || r.status === 401) {
            const data = await r.json();

            if (data.message === "User not found") {
              setShowBlockedModal(true);
              if (sessionStorage.getItem("token")) sessionStorage.clear();
              else { localStorage.removeItem("token"); localStorage.removeItem("user"); }
              setTimeout(() => window.location.href = "/login", 3000);
              return null;
            }

            if (data.message === "Account is blocked" || r.status === 403) {
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
              return null;
            }

            // For any other auth error (e.g. Expired Token), redirect IMMEDIATELY without modal
            logoutUser();
            window.location.href = "/login";
            return null;

          }
          return r.json();
        })
        .then(data => {
          if (data) {
            if (Array.isArray(data)) setEvents(data);
            setLoading(false);
            // Success! Reveal the UI
            setIsCheckingAuth(false);
          }
        })
        .catch(() => {
          // Network/Server error -> Redirect to login to be safe/clean
          window.location.href = "/login";
        });
    };

    // Initial fetch
    fetchEvents();

    // Poll every 5 seconds
    const interval = setInterval(fetchEvents, 5000);

    return () => clearInterval(interval);
  }, [isMounted, router]);

  /* ================= DELETE ================= */
  const deleteEvent = async () => {
    const token = getToken();
    const idToDelete = confirmDeleteId;

    // 1. Close Modal immediately
    setConfirmDeleteId(null);
    setDeletingId(null);

    // 2. Start Animation (Add to local set)
    setDeletingIds(prev => new Set(prev).add(idToDelete));

    // 3. API Call (Optimistic or wait, usually optimistic is better for UI)
    try {
      await fetch(`${API_BASE_URL}/api/events/${idToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      // 4. Wait for animation to finish (500ms matches CSS)
      setTimeout(() => {
        setEvents((e) => e.filter((x) => x._id !== idToDelete));
        setDeletingIds(prev => {
          const next = new Set(prev);
          next.delete(idToDelete);
          return next;
        });
      }, 500);

    } catch (error) {
      console.error("Failed to delete", error);
      // Revert if failed (optional, but good practice)
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(idToDelete);
        return next;
      });
      toast.error("Failed to delete event");
    }
  };

  /* ================= SEND APPROVAL ================= */
  const sendForApproval = async (id) => {
    if (!hodEmails) return setShowEmailModal(true);

    const token = getToken();
    setSendingApprovalId(id);

    await fetch(`${API_BASE_URL}/api/approval/send/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ hodEmail: hodEmails }),
    });

    setEvents((e) =>
      e.map((x) => (x._id === id ? { ...x, approvalStatus: "SENT" } : x))
    );

    setShowEmailSent(true);
    setTimeout(() => setShowEmailSent(false), 2000);
    setShowEmailSent(true);
    setTimeout(() => setShowEmailSent(false), 2000);
    setSendingApprovalId(null);
  };

  /* ================= UPDATE EVENT ================= */
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingEvent) return;

    setIsUpdating(true);
    const token = getToken();

    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${editingEvent._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingEvent),
      });

      if (res.ok) {
        setEvents((prev) =>
          prev.map((ev) => (ev._id === editingEvent._id ? editingEvent : ev))
        );
        setEditingEvent(null);
      } else {
        toast.error("Failed to update event");
      }
    } catch {
      toast.error("Error updating event");
    } finally {
      setIsUpdating(false);
    }
  };

  useKeyboardShortcut({
    onEscape: () => {
      if (editingEvent) setEditingEvent(null);
      if (showEmailModal) setShowEmailModal(false);
      if (confirmDeleteId) setConfirmDeleteId(null);
    },
    onEnter: confirmDeleteId ? deleteEvent : null
  });

  /* Close on Escape Key */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && activeEvent) {
        setActiveEvent(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [activeEvent]);

  if (!isMounted || loading || isCheckingAuth) {
    return <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 2147483647 }} />;
  }

  return (
    <div className={styles.page}>
      {isUpdating && <Loader />}
      {/* ================= APPROVAL SENT ================= */}
      {showEmailSent && (
        <div className={styles.overlay}>
          <div className={styles.emailSuccessModal}>
            <div className={styles.mailIcon}>📨</div>
            <h2>Approval Email Sent</h2>
            <p>You’ll be notified once the HOD responds.</p>
            <span className={styles.pendingBadge}>PENDING APPROVAL</span>
          </div>
        </div>
      )}

      {/* ================= DELETE MODAL ================= */}
      {confirmDeleteId && (
        <div className={styles.overlay}>
          <div className={styles.deleteModal}>
            <div className={styles.trash}>🗑</div>
            <h2>Delete Event?</h2>
            <p>This action cannot be undone.</p>

            <div className={styles.deleteActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className={styles.deleteBtn}
                onClick={deleteEvent}
                disabled={deletingId}
              >
                {deletingId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <header className={styles.header}>
        <h1>Saved Events</h1>
        <div>
          <button
            className={styles.changeEmail}
            onClick={() => setShowEmailModal(true)}
          >
            ✏️ Change HOD Email
          </button>

          {/* Logout button moved to global Header */}

          <button className={styles.back} onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* ================= EVENTS ================= */}
      <div className={styles.list}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
            <h3>No events found 📂</h3>
            <p>Create a new event from the dashboard to get started.</p>
          </div>
        ) : events.map((event) => (
          <div
            key={event._id}
            className={`${styles.card} ${deletingIds.has(event._id) ? styles.deleting : ''}`}
          >
            {/* ================= COVER IMAGE ================= */}
            <div className={styles.cardCover}>
              {event.images && event.images.length > 0 ? (
                <ImageSlider images={event.images} title={event.title} showControls={false} />
              ) : (
                <div className={styles.placeholderCover} />
              )}

              <div className={styles.dateBadge}>
                <span className={styles.day}>{new Date(event.date).getDate()}</span>
                <span className={styles.month}>{new Date(event.date).toLocaleString('default', { month: 'short' }).toUpperCase()}</span>
              </div>

              {/* STATUS BADGE OVERLAY */}
              <div className={styles.statusOverlay}>
                {event.approvalStatus === "APPROVED" && <span className={styles.approvedBadge}>✔ Approved</span>}
                {event.approvalStatus === "SENT" && <span className={styles.pendingBadge}>⏳ Pending</span>}
                {event.approvalStatus === "REJECTED" && <span className={styles.rejectedBadge}>✖ Rejected</span>}
                {event.approvalStatus === "DRAFT" && <span className={styles.draftBadge}>Draft</span>}
              </div>
            </div>

            {/* ================= CONTENT ================= */}
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.headerTop}>
                  <span className={styles.departmentTag}>{event.department}</span>
                  <span className={styles.typeTag}>{event.type}</span>

                  {/* Show Delete here if POSTED */}
                  {(event.socialMedia?.instagram?.posted || event.socialMedia?.facebook?.posted) && (
                    <button
                      className={styles.headerDeleteBtn}
                      onClick={() => setConfirmDeleteId(event._id)}
                      title="Delete"
                    >
                      🗑
                    </button>
                  )}
                </div>
                <h2>{event.title}</h2>
              </div>

              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Audience</span>
                  <span className={styles.value}>{event.audience}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Resource Person</span>
                  <span className={styles.value}>{event.resourcePerson || "N/A"}</span>
                </div>
              </div>

              {event.details && (
                <div style={{ marginTop: '1rem' }}>
                  <button
                    className={styles.readMoreBtn}
                    onClick={() => setActiveEvent(event)}
                  >
                    Read More...
                  </button>
                </div>
              )}

              {/* ================= ACTIONS ================= */}
              <div className={styles.actionRow}>
                {/* ================= RESEND LOGIC ================= */}
                {(() => {
                  if (event.approvalStatus === "REJECTED") {
                    return (
                      <button className={styles.resendBtn} onClick={() => sendForApproval(event._id)}>
                        {sendingApprovalId === event._id ? "Sending…" : "↻ Resend"}
                      </button>
                    );
                  }

                  if (event.approvalStatus === "SENT") {
                    // Check for expiration
                    const lastSent = event.approvalTimeline.slice().reverse().find(i => i.action === "SENT");
                    if (lastSent) {
                      const sentTime = new Date(lastSent.at).getTime();
                      const timeDiff = (new Date().getTime() - sentTime) / (1000 * 60 * 60); // hours

                      if (timeDiff > 5) {
                        return (
                          <button
                            className={styles.resendBtn}
                            onClick={() => sendForApproval(event._id)}
                            style={{ background: '#f59e0b', color: 'white' }}
                            title="Link Expired - Click to resend"
                          >
                            {sendingApprovalId === event._id ? "Sending…" : "⚠ Resend Link"}
                          </button>
                        );
                      }
                    }
                  }

                  if (event.approvalStatus === "DRAFT") {
                    return (
                      <button className={styles.approveBtn} onClick={() => sendForApproval(event._id)}>
                        {sendingApprovalId === event._id ? "Sending…" : "Get Approval"}
                      </button>
                    );
                  }

                  return null;
                })()}

                {/* Show Edit and Delete only if NOT posted. 
                    If posted, Delete is in the header.
                */}
                <div className={styles.crudActions}>
                  {!(event.socialMedia?.instagram?.posted || event.socialMedia?.facebook?.posted) && (
                    <>
                      <button className={styles.iconBtn} onClick={() => setEditingEvent(event)} title="Edit">✏️</button>
                      <button className={styles.iconBtn} onClick={() => setConfirmDeleteId(event._id)} title="Delete">🗑</button>
                    </>
                  )}
                </div>
              </div>

              <hr className={styles.divider} />

              {/* ================= SOCIAL STATUS ================= */}
              <div className={styles.socialSection}>
                {/* Instagram */}
                {event.socialMedia?.facebook?.posted && !event.socialMedia?.instagram?.posted && user?.role === 'ADMIN' ? (
                  <button
                    onClick={() => router.push(`/admin/social-post/${event._id}`)}
                    className={styles.postNowLink}
                  >
                    <FaInstagram /> Post Now ↗
                  </button>
                ) : event.socialMedia?.instagram?.posted ? (
                  <a
                    href={event.socialMedia.instagram.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.socialPill} ${styles.posted}`}
                  >
                    <FaInstagram />
                    <span>View Post ↗</span>
                  </a>
                ) : (
                  <div className={styles.socialPill}>
                    <FaInstagram />
                    <span>Instagram</span>
                  </div>
                )}

                {/* Facebook */}
                {event.socialMedia?.instagram?.posted && !event.socialMedia?.facebook?.posted && user?.role === 'ADMIN' ? (
                  <button
                    onClick={() => router.push(`/admin/social-post/${event._id}`)}
                    className={styles.postNowLinkFb}
                  >
                    <FaFacebook /> Post Now ↗
                  </button>
                ) : event.socialMedia?.facebook?.posted ? (
                  <a
                    href={event.socialMedia.facebook.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.socialPill} ${styles.postedFb}`}
                  >
                    <FaFacebook />
                    <span>View Post ↗</span>
                  </a>
                ) : (
                  <div className={styles.socialPill}>
                    <FaFacebook />
                    <span>Facebook</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ================= EXPANDED CARD POP-OUT ================= */}
      {activeEvent && (
        <div className={styles.overlay} onClick={() => setActiveEvent(null)}>
          <div
            className={`${styles.card} ${styles.expandedCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Same structure as card but expanded */}
            <div className={styles.cardCover}>
              {/* Close Button top left */}
              <button
                className={styles.closeOverlayBtn}
                onClick={() => setActiveEvent(null)}
              >
                ✕
              </button>

              {activeEvent.images && activeEvent.images.length > 0 ? (
                <ImageSlider images={activeEvent.images} title={activeEvent.title} />
              ) : (
                <div className={styles.placeholderCover} />
              )}
              <div className={styles.dateBadge}>
                <span className={styles.day}>{new Date(activeEvent.date).getDate()}</span>
                <span className={styles.month}>{new Date(activeEvent.date).toLocaleString('default', { month: 'short' }).toUpperCase()}</span>
              </div>
            </div>

            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.headerTop}>
                  <span className={styles.departmentTag}>{activeEvent.department}</span>
                  <span className={styles.typeTag}>{activeEvent.type}</span>
                </div>
                <h2 style={{ fontSize: '2rem' }}>{activeEvent.title}</h2>
              </div>

              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Audience</span>
                  <span className={styles.value}>{activeEvent.audience}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Resource Person</span>
                  <span className={styles.value}>{activeEvent.resourcePerson || "N/A"}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Date</span>
                  <span className={styles.value}>
                    {new Date(activeEvent.date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div className={styles.details}>
                {activeEvent.details}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CHANGE EMAIL ================= */}
      {showEmailModal && (
        <div className={styles.overlay}>
          <div className={styles.hodModal}>
            <h2>Change HOD Email</h2>
            <p className={styles.hodSub}>
              This email will receive approval requests.
            </p>

            <input
              type="email"
              value={hodEmails}
              onChange={(e) => setHodEmails(e.target.value)}
              placeholder="Enter HOD email address"
            />

            <div className={styles.hodActions}>
              <button
                className={styles.hodCancel}
                onClick={() => setShowEmailModal(false)}
              >
                Cancel
              </button>

              <button
                className={styles.hodSave}
                onClick={() => {
                  if (!hodEmails.trim()) return;
                  localStorage.setItem("hod_emails", hodEmails);
                  setShowEmailModal(false);
                }}
              >
                Save Email
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ================= EDIT MODAL ================= */}
      {editingEvent && (
        <div className={styles.overlay}>
          <div className={styles.hodModal} style={{ width: '500px', maxWidth: '95%' }}>
            <h2>Edit Event</h2>

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
              <input
                value={editingEvent.title}
                onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                placeholder="Event Title"
                style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                required
              />
              <input
                value={editingEvent.department}
                onChange={(e) => setEditingEvent({ ...editingEvent, department: e.target.value })}
                placeholder="Department"
                style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                required
              />
              <CustomDatePicker
                value={editingEvent.date}
                onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
              />
              <input
                value={editingEvent.resourcePerson}
                onChange={(e) => setEditingEvent({ ...editingEvent, resourcePerson: e.target.value })}
                placeholder="Resource Person"
                style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
              <textarea
                value={editingEvent.details}
                onChange={(e) => setEditingEvent({ ...editingEvent, details: e.target.value })}
                placeholder="Event Details"
                rows={4}
                style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical' }}
              />

              <div className={styles.hodActions}>
                <button
                  type="button"
                  className={styles.hodCancel}
                  onClick={() => setEditingEvent(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.hodSave}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ================= BLOCKED/EXPIRED MODAL ================= */}
      {showBlockedModal && (
        <div className={styles.blockedOverlay}>
          <div className={styles.blockedModal}>
            <div className={styles.lockIcon}>🔒</div>
            <h3>Access Revoked</h3>
            <p>Your session has expired or your account has been blocked or deleted by the administrator.</p>
            <p className={styles.redirectText}>Redirecting to login...</p>
          </div>
        </div>
      )}

    </div>
  );
}
