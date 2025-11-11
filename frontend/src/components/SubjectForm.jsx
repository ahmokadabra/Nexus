// frontend/src/components/SubjectForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";

export default function SubjectForm() {
  // add form
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [ects, setEcts] = useState("");

  // program picker state (add form)
  const [programs, setPrograms] = useState([]); // [{programId, yearNumber}]
  const [availablePrograms, setAvailablePrograms] = useState([]);
  const [pickerProgramId, setPickerProgramId] = useState("");
  const [pickerYear, setPickerYear] = useState(1);

  // list + UI
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);

  // search / sort / pagination
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("code"); // code|name|ects
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // inline edit (bez promjene programa u ovom koraku)
  const [editId, setEditId] = useState(null);
  const [eCode, setECode] = useState("");
  const [eName, setEName] = useState("");
  const [eEcts, setEEcts] = useState("");

  async function fetchList() {
    try {
      const data = await apiGet("/api/subjects");
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setList([]);
      setMsg({ type: "err", text: e.message });
    }
  }
  async function fetchPrograms() {
    try {
      const data = await apiGet("/api/programs");
      setAvailablePrograms(Array.isArray(data) ? data : []);
    } catch {
      setAvailablePrograms([]);
    }
  }

  useEffect(() => { fetchList(); fetchPrograms(); }, []);

  function resetAdd() {
    setCode(""); setName(""); setEcts("");
    setPrograms([]);
    setPickerProgramId("");
    setPickerYear(1);
  }

  // add one program to the draft list
  function addProgramToDraft() {
    if (!pickerProgramId) {
      setMsg({ type: "err", text: "Odaberi studijski program" });
      return;
    }
    if (programs.some(p => p.programId === pickerProgramId)) {
      setMsg({ type: "err", text: "Program je već dodat" });
      return;
    }
    setPrograms(p => [...p, { programId: pickerProgramId, yearNumber: Number(pickerYear) || 1 }]);
  }
  function removeProgramFromDraft(pid) {
    setPrograms(p => p.filter(x => x.programId !== pid));
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      if (programs.length === 0) {
        setMsg({ type: "err", text: "Dodaj bar jedan studijski program" });
        return;
      }
      const payload = {
        name: name.trim(),
        ...(code.trim() ? { code: code.trim() } : {}),
        ...(ects ? { ects: Number(ects) } : {}),
        programs: programs.map(p => ({ programId: p.programId, yearNumber: Number(p.yearNumber) || 1 })),
      };
      await apiPost("/api/subjects", payload);
      setMsg({ type: "ok", text: "Saved" });
      resetAdd();
      fetchList();
    } catch (e2) {
      setMsg({ type: "err", text: e2.message });
    }
  }

  function startEdit(s) {
    setEditId(s.id);
    setECode(s.code || "");
    setEName(s.name || "");
    setEEcts(s.ects ?? "");
  }
  function cancelEdit() { setEditId(null); }
  async function saveEdit(id) {
    try {
      const payload = {
        ...(eName.trim() ? { name: eName.trim() } : {}),
        ...(eCode.trim() ? { code: eCode.trim() } : { code: null }),
        ...(eEcts !== "" ? { ects: Number(eEcts) } : { ects: null }),
        // NOTE: u ovom koraku ne ažuriramo programs (ostavljamo kasnije)
      };
      await apiPut(`/api/subjects/${id}`, payload);
      setEditId(null);
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete?")) return;
    try {
      await apiDelete(`/api/subjects/${id}`);
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  // search/sort/paginate
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(s => {
      const programsBag = (s.subjectPrograms || [])
        .map(sp => `${sp.program?.name || ""} ${sp.program?.code || ""} ${sp.yearNumber || ""}`)
        .join(" ")
        .toLowerCase();
      return (
        (s.code || "").toLowerCase().includes(q) ||
        (s.name || "").toLowerCase().includes(q) ||
        String(s.ects ?? "").toLowerCase().includes(q) ||
        programsBag.includes(q)
      );
    });
  }, [list, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a,b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      if (sortKey === "ects") return ((va||0) - (vb||0)) * dir;
      return String(va).localeCompare(String(vb), undefined, { sensitivity:"base" }) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage-1) * pageSize;
    return sorted.slice(start, start+pageSize);
  }, [sorted, safePage]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h2>Subjects</h2>
        <div className="form-row" style={{gap:8}}>
          <input className="input" placeholder="Pretraga…" value={query} onChange={e=>{ setQuery(e.target.value); setPage(1); }} />
          <button className="btn" onClick={fetchList}>Refresh</button>
        </div>
      </div>

      {/* add */}
      <form onSubmit={submit}>
        <div className="form-row">
          <input className="input" placeholder="Name *" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input small" placeholder="Code (opcionalno)" value={code} onChange={e=>setCode(e.target.value)} />
          <input className="input small" placeholder="ECTS (opcionalno)" value={ects} onChange={e=>setEcts(e.target.value)} inputMode="numeric" />
        </div>

        <div style={{marginTop:8, padding:8, border:"1px dashed #555", borderRadius:8}}>
          <strong>Studijski programi (bar 1) + godina</strong>
          <div className="form-row" style={{marginTop:8}}>
            <select className="input" value={pickerProgramId} onChange={e=>setPickerProgramId(e.target.value)}>
              <option value="">— Odaberi program —</option>
              {availablePrograms.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>
              ))}
            </select>
            <input className="input small" type="number" min={1} max={10} value={pickerYear} onChange={e=>setPickerYear(e.target.value)} />
            <button type="button" className="btn" onClick={addProgramToDraft}>Add</button>
          </div>

          {programs.length > 0 && (
            <ul style={{marginTop:8, display:"flex", gap:8, flexWrap:"wrap"}}>
              {programs.map(p => {
                const pr = availablePrograms.find(ap => ap.id === p.programId);
                const label = pr ? `${pr.name}${pr.code ? ` (${pr.code})` : ""} — ${p.yearNumber}. godina` : p.programId;
                return (
                  <li key={p.programId} style={{padding:"4px 8px", border:"1px solid #444", borderRadius:999}}>
                    {label}{" "}
                    <button type="button" className="btn" onClick={()=>removeProgramFromDraft(p.programId)}>×</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div style={{marginTop:8}}>
          <button className="btn" type="submit">Save</button>
        </div>
        {msg && <div className={msg.type==="ok"?"success":"error"}>{msg.text}</div>}
      </form>

      <h3>All Subjects</h3>
      <table className="table">
        <thead>
          <tr>
            <th onClick={()=>toggleSort("code")} style={{cursor:"pointer"}}>Code</th>
            <th onClick={()=>toggleSort("name")} style={{cursor:"pointer"}}>Name</th>
            <th onClick={()=>toggleSort("ects")} style={{cursor:"pointer"}}>ECTS</th>
            <th>Programs</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pageItems.length === 0 ? (
            <tr><td colSpan="5">[]</td></tr>
          ) : pageItems.map(s => (
            <tr key={s.id}>
              {editId === s.id ? (
                <>
                  <td><input className="input small" value={eCode} onChange={e=>setECode(e.target.value)} /></td>
                  <td><input className="input" value={eName} onChange={e=>setEName(e.target.value)} /></td>
                  <td><input className="input small" value={eEcts} onChange={e=>setEEcts(e.target.value)} inputMode="numeric" /></td>
                  <td>
                    {(s.subjectPrograms || []).map(sp => (
                      <div key={sp.programId}>
                        {sp.program?.code || sp.program?.name || sp.programId} — {sp.yearNumber}. g.
                      </div>
                    ))}
                  </td>
                  <td style={{whiteSpace:"nowrap"}}>
                    <button className="btn" onClick={()=>saveEdit(s.id)}>Save</button>{" "}
                    <button className="btn" onClick={cancelEdit}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{s.code ?? "-"}</td>
                  <td>{s.name}</td>
                  <td>{s.ects ?? "-"}</td>
                  <td>
                    {(s.subjectPrograms || []).length === 0 ? "-" :
                      (s.subjectPrograms || []).map(sp => (
                        <div key={sp.programId}>
                          {sp.program?.code || sp.program?.name || sp.programId} — {sp.yearNumber}. g.
                        </div>
                      ))
                    }
                  </td>
                  <td style={{whiteSpace:"nowrap"}}>
                    <button className="btn" onClick={()=>startEdit(s)}>Edit</button>{" "}
                    <button className="btn" onClick={()=>onDelete(s.id)}>Delete</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{display:"flex", gap:8, alignItems:"center", marginTop:8}}>
        <button className="btn" disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
        <span>Page {safePage} / {totalPages}</span>
        <button className="btn" disabled={safePage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button>
      </div>
    </div>
  );
}
