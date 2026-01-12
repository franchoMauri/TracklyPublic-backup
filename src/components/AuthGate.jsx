import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import SplashScreen from "./ui/SplashScreen";

export default function AuthGate({ children }) {
  const { loading, user } = useAuth();
  const location = useLocation();

  // ⏳ Firebase resolviendo sesión
  if (loading) {
    return <SplashScreen />;
  }

  const publicRoutes = ["/login", "/register"];

  // 🔓 permitir login sin usuario
  if (!user && publicRoutes.includes(location.pathname)) {
    return children;
  }

  // 🔒 bloquear resto sin usuario
  if (!user) {
    return <SplashScreen />;
  }

  return children;
}
