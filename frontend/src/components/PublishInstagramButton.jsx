"use client";
import { useState } from "react";

export default function PublishInstagramButton({ event }) {
  const [loading, setLoading] = useState(false);

  const publish = async () => {
    setLoading(true);

    const res = await fetch("/api/instagram/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: event.bannerImage,
        caption: `
🎉 ${event.title}
📍 ${event.location}
🗓 ${event.date}

#NSRIT #Events
        `,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      alert("✅ Posted to Instagram!");
    } else {
      alert("❌ Failed to post");
      console.error(data.error);
    }
  };

  return (
    <button
      onClick={publish}
      disabled={loading}
      style={{
        padding: "10px 16px",
        background: "#E1306C",
        color: "white",
        borderRadius: "6px",
        border: "none",
        cursor: "pointer",
      }}
    >
      {loading ? "Posting..." : "Publish to Instagram"}
    </button>
  );
}
