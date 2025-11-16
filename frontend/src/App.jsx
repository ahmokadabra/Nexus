// frontend/src/App.jsx
import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import PlanRealizacije from "./components/PlanRealizacije.jsx";
import DatabasePage from "./pages/DatabasePage";
import TeacherLoad from "./components/TeacherLoad.jsx"; // ⬅️ DODANO

// Logo se čita iz /public/logo.png
const Logo = ({ size = 120 }) => (
  <img
    src="/logo.png"
    alt="Nexus"
    style={{ width: size, height: "auto" }}
    onError={(e) => {
      e.currentTarget.style.display = "none";
    }}
  />
);

export default function App() {
  const [active, setActive] = useState(null);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "100px 1fr",
        minHeight: "100vh",
      }}
    >
      <Sidebar active={active} onSelect={setActive} />

      <main style={{ padding: 24 }}>
        {/* Header se pokazuje kad nije početni ekran */}
        {active && (
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderBottom: "1px solid var(--border)",
              paddingBottom: 12,
              marginBottom: 16,
            }}
          >
            <Logo size={42} />
            <h1 style={{ margin: 0, fontSize: 22 }}>
              {active === "db"
                ? "Baza podataka"
                : active === "plan"
                ? "Plan realizacije nastave"
                : active === "opterećenje"
                ? "Opterećenje nastavnika"
                : active === "raspored"
                ? "Raspored nastave"
                : "Biblioteka"}
            </h1>
          </header>
        )}

        {/* Početni ekran = samo logo, centriran */}
        {!active && (
          <div
            style={{
              minHeight: "70vh",
              display: "grid",
              placeItems: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <Logo size={160} />
              <div style={{ marginTop: 12, fontSize: 18, color: "var(--muted)" }}>
                Dobrodošli u Nexus
              </div>
              <div style={{ marginTop: 8, color: "var(--muted)" }}>
                Odaberite sekciju iz lijevog sidebar-a
              </div>
            </div>
          </div>
        )}

        {active === "db" && <DatabasePage />}

        {active === "plan" && <PlanRealizacije />}

        {active === "opterećenje" && <TeacherLoad />}

        {active === "raspored" && (
          <div className="card">
            <p style={{ color: "var(--muted)" }}>
              Ovdje će ići “Raspored nastave”. (Placeholder)
            </p>
          </div>
        )}

        {active === "biblioteka" && (
          <div className="card">
            <p style={{ color: "var(--muted)" }}>
              Ovdje će ići “Biblioteka”. (Placeholder)
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
