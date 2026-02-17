"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { API_BASE_URL } from "@/utils/config";
import styles from "./reset.module.scss";
import { Eye, EyeOff, Lock, KeyRound } from "lucide-react";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // New state for token validation
    const [isTokenValid, setIsTokenValid] = useState(null); // null = loading, true = valid, false = invalid
    const [expiresAt, setExpiresAt] = useState(null);

    useEffect(() => {
        if (!token) {
            setIsTokenValid(false);
            return;
        }

        const validateToken = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/reset-password/validate/${token}`);
                const data = await res.json();
                if (res.ok && data.valid) {
                    setIsTokenValid(true);
                    if (data.expiresAt) {
                        setExpiresAt(data.expiresAt);
                    }
                } else {
                    setIsTokenValid(false);
                }
            } catch {
                setIsTokenValid(false);
            }
        };

        validateToken();
    }, [token]);

    // Check for expiration
    useEffect(() => {
        if (!expiresAt || isTokenValid === false) return;

        const checkExpiration = () => {
            if (Date.now() > new Date(expiresAt).getTime()) {
                setIsTokenValid(false);
            }
        };

        // Check immediately
        checkExpiration();

        // Check every second
        const interval = setInterval(checkExpiration, 1000);
        return () => clearInterval(interval);
    }, [expiresAt, isTokenValid]);

    useEffect(() => {
        if (isTokenValid === false) {
            const timer = setTimeout(() => {
                window.close();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isTokenValid, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword: password }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage("Password reset successfully! Redirecting...");
                setTimeout(() => {
                    router.push("/login?role=ADMIN");
                }, 2000);
            } else {
                setError(data.message || "Failed to reset password");
                if (data.message === "Invalid or expired token") {
                    setIsTokenValid(false);
                }
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (isTokenValid === null) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.card}>
                    <p className={styles.subtitle}>Verifying link...</p>
                </div>
            </div>
        );
    }

    if (isTokenValid === false) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#f1f5f9',
                fontFamily: 'system-ui, sans-serif',
                padding: '1rem'
            }}>
                <div style={{
                    background: 'white',
                    padding: '2.5rem',
                    borderRadius: '1rem',
                    textAlign: 'center',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    maxWidth: '440px',
                    width: '100%'
                }}>
                    <h2 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        Link Expired
                    </h2>
                    <p style={{ color: '#64748b', marginBottom: '0.5rem', lineHeight: '1.5' }}>
                        This password reset link is invalid or has already been used.
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                        Closing window automatically...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <div style={{
                    width: '64px', height: '64px', background: '#eff6ff', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
                    color: '#4f46e5', boxShadow: '0 0 0 8px #f8fafc'
                }}>
                    <KeyRound size={28} />
                </div>

                <h1 className={styles.title}>Set New Password</h1>
                <p className={styles.subtitle}>
                    Your new password must be different from previously used passwords.
                </p>

                {message && <div className={`${styles.message} ${styles.success}`}>{message}</div>}
                {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showPassword ? "text" : "password"}
                                className={styles.input}
                                placeholder="New Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={styles.iconBtn}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <div className={styles.inputWrapper}>
                            <input
                                type="password"
                                className={styles.input}
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <div className={styles.iconBtn} style={{ pointerEvents: 'none', color: '#cbd5e1' }}>
                                <Lock size={18} />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className={styles.button} disabled={loading}>
                        {loading ? "Resetting Password..." : "Reset Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
