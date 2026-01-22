import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import InlineToast from "../components/ui/InlineToast";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* =============================
   SORTABLE STATUS CARD
============================= */
function SortableStatusCard({
  status,
  index,
  isOpen,
  onOpen,
  onClose,
  onEdit,
  onToggle,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        className={`trackly-card px-3 py-2 flex items-center gap-2 ${
          !status.active ? "opacity-60" : ""
        }`}
      >
        {/* DRAG */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-trackly-muted select-none"
        >
          ⠿
        </span>

        {/* LABEL */}
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 text-left truncate text-sm font-medium hover:underline"
        >
          {index + 1}. {status.label}
        </button>
      </div>

      {/* TOOLTIP */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-44 bg-white border border-trackly-border rounded-trackly shadow-lg text-xs">
          <button
            type="button"
            onClick={() => {
              onEdit(status);
              onClose();
            }}
            className="w-full px-3 py-2 text-left hover:bg-trackly-bg"
          >
            ✏️ Editar
          </button>

          <button
            type="button"
            onClick={() => {
              onToggle(status);
              onClose();
            }}
            className="w-full px-3 py-2 text-left hover:bg-trackly-bg"
          >
            {status.active ? "⛔ Desactivar" : "✅ Activar"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full px-3 py-2 text-left text-trackly-muted hover:bg-trackly-bg"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

/* =============================
   PANEL
============================= */
export default function AdminWorkItemStatusesPanel({ embedded = false }) {
  const { user } = useAuth();

  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ key: "", label: "" });
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "success" });

  /* =============================
     REALTIME
  ============================= */
  useEffect(() => {
    const q = query(
      collection(db, "workItemStatuses"),
      orderBy("order", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setStatuses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* =============================
     SAVE (CREATE / UPDATE)
  ============================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.key || !form.label) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "workItemStatuses", editingId), {
          label: form.label.trim(),
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
        setToast({ message: "Estado actualizado", type: "success" });
      } else {
        const key = form.key.trim().toLowerCase();
        if (statuses.some((s) => s.key === key)) {
          setToast({ message: "Key duplicada", type: "error" });
          return;
        }

        const order =
          statuses.length > 0
            ? Math.max(...statuses.map((s) => s.order ?? 0)) + 1
            : 0;

        await addDoc(collection(db, "workItemStatuses"), {
          key,
          label: form.label.trim(),
          order,
          active: true,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });

        setToast({ message: "Estado creado", type: "success" });
      }

      setForm({ key: "", label: "" });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (status) => {
    await updateDoc(doc(db, "workItemStatuses", status.id), {
      active: !status.active,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
  };

  /* =============================
     DND
  ============================= */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const oldIndex = statuses.findIndex((s) => s.id === active.id);
    const newIndex = statuses.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(statuses, oldIndex, newIndex);
    setStatuses(reordered);

    const batch = writeBatch(db);
    reordered.forEach((s, idx) => {
      batch.update(doc(db, "workItemStatuses", s.id), { order: idx });
    });
    await batch.commit();
  };

  /* =============================
     RENDER
  ============================= */
  return (
    <div className={embedded ? "space-y-6" : "trackly-card p-6 space-y-6"}>
      <div>
        <h3 className="trackly-h2 uppercase">Estados de Work Items</h3>
        <p className="text-xs text-trackly-muted">
          Click para acciones · Arrastrar para ordenar
        </p>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <input
          className="trackly-input"
          placeholder="key"
          value={form.key}
          disabled={!!editingId}
          onChange={(e) => setForm({ ...form, key: e.target.value })}
        />
        <input
          className="trackly-input md:col-span-2"
          placeholder="Etiqueta"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="trackly-btn trackly-btn-primary"
          >
            {editingId ? "Guardar" : "Agregar"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ key: "", label: "" });
              }}
              className="trackly-btn trackly-btn-secondary"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* LIST */}
      {loading ? (
        <p className="text-sm text-trackly-muted">Cargando…</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={statuses.map((s) => s.id)}
            strategy={rectSortingStrategy}
          >
            <div className="flex flex-wrap gap-3">
              {statuses.map((status, idx) => (
                <SortableStatusCard
                  key={status.id}
                  status={status}
                  index={idx}
                  isOpen={openMenuId === status.id}
                  onOpen={() =>
                    setOpenMenuId((id) =>
                      id === status.id ? null : status.id
                    )
                  }
                  onClose={() => setOpenMenuId(null)}
                  onToggle={toggleActive}
                  onEdit={(s) => {
                    setEditingId(s.id);
                    setForm({ key: s.key, label: s.label });
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <InlineToast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </div>
  );
}
