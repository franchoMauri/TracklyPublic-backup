import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import WorkItemCard from "./WorkItemCard";

export default function WorkItemColumn({
  title,
  status,
  items,
  onSelect,
  onPreview,
}) {
  const [hover, setHover] = useState(false);

  /* =============================
     DND – DROPPABLE
  ============================= */
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  /* =============================
     CREATE
  ============================= */
  const handleCreate = () => {
    onSelect({
      __isNew: true,
      title: "",
      description: "",
      status,
      priority: "medium",
    });
  };

  return (
    <div
      className="flex flex-col gap-2"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* COLUMN */}
      <div
        ref={setNodeRef}
        className={`
          trackly-card
          p-2 flex flex-col max-h-[70vh]
          rounded
          transition-colors duration-200
          ${hover ? "bg-sky-50" : ""}
          ${isOver ? "ring-2 ring-trackly-primary" : ""}
        `}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold uppercase">
            {title}
          </h3>
          <span className="text-xs text-trackly-muted">
            {items.length}
          </span>
        </div>

        {/* LIST */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {items.length === 0 ? (
            <p className="text-xs text-trackly-muted text-center py-4">
              Sin items
            </p>
          ) : (
            items.map((item) => (
              <WorkItemCard
                key={item.id}
                item={item}
                onEdit={onSelect}
                onPreview={onPreview}
              />
            ))
          )}
        </div>
      </div>

      {/* CREATE — habilitado para TODOS */}
      {hover && (
        <button
          type="button"
          onClick={handleCreate}
          className="
            text-xs py-1
            rounded-sm
            border border-dashed border-trackly-border
            text-trackly-muted
            hover:text-trackly-primary
            hover:border-trackly-primary
            transition
          "
        >
          + Crear
        </button>
      )}
    </div>
  );
}
