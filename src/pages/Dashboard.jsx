import { useState } from "react";
import DashboardTabs from "../components/Dashboard/DashboardTabs";
import HoursDashboard from "../components/Dashboard/HoursDashboard";
import KanbanDashboard from "../components/Dashboard/KanbanDashboard";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("hours");

  return (
    <div className="trackly-container space-y-4">
      <DashboardTabs
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "hours" && <HoursDashboard />}
      {activeTab === "kanban" && <KanbanDashboard />}
    </div>
  );
}
