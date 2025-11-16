// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import PlanRealizacije from "./components/PlanRealizacije.jsx";
import DatabasePage from "./pages/DatabasePage";
import TeacherLoad from "./components/TeacherLoad.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

// Logo se čita iz /public/logo.png
const Logo = ({ size = 120 }) => (
  <img
    src="/logo.png"
    alt="Nexus logo"
    style={{ width: size, height: "auto" }}
  />
);

export default function App() {
  const [active, setActive] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const isAdmin = user?.role === "ADMIN";
  const canDB = isAdmin || user?.canDB;
  const canPlan = isAdmin || user?.canPlan;
  const canTeacherLoad = isAdmin || user?.canTeacherLoad;
  const canSchedule = isAdmin || user?.canSchedule;
  const canLibrary = isAdmin || user?.canLibrary;

  // ako user nema pravo na trenutno aktivnu sekciju, resetuj na početnu
  useEffect(() => {
    if (!user) return;
    const allowed = new Set([
      null,
      ...(canDB ? ["db"] : []),
      ...(canPlan ? ["plan"] : []),
      ...(canTeacherLoad ? ["opterećenje"] : []),
      ...(canSchedule ? ["raspored"] : []),
      ...(canLibrary ? ["biblioteka"] : []),
      ...(isAdmin ? ["admin"] : []),
    ]);
    if (!allowed.has(active)) {
      setActive(null);
    }
  }, [user, active, canDB, canPlan, canTeacherLoad, canSchedule, canLibrary, isAdmin]);

  function handleLogin(u) {
    setUser(u);
    setActive(null);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setActive(null);
  }

  // ako user nije logovan -> samo login ekran
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "100px 1fr",
        minHeight: "100vh",
      }}
    >
      <Sidebar active={active} onSelect={setActive} user={user} />

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
            <Logo size={84} />
            <h1 style={{ margin: 0, fontSize: 22 }}>
              {active === "db"
                ? "Baza podataka"
                : active === "plan"
                ? "Plan realizacije nastave"
                : active === "opterećenje"
                ? "Opterećenje nastavnika"
                : active === "raspored"
                ? "Raspored nastave"
                : active === "admin"
                ? "Administracija"
                : "Biblioteka"}
            </h1>

            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                {user.username} ({user.role})
              </span>
              <button className="btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>
        )}

        {/* Početni ekran = logo + tekst, sa malim razmakom gore/dole */}
        {!active && (
          <div
            style={{
              paddingTop: 16,
              paddingBottom: 16,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <Logo size={960} />
              <div
                style={{
                  marginTop: 8,
                  fontSize: 18,
                  color: "var(--muted)",
                }}
              >
                Dobrodošli u Nexus
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: "var(--muted)",
                }}
              >
                Odaberite sekciju iz lijevog sidebar-a
              </div>
            </div>
          </div>
        )}

        {active === "db" && canDB && <DatabasePage />}

        {active === "plan" && canPlan && <PlanRealizacije />}

        {active === "opterećenje" && canTeacherLoad && <TeacherLoad />}

        {active === "raspored" && canSchedule && (
          <div className="card">
            <p style={{ color: "var(--muted)" }}>
              Ovdje će ići “Raspored nastave”. (Placeholder)
            </p>
          </div>
        )}

        {active === "biblioteka" && canLibrary && (
          <div className="card">
            <p style={{ color: "var(--muted)" }}>
              Ovdje će ići “Biblioteka”. (Placeholder)
            </p>
          </div>
        )}

        {active === "admin" && isAdmin && <AdminPage />}
      </main>
    </div>
  );
}
