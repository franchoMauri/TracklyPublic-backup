import { useMemo, useState } from "react";

export default function WorkItemComboTest({
  workItems = [],
  value,
  onChange,
  placeholder = "Buscar Work Item…",
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

  return (
    <select
      className="trackly-input"
      value={value || ""}
      onChange={(e) => {
        const wi = workItems.find(
          (w) => w.id === e.target.value
        );
        onChange?.(wi || null);
      }}
    >
      <option value="">— Seleccionar tarea —</option>
      {workItems.map((w) => (
        <option key={w.id} value={w.id}>
          {w.title}
        </option>
      ))}
    </select>
  );
}
