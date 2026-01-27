import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../services/firebase";
import {
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { ensureUserDocument } from "../services/usersService";
import { listenAdminSettings } from "../services/adminSettingsService";

const AuthContext = createContext();

/* ======================================================
   MODE → FEATURES
====================================================== */
function resolveFeaturesByMode(mode) {
  switch (mode) {
    case "HOURS_ONLY":
      return {
        manageHours: true,
        projects: false,
        tasks: false,
        workItems: false,
        jira: false,

        // ✅ FIX: informes activos en HOURS_ONLY
        reports: true,

        kanban: false,
      };

    case "PROJECTS":
      return {
        manageHours: false,
        projects: true,
        tasks: true,
        workItems: true,
        jira: false,
        reports: false,
        kanban: true,
      };

    case "FULL":
      return {
        manageHours: true,
        projects: true,
        tasks: true,
        workItems: true,
        jira: true,
        reports: true,
        kanban: true,
      };

    default:
      return {
        manageHours: false,
        projects: false,
        tasks: false,
        workItems: false,
        jira: false,
        reports: false,
        kanban: false,
      };
  }
}

/* ======================================================
   PROVIDER
====================================================== */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState("user");

  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  /**
   * settings = {
   *   mode: "HOURS_ONLY" | "PROJECTS" | "FULL",
   *   features: { ...derivadas },
   *   inactivityEnabled,
   *   inactivityHours,
   *   reminderEnabled,
   *   reminderDays
   * }
   */
  const [settings, setSettings] = useState(null);

  /* ================= AUTH ================= */
  useEffect(() => {
    setPersistence(auth, browserSessionPersistence).catch(() => {});

    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setAuthError("");

      /* ===== LOGOUT ===== */
      if (!currentUser) {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        setUser(null);
        setProfile(null);
        setRole("user");
        setNeedsOnboarding(false);
        setProfileLoaded(true);
        setLoading(false);
        return;
      }

      /* ===== LOGIN ===== */
      setLoading(true);
      setProfileLoaded(false);

      await ensureUserDocument(currentUser);

      const userRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userRef);

      // 🔒 Usuario deshabilitado
      if (snap.exists() && snap.data().disabled === true) {
        await signOut(auth);
        setAuthError("Cuenta deshabilitada. Contactarse con el administrador");
        setUser(null);
        setProfile(null);
        setRole("user");
        setNeedsOnboarding(false);
        setProfileLoaded(true);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      /* ===== PERFIL REALTIME ===== */
      unsubscribeProfile = onSnapshot(userRef, async (profileSnap) => {
        if (!profileSnap.exists()) {
          setProfile(null);
          setRole("user");
          setNeedsOnboarding(true);
          setProfileLoaded(true);
          setLoading(false);
          return;
        }

        const data = profileSnap.data();

        // 🔒 Deshabilitado en caliente
        if (data.disabled === true) {
          await signOut(auth);
          setAuthError("Cuenta deshabilitada. Contactarse con el administrador");
          setUser(null);
          setProfile(null);
          setRole("user");
          setNeedsOnboarding(false);
          setProfileLoaded(true);
          setLoading(false);
          return;
        }

        setProfile(data);
        setRole(data.role || "user");

        const necesitaNombre =
          typeof data.name !== "string" || data.name.trim() === "";

        setNeedsOnboarding(necesitaNombre);
        setProfileLoaded(true);
        setLoading(false);
      });
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  /* ================= ADMIN SETTINGS (GLOBAL / REALTIME) ================= */
  useEffect(() => {
    const unsub = listenAdminSettings((data) => {
      const mode = data?.mode || "HOURS_ONLY";

      setSettings({
        mode,
        features: resolveFeaturesByMode(mode),

        inactivityEnabled: data?.inactivityEnabled ?? false,
        inactivityHours: data?.inactivityHours ?? 24,

        reminderEnabled: data?.reminderEnabled ?? false,
        reminderDays: data?.reminderDays ?? 3,
      });
    });

    return () => unsub();
  }, []);

  /* ================= ACTIONS ================= */
  const logout = async () => {
    await signOut(auth);
  };

  /* ================= PROVIDER ================= */
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        needsOnboarding,
        profileLoaded,
        loading,
        settings,
        authError,
        logout,
        clearAuthError: () => setAuthError(""),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ======================================================
   HOOK
====================================================== */
export function useAuth() {
  return useContext(AuthContext);
}
