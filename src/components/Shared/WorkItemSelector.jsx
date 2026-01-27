import { useMemo, useState, useRef } from "react";

export default function WorkItemSelector({
  enabled = true,
  workItems = [],
  value,
  onChange,
  onCreate,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

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

  const showCreateOption =
    query.trim().length > 0 && filtered.length === 0;

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
    <div className="relative" ref={containerRef}>
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

      {open && (
        <div className="absolute z-[9999] mt-1 w-full bg-white border border-trackly-border rounded shadow max-h-56 overflow-y-auto">
          {filtered.map((w) => (
            <button
              key={w.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
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

          {showCreateOption && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onCreate?.(query.trim());
                setQuery("");
                setOpen(false);
              }}
              className="
                w-full text-left px-3 py-2 text-sm
                text-trackly-primary font-medium
                hover:bg-trackly-primary/10
              "
            >
              ➕ Crear nueva tarea “{query}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
