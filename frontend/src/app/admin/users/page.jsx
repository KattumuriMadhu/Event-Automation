"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./users.module.scss";
import { API_BASE_URL } from "@/utils/config";
import { getToken } from "@/utils/auth";
import { FaTrash, FaKey, FaEye, FaEyeSlash, FaCheckCircle, FaBan } from "react-icons/fa";
import toast from "react-hot-toast";
import ChangePasswordModal from "@/app/components/ChangePasswordModal";
import ChangeEmailModal from "@/app/components/ChangeEmailModal";
import useKeyboardShortcut from "@/hooks/useKeyboardShortcut";

export default function UserManagement() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showCreatePass, setShowCreatePass] = useState(false);
    const [showResetPass, setShowResetPass] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
    const [visiblePasswords, setVisiblePasswords] = useState({});

    const [deleteId, setDeleteId] = useState(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Helper to safely format dates
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (e) {
            return "Invalid Date";
        }
    };

    const togglePasswordVisibility = (id) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const [newUser, setNewUser] = useState({
        email: "",
        password: "",
        role: "PROVIDER"
    });

    const fetchUsers = async () => {
        const token = getToken();

        if (!token) {
            // Use window.location as fallback to avoid router race conditions
            if (typeof window !== 'undefined') window.location.href = "/login";
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 403 || res.status === 401) {
                toast.error("Access denied. Admins only.");
                if (typeof window !== 'undefined') window.location.href = "/dashboard";
                return;
            }

            const data = await res.json();

            if (!Array.isArray(data)) {
                console.error("API returned non-array data:", data);
                setUsers([]);
                return;
            }

            // Sort: Admins first, then by email
            const sortedUsers = data.sort((a, b) => {
                const roleA = a?.role || '';
                const roleB = b?.role || '';
                const emailA = a?.email || '';
                const emailB = b?.email || '';

                if (roleA === 'ADMIN' && roleB !== 'ADMIN') return -1;
                if (roleA !== 'ADMIN' && roleB === 'ADMIN') return 1;
                return emailA.localeCompare(emailB);
            });

            setUsers(sortedUsers);
        } catch (err) {
            console.error("Fetch users error:", err);
            toast.error("Failed to fetch users");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isMounted) {
            fetchUsers();
        }
    }, [isMounted]);

    useKeyboardShortcut({
        onEscape: () => {
            if (showReset) setShowReset(false);
            if (deleteId) setDeleteId(null);
            if (showChangeEmailModal) setShowChangeEmailModal(false);
            if (showChangePasswordModal) setShowChangePasswordModal(false);
        },
        onEnter: deleteId ? () => confirmDelete() : null
    });

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        const token = getToken();

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/create-user`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(newUser)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.message || "Failed");

            toast.success("User created successfully");
            setNewUser({ email: "", password: "", role: "PROVIDER" });
            fetchUsers();
        } catch (err) {
            toast.error(err.message || "Failed to create user");
        } finally {
            setCreating(false);
        }
    };

    const [resetData, setResetData] = useState({ id: null, password: "" });
    const [showReset, setShowReset] = useState(false);

    const toggleStatus = async (id, currentStatus) => {
        const token = getToken();
        const newStatus = currentStatus === "BLOCKED" ? "ACTIVE" : "BLOCKED";

        try {
            await fetch(`${API_BASE_URL}/api/auth/users/${id}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            fetchUsers();

            // Simplified toast
            toast.success(newStatus === 'ACTIVE' ? 'User Activated' : 'User Blocked');
        } catch {
            toast.error("Failed to update status");
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        const token = getToken();
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${deleteId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success("User deleted successfully");
                fetchUsers();
                setDeleteId(null);
            } else {
                toast.error("Failed to delete user");
            }
        } catch {
            toast.error("Error deleting user");
        }
    };

    const deleteUser = (id) => {
        setDeleteId(id);
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        const token = getToken();
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${resetData.id}/password`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ password: resetData.password })
            });

            if (res.ok) {
                toast.success("Password updated");
                setShowReset(false);
                setResetData({ id: null, password: "" });
            } else {
                toast.error("Failed to update password");
            }
        } catch {
            toast.error("Error updating password");
        }
    };

    const openReset = (id) => {
        setResetData({ id, password: "" });
        setShowReset(true);
    };

    // Client-side guard
    if (!isMounted) return null;

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading users...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Manage Users</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className={styles.backBtn}
                        onClick={() => setShowChangeEmailModal(true)}
                    >
                        Change Admin Email
                    </button>
                    <button
                        className={styles.backBtn}
                        onClick={() => setShowChangePasswordModal(true)}
                    >
                        Change Admin Password
                    </button>
                    <button className={styles.backBtn} onClick={() => router.push("/dashboard")}>
                        ← Back to Dashboard
                    </button>
                </div>
            </header>

            {/* CREATE USER FORM */}
            <div className={styles.createCard}>
                <h3 className={styles.createTitle}>Create New Provider</h3>
                <form className={styles.form} onSubmit={handleCreate}>
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        required
                    />
                    <div className={styles.passwordWrapper}>
                        <input
                            type={showCreatePass ? "text" : "password"}
                            placeholder="Password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            required
                            minLength={6}
                        />
                        <span className={styles.eyeIcon} onClick={() => setShowCreatePass(!showCreatePass)}>
                            {showCreatePass ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>
                    <button type="submit" disabled={creating}>
                        {creating ? "Creating..." : "Create User"}
                    </button>
                </form>
            </div>

            {/* USER LIST */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Created At</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(users) && users.length > 0 ? (
                            users.map((user, index) => {
                                // Extra safety check for user object
                                if (!user) return null;

                                const userId = user._id || `user-${index}`;
                                const userEmail = user.email || 'No Email';
                                const userRole = user.role || 'UNKNOWN';
                                const userDate = user.createdAt;
                                const userStatus = user.status || 'ACTIVE';

                                return (
                                    <tr key={userId}>
                                        <td>{userEmail}</td>
                                        <td>
                                            <span className={`${styles.roleBadge} ${userRole === 'ADMIN' ? styles.adminRole : styles.providerRole}`}>
                                                {userRole}
                                            </span>
                                        </td>
                                        <td>{formatDate(userDate)}</td>
                                        <td>
                                            <span style={{ color: userStatus === 'BLOCKED' ? 'red' : 'green', fontWeight: '600', fontSize: '0.85rem' }}>
                                                {userStatus}
                                            </span>
                                        </td>
                                        <td>
                                            {userRole !== 'ADMIN' && (
                                                <div className={styles.actions}>
                                                    <button
                                                        className={`${styles.statusBtn} ${userStatus === 'BLOCKED' ? styles.blocked : styles.active}`}
                                                        onClick={() => toggleStatus(userId, userStatus)}
                                                    >
                                                        {userStatus === 'BLOCKED' ? "Blocked" : "Active"}
                                                    </button>
                                                    <button className={styles.iconBtn} onClick={() => openReset(userId)} title="Reset Password">
                                                        <FaKey />
                                                    </button>
                                                    <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => deleteUser(userId)} title="Delete User">
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>No users found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* DELETE CONFIRMATION MODAL */}
            {deleteId && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} style={{ maxWidth: '400px', padding: '2rem' }}>
                        <div className={styles.deleteModalContent}>
                            <div className={styles.deleteIconWrapper}>
                                <FaTrash />
                            </div>
                            <h3 className={styles.deleteTitle}>Delete User?</h3>
                            <p className={styles.deleteDesc}>
                                Are you sure you want to delete form? This action cannot be undone.
                            </p>
                            <div className={styles.deleteActions}>
                                <button
                                    className={styles.cancelAction}
                                    onClick={() => setDeleteId(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={styles.deleteAction}
                                    onClick={confirmDelete}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RESET PASSWORD MODAL */}
            {showReset && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} style={{ maxWidth: '420px', padding: '2.5rem' }}>
                        <div className={styles.resetModalContent}>
                            <div className={styles.resetIconWrapper}>
                                <FaKey />
                            </div>
                            <h3 className={styles.resetTitle}>Reset Password</h3>
                            <p className={styles.resetDesc}>
                                Enter a new secure password.
                            </p>

                            <form onSubmit={handlePasswordReset}>
                                <div className={styles.resetPasswordWrapper}>
                                    <input
                                        type={showResetPass ? "text" : "password"}
                                        placeholder="New Secure Password"
                                        value={resetData.password}
                                        onChange={e => setResetData({ ...resetData, password: e.target.value })}
                                        required
                                        minLength={6}
                                        className={styles.resetInput}
                                    />
                                    <span className={styles.resetEyeIcon} onClick={() => setShowResetPass(!showResetPass)}>
                                        {showResetPass ? <FaEyeSlash /> : <FaEye />}
                                    </span>
                                </div>
                                <div className={styles.resetActions}>
                                    <button type="button" className={styles.cancelResetAction} onClick={() => setShowReset(false)}>Cancel</button>
                                    <button type="submit" className={styles.saveResetAction}>Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* CHANGE PASSWORD MODAL */}
            <ChangePasswordModal
                isOpen={showChangePasswordModal}
                onClose={() => setShowChangePasswordModal(false)}
                token={getToken()}
            />

            {/* CHANGE EMAIL MODAL */}
            <ChangeEmailModal
                isOpen={showChangeEmailModal}
                onClose={() => setShowChangeEmailModal(false)}
                token={getToken()}
                onUpdate={(newEmail) => {
                    fetchUsers();

                    // Update session storage if exists
                    const sessionUserStr = sessionStorage.getItem("user");
                    if (sessionUserStr) {
                        try {
                            const u = JSON.parse(sessionUserStr);
                            u.email = newEmail;
                            sessionStorage.setItem("user", JSON.stringify(u));
                        } catch (e) {
                            console.error("Error updating session storage", e);
                        }
                    }

                    // Update local storage if exists
                    const localUserStr = localStorage.getItem("user");
                    if (localUserStr) {
                        try {
                            const u = JSON.parse(localUserStr);
                            u.email = newEmail;
                            localStorage.setItem("user", JSON.stringify(u));
                        } catch (e) {
                            console.error("Error updating local storage", e);
                        }
                    }

                    // Dispatch event for Header update
                    window.dispatchEvent(new Event("user-updated"));
                }}
            />
        </div>
    );
}
