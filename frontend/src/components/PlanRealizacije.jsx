import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut } from "../lib/api";
import * as XLSX from "xlsx";

const TITLE_MAP = {
  PRACTITIONER: "Stručnjak iz prakse",
  ASSISTANT: "Asistent",
  SENIOR_ASSISTANT: "Viši asistent",
  ASSISTANT_PROFESSOR: "Docent",
  ASSOCIATE_PROFESSOR: "Vanr. prof.",
  FULL_PROFESSOR: "Red. prof.",
  PROFESSOR_EMERITUS: "Prof. emeritus",
};
const ENG_MAP = { EMPLOYED: "RO", EXTERNAL: "VS" };

export default function PlanRealizacije() {
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [year, setYear] = useState(1);
  const [plan, setPlan] = useState(null);
  const [rows, setRows] = useState([]);
  const [profs, setProfs] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

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

  async function loadPlan(pid = selectedProgramId, yr = year) {
    setLoading(true);
    setMsg(null);
    try {
      const data = await apiGet(
        `/api/planrealizacije/plan?programId=${encodeURIComponent(pid)}&year=${yr}`
      );
      setPlan(data.plan);
      setRows(
        (data.rows || []).map((r) => {
          const L = r.lectureTotal ?? 0;
          const E = r.exerciseTotal ?? 0;
          const kind = L >= E ? "P" : "V";
          return {
            ...r,
            _edit: {
              professorId: r.professorId || "",
              lectureTotal: L,
              exerciseTotal: E,
              kind, // "P" ili "V"
              saving: false,
            },
          };
        })
      );
    } catch (e) {
      setPlan(null);
      setRows([]);
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedProgramId) loadPlan(selectedProgramId, year);
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
      professorId: r._edit.professorId === "" ? null : String(r._edit.professorId),
      lectureTotal: Number(r._edit.lectureTotal) || 0,
      exerciseTotal: Number(r._edit.exerciseTotal) || 0,
    };
    changeRow(r.id, { saving: true });
    try {
      const saved = await apiPut(`/api/planrealizacije/rows/${r.id}`, body);
      setMsg({ type: "ok", text: "Sačuvano" });
      setRows((arr) =>
        arr.map((x) =>
          x.id === r.id
            ? {
                ...x,
                professorId: saved.professorId,
                lectureTotal: saved.lectureTotal,
                exerciseTotal: saved.exerciseTotal,
                professor:
                  saved.professor ??
                  (body.professorId ? profs.find((p) => p.id === body.professorId) || null : null),
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

  async function addTeacher(subjectId) {
    if (!plan?.id) return;
    try {
      setMsg(null);
      const newRow = await apiPost("/api/planrealizacije/rows", {
        planId: plan.id,
        subjectId,
      });
      const prepared = {
        ...newRow,
        _edit: {
          professorId: newRow.professorId || "",
          lectureTotal: newRow.lectureTotal ?? 0,
          exerciseTotal: newRow.exerciseTotal ?? 0,
          kind: "P",
          saving: false,
        },
      };
      setRows((prev) => {
        const idxs = [];
        prev.forEach((x, i) => {
          if (x.subjectId === subjectId) idxs.push(i);
        });
        const insertAt = idxs.length ? idxs[idxs.length - 1] + 1 : prev.length;
        const next = [...prev];
        next.splice(insertAt, 0, prepared);
        return next;
      });
      setMsg({ type: "ok", text: "Dodat nastavnik za ovaj predmet" });
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  const groups = useMemo(() => {
    const order = [];
    const map = new Map();
    rows.forEach((r) => {
      if (!map.has(r.subjectId)) {
        map.set(r.subjectId, []);
        order.push(r.subjectId);
      }
      map.get(r.subjectId).push(r);
    });
    return order.map((sid) => ({
      subjectId: sid,
      subject: map.get(sid)?.[0]?.subject,
      rows: map.get(sid),
    }));
  }, [rows]);

  const computed = useMemo(() => {
    const total = { RO: { L: 0, E: 0 }, VS: { L: 0, E: 0 }, ALL: { L: 0, E: 0 } };
    rows.forEach((r) => {
      const L = Number(r._edit?.lectureTotal ?? r.lectureTotal ?? 0);
      const E = Number(r._edit?.exerciseTotal ?? r.exerciseTotal ?? 0);
      const bucket = r.professor?.engagement ? ENG_MAP[r.professor.engagement] : null;
      total.ALL.L += L;
      total.ALL.E += E;
      if (bucket === "RO") {
        total.RO.L += L;
        total.RO.E += E;
      } else if (bucket === "VS") {
        total.VS.L += L;
        total.VS.E += E;
      }
    });
    const sum = (o) => o.L + o.E;
    const sumALL = sum(total.ALL);
    const sumRO = sum(total.RO);
    const sumVS = sum(total.VS);
    let pRO = 0,
      pVS = 0;
    if (sumALL > 0) {
      pRO = Math.round((sumRO * 10000) / sumALL) / 100;
      pVS = Math.round((sumVS * 10000) / sumALL) / 100;
      const fix = Math.round((100 - (pRO + pVS)) * 100) / 100;
      pVS = Math.round((pVS + fix) * 100) / 100;
    }
    return { total, sumALL, sumRO, sumVS, pRO, pVS };
  }, [rows]);

  const currentProgram = programs.find((p) => p.id === selectedProgramId);

  // ======= EXPORT XLSX =======
  function exportXLSX() {
    if (!plan) return;

    // AOA data
    const aoa = [
      ["Predmet", "Šifra", "Tip (P/V)", "Nastavnik", "Angažman (RO/VS)", "Predavanja", "Vježbe", "Ukupno", "Sedmično P", "Sedmično V", "Sedmično ∑"],
    ];

    const merges = []; // merge Subject kolone po grupama (col 0)

    let excelRow = 1; // nakon headera
    groups.forEach((g) => {
      g.rows.forEach((r, idx) => {
        const subj = g.subject || {};
        const L = Number(r._edit?.lectureTotal ?? r.lectureTotal ?? 0);
        const E = Number(r._edit?.exerciseTotal ?? r.exerciseTotal ?? 0);
        const U = L + E;
        const Lw = (L / 15) || 0;
        const Ew = (E / 15) || 0;
        const Uw = (U / 15) || 0;
        const profId = r._edit?.professorId ?? r.professorId ?? "";
        const prof = profs.find((p) => p.id === profId) || r.professor || null;
        const anga = prof?.engagement ? ENG_MAP[prof.engagement] : "-";
        const kind = r._edit?.kind || "P";

        aoa.push([
          idx === 0 ? subj.name : "", // samo prvi red grupe puni naziv (radi merge-a)
          subj.code || "",
          kind,
          prof?.name || "",
          anga,
          L,
          E,
          U,
          Lw.toFixed(2),
          Ew.toFixed(2),
          Uw.toFixed(2),
        ]);
        excelRow++;
      });

      if (g.rows.length > 1) {
        // spoji Subject kolonu (A) od prvog do zadnjeg reda grupe
        const startR = excelRow - g.rows.length; // top ćelija grupe
        const endR = excelRow - 1; // bottom ćelija grupe
        merges.push({ s: { r: startR, c: 0 }, e: { r: endR, c: 0 } });
      }
    });

    // prazna linija, pa summary
    aoa.push([]);
    aoa.push(["Ukupno RO", "", "", "", "", computed.total.RO.L, computed.total.RO.E, computed.sumRO, "", "", ""]);
    aoa.push(["Udio RO (%)", "", "", "", "", "", "", `${computed.pRO.toFixed(2)}%`, "", "", ""]);
    aoa.push(["Ukupno VS", "", "", "", "", computed.total.VS.L, computed.total.VS.E, computed.sumVS, "", "", ""]);
    aoa.push(["Udio VS (%)", "", "", "", "", "", "", `${computed.pVS.toFixed(2)}%`, "", "", ""]);
    aoa.push(["Ukupno", "", "", "", "", computed.total.ALL.L, computed.total.ALL.E, computed.sumALL, "", "", ""]);
    aoa.push(["Udio ukupno", "", "", "", "", "", "", "100.00%", "", "", ""]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = merges;
    ws["!cols"] = [
      { wch: 36 }, // Predmet
      { wch: 10 }, // Šifra
      { wch: 7 },  // Tip
      { wch: 26 }, // Nastavnik
      { wch: 10 }, // Angažman
      { wch: 12 }, // P
      { wch: 12 }, // V
      { wch: 12 }, // ∑
      { wch: 12 }, // P/7
      { wch: 12 }, // V/7
      { wch: 12 }, // ∑/7
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = `${(currentProgram?.code || "Program")}-god${year}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    const fileBase = (currentProgram?.code || currentProgram?.name || "program").replace(/\s+/g, "_");
    XLSX.writeFile(wb, `plan_realizacije_${fileBase}_god${year}.xlsx`);
  }

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
              <button key={y} className="btn" style={{opacity: year===y?1:0.7}} onClick={()=>setYear(y)}>
                Godina {y}
              </button>
            ))}
          </div>
          <button className="btn" onClick={()=>loadPlan()} disabled={!selectedProgramId || loading}>
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs programi */}
      <div style={{display:"flex", gap:8, flexWrap:"wrap", margin:"8px 0"}}>
        {programs.map(p => (
          <button key={p.id} className="btn"
            style={{ background: selectedProgramId===p.id ? "#2a2f3a" : "transparent", border: "1px solid #3a4152" }}
            onClick={()=>setSelectedProgramId(p.id)} title={p.name}>
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
                <th></th><th></th><th></th><th></th>
                <th>Predavanja</th><th>Vježbe</th><th>Ukupno</th>
                <th>Predavanja</th><th>Vježbe</th><th>Ukupno</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    Nema redova za ovu godinu. Dodaj predmete u bazi i poveži program/godinu, pa klikni <button className="btn" onClick={()=>loadPlan()}>Refresh</button>.
                  </td>
                </tr>
              ) : groups.flatMap((g) =>
                  g.rows.map((r, idx) => {
                    const L  = Number(r._edit?.lectureTotal  ?? r.lectureTotal  ?? 0);
                    const E  = Number(r._edit?.exerciseTotal ?? r.exerciseTotal ?? 0);
                    const U  = L + E;
                    const Lw = (L/15) || 0, Ew = (E/15) || 0, Uw = (U/15) || 0;
                    const subj  = g.subject || {};
                    const ects  = subj.ects ?? "";
                    const joint = (subj.subjectPrograms || []).some(sp => sp.programId !== selectedProgramId);
                    const profId= r._edit?.professorId ?? r.professorId ?? "";
                    const prof  = profs.find(p=>p.id===profId) || r.professor || null;
                    const anga  = prof?.engagement ? ENG_MAP[prof.engagement] : "-";
                    const kind  = r._edit?.kind || "P";

                    return (
                      <tr key={r.id}>
                        {idx === 0 && (
                          <td rowSpan={g.rows.length}>
                            <div style={{fontWeight:600}}>{subj.name}</div>
                            <div style={{fontSize:12, opacity:0.8}}>
                              {subj.code ? `(${subj.code}) ` : ""}ECTS: {ects === "" ? "-" : ects}
                              {joint ? " • Zajednički predmet" : ""}
                            </div>
                          </td>
                        )}
                        <td>
                          <select
                            className="input small"
                            value={kind}
                            onChange={(e)=>changeRow(r.id,{ kind: e.target.value })}
                            style={{ width: 48, padding: "2px 6px" }}
                          >
                            <option value="P">P</option>
                            <option value="V">V</option>
                          </select>
                        </td>
                        <td style={{minWidth:220}}>
                          <select className="input" value={String(profId)} onChange={(e)=>changeRow(r.id,{ professorId: e.target.value })}>
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
                            style={{maxWidth:90, opacity: kind==="P" ? 1 : 0.6}}
                            disabled={kind !== "P"}
                          />
                        </td>
                        <td>
                          <input
                            className="input small"
                            value={E}
                            onChange={e=>changeRow(r.id,{ exerciseTotal: e.target.value })}
                            inputMode="numeric"
                            style={{maxWidth:90, opacity: kind==="V" ? 1 : 0.6}}
                            disabled={kind !== "V"}
                          />
                        </td>
                        <td>{U}</td>
                        <td>{Lw.toFixed(2)}</td>
                        <td>{Ew.toFixed(2)}</td>
                        <td>{Uw.toFixed(2)}</td>
                        <td style={{whiteSpace:"nowrap", display:"flex", gap:6}}>
                          <button className="btn" onClick={()=>saveRow(r)} disabled={r._edit?.saving}>
                            {r._edit?.saving ? "..." : "Save"}
                          </button>
                          {idx === 0 && (
                            <button className="btn" title="Dodaj nastavnika za ovaj predmet" onClick={()=>addTeacher(g.subjectId)}>
                              Dodaj nastavnika
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )
              }

              {/* Footer: RO/VS + Ukupno u istom redu s udjelima */}
              <tr>
                <td colSpan={4} style={{textAlign:"right", fontWeight:600}}>Ukupno iz radnog odnosa (RO):</td>
                <td>{computed.total.RO.L}</td>
                <td>{computed.total.RO.E}</td>
                <td>{computed.sumRO}</td>
                <td colSpan={2} style={{textAlign:"right", fontWeight:600}}>Udio RO (%):</td>
                <td>{computed.pRO.toFixed(2)}%</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={4} style={{textAlign:"right", fontWeight:600}}>Ukupno iz honorarnog angažmana (VS):</td>
                <td>{computed.total.VS.L}</td>
                <td>{computed.total.VS.E}</td>
                <td>{computed.sumVS}</td>
                <td colSpan={2} style={{textAlign:"right", fontWeight:600}}>Udio VS (%):</td>
                <td>{computed.pVS.toFixed(2)}%</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={4} style={{textAlign:"right", fontWeight:700}}>Ukupno:</td>
                <td>{computed.total.ALL.L}</td>
                <td>{computed.total.ALL.E}</td>
                <td>{computed.sumALL}</td>
                <td colSpan={2} style={{textAlign:"right", fontWeight:700}}>Udio ukupno:</td>
                <td>100.00%</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 12, display:"flex", gap:8 }}>
            <button className="btn" onClick={exportXLSX}>
              Download Excel (.xlsx)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** helpers */
function professorEngagement(prof) {
  return prof?.engagement === "EMPLOYED" || prof?.engagement === "EXTERNAL"
    ? prof.engagement
    : undefined;
}
function groupBySubject(rows) {
  const order = [];
  const map = new Map();
  rows.forEach((r) => {
    if (!map.has(r.subjectId)) {
      map.set(r.subjectId, []);
      order.push(r.subjectId);
    }
    map.get(r.subjectId).push(r);
  });
  return order.map((sid) => ({
    subjectId: sid,
    subject: map.get(sid)?.[0]?.subject,
    rows: map.get(sid),
  }));
}
