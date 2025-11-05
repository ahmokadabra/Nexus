import React, { useState } from "react";
import ProfessorForm from "./components/ProfessorForm";
import SubjectForm from "./components/SubjectForm";
import RoomForm from "./components/RoomForm";
import CycleForm from "./components/CycleForm";
import ProgramForm from "./components/ProgramForm";
import CourseForm from "./components/CourseForm";   // ⬅ novo
import "./App.css";

export default function App() {
  const [view, setView] = useState("professors");

  return (
    <div className="container">
      <div className="header">
        <h1>Nexus Admin</h1>
        <div className="nav">
          <button className="btn" onClick={() => setView("professors")}>Professors</button>
          <button className="btn" onClick={() => setView("subjects")}>Subjects</button>
          <button className="btn" onClick={() => setView("rooms")}>Rooms</button>
          <button className="btn" onClick={() => setView("cycles")}>Cycles</button>
          <button className="btn" onClick={() => setView("programs")}>Programs</button>
          <button className="btn" onClick={() => setView("courses")}>Courses</button> {/* ⬅ novo */}
        </div>
      </div>

      <div className="card">
        {view === "professors" && <ProfessorForm />}
        {view === "subjects" && <SubjectForm />}
        {view === "rooms" && <RoomForm />}
        {view === "cycles" && <CycleForm />}
        {view === "programs" && <ProgramForm />}
        {view === "courses" && <CourseForm />}      {/* ⬅ novo */}
      </div>
    </div>
  );
}
