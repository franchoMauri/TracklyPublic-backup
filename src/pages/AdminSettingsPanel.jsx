import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";

export default function AdminSettingsPanel({ onClose }) {
  const [section, setSection] = useState("projects");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">
              Configuración del sistema
            </h2>
            <p className="text-sm text-gray-500">
              Administración general de Trackly
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:underline"
          >
            Cerrar
          </button>
        </div>

        {/* BODY */}
        <div className="flex flex-1 overflow-hidden">
          {/* SIDEBAR */}
          <aside className="w-56 border-r bg-gray-50 p-4 space-y-1">
            <button
              onClick={() => setSection("projects")}
              className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                section === "projects"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Proyectos
            </button>

            <button
              disabled
              className="w-full text-left px-3 py-2 rounded text-sm text-gray-400"
            >
              Tipos de tarea (próx.)
            </button>

            <button
              disabled
              className="w-full text-left px-3 py-2 rounded text-sm text-gray-400"
            >
              Tareas (próx.)
            </button>
          </aside>

          {/* CONTENT */}
          <main className="flex-1 p-6 overflow-y-auto">
            {section === "projects" && <ProjectsSection />}
          </main>
        </div>
      </div>
    </div>
  );
}

/* =============================
   PROYECTOS
============================= */

function ProjectsSection() {
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  /* 🔴 REALTIME PROJECTS */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "projects"),
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setProjects(
          data.sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    );

    return () => unsub();
  }, []);

  /* ➕ CREATE / ✏️ EDIT */
  const saveProject = async () => {
    if (!editing?.name?.trim()) return;

    setSaving(true);

    try {
      if (editing.id) {
        await updateDoc(doc(db, "projects", editing.id), {
          name: editing.name.trim(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "projects"), {
          name: editing.name.trim(),
          active: true,
          createdAt: serverTimestamp(),
        });
      }

      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  /* 🔄 TOGGLE ACTIVE */
  const toggleActive = async (p) => {
    await updateDoc(doc(db, "projects", p.id), {
      active: !p.active,
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Proyectos</h3>
          <p className="text-sm text-gray-500">
            Gestioná los proyectos disponibles
          </p>
        </div>

        <button
          onClick={() => setEditing({ name: "" })}
          title="Crear nuevo proyecto"
          className="
            w-9 h-9
            flex items-center justify-center
            rounded-full
            border border-gray-300
            text-gray-600
            hover:bg-gray-100
            transition
          "
        >
          +
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">{p.name}</td>

                <td className="px-4 py-3">
                  {p.active ? (
                    <span className="text-green-600 text-xs font-medium">
                      Activo
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">
                      Inactivo
                    </span>
                  )}
                </td>

                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() =>
                      setEditing({ id: p.id, name: p.name })
                    }
                    className="text-blue-600 text-xs hover:underline"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => toggleActive(p)}
                    className="text-xs text-gray-600 hover:underline"
                  >
                    {p.active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}

            {projects.length === 0 && (
              <tr className="border-t text-gray-400">
                <td className="px-4 py-3" colSpan={3}>
                  No hay proyectos cargados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
            <h4 className="font-semibold">
              {editing.id ? "Editar proyecto" : "Nuevo proyecto"}
            </h4>

            <input
              type="text"
              value={editing.name}
              onChange={(e) =>
                setEditing({ ...editing, name: e.target.value })
              }
              placeholder="Nombre del proyecto"
              className="input w-full"
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setEditing(null)}
                className="text-sm text-gray-500"
              >
                Cancelar
              </button>

              <button
                onClick={saveProject}
                disabled={saving}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
              >
                {editing.id ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
