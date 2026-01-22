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

  /* ================= ADMIN SETTINGS (REALTIME GLOBAL) ================= */
  useEffect(() => {
    const unsub = listenAdminSettings((data) => {
      setSettings({
        // defaults defensivos
        featureManageHours: false,
        featureProjectCombo: true,
        featureTaskCombo: true,
        featureJiraCombo: false,
        featureWorkItems: false,
        featureReports: false,

        // override desde Firestore
        ...data,
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
