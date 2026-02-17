"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import StatusBadge from "./StatusBadge";

export default function PublishToSocial({ event }) {
  const [platform, setPlatform] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(
    event?.socialStatus || "PENDING"
  );

  const publish = async () => {
    if (!platform) {
      toast.error("Please select a social media platform");
      return;
    }

    setLoading(true);
    toast.loading("Publishing post...", { id: "publish" });

    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event._id,
          platform,
        }),
      });

      if (!res.ok) throw new Error("Publish failed");

      setStatus("POSTED");
      toast.success("Post published successfully 🚀", {
        id: "publish",
      });
    } catch (err) {
      setStatus("FAILED");
      toast.error("Failed to publish post", {
        id: "publish",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420 }}>
      <div style={{ marginBottom: 10 }}>
        <StatusBadge status={status} />
      </div>

      <label className="block font-medium mb-2">
        Select Platform
      </label>

      <select
        value={platform}
        onChange={(e) => setPlatform(e.target.value)}
        className="w-full border rounded px-3 py-2"
      >
        <option value="">-- Choose Platform --</option>
        <option value="instagram">Instagram</option>
        <option value="facebook">Facebook</option>
      </select>

      <button
        onClick={publish}
        disabled={!platform || loading}
        style={{
          marginTop: 16,
          width: "100%",
          padding: "12px",
          background: !platform || loading ? "#94a3b8" : "#2563eb",
          color: "#fff",
          borderRadius: 8,
          fontWeight: 600,
          cursor: !platform || loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Publishing..." : "Publish to Social Media"}
      </button>
    </div>
  );
}
