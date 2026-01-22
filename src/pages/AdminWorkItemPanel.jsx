import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import InlineToast from "../components/ui/InlineToast";
import { useWorkItemStatuses } from "../hooks/useWorkItemStatuses";

export default function AdminWorkItemPanel({ embedded = false, onClose }) {
  const { user } = useAuth();

  /* 🔑 estados desde Firestore */
  const statuses = useWorkItemStatuses();

  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    projectId: "",
    projectName: "",
    assignedTo: "",
    assignedToName: "",
    priority: "medium",
    status: "todo",
    estimateHours: "",
  });

  const [toast, setToast] = useState({
    message: "",
    type: "success",
  });

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "workItems"), orderBy("createdAt", "desc")),
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => !u.disabled && !u.deleted)
      );
    });

    const unsubProjects = onSnapshot(collection(db, "projects"), (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubUsers();
      unsubProjects();
    };
  }, []);

  /* ================= HANDLERS ================= */

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleProjectChange = (e) => {
    const p = projects.find((x) => x.id === e.target.value);
    setForm({
      ...form,
      projectId: p?.id || "",
      projectName: p?.name || "",
    });
  };

  const handleUserChange = (e) => {
    const u = users.find((x) => x.id === e.target.value);
    setForm({
      ...form,
      assignedTo: u?.id || "",
      assignedToName: u?.name || "",
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      projectId: "",
      projectName: "",
      assignedTo: "",
      assignedToName: "",
      priority: "medium",
      status: "todo",
      estimateHours: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.projectId) return;

    try {
      setSaving(true);

      const payload = {
        ...form,
        estimateHours: form.estimateHours
          ? Number(form.estimateHours)
          : null,
        actualHours: 0,
        active: true,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };

      if (editingId) {
        await updateDoc(doc(db, "workItems", editingId), payload);
        setToast({
          message: "Work Item actualizado",
          type: "success",
        });
      } else {
        await addDoc(collection(db, "workItems"), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });
        setToast({
          message: "Work Item creado",
          type: "success",
        });
      }

      resetForm();
    } catch {
      setToast({
        message: "Error al guardar",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description || "",
      projectId: item.projectId,
      projectName: item.projectName,
      assignedTo: item.assignedTo || "",
      assignedToName: item.assignedToName || "",
      priority: item.priority,
      status: item.status, // 🔑 key
      estimateHours: item.estimateHours || "",
    });
  };

  const getStatusLabel = (statusKey) =>
    statuses.find((s) => s.key === statusKey)?.label ||
    statusKey;

  /* ================= CONTENT ================= */

  const content = (
    <>
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="trackly-h2">Work Items</h2>
            <p className="text-xs text-trackly-muted">
              Gestión de unidades de trabajo
            </p>
          </div>

          <button
            onClick={onClose}
            className="trackly-btn trackly-btn-secondary"
          >
            Cerrar
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-6 gap-3"
      >
        <input
          name="title"
          placeholder="Título"
          value={form.title}
          onChange={handleChange}
          className="trackly-input md:col-span-3"
          required
        />

        <select
          value={form.projectId}
          onChange={handleProjectChange}
          className="trackly-input md:col-span-3"
          required
        >
          <option value="">Proyecto</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={form.assignedTo}
          onChange={handleUserChange}
          className="trackly-input md:col-span-2"
        >
          <option value="">Sin asignar</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.email}
            </option>
          ))}
        </select>

        <select
          name="priority"
          value={form.priority}
          onChange={handleChange}
          className="trackly-input md:col-span-2"
        >
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
        </select>

        {/* 🔑 STATUS FROM FIRESTORE */}
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="trackly-input md:col-span-2"
        >
          {statuses.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Descripción"
          className="trackly-input md:col-span-6"
          rows={2}
        />

        <input
          name="estimateHours"
          value={form.estimateHours}
          onChange={handleChange}
          type="number"
          step="0.5"
          placeholder="Estimación (hs)"
          className="trackly-input md:col-span-2"
        />

        <button
          disabled={saving}
          className="trackly-btn trackly-btn-primary md:col-span-2"
        >
          {editingId ? "Actualizar" : "Crear"}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="trackly-btn trackly-btn-secondary md:col-span-2"
          >
            Cancelar
          </button>
        )}
      </form>

      <div className="border border-trackly-border rounded-trackly overflow-hidden">
        <table className="trackly-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Proyecto</th>
              <th>Asignado</th>
              <th>Estado</th>
              <th className="w-24">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td className="font-medium">{i.title}</td>
                <td>{i.projectName}</td>
                <td>{i.assignedToName || "—"}</td>
                <td>{getStatusLabel(i.status)}</td>
                <td>
                  <button
                    onClick={() => handleEdit(i)}
                    className="text-trackly-primary hover:underline"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InlineToast
        message={toast.message}
        type={toast.type}
        onClose={() =>
          setToast({ message: "", type: "success" })
        }
      />
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="trackly-card w-full max-w-6xl p-6 space-y-6 shadow-xl">
        {content}
      </div>
    </div>
  );
}
