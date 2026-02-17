import { useState } from "react";
import styles from "./ChangePasswordModal.module.scss";
import { API_BASE_URL } from "@/utils/config";
import toast from "react-hot-toast";
import useKeyboardShortcut from "@/hooks/useKeyboardShortcut";

export default function ChangePasswordModal({ isOpen, onClose, token }) {
    const [formData, setFormData] = useState({
        current: "",
        newPass: "",
        confirm: ""
    });
    const [loading, setLoading] = useState(false);

    useKeyboardShortcut({ onEscape: onClose });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.newPass !== formData.confirm) {
            toast.error("New passwords do not match");
            return;
        }
        if (formData.newPass.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/profile/password`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: formData.current,
                    newPassword: formData.newPass
                })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Password updated successfully");
                setFormData({ current: "", newPass: "", confirm: "" });
                onClose();
            } else {
                toast.error(data.message || "Failed to update password");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <h3>Change Password</h3>
                <p>Update your admin account password securely.</p>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <input
                            type="password"
                            className={styles.input}
                            placeholder="Current Password"
                            value={formData.current}
                            onChange={(e) => setFormData({ ...formData, current: e.target.value })}
                            required
                        />
                        <input
                            type="password"
                            className={styles.input}
                            placeholder="New Password"
                            value={formData.newPass}
                            onChange={(e) => setFormData({ ...formData, newPass: e.target.value })}
                            required
                        />
                        <input
                            type="password"
                            className={styles.input}
                            placeholder="Confirm New Password"
                            value={formData.confirm}
                            onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
                            required
                        />
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.cancel}
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submit}
                            disabled={loading}
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
