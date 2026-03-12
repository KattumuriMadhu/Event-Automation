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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);

  const [loading, setLoading] = useState(false);

  /* Forgot Password State */
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  // const [forgotMessage, setForgotMessage] = useState(""); // REMOVED
  const [forgotError, setForgotError] = useState("");

  /* ================= LOGIN ================= */
  const handleLogin = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password, isCoordinator }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Invalid credentials");
        return;
      }

      // Use consistent auth utility
      loginUser(data.token, data.user);

      // Redirect based on role or intended destination
      const redirectPath = searchParams.get("redirect");
      if (redirectPath) {
        window.location.href = decodeURIComponent(redirectPath);
      } else {
        if (data.user?.role === "ADMIN") {
          window.location.href = "/events";
        } else {
          window.location.href = "/dashboard";
        }
      }
    } catch {
      toast.error("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= FORGOT PASSWORD ================= */
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
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

          {/* ================= LOGIN ================= */}
          <h2 className={styles.title}>Welcome Back</h2>

          {/* Coordinator Checkbox */}
          <div className={styles.row} style={{ justifyContent: "flex-start", marginBottom: "15px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.95rem", color: "#64748b" }}>
              <input
                type="checkbox"
                checked={isCoordinator}
                onChange={(e) => {
                  setIsCoordinator(e.target.checked);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter") handleLogin();
                }}
              />
              Login as Coordinator
            </label>
          </div>

          {/* Always show the email input, even for coordinator */}
          <input
            className={styles.input}
            placeholder="Email / Faculty ID"
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
          />


          <div className={styles.passwordBox}>
            <input
              className={styles.input}
              type={showPassword ? "text" : "password"}
              placeholder={isCoordinator ? "Coordinator Password" : "Password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
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
            <span
              className={styles.forgot}
              onClick={async () => {
                if (isCoordinator) {
                  toast.error("Contact system administrator to reset coordinator password.");
                  return;
                }
                if (!email) {
                  toast.error("Please enter your email address.");
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
                  } else {
                    toast.error(data.message || "Invalid email for password reset");
                  }
                } catch {
                  toast.error("Unable to verify email. try again.");
                } finally {
                  setLoading(false);
                }
              }}>
              Forgot Password?
            </span>
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
          <div className={styles.row} style={{ justifyContent: 'center', marginTop: '20px' }}>
            <span className={styles.subtitle} style={{ fontSize: '0.95rem' }}>
              Don&apos;t have an account?{" "}
              <span
                className={styles.forgot}
                onClick={() => router.push("/register")}
                style={{ fontWeight: '600' }}
              >
                Create new account
              </span>
            </span>
          </div>        </div>
      </div>
    </div >
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
