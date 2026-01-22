import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { auth } from "../services/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import tracklyLogo from "../assets/trackly-logo.png";

export default function Login() {
  const { login, authError, clearAuthError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authError) setError(authError);
    return () => clearAuthError();
  }, [authError, clearAuthError]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoadingEmail(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError("Error al iniciar sesión");
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-3">
      <div className="bg-white rounded-xl shadow-lg p-5 w-full max-w-md space-y-3">
        <div className="flex justify-center">
          <img src={tracklyLogo} alt="logo" className="h-10" />
        </div>

        {error && (
          <div className="bg-red-200 text-red-800 px-3 py-2 rounded text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-2">
          <input
            type="email"
            className="input w-full"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            className="input w-full"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="btn-primary w-full" disabled={loadingEmail}>
            {loadingEmail ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
