"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyOtp() {
  const router = useRouter();
  const [otpInput, setOtpInput] = useState("");
  const [error, setError] = useState("");

  const verifyOtp = () => {
    const storedOtp = localStorage.getItem("otp");

    if (otpInput !== storedOtp) {
      setError("Invalid OTP");
      return;
    }

    // OTP verified
    localStorage.removeItem("otp");
    router.push("/create-password");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Verify OTP</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <input
        type="text"
        placeholder="Enter OTP"
        value={otpInput}
        onChange={(e) => setOtpInput(e.target.value)}
      />

      <br /><br />

      <button onClick={verifyOtp}>Verify OTP</button>
    </div>
  );
}
