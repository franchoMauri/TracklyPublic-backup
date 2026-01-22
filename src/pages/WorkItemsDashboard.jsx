import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";

import WorkItemsKanban from "../components/workItems/WorkItemsKanban";
import WorkItemsBacklog from "../components/workItems/WorkItemsBacklog";

export default function WorkItemsDashboard() {
  const [items, setItems] = useState([]);
  const [view, setView] = useState("kanban"); // kanban | backlog

  useEffect(() => {
    const q = query(
      collection(db, "workItems"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snap) => {
      setItems(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((i) => i.active)
      );
    });
  }, []);

  const [filters, setFilters] = useState({
  project: "",
  assignedTo: "",
  priority: "",
});

const filteredItems = items.filter((i) => {
  if (filters.project && i.projectId !== filters.project) return false;
  if (filters.assignedTo && i.assignedTo !== filters.assignedTo) return false;
  if (filters.priority && i.priority !== filters.priority) return false;
  return true;
});


  return (
    <div className="trackly-container space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="trackly-h2">Work Items</h2>

        <div className="flex gap-2">
          <button
            onClick={() => setView("kanban")}
            className={`trackly-btn ${
              view === "kanban"
                ? "trackly-btn-primary"
                : "trackly-btn-secondary"
            }`}
          >
            Kanban
          </button>

          <button
            onClick={() => setView("backlog")}
            className={`trackly-btn ${
              view === "backlog"
                ? "trackly-btn-primary"
                : "trackly-btn-secondary"
            }`}
          >
            Backlog
          </button>
        </div>
      </div>

      {/* CONTENT */}
      {view === "kanban" ? (
        <WorkItemsKanban items={items} />
      ) : (
        <WorkItemsBacklog items={items} />
      )}
      <div className="flex gap-2 flex-wrap">
  <select
    className="trackly-input"
    onChange={(e) =>
      setFilters((f) => ({ ...f, project: e.target.value }))
    }
  >
    <option value="">Todos los proyectos</option>
    {projects.map((p) => (
      <option key={p.id} value={p.id}>
        {p.name}
      </option>
    ))}
  </select>

  <select
    className="trackly-input"
    onChange={(e) =>
      setFilters((f) => ({ ...f, assignedTo: e.target.value }))
    }
  >
    <option value="">Todos los asignados</option>
    {users.map((u) => (
      <option key={u.id} value={u.id}>
        {u.name}
      </option>
    ))}
  </select>

  <select
    className="trackly-input"
    onChange={(e) =>
      setFilters((f) => ({ ...f, priority: e.target.value }))
    }
  >
    <option value="">Todas las prioridades</option>
    <option value="high">Alta</option>
    <option value="medium">Media</option>
    <option value="low">Baja</option>
  </select>
</div>

    </div>
    
  );
}
