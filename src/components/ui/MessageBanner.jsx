import { useEffect, useState } from "react";

export default function MessageBanner({
  type = "info",
  children,
  duration = 4000,
  onClose,
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!duration) return;

    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const styles = {
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
    warning: "bg-yellow-100 text-yellow-700",
    info: "bg-blue-100 text-blue-700",
  };

  const icons = {
    success: "✔",
    error: "❌",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <div
      className={`
        ${styles[type]}
        px-4 py-2
        rounded-md
        shadow-sm
        text-sm
        flex items-center gap-2
      `}
    >
      <span>{icons[type]}</span>
      <span className="leading-snug">{children}</span>
    </div>
  );
}
