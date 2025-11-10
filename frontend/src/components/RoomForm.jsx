// frontend/src/components/RoomForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";

export default function RoomForm() {
  // add form
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isOnline, setIsOnline] = useState(false);

  // list + UI
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);

  // search / sort / pagination
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("name"); // name|capacity|isOnline
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // inline edit
  const [editId, setEditId] = useState(null);
  const [eName, setEName] = useState("");
  const [eCap, setECap] = useState("");
  const [eOnline, setEOnline] = useState(false);

  async function fetchList() {
    try {
      const data = await apiGet("/api/rooms");
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setList([]);
      setMsg({ type: "err", text: e.message });
    }
  }
  useEffect(()=>{ fetchList(); }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = {
        name: name.trim(),
        ...(capacity ? { capacity: Number(capacity) } : {}),
        isOnline,
      };
      await apiPost("/api/rooms", payload);
      setMsg({ type: "ok", text: "Saved" });
      setName(""); setCapacity(""); setIsOnline(false);
      fetchList();
    } catch (e2) {
      setMsg({ type: "err", text: e2.message });
    }
  }

  function startEdit(r) {
    setEditId(r.id);
    setEName(r.name || "");
    setECap(r.capacity ?? "");
    setEOnline(!!r.isOnline);
  }
  function cancelEdit() { setEditId(null); }
  async function saveEdit(id) {
    try {
      const payload = {
        name: eName.trim(),
        ...(eCap !== "" ? { capacity: Number(eCap) } : { capacity: null }),
        isOnline: !!eOnline,
      };
      await apiPut(`/api/rooms/${id}`, payload);
      setEditId(null);
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete?")) return;
    try {
      await apiDelete(`/api/rooms/${id}`);
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  // search/sort/paginate
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(r =>
      (r.name || "").toLowerCase().includes(q) ||
      String(r.capacity ?? "").toLowerCase().includes(q) ||
      (r.isOnline ? "online" : "offline").includes(q)
    );
  }, [list, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a,b) => {
      let va, vb;
      if (sortKey === "capacity") {
        va = a.capacity ?? 0; vb = b.capacity ?? 0;
        return (va - vb) * dir;
      } else if (sortKey === "isOnline") {
        va = a.isOnline ? 1 : 0; vb = b.isOnline ? 1 : 0;
        return (va - vb) * dir;
      } else {
        va = a.name ?? ""; vb = b.name ?? "";
        return String(va).localeCompare(String(vb), undefined, { sensitivity: "base" }) * dir;
      }
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
        <h2>Rooms</h2>
        <div className="form-row" style={{gap:8}}>
          <input className="input" placeholder="Pretraga…" value={query} onChange={e=>{ setQuery(e.target.value); setPage(1); }} />
          <button className="btn" onClick={fetchList}>Refresh</button>
        </div>
      </div>

      {/* add */}
      <form onSubmit={submit}>
        <div className="form-row">
          <input className="input" placeholder="Name (A-101)" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input small" placeholder="Capacity" value={capacity} onChange={e=>setCapacity(e.target.value)} inputMode="numeric" />
          <label style={{display:"flex",alignItems:"center",gap:8}}>
            <input type="checkbox" checked={isOnline} onChange={e=>setIsOnline(e.target.checked)} /> Online
          </label>
          <button className="btn" type="submit">Save</button>
        </div>
        {msg && <div className={msg.type==="ok"?"success":"error"}>{msg.text}</div>}
      </form>

      <h3>All Rooms</h3>
      <table className="table">
        <thead>
          <tr>
            <th onClick={()=>toggleSort("name")} style={{cursor:"pointer"}}>Name</th>
            <th onClick={()=>toggleSort("capacity")} style={{cursor:"pointer"}}>Capacity</th>
            <th onClick={()=>toggleSort("isOnline")} style={{cursor:"pointer"}}>Online</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pageItems.length === 0 ? (
            <tr><td colSpan="4">[]</td></tr>
          ) : pageItems.map(r => (
            <tr key={r.id}>
              {editId === r.id ? (
                <>
                  <td><input className="input small" value={eName} onChange={e=>setEName(e.target.value)} /></td>
                  <td><input className="input small" value={eCap} onChange={e=>setECap(e.target.value)} inputMode="numeric" /></td>
                  <td>
                    <label style={{display:"flex",alignItems:"center",gap:8}}>
                      <input type="checkbox" checked={eOnline} onChange={e=>setEOnline(e.target.checked)} /> Online
                    </label>
                  </td>
                  <td style={{whiteSpace:"nowrap"}}>
                    <button className="btn" onClick={()=>saveEdit(r.id)}>Save</button>{" "}
                    <button className="btn" onClick={cancelEdit}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{r.name}</td>
                  <td>{r.capacity ?? "-"}</td>
                  <td>{r.isOnline ? "Yes" : "No"}</td>
                  <td style={{whiteSpace:"nowrap"}}>
                    <button className="btn" onClick={()=>startEdit(r)}>Edit</button>{" "}
                    <button className="btn" onClick={()=>onDelete(r.id)}>Delete</button>
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
