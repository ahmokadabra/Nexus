import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import DatabasePage from "./pages/DatabasePage";

// Napomena za logo: stavi SVOJ fajl u frontend/public/logo.svg
const Logo = ({ size = 120 }) => (
  <img src="/logo.svg" alt="Nexus" style={{ width: size, height: "auto" }} />
);

export default function App() {
  // null = početni ekran (samo logo); ostalo: "db" | "plan" | "opterećenje" | "raspored" | "biblioteka"
  const [active, setActive] = useState(null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", minHeight: "100vh" }}>
      <Sidebar active={active} onSelect={setActive} />

      <main style={{ padding: 24 }}>
        {/* Header se pokazuje kad nije početni ekran */}
        {active && (
          <header style={{
            display: "flex", alignItems: "center", gap: 12,
            borderBottom: "1px solid #eee", paddingBottom: 12, marginBottom: 16
          }}>
            <Logo size={42} />
            <h1 style={{ margin: 0, fontSize: 22 }}>
              {active === "db" ? "Baza podataka"
                : active === "plan" ? "Plan realizacije nastave"
                : active === "opterećenje" ? "Opterećenje nastavnika"
                : active === "raspored" ? "Raspored nastave"
                : "Biblioteka"}
            </h1>
          </header>
        )}

        {/* Sadržaj */}
        {!active && (
          <div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <Logo size={160} />
              <div style={{ marginTop: 12, fontSize: 18, color: "#666" }}>Dobrodošli u Nexus</div>
            </div>
          </div>
        )}

        {active === "db" && <DatabasePage />}

        {active === "plan" && (
          <div style={{ padding: 12, color: "#666" }}>
            <p>Ovdje će ići alat za “Plan realizacije nastave”. (Placeholder)</p>
          </div>
        )}

        {active === "opterećenje" && (
          <div style={{ padding: 12, color: "#666" }}>
            <p>Ovdje će ići “Opterećenje nastavnika”. (Placeholder)</p>
          </div>
        )}

        {active === "raspored" && (
          <div style={{ padding: 12, color: "#666" }}>
            <p>Ovdje će ići “Raspored nastave”. (Placeholder)</p>
          </div>
        )}

        {active === "biblioteka" && (
          <div style={{ padding: 12, color: "#666" }}>
            <p>Ovdje će ići “Biblioteka”. (Placeholder)</p>
          </div>
        )}
      </main>
    </div>
  );
}
