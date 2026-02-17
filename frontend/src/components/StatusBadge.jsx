export default function StatusBadge({ status }) {
  const styles = {
    PENDING: { bg: "#facc15", text: "#92400e", label: "Pending" },
    POSTED: { bg: "#22c55e", text: "#065f46", label: "Posted" },
    FAILED: { bg: "#ef4444", text: "#7f1d1d", label: "Failed" },
  };

  if (!status) return null;

  const s = styles[status];

  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      {s.label}
    </span>
  );
}
