"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "lucide-react";
import { FaSignOutAlt } from "react-icons/fa";
import { getUser, logoutUser } from "@/utils/auth";

export default function Header() {
    const router = useRouter();
    const [user, setUser] = useState(null);

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        // Function to update user state from storage
        const updateUser = () => {
            const currentUser = getUser();
            setUser(currentUser);
        };

        // Initial load
        updateUser();

        // Listen for custom auth events and storage changes
        window.addEventListener("auth-change", updateUser);
        window.addEventListener("user-updated", updateUser);
        window.addEventListener("storage", updateUser); // For cross-tab sync

        return () => {
            window.removeEventListener("auth-change", updateUser);
            window.removeEventListener("user-updated", updateUser);
            window.removeEventListener("storage", updateUser);
        };
    }, []);

    const confirmLogout = () => {
        logoutUser();
        // Force a hard refresh to clear any state if needed, or just push to login
        window.location.href = "/login";
    };

    /* ================= PATH CHECK ================= */
    const pathname = usePathname();
    if (pathname === "/login") return null;

    return (
        <>
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>

            <header style={styles.header}>
                <div style={styles.logoSection}>
                    <img src="/nsrit-logo.jpeg" alt="NSRIT Logo" style={styles.logo} />
                    {/* <h1 style={styles.title}>Nadimpalli Satya Narayana Raju Institute of Technology</h1> */}
                </div>

                <div style={styles.userSection}>
                    {/* Hide user info on specific public-facing or isolated pages like social post */}
                    {!pathname.includes("/admin/social-post/") && (
                        user ? (
                            <div style={styles.userInfo}>
                                <span style={styles.roleBadge}>{user.role || "USER"}</span>
                                <span style={styles.userName}>{user.email || "Admin"}</span>
                                <button
                                    style={styles.logoutBtn}
                                    onClick={() => setShowLogoutConfirm(true)}
                                    title="Logout"
                                >
                                    <FaSignOutAlt size={14} />
                                </button>
                            </div>
                        ) : (
                            // Placeholder if no user info but not on login page
                            <div style={styles.placeholder}></div>
                        )
                    )}
                </div>
            </header>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalContent}>
                            <div style={styles.warningIcon}>👋</div>
                            <h2 style={styles.modalTitle}>Ready to Leave?</h2>
                            <p style={styles.modalText}>
                                Are you sure you want to log out of your account?
                            </p>
                            <div style={styles.modalActions}>
                                <button
                                    style={styles.cancelBtn}
                                    onClick={() => setShowLogoutConfirm(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    style={styles.confirmBtn}
                                    onClick={confirmLogout}
                                >
                                    Yes, Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

}

const styles = {
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: "70px",
        background: "#ffffff",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
    },
    logoSection: {
        display: "flex",
        alignItems: "center",
        gap: "15px",
    },
    logo: {
        height: "45px",
        objectFit: "contain",
    },
    title: {
        fontSize: "24px",
        fontWeight: "700",
        color: "#1e3a8a", // Dark blue
        letterSpacing: "1px",
        margin: 0,
    },
    userSection: {
        display: "flex",
        alignItems: "center",
    },
    userInfo: {
        display: "flex",
        alignItems: "center",
        gap: "15px",
    },
    roleBadge: {
        background: "#eff6ff",
        color: "#2563eb",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "600",
        textTransform: "uppercase",
    },
    userName: {
        fontSize: "15px",
        fontWeight: "500",
        color: "#334155",
    },
    logoutBtn: {
        background: "#fff1f2",
        border: "1px solid #fecaca",
        color: "#ef4444",
        width: "32px",
        height: "32px",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s",
        marginLeft: "5px",
    },
    placeholder: {},

    /* Modal Styles */
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        animation: 'fadeIn 0.2s ease-out',
    },
    modal: {
        background: 'white',
        padding: '2rem',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '400px',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        transform: 'scale(1)',
        animation: 'scaleIn 0.2s ease-out',
    },
    modalContent: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
    },
    warningIcon: {
        fontSize: '3rem',
        marginBottom: '0.5rem',
        animation: 'bounce 1s infinite',
    },
    modalTitle: {
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: '0.5rem',
    },
    modalText: {
        color: '#64748b',
        marginBottom: '1.5rem',
        lineHeight: '1.5',
    },
    modalActions: {
        display: 'flex',
        gap: '1rem',
        width: '100%',
        justifyContent: 'center',
    },
    cancelBtn: {
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        background: 'white',
        color: '#64748b',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flex: 1,
    },
    confirmBtn: {
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        border: 'none',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)',
        flex: 1,
    },
};
