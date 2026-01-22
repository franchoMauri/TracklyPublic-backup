import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

import AssignUserPopover from "./AssignUserPopover";

export default function WorkItemCard({
  item,
  onEdit,
  onPreview,
}) {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [showAssign, setShowAssign] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const avatarRef = useRef(null);
  const confirmRef = useRef(null);

  /* =============================
     DND
  ============================= */
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: item.id,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  /* =============================
     DELETE
  ============================= */
  const handleDelete = async (e) => {
    e.stopPropagation();
    await deleteDoc(doc(db, "workItems", item.id));
  };

  /* =============================
     PREVIEW
  ============================= */
  const openPreview = () => {
    if (!isDragging) {
      onPreview?.(item);
    }
  };

  return (
    <div onClick={openPreview} className="select-none">
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className="
          group relative
          border border-trackly-border bg-white p-3
          hover:shadow-sm transition
          overflow-hidden
        "
      >
        {/* HEADER */}
        <div className="flex justify-between items-start mb-1">
          {/* TITLE (DRAG HANDLE) */}
          <div
            {...listeners}
            className="
              flex items-center gap-2
              text-sm font-medium cursor-grab
              min-w-0
            "
          >
            <span className="truncate">{item.title}</span>

            {/* ✏️ EDIT */}
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(item);
                }}
                className="
                  opacity-0 group-hover:opacity-100
                  transition
                  text-trackly-muted hover:text-trackly-primary
                  text-xs
                "
                title="Editar"
              >
                ✏️
              </button>
            )}
          </div>

          {/* 🗑️ DELETE */}
          {isAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="text-trackly-muted hover:text-red-600 text-xs"
                title="Eliminar"
              >
                🗑️
              </button>

              {confirmDelete && (
                <div
                  ref={confirmRef}
                  onClick={(e) => e.stopPropagation()}
                  className="
                    absolute right-0 top-5 z-10
                    bg-white border border-trackly-border
                    rounded shadow-sm
                    text-xs px-2 py-1
                    flex items-center gap-2
                  "
                >
                  <span>Eliminar este item?</span>
                  <button
                    onClick={handleDelete}
                    className="text-red-600 hover:underline"
                  >
                    Sí
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-trackly-muted hover:underline"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PROJECT BADGE */}
        {item.projectName && (
          <div className="mb-1">
            <span
              className="
                inline-block
                text-[10px]
                px-2 py-0.5
                rounded-full
                bg-trackly-bg
                text-trackly-muted
                truncate
                max-w-full
              "
              title={item.projectName}
            >
              {item.projectName}
            </span>
          </div>
        )}

        {/* FOOTER */}
        <div className="flex justify-between items-center mt-3">
          {/* PRIORITY */}
          <span
            className={
              item.priority === "high"
                ? "text-red-600"
                : item.priority === "medium"
                ? "text-yellow-600"
                : "text-green-600"
            }
            title={`Prioridad: ${item.priority}`}
          >
            {item.priority === "high"
              ? "▲"
              : item.priority === "medium"
              ? "▶"
              : "▼"}
          </span>

          {/* ASSIGNED */}
          <button
            ref={avatarRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAssign(true);
            }}
            title={
              item.assignedToName
                ? `Asignado a ${item.assignedToName}`
                : "Asignar usuario"
            }
            className="
              w-6 h-6 rounded-full
              bg-trackly-bg text-xs
              flex items-center justify-center
              hover:bg-gray-200
            "
          >
            {item.assignedToName
              ? item.assignedToName[0].toUpperCase()
              : "+"}
          </button>
        </div>

        {/* ASSIGN POPOVER */}
        {showAssign &&
          avatarRef.current &&
          createPortal(
            <AssignUserPopover
              anchorRef={avatarRef}
              item={item}
              onClose={() => setShowAssign(false)}
            />,
            document.body
          )}
      </div>
    </div>
  );
}
