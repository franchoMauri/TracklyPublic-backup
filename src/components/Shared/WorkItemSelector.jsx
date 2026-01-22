import { useMemo, useState } from "react";

export default function WorkItemSelector({
  enabled = true,
  workItems = [],
  value,
  onChange,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => workItems.find((w) => w.id === value),
    [value, workItems]
  );

  const filtered = useMemo(() => {
    if (!query) return workItems;
    return workItems.filter((w) =>
      w.title.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, workItems]);

  if (!enabled) {
    return (
      <input
        disabled
        className="trackly-input opacity-50"
        placeholder="Tareas deshabilitadas"
      />
    );
  }

  return (
    <div className="relative">
      <input
        className="trackly-input"
        placeholder="Buscar tarea..."
        value={selected?.title || query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />

      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-trackly-border rounded shadow max-h-56 overflow-y-auto">
          {filtered.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => {
                onChange?.(w);
                setQuery("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-trackly-bg"
            >
              {w.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
