// frontend/src/App.jsx
import React, { useState } from "react";

// DB sekcija – tvoje postojeće forme
import ProfessorForm from "./components/ProfessorForm";
import SubjectForm from "./components/SubjectForm";
import RoomForm from "./components/RoomForm";
import ProgramForm from "./components/ProgramForm";
import CycleForm from "./components/CycleForm";
import CourseForm from "./components/CourseForm";

// Jednostavan placeholder za “prazne” panele
function EmptyPanel({ title }) {
  return (
    <div style={{
      padding: 24,
      border: "1px dashed #ddd",
      borderRadius: 12,
      background: "#fafafa"
    }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p>Ovaj modul će biti dodat uskoro. 🙂</p>
    </div>
  );
}

export default function App() {
  // Glavne sekcije: home (logo), database, plan, workload, schedule, library
  const [section, setSection] = useState("home");

  // Unutar “Baza podataka” imamo kartice/form-e
  const [dbTab, setDbTab] = useState("professors");

  // Sidebar stavke (ikonice su emoji da ne uvodimo dodatne pakete)
  const nav = [
    { key: "database", label: "Baza podataka", icon: "🗂️" },
    { key: "plan",     label: "Plan realizacije nastave", icon: "🧭" },
    { key: "workload", label: "Opterećenje nastavnika",   icon: "🧮" },
    { key: "schedule", label: "Raspored nastave",         icon: "🗓️" },
    { key: "library",  label: "Biblioteka",               icon: "📚" },
  ];

  // Render “glavnog” headera: na “home” je veliki logo na sredini,
  // na ostalim sekcijama kompaktni header s malim logom.
  const showHeader = section !== "home";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      {/* SIDEBAR */}
      <aside style={{
        background: "#0f172a", color: "white",
        display: "flex", flexDirection: "column", padding: 16, gap: 8
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <img src="/logo.svg" alt="Nexus" style={{ width: 32, height: 32 }} />
          <strong style={{ fontSize: 18 }}>Nexus</strong>
        </div>

        {nav.map(item => (
          <button
            key={item.key}
            onClick={() => setSection(item.key)}
            style={{
              textAlign: "left",
              background: section === item.key ? "#1e293b" : "transparent",
              color: "white",
              border: "none",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        <div style={{ marginTop: "auto", opacity: 0.7, fontSize: 12 }}>
          © {new Date().getFullYear()} Nexus
        </div>
      </aside>

      {/* CONTENT */}
      <main style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header (osim na “home”) */}
        {showHeader && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid #eee",
            position: "sticky",
            top: 0,
            background: "white",
            zIndex: 1
          }}>
            <img src="/logo.svg" alt="Nexus" style={{ width: 28, height: 28 }} />
            <div style={{ fontWeight: 600 }}>
              {nav.find(n => n.key === section)?.label || "Nexus"}
            </div>
          </div>
        )}

        {/* Središnji sadržaj */}
        <div style={{ padding: 16 }}>
          {/* HOME – samo veliki logo u centru */}
          {section === "home" && (
            <div style={{
              minHeight: "70vh",
              display: "grid",
              placeItems: "center"
            }}>
              <div style={{ textAlign: "center" }}>
                <img src="/logo.svg" alt="Nexus" style={{ width: 200, height: "auto", opacity: 0.95 }} />
                <div style={{ marginTop: 12, fontSize: 18, color: "#475569" }}>
                  Dobrodošli u Nexus
                </div>
              </div>
            </div>
          )}

          {/* BAZA PODATAKA – tvoje forme u tabs/dugmad */}
          {section === "database" && (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <TabButton active={dbTab === "professors"} onClick={() => setDbTab("professors")}>Profesori</TabButton>
                <TabButton active={dbTab === "subjects"}   onClick={() => setDbTab("subjects")}>Predmeti</TabButton>
                <TabButton active={dbTab === "rooms"}      onClick={() => setDbTab("rooms")}>Učionice</TabButton>
                <TabButton active={dbTab === "programs"}   onClick={() => setDbTab("programs")}>Studijski programi</TabButton>
                <TabButton active={dbTab === "cycles"}     onClick={() => setDbTab("cycles")}>Ciklusi/Termini</TabButton>
                <TabButton active={dbTab === "courses"}    onClick={() => setDbTab("courses")}>Kursevi</TabButton>
              </div>

              <div>
                {dbTab === "professors" && <ProfessorForm />}
                {dbTab === "subjects"   && <SubjectForm />}
                {dbTab === "rooms"      && <RoomForm />}
                {dbTab === "programs"   && <ProgramForm />}
                {dbTab === "cycles"     && <CycleForm />}
                {dbTab === "courses"    && <CourseForm />}
              </div>
            </div>
          )}

          {/* OSTALE SEKCIJE – privremeno prazne */}
          {section === "plan"     && <EmptyPanel title="Plan realizacije nastave" />}
          {section === "workload" && <EmptyPanel title="Opterećenje nastavnika" />}
          {section === "schedule" && <EmptyPanel title="Raspored nastave" />}
          {section === "library"  && <EmptyPanel title="Biblioteka" />}
        </div>
      </main>
    </div>
  );
}

// mali pomoćni komponent za dugmad/tabove
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="btn"
      style={{
        background: active ? "#0ea5e9" : "#e2e8f0",
        color: active ? "white" : "#0f172a",
        border: "none",
        borderRadius: 10,
        padding: "8px 12px",
        cursor: "pointer",
        fontWeight: 600
      }}
    >
      {children}
    </button>
  );
}
