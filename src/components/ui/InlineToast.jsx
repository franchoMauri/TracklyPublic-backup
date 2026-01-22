import { useEffect } from "react";

export default function InlineToast({
  message,
  type = "success", // "success" | "error" | "info"
  onClose,
  duration = 3500,
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  const styles = {
    success: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  };

  const icons = {
    success: "✔",
    error: "✖",
    info: "ℹ",
  };

  return (
    <div
      className={`mt-3 px-3 py-2 rounded text-xs flex items-center gap-2 ${styles[type]}`}
    >
      <span className="font-bold">{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}
