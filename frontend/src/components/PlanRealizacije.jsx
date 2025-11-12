// frontend/src/components/PlanRealizacije.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut } from "../lib/api";

const TITLE_MAP = {
  PRACTITIONER: "Stručnjak iz prakse",
  ASSISTANT: "Asistent",
  SENIOR_ASSISTANT: "Viši asistent",
  ASSISTANT_PROFESSOR: "Docent",
  ASSOCIATE_PROFESSOR: "Vanr. prof.",
  FULL_PROFESSOR: "Red. prof.",
  PROFESSOR_EMERITUS: "Prof. emeritus",
};
const ENG_MAP = { EMPLOYED: "RO", EXTERNAL: "VS" }; // Radni odnos / Vanjski saradnik

export default function PlanRealizacije() {
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [year, setYear] = useState(1);
  const [plan, setPlan] = useState(null);
  const [rows, setRows] = useState([]);
  const [profs, setProfs] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // učitaj programe + profesore
  useEffect(() => {
    (async () => {
      try {
        const [ps, pf] = await Promise.all([
          apiGet("/api/planrealizacije/programs"),
          apiGet("/api/professors"),
        ]);
        setPrograms(ps);
        setProfs(pf);
        if (ps.length && !selectedProgramId) setSelectedProgramId(ps[0].id);
      } catch (e) {
        setMsg({ type: "err", text: e.message });
      }
    })();
  }, []);

  // učitaj/kreiraj plan za izabrani program i godinu
  useEffect(() => {
    if (!selectedProgramId) return;
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const data = await apiGet(
          `/api/planrealizacije/plan?programId=${encodeURIComponent(selectedProgramId)}&year=${year}`
        );
        setPlan(data.plan);
        setRows(
          (data.rows || []).map((r) => ({
            ...r,
            _edit: {
              professorId: r.professorId || "",
              lectureTotal: r.lectureTotal ?? 0,
              exerciseTotal: r.exerciseTotal ?? 0,
              saving: false,
            },
          }))
        );
      } catch (e) {
        setPlan(null);
        setRows([]);
        setMsg({ type: "err", text: e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedProgramId, year]);

  async function seedPrograms() {
    try {
      setMsg(null);
      const res = await apiPost("/api/planrealizacije/seed-programs", {});
      setPrograms(res.programs || []);
      if (res.programs?.length) setSelectedProgramId(res.programs[0].id);
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  function changeRow(id, patch) {
    setRows((arr) =>
      arr.map((r) => (r.id === id ? { ...r, _edit: { ...r._edit, ...patch } } : r))
    );
  }

  async function saveRow(r) {
    if (!r?._edit) return;
    const body = {
      professorId:
        r._edit.professorId === "" ? null : String(r._edit.professorId),
      lectureTotal: Number(r._edit.lectureTotal) || 0,
      exerciseTotal: Number(r._edit.exerciseTotal) || 0,
    };
    changeRow(r.id, { saving: true });
    try {
      await apiPut(`/api/planrealizacije/rows/${r.id}`, body);
      setMsg({ type: "ok", text: "Sačuvano" });
      // odražaj lokalno (bez refetcha)
      setRows((arr) =>
        arr.map((x) =>
          x.id === r.id
            ? {
                ...x,
                professorId: body.professorId,
                lectureTotal: body.lectureTotal,
                exerciseTotal: body.exerciseTotal,
                professor:
                  body.professorId
                    ? profs.find((p) => p.id === body.professorId) || null
                    : null,
                _edit: { ...x._edit, saving: false },
              }
            : x
        )
      );
    } catch (e) {
      setMsg({ type: "err", text: e.message });
      changeRow(r.id, { saving: false });
    }
  }

  // proračuni
  const computed = useMemo(() => {
    const total = { RO: { L: 0, E: 0 }, VS: { L: 0, E: 0 }, ALL: { L: 0, E: 0 } };
    rows.forEach((r) => {
      const L = Number(r._edit?.lectureTotal ?? r.lectureTotal ?? 0);
      const E = Number(r._edit?.exerciseTotal ?? r.exerciseTotal ?? 0);
      const bucket = r.professor?.engagement ? ENG_MAP[r.professor.engagement] : null;
      total.ALL.L += L; total.ALL.E += E;
      if (bucket === "RO") { total.RO.L += L; total.RO.E += E; }
      else if (bucket === "VS") { total.VS.L += L; total.VS.E += E; }
    });
    const sum = (obj) => obj.L + obj.E;
    return {
      total,
      sumALL: sum(total.ALL),
      sumRO: sum(total.RO),
      sumVS: sum(total.VS),
    };
  }, [rows]);

  const currentProgram = programs.find((p) => p.id === selectedProgramId);

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap"}}>
        <h2>Plan realizacije nastave</h2>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          {programs.length === 0 ? (
            <button className="btn" onClick={seedPrograms}>Dodaj standardne studijske programe</button>
          ) : null}
          <div style={{display:"flex", gap:6}}>
            {[1,2,3,4].map(y => (
              <button
                key={y}
                className="btn"
                style={{opacity: year===y?1:0.7}}
                onClick={()=>setYear(y)}
              >
                Godina {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs programi */}
      <div style={{display:"flex", gap:8, flexWrap:"wrap", margin:"8px 0"}}>
        {programs.map(p => (
          <button
            key={p.id}
            className="btn"
            style={{
              background: selectedProgramId===p.id ? "#2a2f3a" : "transparent",
              border: "1px solid #3a4152"
            }}
            onClick={()=>setSelectedProgramId(p.id)}
            title={p.name}
          >
            {p.code || p.name}
          </button>
        ))}
      </div>

      {msg && <div className={msg.type==="ok"?"success":"error"}>{msg.text}</div>}

      {loading ? (
        <div>Učitavanje…</div>
      ) : !currentProgram ? (
        <div>Nema programa. Pokreni seed iznad.</div>
      ) : !plan ? (
        <div>Nema podataka za prikaz.</div>
      ) : (
        <>
          {/* Header */}
          <div style={{margin:"12px 0"}}>
            <div style={{fontSize:18, fontWeight:700}}>Plan realizacije nastave</div>
            <div>{plan.facultyName}</div>
            <div>{currentProgram.name} ({currentProgram.code}) — Godina {plan.yearNumber}</div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Predmet</th>
                <th>P/V</th>
                <th>Nastavnici</th>
                <th>Angažman</th>
                <th colSpan={3}>Pokrivenost ukupno</th>
                <th colSpan={3}>Pokrivenost sedmična</th>
                <th></th>
              </tr>
              <tr>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th>Predavanja</th>
                <th>Vježbe</th>
                <th>Ukupno</th>
                <th>Predavanja</th>
                <th>Vježbe</th>
                <th>Ukupno</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={11}>Nema redova</td></tr>
              ) : rows.map(r => {
                const L = Number(r._edit?.lectureTotal ?? r.lectureTotal ?? 0);
                const E = Number(r._edit?.exerciseTotal ?? r.exerciseTotal ?? 0);
                const U = L + E;
                const Lw = (L/15) || 0;
                const Ew = (E/15) || 0;
                const Uw = (U/15) || 0;
                const subj = r.subject || {};
                const ects = subj.ects ?? "";
                const joint = (subj.subjectPrograms || []).some(sp => sp.programId !== selectedProgramId);
                const profId = r._edit?.professorId ?? r.professorId ?? "";
                const prof = profs.find(p=>p.id===profId) || r.professor || null;
                const anga = prof?.engagement ? ENG_MAP[prof.engagement] : "-";
                const title = prof?.title ? (TITLE_MAP[prof.title] || prof.title) : "";

                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{fontWeight:600}}>{subj.name}</div>
                      <div style={{fontSize:12, opacity:0.8}}>
                        {subj.code ? `(${subj.code}) ` : ""}ECTS: {ects === "" ? "-" : ects}
                        {joint ? " • Zajednički predmet" : ""}
                      </div>
                    </td>
                    <td>P/V</td>
                    <td style={{minWidth:220}}>
                      <select
                        className="input"
                        value={String(profId)}
                        onChange={(e)=>changeRow(r.id,{ professorId: e.target.value })}
                      >
                        <option value="">— odaberi —</option>
                        {profs.map(p=>(
                          <option key={p.id} value={p.id}>
                            {p.name}{p.title?` — ${TITLE_MAP[p.title]||p.title}`:""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{anga}</td>
                    <td>
                      <input
                        className="input small"
                        value={L}
                        onChange={e=>changeRow(r.id,{ lectureTotal: e.target.value })}
                        inputMode="numeric"
                        style={{maxWidth:90}}
                      />
                    </td>
                    <td>
                      <input
                        className="input small"
                        value={E}
                        onChange={e=>changeRow(r.id,{ exerciseTotal: e.target.value })}
                        inputMode="numeric"
                        style={{maxWidth:90}}
                      />
                    </td>
                    <td>{U}</td>
                    <td>{Lw.toFixed(2)}</td>
                    <td>{Ew.toFixed(2)}</td>
                    <td>{Uw.toFixed(2)}</td>
                    <td style={{whiteSpace:"nowrap"}}>
                      <button className="btn" disabled={r._edit?.saving} onClick={()=>saveRow(r)}>
                        {r._edit?.saving ? "..." : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Totali */}
              <tr>
                <td colSpan={4} style={{textAlign:"right", fontWeight:600}}>Ukupno iz radnog odnosa (RO):</td>
                <td>{computed.total.RO.L}</td>
                <td>{computed.total.RO.E}</td>
                <td>{computed.sumRO}</td>
                <td>{(computed.total.RO.L/15).toFixed(2)}</td>
                <td>{(computed.total.RO.E/15).toFixed(2)}</td>
                <td>{(computed.sumRO/15).toFixed(2)}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={4} style={{textAlign:"right", fontWeight:600}}>Ukupno iz honorarnog angažmana (VS):</td>
                <td>{computed.total.VS.L}</td>
                <td>{computed.total.VS.E}</td>
                <td>{computed.sumVS}</td>
                <td>{(computed.total.VS.L/15).toFixed(2)}</td>
                <td>{(computed.total.VS.E/15).toFixed(2)}</td>
                <td>{(computed.sumVS/15).toFixed(2)}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={4} style={{textAlign:"right", fontWeight:700}}>Ukupno:</td>
                <td>{computed.total.ALL.L}</td>
                <td>{computed.total.ALL.E}</td>
                <td>{computed.sumALL}</td>
                <td>{(computed.total.ALL.L/15).toFixed(2)}</td>
                <td>{(computed.total.ALL.E/15).toFixed(2)}</td>
                <td>{(computed.sumALL/15).toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
