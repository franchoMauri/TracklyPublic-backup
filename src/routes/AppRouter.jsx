import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import AuthGate from "../components/AuthGate";
import Admin from "../pages/Admin";
import Dashboard from "../pages/Dashboard";
import AddHours from "../pages/AddHours";
import MyRecords from "../pages/MyRecords";
import Reports from "../pages/Reports";
import Login from "../pages/Login";
import ChooseName from "../pages/ChooseName";
import Profile from "../pages/Profile";

import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { listenAdminSettings } from "../services/adminSettingsService";

function PrivateRoute({ children }) {
  const { user, loading, needsOnboarding, profileLoaded } = useAuth();

  if (loading || !profileLoaded) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/choose-name" replace />;

  return children;
}

export default function AppRouter() {
  const { user, role, loading, needsOnboarding, profileLoaded } = useAuth();

  const [settings, setSettings] = useState(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setSettings(null);
      setSettingsLoaded(true);
      return;
    }

    const unsub = listenAdminSettings((data) => {
      setSettings(data);
      setSettingsLoaded(true);
    });

    return () => unsub?.();
  }, [user]);

  if (loading || (user && !profileLoaded) || (user && !settingsLoaded)) {
    return <div>Cargando…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ===== ROOT SIEMPRE DEFINIDA ===== */}
        <Route
          path="/"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          }
        />

        {/* ===== LOGIN ===== */}
        <Route path="/login" element={<Login />} />

        {/* ===== ONBOARDING ===== */}
        {user && needsOnboarding && (
          <Route path="/choose-name" element={<ChooseName />} />
        )}

        {/* ===== APP ===== */}
        {user && !needsOnboarding && (
          <Route element={<Layout />}>
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />

            <Route
              path="/add"
              element={
                <PrivateRoute>
                  <AddHours />
                </PrivateRoute>
              }
            />

            <Route
              path="/records"
              element={
                <PrivateRoute>
                  <MyRecords />
                </PrivateRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />

            {settings?.featureReports && (
              <Route
                path="/reports"
                element={
                  <PrivateRoute>
                    <Reports />
                  </PrivateRoute>
                }
              />
            )}

            {role === "admin" && (
              <Route
                path="/admin"
                element={
                  <PrivateRoute>
                    <Admin />
                  </PrivateRoute>
                }
              />
            )}
          </Route>
        )}

        {/* ===== FALLBACK GLOBAL ===== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
