import { useState } from "react";
import styles from "./ChangePasswordModal.module.scss"; // Reusing styles
import { API_BASE_URL } from "@/utils/config";
import toast from "react-hot-toast";
import useKeyboardShortcut from "@/hooks/useKeyboardShortcut";

export default function ChangeEmailModal({ isOpen, onClose, token, onUpdate }) {
    const [formData, setFormData] = useState({
        currentPassword: "",
        newEmail: ""
    });
    const [loading, setLoading] = useState(false);

    useKeyboardShortcut({ onEscape: onClose });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/profile/email`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Email updated successfully");
                if (onUpdate) onUpdate(formData.newEmail);
                setFormData({ currentPassword: "", newEmail: "" });
                onClose();
                // Optional: Trigger a logout or user refresh if needed
            } else {
                toast.error(data.message || "Failed to update email");
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
                <h3>Change Email Address</h3>
                <p>Enter your current password to maximize security.</p>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <input
                            type="email"
                            className={styles.input}
                            placeholder="New Email Address"
                            value={formData.newEmail}
                            onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
                            required
                        />
                        <input
                            type="password"
                            className={styles.input}
                            placeholder="Current Password"
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
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
                            {loading ? "Updating..." : "Update Email"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
