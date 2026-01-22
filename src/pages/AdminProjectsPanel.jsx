import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import InlineToast from "../components/ui/InlineToast";

export default function AdminProjectsPanel({ onClose, embedded = false }) {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({
    message: "",
    type: "success",
  });

  /* =============================
     REALTIME PROJECTS
  ============================= */
  useEffect(() => {
    const q = query(
      collection(db, "projects"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setProjects(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* =============================
     HANDLERS
  ============================= */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm({ name: "", code: "", description: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSaving(true);

      if (editingId) {
        await updateDoc(doc(db, "projects", editingId), {
          name: form.name.trim(),
          code: form.code.trim(),
          description: form.description.trim(),
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });

        setToast({
          message: "Proyecto actualizado correctamente",
          type: "success",
        });
      } else {
        await addDoc(collection(db, "projects"), {
          name: form.name.trim(),
          code: form.code.trim(),
          description: form.description.trim(),
          active: true,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });

        setToast({
          message: "Proyecto creado correctamente",
          type: "success",
        });
      }

      resetForm();
    } catch {
      setToast({
        message: "Error al guardar el proyecto",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (project) => {
    try {
      await updateDoc(doc(db, "projects", project.id), {
        active: !project.active,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    } catch {
      setToast({
        message: "Error al actualizar estado",
        type: "error",
      });
    }
  };

  const handleEdit = (project) => {
    setEditingId(project.id);
    setForm({
      name: project.name || "",
      code: project.code || "",
      description: project.description || "",
    });
  };

  /* =============================
     CONTENT
  ============================= */
  const content = (
    <>
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="trackly-h2">Proyectos</h2>
            <p className="text-xs text-trackly-muted">
              Gestión de proyectos del sistema
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

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-4 gap-3"
      >
        <input
          name="name"
          placeholder="Nombre del proyecto"
          value={form.name}
          onChange={handleChange}
          className="trackly-input md:col-span-2"
          required
        />

        <input
          name="code"
          placeholder="Código"
          value={form.code}
          onChange={handleChange}
          className="trackly-input"
        />

        <button
          type="submit"
          disabled={saving}
          className="trackly-btn trackly-btn-primary"
        >
          {editingId ? "Actualizar" : "Agregar"}
        </button>

        <textarea
          name="description"
          placeholder="Descripción (opcional)"
          value={form.description}
          onChange={handleChange}
          className="trackly-input md:col-span-4"
          rows={2}
        />
      </form>

      {/* LIST */}
      <div className="border border-trackly-border rounded-trackly overflow-hidden">
        <table className="trackly-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Código</th>
              <th>Estado</th>
              <th className="w-32">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center text-trackly-muted py-4">
                  Cargando proyectos…
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-trackly-muted py-4">
                  No hay proyectos creados
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="font-medium">{p.name}</div>
                    {p.description && (
                      <div className="text-[11px] text-trackly-muted">
                        {p.description}
                      </div>
                    )}
                  </td>

                  <td>{p.code || "—"}</td>

                  <td>
                    {p.active ? (
                      <span className="text-green-600 font-medium">
                        Activo
                      </span>
                    ) : (
                      <span className="text-trackly-muted">
                        Inactivo
                      </span>
                    )}
                  </td>

                  <td className="flex gap-3">
                    <button
                      onClick={() => handleEdit(p)}
                      className="text-trackly-primary hover:underline"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => toggleActive(p)}
                      className="text-xs hover:underline"
                    >
                      {p.active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InlineToast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </>
  );

  /* =============================
     FINAL RENDER
  ============================= */
  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="trackly-card w-full max-w-4xl p-6 space-y-6 shadow-xl">
        {content}
      </div>
    </div>
  );
}
