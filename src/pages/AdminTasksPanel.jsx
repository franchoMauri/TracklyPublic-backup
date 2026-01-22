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
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import InlineToast from "../components/ui/InlineToast";

export default function AdminTasksPanel({ onClose, embedded = false }) {
  const { user } = useAuth();

  /* =============================
     STATE
  ============================= */
  const [tasks, setTasks] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);

  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);

  const [newTaskName, setNewTaskName] = useState("");
  const [newTypeName, setNewTypeName] = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  /* =============================
     REALTIME – TASKS
  ============================= */
  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setTasks(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });
  }, []);

  /* =============================
     REALTIME – TASK TYPES
  ============================= */
  useEffect(() => {
    const q = query(collection(db, "taskTypes"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setTaskTypes(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });
  }, []);

  /* =============================
     HANDLERS
  ============================= */
  const handleSelectTask = (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    setSelectedTaskId(taskId);
    setSelectedTask(task || null);
  };

  const createTask = async () => {
    if (!newTaskName.trim()) return;

    try {
      setSaving(true);

      const ref = await addDoc(collection(db, "tasks"), {
        name: newTaskName.trim(),
        active: true,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      setNewTaskName("");
      handleSelectTask(ref.id);

      setToast({
        message: "Tarea creada correctamente",
        type: "success",
      });
    } catch {
      setToast({
        message: "Error al crear la tarea",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const createType = async () => {
    if (!newTypeName.trim() || !selectedTask) return;

    try {
      setSaving(true);

      await addDoc(collection(db, "taskTypes"), {
        name: newTypeName.trim(),
        taskId: selectedTask.id,
        taskName: selectedTask.name,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      setNewTypeName("");
      setToast({
        message: "Tipo creado correctamente",
        type: "success",
      });
    } catch {
      setToast({
        message: "Error al crear el tipo",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (col, item) => {
    try {
      await updateDoc(doc(db, col, item.id), {
        active: !item.active,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    } catch {
      setToast({
        message: "Error al actualizar el estado",
        type: "error",
      });
    }
  };

  const filteredTypes = taskTypes.filter(
    (t) => t.taskId === selectedTaskId
  );

  /* =============================
     CONTENT
  ============================= */
  const content = (
    <>
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="trackly-h2">Tareas y Tipos</h2>
            <p className="text-xs text-trackly-muted">
              Definí las tareas y sus tipos asociados
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

      <InlineToast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ================= TAREAS ================= */}
        <div className="trackly-card p-4 space-y-4">
          <h3 className="trackly-h2 text-sm">Tareas</h3>

          {/* SELECT TASK */}
          <div>
            <label className="trackly-label">Seleccionar tarea</label>
            <select
              value={selectedTaskId}
              onChange={(e) => handleSelectTask(e.target.value)}
              className="trackly-input"
            >
              <option value="">— Seleccionar —</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* CREATE TASK */}
          <div className="flex gap-2">
            <input
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="Nueva tarea"
              className="trackly-input flex-1"
            />
            <button
              onClick={createTask}
              disabled={saving}
              className="trackly-btn trackly-btn-primary"
            >
              +
            </button>
          </div>

          {/* TASK LIST */}
              <div className="max-h-64 overflow-y-auto border border-trackly-border rounded-trackly">
                <ul className="divide-y text-sm">
                  {tasks.map((t) => (
                    <li
                      key={t.id}
                      onClick={() => handleSelectTask(t.id)}
                      className={`
                        flex items-center justify-between
                        py-2 px-2 cursor-pointer
                        ${
                          selectedTaskId === t.id
                            ? "bg-trackly-primary/10"
                            : "hover:bg-gray-50"
                        }
                      `}
                    >
                      <span
                        className={
                          t.active
                            ? "font-medium"
                            : "text-trackly-muted line-through"
                        }
                      >
                        {t.name}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActive("tasks", t);
                        }}
                        className="text-xs text-trackly-primary hover:underline"
                      >
                        {t.active ? "Desactivar" : "Activar"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>


        {/* ================= TIPOS ================= */}
        <div className="trackly-card p-4 space-y-4">
          <h3 className="trackly-h2 text-sm">
            Tipos {selectedTask && `· ${selectedTask.name}`}
          </h3>

          {!selectedTask ? (
            <p className="text-xs text-trackly-muted">
              Seleccioná una tarea para gestionar sus tipos
            </p>
          ) : (
            <>
              {/* CREATE TYPE */}
              <div className="flex gap-2">
                <input
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Nuevo tipo"
                  className="trackly-input flex-1"
                />
                <button
                  onClick={createType}
                  disabled={saving}
                  className="trackly-btn trackly-btn-primary"
                >
                  +
                </button>
              </div>

              {/* TYPES LIST */}
              <ul className="divide-y text-sm">
                {filteredTypes.length === 0 && (
                  <li className="py-2 text-xs text-trackly-muted">
                    No hay tipos creados para esta tarea
                  </li>
                )}

                {filteredTypes.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between py-2"
                  >
                    <span
                      className={
                        t.active
                          ? "font-medium"
                          : "text-trackly-muted line-through"
                      }
                    >
                      {t.name}
                    </span>

                    <button
                      onClick={() => toggleActive("taskTypes", t)}
                      className="text-xs text-trackly-primary hover:underline"
                    >
                      {t.active ? "Desactivar" : "Activar"}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
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
      <div className="trackly-card w-full max-w-5xl p-6 space-y-6 shadow-xl">
        {content}
      </div>
    </div>
  );
}
