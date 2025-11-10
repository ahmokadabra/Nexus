// frontend/src/components/ProfessorForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete, apiUrl } from "../lib/api";

const TITLE_OPTIONS = [
  ["", "— Zvanje —"],
  ["PRACTITIONER", "Stručnjak iz prakse"],
  ["ASSISTANT", "Asistent"],
  ["SENIOR_ASSISTANT", "Viši asistent"],
  ["ASSISTANT_PROFESSOR", "Docent"],
  ["ASSOCIATE_PROFESSOR", "Vanredni profesor"],
  ["FULL_PROFESSOR", "Redovni profesor"],
  ["PROFESSOR_EMERITUS", "Profesor emeritus"],
];

const ENGAGEMENT_OPTIONS = [
  ["", "— Angažman —"],
  ["EMPLOYED", "Radni odnos"],
  ["EXTERNAL", "Vanjski saradnik"],
];

function titleLabel(code) {
  const f = TITLE_OPTIONS.find(([c]) => c === code);
  return f ? f[1] : "-";
}
function engagementLabel(code) {
  const f = ENGAGEMENT_OPTIONS.find(([c]) => c === code);
  return f ? f[1] : "-";
}

export default function ProfessorForm() {
  // add form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [engagement, setEngagement] = useState("");

  // list + UI state
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);

  // search / sort / pagination
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("name"); // name|email|phone|title|engagement
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // inline edit
  const [editId, setEditId] = useState(null);
  const [eName, setEName] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eTitle, setETitle] = useState("");
  const [eEng, setEEng] = useState("");

  async function fetchList() {
    try {
      const data = await apiGet("/api/professors");
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setList([]);
      setMsg({ type: "err", text: e.message });
    }
  }
  useEffect(() => { fetchList(); }, []);

  function resetAddForm() {
    setName(""); setEmail(""); setPhone(""); setTitle(""); setEngagement("");
  }

  // ADD
  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = {
        name: name.trim(),
        ...(email ? { email: email.trim() } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(title ? { title } : {}),
        ...(engagement ? { engagement } : {}),
      };
      await apiPost("/api/professors", payload);
      setMsg({ type: "ok", text: "Saved" });
      resetAddForm();
      fetchList();
    } catch (e2) {
      setMsg({ type: "err", text: e2.message });
    }
  }

  // inline EDIT
  function startEdit(p) {
    setEditId(p.id);
    setEName(p.name || "");
    setEEmail(p.email || "");
    setEPhone(p.phone || "");
    setETitle(p.title || "");
    setEEng(p.engagement || "");
  }
  function cancelEdit() { setEditId(null); }
  async function saveEdit(id) {
    try {
      const payload = {
        name: eName.trim(),
        ...(eEmail ? { email: eEmail.trim() } : { email: null }),
        ...(ePhone ? { phone: ePhone.trim() } : { phone: null }),
        ...(eTitle ? { title: eTitle } : { title: null }),
        ...(eEng ? { engagement: eEng } : { engagement: null }),
      };
      await apiPut(`/api/professors/${id}`, payload);
      setEditId(null);
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  // DELETE
  async function onDelete(id) {
    if (!confirm("Delete?")) return;
    try {
      await apiDelete(`/api/professors/${id}`);
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  // DOWNLOAD XLSX  ✅
  async function downloadXlsx() {
    setMsg(null);
    try {
      const url = apiUrl("/api/professors/export.xlsx");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "profesori.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setMsg({ type: "err", text: `Download nije uspio: ${e.message}` });
    }
  }

  // filtering / sorting / pagination
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.phone || "").toLowerCase().includes(q) ||
      titleLabel(p.title).toLowerCase().includes(q) ||
      engagementLabel(p.engagement).toLowerCase().includes(q)
    );
  }, [list, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const va = (sortKey === "title") ? titleLabel(a.title)
               : (sortKey === "engagement") ? engagementLabel(a.engagement)
               : (a[sortKey] ?? "");
      const vb = (sortKey === "title") ? titleLabel(b.title)
               : (sortKey === "engagement") ? engagementLabel(b.engagement)
               : (b[sortKey] ?? "");
      return String(va).localeCompare(String(vb), undefined, { sensitivity: "base" }) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h2>Professors</h2>
        <div className="form-row" style={{gap:8}}>
          <input className="input" placeholder="Pretraga…" value={query} onChange={e=>{ setQuery(e.target.value); setPage(1); }} />
          <button className="btn" onClick={fetchList}>Refresh</button>
          <button className="btn" onClick={downloadXlsx}>Download XLSX</button>
        </div>
      </div>

      {/* ADD form */}
      <form onSubmit={submit}>
        <div className="form-row">
          <input className="input" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="input" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
        </div>
        <div className="form-row">
          <select className="input small" value={title} onChange={e=>setTitle(e.target.value)}>
            {TITLE_OPTIONS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input small" value={engagement} onChange={e=>setEngagement(e.target.value)}>
            {ENGAGEMENT_OPTIONS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="btn" type="submit">Save</button>
        </div>
        {msg && <div className={msg.type==="ok"?"success":"error"}>{msg.text}</div>}
      </form>

      <h3>All Professors</h3>
      <table className="table">
        <thead>
          <tr>
            <th onClick={()=>toggleSort("name")} style={{cursor:"pointer"}}>Name</th>
            <th onClick={()=>toggleSort("email")} style={{cursor:"pointer"}}>Email</th>
            <th onClick={()=>toggleSort("phone")} style={{cursor:"pointer"}}>Phone</th>
            <th onClick={()=>toggleSort("title")} style={{cursor:"pointer"}}>Zvanje</th>
            <th onClick={()=>toggleSort("engagement")} style={{cursor:"pointer"}}>Angažman</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pageItems.length === 0 ? (
            <tr><td colSpan="6">[]</td></tr>
          ) : pageItems.map(p => (
            <tr key={p.id}>
              {editId === p.id ? (
                <>
                  <td><input className="input small" value={eName} onChange={e=>setEName(e.target.value)} /></td>
                  <td><input className="input small" value={eEmail} onChange={e=>setEEmail(e.target.value)} /></td>
                  <td><input className="input small" value={ePhone} onChange={e=>setEPhone(e.target.value)} /></td>
                  <td>
                    <select className="input small" value={eTitle} onChange={e=>setETitle(e.target.value)}>
                      {TITLE_OPTIONS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="input small" value={eEng} onChange={e=>setEEng(e.target.value)}>
                      {ENGAGEMENT_OPTIONS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td style={{whiteSpace:"nowrap"}}>
                    <button className="btn" onClick={()=>saveEdit(p.id)}>Save</button>{" "}
                    <button className="btn" onClick={cancelEdit}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{p.name}</td>
                  <td>{p.email ?? "-"}</td>
                  <td>{p.phone ?? "-"}</td>
                  <td>{titleLabel(p.title)}</td>
                  <td>{engagementLabel(p.engagement)}</td>
                  <td style={{whiteSpace:"nowrap"}}>
                    <button className="btn" onClick={()=>startEdit(p)}>Edit</button>{" "}
                    <button className="btn" onClick={()=>onDelete(p.id)}>Delete</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div style={{display:"flex", gap:8, alignItems:"center", marginTop:8}}>
        <button className="btn" disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
        <span>Page {safePage} / {totalPages}</span>
        <button className="btn" disabled={safePage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button>
      </div>
    </div>
  );
}
