// frontend/src/App.jsx
import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import logoUrl from "./assets/logo.svg";

// tvoje forme (već postojeće)
import ProfessorForm from "./components/ProfessorForm";
import SubjectForm from "./components/SubjectForm";
import RoomForm from "./components/RoomForm";
import CycleForm from "./components/CycleForm";
import ProgramForm from "./components/ProgramForm";
// (po želji) import CourseForm ako ga koristiš
// import CourseForm from "./components/CourseForm";

function Placeholder({ title }) {
  return (
    <div className="card placeholder">
      <h2>{title}</h2>
      <p>Ovdje će ići funkcionalnosti za “{title}”. Za sada je prazno.</p>
    </div>
  );
}

function DataHub() {
  return (
    <div className="grid">
      <div className="card"><ProfessorForm /></div>
      <div className="card"><SubjectForm /></div>
      <div className="card"><RoomForm /></div>
      <div className="card"><CycleForm /></div>
      <div className="card"><ProgramForm /></div>
      {/* <div className="card"><CourseForm /></div> */}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState(null); // null => početni ekran sa velikim logom

  const headerLogoSmall = (
    <div className="brand">
      {logoUrl ? <img src={logoUrl} alt="Nexus" /> : <strong>Nexus</strong>}
      <span>Nexus</span>
    </div>
  );

  const bigCenteredLogo = (
    <div className="hero">
      {logoUrl ? <img src={logoUrl} alt="Nexus" /> : <h1>Nexus</h1>}
      <p>Dobrodošli 👋<br/>Izaberite sekciju iz lijevog menija.</p>
    </div>
  );

  let content = bigCenteredLogo;
  if (tab) {
    switch (tab) {
      case "db":
        content = <DataHub />;
        break;
      case "plan":
        content = <Placeholder title="Plan realizacije nastave" />;
        break;
      case "load":
        content = <Placeholder title="Opterećenje nastavnika" />;
        break;
      case "sched":
        content = <Placeholder title="Raspored nastave" />;
        break;
      case "lib":
        content = <Placeholder title="Biblioteka" />;
        break;
      default:
        content = bigCenteredLogo;
    }
  }

  return (
    <div className="layout">
      <Sidebar active={tab} onSelect={setTab} />
      <main className="main">
        {/* Header se pojavljuje samo kad je odabran neki tab */}
        {tab && <header className="header">{headerLogoSmall}</header>}
        <div className="content">{content}</div>
      </main>
    </div>
  );
}
