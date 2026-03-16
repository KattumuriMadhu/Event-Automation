"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaInstagram, FaFacebook, FaExternalLinkAlt } from "react-icons/fa";
import styles from "./events.module.scss";
import Loader from "../components/Loader";
import ImageSlider from "../components/ImageSlider";
import CustomDatePicker from "../components/CustomDatePicker";
import { API_BASE_URL } from "@/utils/config";
import { CalendarX, PlusCircle, LayoutDashboard, Clock, CheckCircle, XCircle } from "lucide-react";
import { getUser, getToken, logoutUser } from "@/utils/auth";
import toast from "react-hot-toast";
import useKeyboardShortcut from "@/hooks/useKeyboardShortcut";

export default function EventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('saved'); // Updated via useEffect for ADMIN
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [sendingApprovalId, setSendingApprovalId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set()); // Track IDs animating out
  const [loading, setLoading] = useState(true);

  const [showEmailModal, setShowEmailModal] = useState(false);

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
    const localUser = getUser();
    setUser(localUser);

    if (localUser?.role === 'ADMIN' && activeTab === 'saved') {
      setActiveTab('published');
    }

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
    const token = getToken();
    setSendingApprovalId(id);

    try {
      const response = await fetch(`${API_BASE_URL}/api/approval/send/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to send approval");
        setSendingApprovalId(null);
        return;
      }
    } catch (error) {
      console.error("Failed to send approval", error);
      toast.error("Failed to send approval");
      setSendingApprovalId(null);
      return;
    }

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

  const displayEvents = events.filter(ev => {
    const isPosted = ev.socialMedia?.instagram?.posted || ev.socialMedia?.facebook?.posted;
    if (activeTab === 'saved') {
      return ev.submittedByEmail === user?.email && (
        ['DRAFT', 'SENT', 'REJECTED'].includes(ev.approvalStatus) ||
        (ev.approvalStatus === 'APPROVED' && !isPosted)
      );
    } else {
      return isPosted;
    }
  });

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
            <p>You’ll be notified once the Coordinator responds.</p>
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
        <h1>{activeTab === 'saved' ? 'Saved Events' : 'Published Events'}</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          {user?.role !== 'ADMIN' && (
            <>
              <button
                className={`${styles.tabBtn} ${activeTab === 'published' ? styles.activeTab : styles.inactiveTab}`}
                onClick={() => setActiveTab('published')}
              >
                View Published Events
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'saved' ? styles.activeTab : styles.inactiveTab}`}
                onClick={() => setActiveTab('saved')}
              >
                View Saved Events
              </button>
            </>
          )}
          {user?.role === 'ADMIN' ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className={styles.back}
                onClick={() => router.push('/admin/analytics')}
                style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white" }}
              >
                📊 View Analytics
              </button>
              <button
                className={styles.back}
                onClick={() => router.push("/admin/pending")}
                style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white" }}
              >
                View Pending Events
              </button>
              <button className={styles.back} onClick={() => router.push("/admin/users")}>
                Manage Users
              </button>
            </div>
          ) : (
            <button className={styles.back} onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </button>
          )}
        </div>
      </header>

      {/* ================= ADMIN ANALYTICS BOARD PREVIOUSLY HERE ================= */}

      {/* ================= EVENTS ================= */}
      <div className={styles.list}>
        {displayEvents.length === 0 ? (
          <div className={styles.emptyStateContainer}>
            <div className={styles.emptyStateIconWrapper}>
              <CalendarX size={48} strokeWidth={1.5} />
            </div>
            <h3 className={styles.emptyStateTitle}>No Events Found</h3>
            <p className={styles.emptyStateDesc}>
              {activeTab === 'saved'
                ? "You haven't created any events yet. Build your first event to start engaging with your audience."
                : "No published events found."}
            </p>
            {activeTab === 'saved' && user?.role !== 'ADMIN' && (
              <button
                className={styles.emptyStateBtn}
                onClick={() => router.push("/dashboard")}
              >
                <PlusCircle size={20} />
                Create New Event
              </button>
            )}
          </div>
        ) : displayEvents.map((event) => (
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
                {(event.socialMedia?.instagram?.posted || event.socialMedia?.facebook?.posted) ? (
                  <span className={styles.publishedBadge}>✔ Published</span>
                ) : event.approvalStatus === "APPROVED" && user?.role !== 'ADMIN' ? (
                  <span className={styles.approvedBadge}>✔ Approved</span>
                ) : event.approvalStatus === "SENT" ? (
                  <span className={styles.pendingBadge}>⏳ Pending</span>
                ) : event.approvalStatus === "REJECTED" ? (
                  <span className={styles.rejectedBadge}>✖ Rejected</span>
                ) : event.approvalStatus === "DRAFT" ? (
                  <span className={styles.draftBadge}>Draft</span>
                ) : null}
              </div>
            </div>

            {/* ================= CONTENT ================= */}
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.headerTop}>
                  <span className={styles.departmentTag}>{event.department}</span>
                  <span className={styles.typeTag}>{event.type}</span>

                  {/* Show Delete here ALWAYS FOR ADMIN, or if event is APPROVED but NOT POSTED for users */}
                  {(user?.role === 'ADMIN' || (event.approvalStatus === 'APPROVED' && !(event.socialMedia?.instagram?.posted || event.socialMedia?.facebook?.posted))) && (
                    <button
                      className={styles.headerDeleteBtn}
                      onClick={() => setConfirmDeleteId(event._id)}
                      title="Delete Event"
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
                {event.dates && event.dates.length > 1 && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Dates</span>
                    <span className={styles.value}>
                       {event.dates.map(d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })).join(', ')}
                    </span>
                  </div>
                )}
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
                  // Check if another event with the exact same title/date (case-insensitive)
                  // is already SENT, APPROVED, or POSTED.
                  const isDuplicatePendingOrApproved = events.some((otherEvent) => {
                    if (otherEvent._id === event._id) return false;

                    const titleMatch = otherEvent.title.toLowerCase().trim() === event.title.toLowerCase().trim();
                    const dateMatch = new Date(otherEvent.date).toDateString() === new Date(event.date).toDateString();

                    const statusMatch = ["SENT", "APPROVED"].includes(otherEvent.approvalStatus) ||
                      otherEvent.socialMedia?.instagram?.posted ||
                      otherEvent.socialMedia?.facebook?.posted;

                    return titleMatch && dateMatch && statusMatch;
                  });

                  if (isDuplicatePendingOrApproved && ["DRAFT", "REJECTED"].includes(event.approvalStatus)) {
                    return (
                      <button className={styles.disabledApproveBtn} disabled title="An identical event is already pending or approved">
                        Duplicate Pending/Approved
                      </button>
                    );
                  }

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
                    If posted, Delete is in the header. ADMIN already has Delete in the header.
                */}
                <div className={styles.crudActions}>
                  {!(event.socialMedia?.instagram?.posted || event.socialMedia?.facebook?.posted) && user?.role !== 'ADMIN' && (
                    <>
                      {event.approvalStatus !== 'APPROVED' && (
                        <button className={styles.iconBtn} onClick={() => setEditingEvent(event)} title="Edit">✏️</button>
                      )}
                      {activeTab === 'saved' && event.approvalStatus !== 'APPROVED' && (
                        <button className={styles.iconBtn} onClick={() => setConfirmDeleteId(event._id)} title="Delete Event">🗑️</button>
                      )}
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
                  <span className={styles.label}>{activeEvent.dates && activeEvent.dates.length > 1 ? 'Dates' : 'Date'}</span>
                  <span className={styles.value}>
                    {activeEvent.dates && activeEvent.dates.length > 1
                      ? activeEvent.dates.map(d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })).join(', ')
                      : new Date(activeEvent.date).toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                    }
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
                isMulti={true}
                value={editingEvent.dates && editingEvent.dates.length > 0 ? editingEvent.dates : editingEvent.date}
                onChange={(e) => {
                   if (e.target.name === 'dates') {
                       setEditingEvent({ ...editingEvent, dates: e.target.value, date: e.target.value[0] });
                   } else {
                       setEditingEvent({ ...editingEvent, date: e.target.value });
                   }
                }}
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
