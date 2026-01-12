import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../services/firebase";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { ensureUserDocument } from "../services/usersService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState("user");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    setPersistence(auth, browserSessionPersistence).catch(() => {});

    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setAuthError("");

      // ===== LOGOUT / NO USER =====
      if (!currentUser) {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        setUser(null);
        setProfile(null);
        setRole("user");
        setNeedsOnboarding(false);
        setProfileLoaded(true); // 👈 clave: no bloquear la app
        setLoading(false);
        return;
      }

      // ===== LOGIN =====
      setLoading(true);
      setProfileLoaded(false);

      await ensureUserDocument(currentUser);

      const userRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists() && snap.data().disabled === true) {
        await signOut(auth);
        setAuthError("Tu cuenta fue deshabilitada por un administrador");
        setUser(null);
        setProfile(null);
        setRole("user");
        setNeedsOnboarding(false);
        setProfileLoaded(true);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      const usaGoogle = currentUser.providerData?.some(
        (p) => p.providerId === "google.com"
      );

      // ===== PROFILE LISTENER =====
      unsubscribeProfile = onSnapshot(userRef, async (profileSnap) => {
        if (!profileSnap.exists()) {
          // 👈 evita pantalla en blanco si el doc tarda
          setProfile(null);
          setRole("user");
          setNeedsOnboarding(true);
          setProfileLoaded(true);
          setLoading(false);
          return;
        }

        const data = profileSnap.data();

        if (data.disabled === true) {
          await signOut(auth);
          setAuthError("Tu cuenta fue deshabilitada por un administrador");
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

        const necesitaNombre = !data.name;
        const necesitaCambioClave =
          !usaGoogle && data.mustChangePassword === true;

        setNeedsOnboarding(necesitaNombre || necesitaCambioClave);
        setProfileLoaded(true);
        setLoading(false);
      });
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        needsOnboarding,
        profileLoaded,
        loading,
        login,
        logout,
        authError,
        clearAuthError: () => setAuthError(""),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
