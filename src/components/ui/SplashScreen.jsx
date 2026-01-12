export default function SplashScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif"
    }}>
      <div>
        <strong>Tracky</strong>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          Cargando…
        </div>
      </div>
    </div>
  );
}
