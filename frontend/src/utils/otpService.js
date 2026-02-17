import { API_BASE_URL } from "./config";

export const sendOtp = async (email) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, message: data.message };
    }

    return { success: true };
  } catch {
    return { success: false, message: "Server connection failed" };
  }
};

export const verifyOtp = async (email, otp) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, message: data.message };
    }

    return { success: true };
  } catch {
    return { success: false, message: "Server connection failed" };
  }
};
