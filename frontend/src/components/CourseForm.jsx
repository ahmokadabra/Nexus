import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

export default function CourseForm() {
  const [subjectId, setSubjectId] = useState("");
  const [professorId, setProfessorId] = useState("");
  const [termId, setTermId] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [terms, setTerms] = useState([]); // [{id, name, cycleName}]
  const [courses, setCourses] = useState([]);

  const [msg, setMsg] = useState(null);

  async function loadLookups() {
    try {
      const [sj, pr, cy] = await Promise.all([
        apiGet("/api/subjects"),
        apiGet("/api/professors"),
        apiGet("/api/cycles"),
      ]);
      setSubjects(Array.isArray(sj) ? sj : []);
      setProfessors(Array.isArray(pr) ? pr : []);
      // flatten terms with cycle label
      const allTerms = [];
      (Array.isArray(cy) ? cy : []).forEach((c) => {
        (c.terms || []).forEach((t) => {
          allTerms.push({ id: t.id, name: t.name, cycleName: c.name });
        });
      });
      setTerms(allTerms);
    } catch (e) {
      setSubjects([]); setProfessors([]); setTerms([]);
      setMsg({ type: "err", text: e.message });
    }
  }

  async function loadCourses() {
    try {
      const data = await apiGet("/api/courses");
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      setCourses([]); setMsg({ type: "err", text: e.message });
    }
  }

  useEffect(() => { loadLookups(); loadCourses(); }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await apiPost("/api/courses", { subjectId, professorId, termId });
      setMsg({ type: "ok", text: "Course created" });
      setSubjectId(""); setProfessorId(""); setTermId("");
      loadCourses();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  const nameById = (arr, id) => (arr.find((x) => x.id === id)?.name);

  return (
    <div>
      <h2>Courses</h2>

      <form onSubmit={submit}>
        <div className="form-row">
          <select className="input" value={subjectId} onChange={(e)=>setSubjectId(e.target.value)} required>
            <option value="">— select subject —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.code ? `${s.code} — ` : ""}{s.name}</option>)}
          </select>

          <select className="input" value={professorId} onChange={(e)=>setProfessorId(e.target.value)} required>
            <option value="">— select professor —</option>
            {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select className="input" value={termId} onChange={(e)=>setTermId(e.target.value)} required>
            <option value="">— select term —</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.cycleName} • {t.name}</option>)}
          </select>
        </div>

        <button className="btn" type="submit" disabled={!subjectId || !professorId || !termId}>
          Save
        </button>
        {msg && <div className={msg.type === "ok" ? "success" : "error"}>{msg.text}</div>}
      </form>

      <h3>All Courses</h3>
      <table className="table">
        <thead>
          <tr><th>Subject</th><th>Professor</th><th>Term</th></tr>
        </thead>
        <tbody>
          {courses.length === 0 ? (
            <tr><td colSpan="3">[]</td></tr>
          ) : (
            courses.map(c => {
              const subj = c.subject?.name || nameById(subjects, c.subjectId) || c.subjectId;
              const prof = c.professor?.name || nameById(professors, c.professorId) || c.professorId;
              const t = terms.find(t => t.id === c.termId);
              const termLabel = c.term?.name || (t ? `${t.cycleName} • ${t.name}` : c.termId);
              return (
                <tr key={c.id}>
                  <td>{subj}</td>
                  <td>{prof}</td>
                  <td>{termLabel}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
