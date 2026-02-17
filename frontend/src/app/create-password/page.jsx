"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function CreatePassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const createAccount = () => {
    if (!password || !confirm) {
      setError("All fields required");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    const email = localStorage.getItem("otpEmail");

    // Store account
    localStorage.setItem(
      "event_user",
      JSON.stringify({
        email,
        password: btoa(password), // encoded
        role: "ADMIN",
      })
    );

    localStorage.removeItem("otpEmail");

    toast.success("Account created successfully!");
    router.push("/login");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Create Password</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <input
        type="password"
        placeholder="Create password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="Confirm password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />

      <br /><br />

      <button onClick={createAccount}>Create Account</button>

    </div>
  );
}
