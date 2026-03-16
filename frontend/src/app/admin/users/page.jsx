"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, logoutUser } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/config";
import toast from "react-hot-toast";
import styles from "./users.module.scss";

export default function AdminUsersPage() {
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        const token = getToken();
        const currentUser = getUser();
        if (!token || !currentUser || currentUser.role !== "ADMIN") {
            router.push("/login");
            return;
        }
        setUser(currentUser);

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
                    toast.error("Failed to load users");
                }
            } catch (error) {
                toast.error("Error communicating with server");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [router]);

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
                <button className={styles.backBtn} onClick={() => router.push("/events")}>
                    View Events
                </button>
            </header>

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
                                                {u.status}
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
