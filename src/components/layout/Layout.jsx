import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import ProfileModal from "../profile/ProfileModal";

export default function Layout() {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-trackly-bg">
      <Sidebar onOpenProfile={() => setProfileOpen(true)} />

      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 px-6">
          <Outlet />
        </main>
      </div>

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
}
