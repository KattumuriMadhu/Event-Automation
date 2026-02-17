"use client";

import { loginUser } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/config";
import { useState, Suspense } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./login.module.scss";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* New State for Logic */
  /* New State for Logic */
  const [role, setRole] = useState("ADMIN"); // ADMIN or PROVIDER
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  /* Forgot Password State */
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  // const [forgotMessage, setForgotMessage] = useState(""); // REMOVED
  const [forgotError, setForgotError] = useState("");

  /* ================= LOGIN ================= */
  const handleLogin = async () => {
    // setError(""); // REMOVED to prevent layout jump
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      // Enforce strict portal access
      if (data.user.role !== role) {
        setError(`Access Denied. Please login via the ${data.user.role === 'ADMIN' ? 'Admin' : 'Provider'} portal.`);
        return;
      }

      // Use consistent auth utility
      loginUser(data.token, data.user);

      // Redirect based on role
      // Redirect based on role or intended destination
      const redirectPath = searchParams.get("redirect");
      if (redirectPath) {
        window.location.href = decodeURIComponent(redirectPath);
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= FORGOT PASSWORD ================= */
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    // setForgotMessage(""); // REMOVED
    setForgotError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setShowForgotModal(false);
      } else {
        setForgotError(data.message || "Failed to send reset email");
      }
    } catch {
      setForgotError("Something went wrong. Try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  /* ================= REGISTER ================= */



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
              <h1 className={styles.overlayHeading}>Streamline Your Campus Event Management</h1>
              <p className={styles.overlayDescription}>
                Efficiently plan, organize, and execute events with our comprehensive automation platform designed for NSRIT.
              </p>
            </div>
          </div>

          <div className={styles.overlayGradient}></div>

        </div>

        <div className={styles.right}>
          <img src="/nsrit-logo.jpeg" className={styles.rightLogo} />

          {error && <div className={styles.error}>{error}</div>}

          {/* ================= LOGIN ================= */}
          {/* ================= LOGIN ================= */}
          {/* ================= LOGIN ================= */}
          <h2 className={styles.title}>Welcome Back</h2>
          <p className={styles.subtitle}>Select your portal to login</p>

          {/* Role Toggle */}
          <div style={{
            display: 'flex', gap: '10px', marginBottom: '25px', padding: '4px', background: '#f1f5f9', borderRadius: '12px'
          }}>
            <button
              onClick={() => { setRole("ADMIN"); setError(""); }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: role === "ADMIN" ? '#ffffff' : 'transparent',
                color: role === "ADMIN" ? '#2563eb' : '#64748b',
                boxShadow: role === "ADMIN" ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Admin
            </button>
            <button
              onClick={() => { setRole("PROVIDER"); setError(""); }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: role === "PROVIDER" ? '#ffffff' : 'transparent',
                color: role === "PROVIDER" ? '#2563eb' : '#64748b',
                boxShadow: role === "PROVIDER" ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Provider
            </button>
          </div>

          <input
            className={styles.input}
            placeholder="Email"
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
          />

          <div className={styles.passwordBox}>
            <input
              className={styles.input}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
            />
            <span
              className={styles.eye}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </span>
          </div>


          <div className={styles.row}>
            <div className={styles.remember}></div>
            {role === "ADMIN" && (
              <span
                className={styles.forgot}
                onClick={async () => {
                  if (!email) {
                    setError("Please enter your email address.");
                    return;
                  }

                  // Optional: minimal frontend validation
                  setLoading(true);
                  try {
                    const res = await fetch(`${API_BASE_URL}/api/auth/check-email`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email }),
                    });
                    const data = await res.json();

                    if (res.ok) {
                      setShowForgotModal(true);
                      setError("");
                    } else {
                      setError(data.message || "Invalid email for password reset");
                    }
                  } catch {
                    setError("Unable to verify email. try again.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Forgot Password?
              </span>
            )}
          </div>

          <button
            className={styles.loginButton}
            onClick={handleLogin}
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? "Verifying..." : "Login"}
          </button>

          {/* ================= FORGOT MODAL ================= */}
          {showForgotModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalCard}>
                <div className={styles.modalIcon}>
                  <KeyRound size={28} />
                </div>

                <h3 className={styles.modalTitle}>
                  Confirm Password Reset
                </h3>

                <p className={styles.modalText}>
                  Send a password reset link to your registered email address?
                </p>

                {forgotError && (
                  <div className={`${styles.modalMessage} ${styles.modalError}`}>
                    {forgotError}
                  </div>
                )}

                <div className={styles.modalButtons}>
                  <button
                    className={styles.cancelButton}
                    onClick={() => { setShowForgotModal(false); setForgotError(""); }}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.sendButton}
                    onClick={handleForgotSubmit}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </div>
            </div>
          )}




          {/* ================= SIGNUP ================= */}


        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
