"use client";

import { loginUser } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/config";
import { useState, Suspense } from "react";
import { Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import styles from "../login/login.module.scss"; // Reuse login styles

function RegisterContent() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [facultyId, setFacultyId] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);

    const handleSendOtp = async () => {
        if (!email) {
            toast.error("Please enter your email.");
            return;
        }
        if (!email.toLowerCase().endsWith("@nsrit.edu.in")) {
            toast.error("Only @nsrit.edu.in email addresses are allowed.");
            return;
        }

        setOtpLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || "Failed to send OTP");
                return;
            }
            setOtpSent(true);
            toast.success("OTP sent to your email!");
        } catch {
            toast.error("Server error. Try again later.");
        } finally {
            setOtpLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp) {
            toast.error("Please enter the OTP.");
            return;
        }

        setVerifyLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || "Invalid OTP");
                return;
            }
            setIsEmailVerified(true);
            toast.success("Email verified successfully!");
        } catch {
            toast.error("Server error. Try again later.");
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!name || !email || !facultyId || !password || !confirmPassword) {
            toast.error("Please fill in all fields.");
            return;
        }

        if (!isEmailVerified) {
            toast.error("Please verify your email first.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, facultyId, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Registration failed");
                return;
            }

            toast.success("Account created successfully! Please login.");
            router.push("/login");

        } catch {
            toast.error("Server error. Try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <div className={styles.left}>
                    <div className={styles.marquee}>
                        <span className={styles.marqueeText}>
                            Nadimpalli Satyanarayana Raju Institute of Technology
                        </span>
                    </div>

                    <div className={styles.overlayContent}>
                        <div className={styles.overlayText}>
                            <h1 className={styles.overlayHeading}>Join the NSRIT Community</h1>
                            <p className={styles.overlayDescription}>
                                Create an account to participate in and manage campus events efficiently.
                            </p>
                        </div>
                    </div>

                    <div className={styles.overlayGradient}></div>
                </div>

                <div className={styles.right}>
                    <img src="/nsrit-logo.jpeg" className={styles.rightLogo} alt="NSRIT Logo" />

                    <h2 className={styles.title}>Create Account</h2>
                    <p className={styles.subtitle}>Register with your NSRIT credentials</p>

                    <input
                        className={styles.input}
                        placeholder="Name"
                        value={name}
                        onChange={(e) => { setName(e.target.value); }}
                    />

                    <div className={styles.inputGroup}>
                        <input
                            className={styles.input}
                            placeholder="Email (@nsrit.edu.in)"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setIsEmailVerified(false); setOtpSent(false); }}
                            disabled={isEmailVerified}
                        />
                        {isEmailVerified && (
                            <CheckCircle2 color="green" size={20} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        )}
                        {!isEmailVerified && !otpLoading && (
                            <button
                                onClick={handleSendOtp}
                                disabled={otpLoading}
                                className={styles.verifyBtn}
                            >
                                {otpSent ? "Resend OTP" : "Verify Email"}
                            </button>
                        )}
                        {otpLoading && (
                            <Loader2 color="#16a34a" size={20} className={styles.spinner} style={{ position: 'absolute', right: '12px', top: 'calc(50% - 10px)' }} />
                        )}
                    </div>

                    {otpSent && !isEmailVerified && (
                        <div className={styles.inputGroup}>
                            <input
                                className={styles.input}
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => { setOtp(e.target.value); }}
                            />
                            {!verifyLoading && (
                                <button
                                    onClick={handleVerifyOtp}
                                    disabled={verifyLoading}
                                    className={`${styles.verifyBtn} ${styles.verifyBtnSuccess}`}
                                >
                                    Verify OTP
                                </button>
                            )}
                            {verifyLoading && (
                                <Loader2 color="#16a34a" size={20} className={styles.spinner} style={{ position: 'absolute', right: '12px', top: 'calc(50% - 10px)' }} />
                            )}
                        </div>
                    )}

                    <input
                        className={styles.input}
                        placeholder="Faculty ID"
                        value={facultyId}
                        onChange={(e) => { setFacultyId(e.target.value); }}
                    />

                    <div className={styles.passwordBox}>
                        <input
                            className={styles.input}
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); }}
                        />
                        <span
                            className={styles.eye}
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff /> : <Eye />}
                        </span>
                    </div>

                    <div className={styles.passwordBox}>
                        <input
                            className={styles.input}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); }}
                        />
                        <span
                            className={styles.eye}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? <EyeOff /> : <Eye />}
                        </span>
                    </div>

                    <button
                        className={styles.loginButton}
                        onClick={handleRegister}
                        disabled={loading}
                        style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}
                    >
                        {loading ? "Creating..." : "Register"}
                    </button>

                    <div className={styles.row} style={{ justifyContent: 'center', marginTop: '20px' }}>
                        <span className={styles.subtitle} style={{ fontSize: '0.95rem' }}>
                            Already have an account?{" "}
                            <span
                                className={styles.forgot}
                                onClick={() => router.push("/login")}
                                style={{ fontWeight: '600' }}
                            >
                                Login here
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RegisterContent />
        </Suspense>
    );
}
