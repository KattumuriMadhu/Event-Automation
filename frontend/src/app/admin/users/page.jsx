"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, logoutUser } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/config";
import toast from "react-hot-toast";
import { FaEnvelope, FaTimes, FaLock, FaUserShield } from "react-icons/fa";
import styles from "./users.module.scss";

export default function AdminUsersPage() {
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [serverError, setServerError] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const [coordinatorEmail, setCoordinatorEmail] = useState("");
    const [emailPassword, setEmailPassword] = useState("");
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);

    useEffect(() => {
        const token = getToken();
        const currentUser = getUser();
        if (!token || !currentUser || currentUser.role !== "ADMIN") {
            router.push("/login");
            return;
        }
        setUser(currentUser);
        setCoordinatorEmail(currentUser.email);

        const fetchUsers = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    setUsersList(data);
                } else {
                    setServerError(true);
                }
            } catch (error) {
                setServerError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [router]);

    const updateCoordinatorEmail = async () => {
        if (!coordinatorEmail || !emailPassword) {
            toast.error("Email and password are required");
            return;
        }
        
        setIsUpdatingEmail(true);
        const token = getToken();

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/admin/email`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ email: coordinatorEmail, password: emailPassword })
            });

            if (response.ok) {
                toast.success("Coordinator email updated successfully");
                // Update local storage so session continues smoothly
                const updatedUser = { ...user, email: coordinatorEmail };
                setUser(updatedUser);
                if (typeof localStorage !== "undefined") {
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                }
                setShowEmailModal(false);
                setEmailPassword("");
            } else {
                const errData = await response.json();
                toast.error(errData.message || "Failed to update email");
            }
        } catch (error) {
            toast.error("Error updating email");
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const deleteUser = async () => {
        if (!confirmDeleteId) return;

        setDeletingId(confirmDeleteId);
        const token = getToken();

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/users/${confirmDeleteId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                toast.success("User deleted successfully");
                setUsersList((prev) => prev.filter((u) => u._id !== confirmDeleteId));
            } else {
                const errData = await response.json();
                toast.error(errData.message || "Failed to delete user");
            }
        } catch (error) {
            toast.error("Error deleting user");
        } finally {
            setConfirmDeleteId(null);
            setDeletingId(null);
        }
    };

    const toggleStatus = async (userId, currentStatus) => {
        if (currentStatus === "PENDING") return; // Keep pending handled by email flow

        const newStatus = currentStatus === "ACTIVE" ? "BLOCKED" : "ACTIVE";
        const token = getToken();

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                setUsersList(prev => prev.map(u => u._id === userId ? { ...u, status: newStatus } : u));
                toast.success(`User is now ${newStatus.toLowerCase()}`);
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            toast.error("Error communicating with server");
        }
    };

    if (loading) {
        return <div className={styles.loaderArea}>Loading users...</div>;
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

            {/* DELETE MODAL */}
            {confirmDeleteId && (
                <div className={styles.overlay}>
                    <div className={styles.deleteModal}>
                        <div className={styles.trash}>🗑</div>
                        <h2>Delete User?</h2>
                        <p>This will permanently remove the user from the system.</p>
                        <div className={styles.deleteActions}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setConfirmDeleteId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.deleteBtn}
                                onClick={deleteUser}
                                disabled={!!deletingId}
                            >
                                {deletingId ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className={styles.header}>
                <h1>Manage System Users</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        className={styles.backBtn} 
                        style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                        onClick={() => setShowEmailModal(true)}
                    >
                        Change Email
                    </button>
                    <button className={styles.backBtn} onClick={() => router.push("/events")}>
                        View Events
                    </button>
                </div>
            </header>

            {/* EMAIL CHANGE MODAL */}
            {showEmailModal && (
                <div className={styles.overlay}>
                    <div className={styles.emailModal}>
                        <button 
                            className={styles.closeIconBtn} 
                            onClick={() => {
                                setShowEmailModal(false);
                                setEmailPassword("");
                            }}
                        >
                            <FaTimes />
                        </button>
                        <div className={styles.modalIconWrapper}>
                            <FaUserShield />
                        </div>
                        <h2>Update Coordinator Email</h2>
                        <p>Ensure the new email is active as all authorization requests will be routed here securely.</p>
                        
                        <div className={styles.inputGroup}>
                            <label>New Coordinator Email</label>
                            <div style={{ position: 'relative' }}>
                                <FaEnvelope style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input 
                                    type="email" 
                                    value={coordinatorEmail} 
                                    onChange={(e) => setCoordinatorEmail(e.target.value)} 
                                    className={styles.premiumInput}
                                    placeholder="admin@example.com"
                                    style={{ paddingLeft: '2.5rem' }}
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label>Current Password</label>
                            <div style={{ position: 'relative' }}>
                                <FaLock style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input 
                                    type="password" 
                                    value={emailPassword} 
                                    onChange={(e) => setEmailPassword(e.target.value)} 
                                    className={styles.premiumInput}
                                    placeholder="••••••••"
                                    style={{ paddingLeft: '2.5rem' }}
                                />
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => {
                                    setShowEmailModal(false);
                                    setEmailPassword("");
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                className={styles.updateBtn} 
                                onClick={updateCoordinatorEmail}
                                disabled={isUpdatingEmail}
                            >
                                {isUpdatingEmail ? "Updating..." : "Confirm Update"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.card}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Faculty ID</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usersList.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className={styles.emptyState}>No registered users found.</td>
                                </tr>
                            ) : (
                                usersList.map((u) => (
                                    <tr key={u._id}>
                                        <td>
                                            <div className={styles.userInfo}>
                                                <div className={styles.avatar}>{u.name.charAt(0).toUpperCase()}</div>
                                                <span className={styles.name}>{u.name}</span>
                                            </div>
                                        </td>
                                        <td><span className={styles.emailText}>{u.email}</span></td>
                                        <td><span className={styles.facultyIdBadge}>{u.facultyId}</span></td>
                                        <td>
                                            <span
                                                className={`${styles.statusBadge} ${u.status === 'ACTIVE' ? styles.active : u.status === 'PENDING' ? styles.pending : styles.blocked}`}
                                                style={{ cursor: u.status === 'PENDING' ? 'not-allowed' : 'pointer' }}
                                                onClick={() => toggleStatus(u._id, u.status)}
                                                title={u.status === 'PENDING' ? '' : 'Click to interact/toggle block'}
                                            >
                                                <span className={styles.statusText}>{u.status}</span>
                                                <span className={styles.hoverText}>
                                                    {u.status === 'ACTIVE' ? 'BLOCK' : u.status === 'BLOCKED' ? 'ACTIVE' : u.status}
                                                </span>
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={styles.actionDeleteBtn}
                                                onClick={() => setConfirmDeleteId(u._id)}
                                                title="Delete User"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
