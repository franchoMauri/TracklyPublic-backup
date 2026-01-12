import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside
      style={{
        width: "200px",
        background: "#f3f4f6",
        padding: "20px",
      }}
    >
      <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <Link to="/">Dashboard</Link>
        <Link to="/add">Cargar horas</Link>
        <Link to="/records">Mis registros</Link>
        <Link to="/reports">Reportes</Link>
        <Link to="/admin">Admin</Link>
      </nav>
    </aside>
  );
}
