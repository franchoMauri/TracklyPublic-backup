import { useState } from "react";
import AdminProjectsPanel from "./AdminProjectsPanel";
import AdminTasksPanel from "./AdminTasksPanel";
import AdminWorkItemPanel from "./AdminWorkItemPanel";
import AdminWorkItemStatusesPanel from "./AdminWorkItemStatusesPanel";

export default function AdminManagementPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState("projects");

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="trackly-card w-full max-w-6xl h-[85vh] flex flex-col shadow-xl">
        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-trackly-border">
          <div>
            <h2 className="trackly-h2">Gestión</h2>
            <p className="text-xs text-trackly-muted">
              Proyectos, tareas y work items
            </p>
          </div>

          <button
            onClick={onClose}
            className="trackly-btn trackly-btn-secondary"
          >
            Cerrar
          </button>
        </div>

        {/* ================= TABS ================= */}
        <div className="flex gap-1 px-6 pt-3 border-b border-trackly-border">
          <TabButton
            active={activeTab === "projects"}
            onClick={() => setActiveTab("projects")}
          >
            Proyectos
          </TabButton>

          <TabButton
            active={activeTab === "tasks"}
            onClick={() => setActiveTab("tasks")}
          >
            Tareas y Tipos
          </TabButton>

          <TabButton
            active={activeTab === "workItems"}
            onClick={() => setActiveTab("workItems")}
          >
            Work Items
          </TabButton>

          <TabButton
            active={activeTab === "statuses"}
            onClick={() => setActiveTab("statuses")}
          >
            Estados
          </TabButton>
        </div>

        {/* ================= CONTENT ================= */}
        <div className="flex-1 overflow-y-auto p-6 bg-trackly-bg">
          {activeTab === "projects" && <AdminProjectsPanel embedded />}
          {activeTab === "tasks" && <AdminTasksPanel embedded />}
          {activeTab === "workItems" && <AdminWorkItemPanel embedded />}

          {/* 🔐 IMPORTANTE: lazy mount real */}
          {activeTab === "statuses" ? (
            <AdminWorkItemStatusesPanel embedded />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* =============================
   TAB BUTTON – TRACKLY STYLE
============================= */
function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm transition
        border-b-2
        ${
          active
            ? "border-trackly-primary text-trackly-primary font-medium"
            : "border-transparent text-trackly-muted hover:text-trackly-text"
        }
      `}
    >
      {children}
    </button>
  );
}
