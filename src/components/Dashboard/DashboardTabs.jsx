export default function DashboardTabs({
  active,
  onChange,
  availableTabs = [],
}) {
  const allTabs = {
    hours: {
      id: "hours",
      label: "Horas & Métricas",
    },
    kanban: {
      id: "kanban",
      label: "Kanban Work Items",
    },
  };

  return (
    <div className="flex gap-1 border-b border-trackly-border">
      {availableTabs.map((tabId) => {
        const t = allTabs[tabId];
        if (!t) return null;

        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`
              px-4 py-2 text-sm font-medium
              border-b-2 transition
              ${
                active === t.id
                  ? "border-trackly-primary text-trackly-primary bg-sky-50"
                  : "border-transparent text-trackly-muted hover:text-trackly-text bg-blue-50"
              }
            `}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
