export default function DashboardTabs({ active, onChange }) {
  const tabs = [
    { id: "hours", label: "Horas & Métricas" },
    { id: "kanban", label: "Kanban Work Items" },
  ];

  return (
    <div className="flex gap-2 border-b border-trackly-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`
            px-4 py-2 text-sm font-medium
            border-b-2 transition
            ${
              active === t.id
                ? "border-trackly-primary text-trackly-primary"
                : "border-transparent text-trackly-muted hover:text-trackly-text"
            }
          `}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
