import { useEffect, useState } from "react";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useWorkItemStatuses } from "../../hooks/useWorkItemStatuses";
import { useAuth } from "../../context/AuthContext";

export default function WorkItemModal({ item, onClose }) {
  const { user } = useAuth();
  const isNew = !!item.__isNew;

  /* 🔑 estados desde Firestore */
  const statuses = useWorkItemStatuses();

  /* 🔑 proyectos */
  const [projects, setProjects] = useState([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "",
    priority: "medium",
    projectId: "",
    projectName: "",
  });

  const [saving, setSaving] = useState(false);

  /* =============================
     LOAD PROJECTS
  ============================= */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "projects"),
      (snap) => {
        setProjects(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      }
    );
    return () => unsub();
  }, []);

  /* =============================
     INIT / SYNC ITEM
  ============================= */
  useEffect(() => {
    setForm({
      title: item.title || "",
      description: item.description || "",
      status: item.status || statuses[0]?.key || "",
      priority: item.priority || "medium",
      projectId: item.projectId || "",
      projectName: item.projectName || "",
    });
  }, [item, statuses]);

  /* =============================
     HANDLERS
  ============================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProjectChange = (e) => {
    const p = projects.find((x) => x.id === e.target.value);
    setForm((prev) => ({
      ...prev,
      projectId: p?.id || "",
      projectName: p?.name || "",
    }));
  };

  const save = async () => {
    if (!form.title || !form.status) return;

    try {
      setSaving(true);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        projectId: form.projectId || "",
        projectName: form.projectName || "",
        updatedAt: serverTimestamp(),
      };

      if (isNew) {
        // 🆕 CREATE
        await addDoc(collection(db, "workItems"), {
          ...payload,
          active: true,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          createdByName: user.displayName || user.email,
        });
      } else {
        // ✏️ UPDATE
        await updateDoc(doc(db, "workItems", item.id), payload);
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  /* =============================
     RENDER
  ============================= */
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-md border border-trackly-border shadow-lg">
        {/* HEADER */}
        <div className="px-4 py-3 border-b border-trackly-border">
          <h3 className="text-sm font-semibold">
            {isNew ? "Nuevo Work Item" : "Editar Work Item"}
          </h3>
        </div>

        {/* BODY */}
        <div className="px-4 py-4 space-y-3 text-sm">
          {/* TITLE */}
          <div className="space-y-1">
            <label className="text-xs text-trackly-muted">
              Título
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full border-b border-trackly-border px-1 py-1 focus:outline-none focus:border-trackly-primary"
              autoFocus
            />
          </div>

          {/* PROJECT */}
          <div className="space-y-1">
            <label className="text-xs text-trackly-muted">
              Proyecto
            </label>
            <select
              value={form.projectId}
              onChange={handleProjectChange}
              className="w-full border-b border-trackly-border px-1 py-1 bg-transparent focus:outline-none focus:border-trackly-primary"
            >
              <option value="">Sin proyecto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-1">
            <label className="text-xs text-trackly-muted">
              Descripción
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              className="w-full border-b border-trackly-border px-1 py-1 resize-none focus:outline-none focus:border-trackly-primary"
            />
          </div>

          {/* STATUS */}
          <div className="space-y-1">
            <label className="text-xs text-trackly-muted">
              Estado
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border-b border-trackly-border px-1 py-1 bg-transparent focus:outline-none focus:border-trackly-primary"
            >
              {statuses.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* PRIORITY */}
          <div className="space-y-1">
            <label className="text-xs text-trackly-muted">
              Prioridad
            </label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full border-b border-trackly-border px-1 py-1 bg-transparent focus:outline-none focus:border-trackly-primary"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-4 py-3 border-t border-trackly-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-trackly-muted hover:underline"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving || !form.title}
            className="text-xs font-medium text-trackly-primary hover:underline disabled:opacity-40"
          >
            {isNew ? "Crear" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
