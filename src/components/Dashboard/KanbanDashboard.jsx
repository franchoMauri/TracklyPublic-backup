import { useEffect, useMemo, useState, useCallback } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import WorkItemsKanban from "../workItem/WorkItemsKanban";

export default function KanbanDashboard() {
  const [items, setItems] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [filters, setFilters] = useState({
    projectId: "",
    assignedTo: "",
    priority: "",
  });

  /* =============================
     REALTIME WORK ITEMS
  ============================= */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "workItems"), (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  /* =============================
     REALTIME STATUSES (DYNAMIC)
  ============================= */
  useEffect(() => {
    const q = query(
      collection(db, "workItemStatuses"),
      orderBy("order", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setStatuses(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.active && s.key)
      );
    });

    return () => unsub();
  }, []);

  /* =============================
     FILTERED ITEMS
  ============================= */
  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (filters.projectId && i.projectId !== filters.projectId)
        return false;
      if (filters.assignedTo && i.assignedTo !== filters.assignedTo)
        return false;
      if (filters.priority && i.priority !== filters.priority)
        return false;
      return true;
    });
  }, [items, filters]);

  /* =============================
     OPTIONS (DERIVED)
  ============================= */
  const projectOptions = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      if (i.projectId && !map.has(i.projectId)) {
        map.set(i.projectId, i.projectName || i.projectId);
      }
    });
    return Array.from(map.entries());
  }, [items]);

  const assignedOptions = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      if (i.assignedTo && !map.has(i.assignedTo)) {
        map.set(i.assignedTo, i.assignedToName || i.assignedTo);
      }
    });
    return Array.from(map.entries());
  }, [items]);

  /* =============================
     HANDLERS
  ============================= */
  const resetFilters = useCallback(() => {
    setFilters({
      projectId: "",
      assignedTo: "",
      priority: "",
    });
  }, []);

  /* =============================
     RENDER
  ============================= */
  return (
    <div className="space-y-6">

      {/* ================= FILTERS ================= */}
      <div className="trackly-card p-4 flex flex-wrap gap-4 items-end">
        {/* PROYECTO */}
        <div>
          <label className="trackly-label">Proyecto</label>
          <select
            className="trackly-input"
            value={filters.projectId}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                projectId: e.target.value,
              }))
            }
          >
            <option value="">Todos</option>
            {projectOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* ASIGNADO */}
        <div>
          <label className="trackly-label">Asignado</label>
          <select
            className="trackly-input"
            value={filters.assignedTo}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                assignedTo: e.target.value,
              }))
            }
          >
            <option value="">Todos</option>
            {assignedOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* PRIORIDAD */}
        <div>
          <label className="trackly-label">Prioridad</label>
          <select
            className="trackly-input"
            value={filters.priority}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                priority: e.target.value,
              }))
            }
          >
            <option value="">Todas</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>

        {/* RESET */}
        <button
          type="button"
          onClick={resetFilters}
          className="trackly-btn trackly-btn-secondary h-10"
        >
          Limpiar
        </button>
      </div>

      {/* ================= KANBAN ================= */}
      {statuses.length === 0 ? (
        <div className="trackly-card p-6 text-sm text-trackly-muted">
          No hay estados activos configurados para Work Items
        </div>
      ) : (
        <WorkItemsKanban
          items={filteredItems}
          statuses={statuses}
        />
      )}
    </div>
  );
}
