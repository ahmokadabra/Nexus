// frontend/src/components/SubjectForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";

export default function SubjectForm() {
  // add form
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [ects, setEcts] = useState("");

  // list + UI
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);

  // search / sort / pagination
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("code"); // code|name|ects
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // inline edit
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
  useEffect(() => { fetchList(); }, []);

  function resetAdd() { setCode(""); setName(""); setEcts(""); }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        ...(ects ? { ects: Number(ects) } : {}),
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
        code: eCode.trim(),
        name: eName.trim(),
        ...(eEcts !== "" ? { ects: Number(eEcts) } : { ects: null }),
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
    return list.filter(s =>
      (s.code || "").toLowerCase().includes(q) ||
      (s.name || "").toLowerCase().includes(q) ||
      String(s.ects ?? "").toLowerCase().includes(q)
    );
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
          <input className="input small" placeholder="Code" value={code} onChange={e=>setCode(e.target.value)} required />
          <input className="input" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input small" placeholder="ECTS" value={ects} onChange={e=>setEcts(e.target.value)} inputMode="numeric" />
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pageItems.length === 0 ? (
            <tr><td colSpan="4">[]</td></tr>
          ) : pageItems.map(s => (
            <tr key={s.id}>
              {editId === s.id ? (
                <>
                  <td><input className="input small" value={eCode} onChange={e=>setECode(e.target.value)} /></td>
                  <td><input className="input" value={eName} onChange={e=>setEName(e.target.value)} /></td>
                  <td><input className="input small" value={eEcts} onChange={e=>setEEcts(e.target.value)} inputMode="numeric" /></td>
                  <td style={{whiteSpace:"nowrap"}}>
                    <button className="btn" onClick={()=>saveEdit(s.id)}>Save</button>{" "}
                    <button className="btn" onClick={cancelEdit}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{s.code}</td>
                  <td>{s.name}</td>
                  <td>{s.ects ?? "-"}</td>
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
