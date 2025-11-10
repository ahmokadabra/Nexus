import React, { useState } from "react";
import ProfessorForm from "../components/ProfessorForm";
import SubjectForm from "../components/SubjectForm";
import RoomForm from "../components/RoomForm";
import CycleForm from "../components/CycleForm";
import ProgramForm from "../components/ProgramForm";
import CourseForm from "../components/CourseForm";

const sections = [
  { key: "prof", label: "Profesori", component: ProfessorForm },
  { key: "subj", label: "Predmeti", component: SubjectForm },
  { key: "rooms", label: "Učionice", component: RoomForm },
  { key: "cycles", label: "Ciklusi/Termini", component: CycleForm },
  { key: "programs", label: "Studijski programi", component: ProgramForm },
  { key: "courses", label: "Kursevi", component: CourseForm },
];

export default function DatabasePage() {
  const [section, setSection] = useState("prof");

  const TabBtn = ({ id, label }) => {
    const active = section === id;
    return (
      <button
        onClick={() => setSection(id)}
        className="btn"
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: active ? "#1f2937" : "#0b1220",
          color: active ? "var(--text)" : "var(--muted)"
        }}
      >
        {label}
      </button>
    );
  };

  const Current = sections.find(s => s.key === section)?.component ?? (() => <div/>);

  return (
    <div className="card">
      {/* Top tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {sections.map(s => <TabBtn key={s.key} id={s.key} label={s.label} />)}
      </div>

      <Current />
    </div>
  );
}
