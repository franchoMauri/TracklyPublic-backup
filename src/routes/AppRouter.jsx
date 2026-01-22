import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Layout from "../components/layout/Layout";
import Admin from "../pages/Admin";
import Dashboard from "../pages/Dashboard";
import AddHours from "../pages/AddHours";
import MyRecords from "../pages/MyRecords";
import Reports from "../pages/Reports";
import Login from "../pages/Login";
import ChooseName from "../pages/ChooseName";
import Profile from "../pages/Profile";

import { useAuth } from "../context/AuthContext";
import { listenAdminSettings } from "../services/adminSettingsService";

export default function AppRouter() {
  const {
    user,
    role,
    loading,
    needsOnboarding,
    profileLoaded,
  } = useAuth();

  const [settings, setSettings] = useState(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // =============================
  // ADMIN SETTINGS (solo si hay user)
  // =============================
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

  // =============================
  // BLOQUEO GLOBAL HASTA ESTADO ESTABLE
  // =============================
  if (loading || (user && !profileLoaded) || (user && !settingsLoaded)) {
    return <div>Cargando…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* ================= ROOT ================= */}
        <Route
          path="/"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : needsOnboarding ? (
              <Navigate to="/choose-name" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* ================= LOGIN ================= */}
        <Route
          path="/login"
          element={
            !user ? (
              <Login />
            ) : needsOnboarding ? (
              <Navigate to="/choose-name" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* ================= ONBOARDING ================= */}
        <Route
          path="/choose-name"
          element={
            user && needsOnboarding ? (
              <ChooseName />
            ) : !user ? (
              <Navigate to="/login" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* ================= APP ================= */}
        <Route element={<Layout />}>
          <Route
            path="/dashboard"
            element={
              user && !needsOnboarding ? (
                <Dashboard />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/add"
            element={
              user && !needsOnboarding ? (
                <AddHours />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/records"
            element={
              user && !needsOnboarding ? (
                <MyRecords />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/profile"
            element={
              user && !needsOnboarding ? (
                <Profile />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {settings?.featureReports && (
            <Route
              path="/reports"
              element={
                user && !needsOnboarding ? (
                  <Reports />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          )}

          {role === "admin" && (
            <Route
              path="/admin"
              element={
                user && !needsOnboarding ? (
                  <Admin />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          )}
        </Route>

        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
