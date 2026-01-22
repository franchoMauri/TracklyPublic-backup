import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../services/firebase";

export default function TaskTypeSelector({
  taskId,
  taskTypeId,
  onChange,
}) {
  const [tasks, setTasks] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);

  /* ================= LOAD TASKS ================= */
  useEffect(() => {
    const q = query(collection(db, "tasks"));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((t) => t.active)
      );
    });

    return () => unsub();
  }, []);

  /* ================= LOAD TYPES BY TASK ================= */
  useEffect(() => {
    if (!taskId) {
      setTaskTypes([]);
      return;
    }

    const q = query(
      collection(db, "taskTypes"),
      where("taskId", "==", taskId)
    );

    const unsub = onSnapshot(q, (snap) => {
      setTaskTypes(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((t) => t.active)
      );
    });

    return () => unsub();
  }, [taskId]);

  return (
    <div className="space-y-3">
      {/* ===== TASK ===== */}
      <div>
        <label className="trackly-label">Tarea</label>
        <select
          value={taskId || ""}
          onChange={(e) =>
            onChange({
              taskId: e.target.value,
              taskTypeId: "",
            })
          }
          className="trackly-input"
        >
          <option value="">Seleccionar tarea</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* ===== TYPE (SIEMPRE VISIBLE) ===== */}
      <div>
        <label className="trackly-label">Tipo</label>
        <select
          value={taskTypeId || ""}
          disabled={!taskId}
          onChange={(e) =>
            onChange({
              taskId,
              taskTypeId: e.target.value,
            })
          }
          className="trackly-input disabled:opacity-50"
        >
          <option value="">
            {taskId
              ? "Seleccionar tipo"
              : "Seleccioná una tarea primero"}
          </option>

          {taskTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
