// frontend/src/components/PlanRealizacije.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut } from "../lib/api";

// prikaz angažmana
function engagementLabel(code) {
  if (code === "EMPLOYED") return "RO";
  if (code === "EXTERNAL") return "VS";
  return "-";
}

// 15 nastavnih sedmica
const WEEKS = 15;

// kod→fakultet (isto kao backend, radi headera)
const FACULTY_BY_CODE = {
  FIR: "Ekonomski fakultet",
  SMDP: "Ekonomski fakultet",
  RI: "Tehnički fakultet",
  TUG: "Fakultet turizma, ugostiteljstva i gastronomije",
  EP: "Biotehnički fakultet",
};

export default function PlanRealizacije() {
  const [programs, setPrograms] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [programId, setProgramId] = useState("");
  const [year, setYear] = useState(1);

  const [plan, setPlan] = useState(null); // {id, program, facultyName, yearNumber}
  const [rows, setRows] = useState([]);   // PRNRow[]
  const [msg, setMsg] = useState(null);

  // učitaj programe (filtriraj na FIR, SMDP, RI, TUG, EP po code)
  async function loadPrograms() {
    try {
      const list = await apiGet("/api/prn/programs");
      const keep = (list || []).filter(p =>
        ["FIR","SMDP","RI","TUG","EP"].includes(p.code || "")
      );
      setPrograms(keep);
      if (!programId && keep.length) setProgramId(keep[0].id);
    } catch {
      setPrograms([]);
    }
  }
  async function loadProfessors() {
    try {
      const list = await apiGet("/api/professors");
      setProfessors(Array.isArray(list) ? list : []);
    } catch {
      setProfessors([]);
    }
  }

  async function loadPlan() {
    if (!programId || !year) return;
    setMsg(null);
    try {
      const data = await apiGet(`/api/prn/plan?programId=${encodeURIComponent(programId)}&year=${year}`);
      setPlan(data.plan);
      setRows(data.rows || []);
    } catch (e) {
      setPlan(null);
      setRows([]);
      setMsg({ type: "err", text: e.message });
    }
  }

  useEffect(() => { loadPrograms(); loadProfessors(); }, []);
  useEffect(() => { if (programId) loadPlan(); }, [programId, year]);

  // pomoćni izračuni
  function rowTotals(r) {
    const L = Number(r.lectureTotal || 0);
    const E = Number(r.exerciseTotal || 0);
    return { L, E, T: L + E, Lw: L / WEEKS, Ew: E / WEEKS, Tw: (L + E) / WEEKS };
  }

  // ukupni sabiri po angažmanu
  const totals = useMemo(() => {
    let ro = 0, vs = 0;
    rows.forEach(r => {
      const { T } = rowTotals(r);
      if (r.professor?.engagement === "EMPLOYED") ro += T;
      else if (r.professor?.engagement === "EXTERNAL") vs += T;
    });
    return { ro, vs, all: ro + vs };
  }, [rows]);

  function ectsLabel(s) {
    return (s?.ects ?? "") !== "" && s?.ects != null ? `ECTS: ${s.ects}` : "";
  }
  function sharedLabel(s) {
    const count = (s?.subjectPrograms || []).length;
    return count > 1 ? "Zajednički predmet" : "";
  }

  // inline izmjena reda
  async function updateRow(id, patch) {
    try {
      const updated = await apiPut(`/api/prn/rows/${id}`, patch);
      setRows(rs => rs.map(r => (r.id === id ? { ...r, ...updated } : r)));
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  return (
    <div>
      {/* filter traka */}
      <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", marginBottom:12 }}>
        <div>
          <label style={{ opacity:.8, fontSize:12 }}>Studijski program</label><br/>
          <select className="input" value={programId} onChange={e=>setProgramId(e.target.value)}>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ opacity:.8, fontSize:12 }}>Godina</label><br/>
          <div style={{display:"flex", gap:8}}>
            {[1,2,3,4].map(n => (
              <button key={n}
                className="btn"
                style={{ background: year===n ? "#444" : undefined }}
                onClick={()=>setYear(n)}
              >{n}</button>
            ))}
          </div>
        </div>
        <button className="btn" onClick={loadPlan}>Refresh</button>
        {msg && <div className={msg.type==="ok"?"success":"error"}>{msg.text}</div>}
      </div>

      {/* header */}
      {plan && (
        <div style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Plan realizacije nastave</h2>
          <div style={{ opacity:.9 }}>
            {FACULTY_BY_CODE[plan.program.code || ""] || plan.facultyName || ""} &mdash; {plan.program.name}{plan.program.code ? ` (${plan.program.code})` : ""} — {year}. godina
          </div>
        </div>
      )}

      {/* tabela */}
      <div style={{ overflowX:"auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Predmet</th>
              <th>P/V</th>
              <th>Nastavnik</th>
              <th>Angažman</th>
              <th colSpan={3}>Pokrivenost ukupno — I semestar</th>
              <th colSpan={3}>Pokrivenost sedmična</th>
              <th></th>
            </tr>
            <tr>
              <th colSpan={4}></th>
              <th>Pred.</th>
              <th>Vjež.</th>
              <th>Ukupno</th>
              <th>Pred.</th>
              <th>Vjež.</th>
              <th>Ukupno</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={11}>[]</td></tr>
            ) : rows.map(r => {
              const sums = rowTotals(r);
              const subj = r.subject || {};
              const pvBadge = "P/V";
              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight:600 }}>{subj.name}{subj.code ? ` (${subj.code})` : ""}</div>
                    <div style={{ fontSize:12, opacity:.85 }}>
                      {ectsLabel(subj)}{sharedLabel(subj) ? ` — ${sharedLabel(subj)}` : ""}
                    </div>
                  </td>
                  <td style={{ textAlign:"center" }}>
                    <span style={{ padding:"2px 6px", border:"1px solid #555", borderRadius:6, fontSize:12 }}>{pvBadge}</span>
                  </td>
                  <td style={{ minWidth:220 }}>
                    <select
                      className="input"
                      value={r.professorId || ""}
                      onChange={(e)=>updateRow(r.id, { professorId: e.target.value || null })}
                    >
                      <option value="">— odaberi —</option>
                      {professors.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ textAlign:"center" }}>
                    {engagementLabel(r.professor?.engagement)}
                  </td>

                  {/* ukupno semestar: inputi za predavanja i vježbe, ukupno = readOnly */}
                  <td style={{ width:100 }}>
                    <input className="input small" inputMode="numeric"
                      value={r.lectureTotal ?? 0}
                      onChange={(e)=>updateRow(r.id, { lectureTotal: Number(e.target.value || 0) })}
                    />
                  </td>
                  <td style={{ width:100 }}>
                    <input className="input small" inputMode="numeric"
                      value={r.exerciseTotal ?? 0}
                      onChange={(e)=>updateRow(r.id, { exerciseTotal: Number(e.target.value || 0) })}
                    />
                  </td>
                  <td style={{ textAlign:"right", width:90 }}>{sums.T}</td>

                  {/* sedmična = /15, zaokruži na 2 decimale */}
                  <td style={{ textAlign:"right", width:90 }}>{(sums.Lw).toFixed(2)}</td>
                  <td style={{ textAlign:"right", width:90 }}>{(sums.Ew).toFixed(2)}</td>
                  <td style={{ textAlign:"right", width:90 }}>{(sums.Tw).toFixed(2)}</td>

                  <td></td>
                </tr>
              );
            })}
          </tbody>

          {/* footer sabiranja */}
          <tfoot>
            <tr>
              <td colSpan={6} style={{ textAlign:"right", fontWeight:600 }}>Ukupno iz radnog odnosa</td>
              <td style={{ textAlign:"right", fontWeight:600 }}>{totals.ro}</td>
              <td colSpan={3}></td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={6} style={{ textAlign:"right", fontWeight:600 }}>Ukupno iz honorarnog angažmana</td>
              <td style={{ textAlign:"right", fontWeight:600 }}>{totals.vs}</td>
              <td colSpan={3}></td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={6} style={{ textAlign:"right", fontWeight:900 }}>Ukupno</td>
              <td style={{ textAlign:"right", fontWeight:900 }}>{totals.all}</td>
              <td colSpan={3}></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
