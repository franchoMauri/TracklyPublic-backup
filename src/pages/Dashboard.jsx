import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import DashboardTabs from "../components/Dashboard/DashboardTabs";
import HoursDashboard from "../components/Dashboard/HoursDashboard";
import KanbanDashboard from "../components/Dashboard/KanbanDashboard";

export default function Dashboard() {
  const { settings } = useAuth();

  /* =============================
     TABS DISPONIBLES SEGÚN MODO
  ============================= */
  const availableTabs = useMemo(() => {
    if (!settings) return [];

    switch (settings.mode) {
      case "ONLY_HOURLY":
        return ["hours"];

      case "FULL":
        return ["hours", "kanban"];

      default:
        return [];
    }
  }, [settings]);

  /* =============================
     TAB ACTIVO
  ============================= */
  const [activeTab, setActiveTab] = useState(null);

  /* =============================
     AJUSTE AUTOMÁTICO SI CAMBIA EL MODO
  ============================= */
  useEffect(() => {
    if (!availableTabs.length) {
      setActiveTab(null);
      return;
    }

    if (!activeTab || !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  if (!availableTabs.length || !activeTab) {
    return null;
  }

  return (
    <div className="trackly-container space-y-4">
      <DashboardTabs
        active={activeTab}
        onChange={setActiveTab}
        availableTabs={availableTabs}
      />

      {activeTab === "hours" && <HoursDashboard />}
      {activeTab === "kanban" && <KanbanDashboard />}
    </div>
  );
}
