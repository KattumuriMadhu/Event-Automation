"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/config";
import toast from "react-hot-toast";
import styles from "./pending.module.scss";
import ImageSlider from "@/app/components/ImageSlider";
import confetti from "canvas-confetti";

export default function PendingApprovalsPage() {
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [pendingEvents, setPendingEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [serverError, setServerError] = useState(false);

    const [viewingEvent, setViewingEvent] = useState(null);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);
    const [approvingIds, setApprovingIds] = useState([]);

    useEffect(() => {
        const token = getToken();
        const currentUser = getUser();
        if (!token || !currentUser || currentUser.role !== "ADMIN") {
            router.push("/login");
            return;
        }
        setUser(currentUser);
        fetchEvents(token);

        // Auto refresh every 5 seconds
        const intervalId = setInterval(() => {
            fetchEvents(token);
        }, 5000);

        return () => clearInterval(intervalId);
    }, [router]);

    const fetchEvents = async (token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/events`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                // Filter only those that are 'SENT'
                const pending = data.filter((e) => e.approvalStatus === "SENT");
                setPendingEvents(pending);
            } else {
                setServerError(true);
                toast.error("Failed to load events");
            }
        } catch (error) {
            setServerError(true);
            toast.error("Error communicating with server");
        } finally {
            setLoading(false);
        }
    };

    const handleViewClick = (event) => {
        setViewingEvent(event);
    };

    const handleApprove = async (eventId) => {
        setApprovingIds(prev => [...prev, eventId]);
        const token = getToken();
        try {
            const response = await fetch(`${API_BASE_URL}/api/approval/approve/${eventId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.ok) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#2563eb', '#16a34a', '#f59e0b']
                });
                toast.success("Event approved and email sent!");
                setPendingEvents(prev => prev.filter(e => e._id !== eventId));
            } else {
                const errData = await response.json();
                toast.error(errData.message || "Approval failed");
            }
        } catch (error) {
            console.error("handleApprove error", error);
            toast.error(error.message || "Network error during approval");
        } finally {
            setApprovingIds(prev => prev.filter(id => id !== eventId));
        }
    };

    const handleRejectClick = (eventId) => {
        setRejectingId(eventId);
        setRejectReason("");
    };

    const submitReject = async () => {
        if (!rejectReason.trim()) {
            toast.error("Please provide a reason for rejection");
            return;
        }

        setIsRejecting(true);
        const token = getToken();
        try {
            const response = await fetch(`${API_BASE_URL}/api/approval/reject/${rejectingId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ reason: rejectReason })
            });

            if (response.ok) {
                toast.success("Event rejected and email sent!");
                setPendingEvents(prev => prev.filter(e => e._id !== rejectingId));
                setRejectingId(null);
            } else {
                const errData = await response.json();
                toast.error(errData.message || "Rejection failed");
            }
        } catch (error) {
            console.error("submitReject error", error);
            toast.error(error.message || "Network error during rejection");
        } finally {
            setIsRejecting(false);
        }
    };

    if (loading) {
        return <div className={styles.loaderArea}>Loading pending approvals...</div>;
    }

    if (serverError) {
        return (
            <div className={styles.page}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', textAlign: "center", padding: "50px" }}>
                    <h2 style={{ color: '#ef4444', fontSize: '2rem', marginBottom: '1rem' }}>⚠</h2>
                    <h2>Cannot Connect to Server</h2>
                    <p style={{ marginTop: '10px', color: '#64748b' }}>Please check if the backend server is running and try again.</p>
                    <button
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                        onClick={() => window.location.reload()}
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1>Pending Events Approval</h1>
                <button className={styles.backBtn} onClick={() => router.push("/events")}>
                    Back to Events
                </button>
            </header>

            <div className={styles.card}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Event Name</th>
                                <th>Department & Type</th>
                                <th>Submitter</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingEvents.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className={styles.emptyState}>
                                        <div style={{ fontSize: '2rem', margin: '0 0 1rem 0' }}>🎉</div>
                                        You're all caught up! No events pending approval.
                                    </td>
                                </tr>
                            ) : (
                                pendingEvents.map((e) => (
                                    <tr key={e._id}>
                                        <td>
                                            <div className={styles.eventTitle}>{e.title}</div>
                                        </td>
                                        <td>
                                            <span className={styles.departmentBadge}>{e.department}</span>
                                            <span className={styles.typeBadge}>{e.type}</span>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: '500' }}>{e.submittedByName || 'User'}</span>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{e.submittedByEmail}</div>
                                        </td>
                                        <td>
                                            <div className={styles.dateText}>
                                                {e.date ? new Date(e.date).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                }) : "TBA"}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    className={styles.actionViewBtn}
                                                    onClick={() => handleViewClick(e)}
                                                    title="View Information"
                                                >
                                                    🔍 View
                                                </button>
                                                <button
                                                    className={styles.actionApproveBtn}
                                                    onClick={() => handleApprove(e._id)}
                                                    disabled={approvingIds.includes(e._id)}
                                                >
                                                    {approvingIds.includes(e._id) ? "Approving..." : "✓ Approve"}
                                                </button>
                                                <button
                                                    className={styles.actionRejectBtn}
                                                    onClick={() => handleRejectClick(e._id)}
                                                >
                                                    ✕ Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* REJECT MODAL */}
            {rejectingId && (
                <div className={styles.overlay}>
                    <div className={styles.modal}>
                        <h2>Reject Event</h2>
                        <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.95rem' }}>
                            Please provide a reason for rejection. This will be sent directly to the event submitter.
                        </p>

                        <textarea
                            className={styles.reasonInput}
                            rows="4"
                            placeholder="e.g., The event details are incomplete. Please add a resource person..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            autoFocus
                        />

                        <div className={styles.modalActions}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setRejectingId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.confirmRejectBtn}
                                onClick={submitReject}
                                disabled={isRejecting}
                            >
                                {isRejecting ? "Rejecting..." : "Confirm Rejection"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXPANDED VIEW MODAL */}
            {viewingEvent && (
                <div className={styles.overlay} onClick={() => setViewingEvent(null)}>
                    <div
                        className={`${styles.card} ${styles.expandedCard}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.cardCover}>
                            <button
                                className={styles.closeOverlayBtn}
                                onClick={() => setViewingEvent(null)}
                            >
                                ✕
                            </button>

                            {viewingEvent.images && viewingEvent.images.length > 0 ? (
                                <ImageSlider images={viewingEvent.images} title={viewingEvent.title} />
                            ) : (
                                <div className={styles.placeholderCover} />
                            )}
                            {viewingEvent.date && (
                                <div className={styles.dateBadge}>
                                    <span className={styles.day}>{new Date(viewingEvent.date).getDate()}</span>
                                    <span className={styles.month}>{new Date(viewingEvent.date).toLocaleString('default', { month: 'short' }).toUpperCase()}</span>
                                </div>
                            )}
                        </div>

                        <div className={styles.cardContent}>
                            <div className={styles.cardHeader}>
                                <div className={styles.headerTop}>
                                    <span className={styles.departmentTag}>{viewingEvent.department}</span>
                                    <span className={styles.typeTag}>{viewingEvent.type}</span>
                                </div>
                                <h2 style={{ fontSize: '2rem', marginTop: "0.5rem", marginBottom: "0" }}>{viewingEvent.title}</h2>
                            </div>

                            <div className={styles.metaGrid}>
                                <div className={styles.metaItem}>
                                    <span className={styles.label}>Audience</span>
                                    <span className={styles.value}>{viewingEvent.audience || "Students"}</span>
                                </div>
                                <div className={styles.metaItem}>
                                    <span className={styles.label}>Resource Person</span>
                                    <span className={styles.value}>{viewingEvent.resourcePerson || "N/A"}</span>
                                </div>
                                <div className={styles.metaItem}>
                                    <span className={styles.label}>Date</span>
                                    <span className={styles.value}>
                                        {viewingEvent.date ? new Date(viewingEvent.date).toLocaleDateString(undefined, {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        }) : "TBA"}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.details}>
                                {viewingEvent.details || viewingEvent.description}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
