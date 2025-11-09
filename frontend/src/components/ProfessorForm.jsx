// frontend/src/components/ProfessorForm.jsx
import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";

// mape za prikaz
const PRETTY_TITLE = {
  PRACTITIONER: "Stručnjak iz prakse",
  ASSISTANT: "Asistent",
  SENIOR_ASSISTANT: "Viši asistent",
  ASSISTANT_PROFESSOR: "Docent",
  ASSOCIATE_PROFESSOR: "Vanredni profesor",
  FULL_PROFESSOR: "Redovni profesor",
  PROFESSOR_EMERITUS: "Profesor emeritus",
};
const PRETTY_ENG = { EMPLOYED: "Radni odnos", EXTERNAL: "Vanjski saradnik" };

const TITLE_OPTIONS = [
  { v: "", label: "— Zvanje —" },
  { v: "PRACTITIONER", label: "Stručnjak iz prakse" },
  { v: "ASSISTANT", label: "Asistent" },
  { v: "SENIOR_ASSISTANT", label: "Viši asistent" },
  { v: "ASSISTANT_PROFESSOR", label: "Docent" },
  { v: "ASSOCIATE_PROFESSOR", label: "Vanredni profesor" },
  { v: "FULL_PROFESSOR", label: "Redovni profesor" },
  { v: "PROFESSOR_EMERITUS", label: "Profesor emeritus" },
];

const ENG_OPTIONS = [
  { v: "", label: "— Angažman —" },
  { v: "EMPLOYED", label: "Radni odnos" },
  { v: "EXTERNAL", label: "Vanjski saradnik" },
];

export default function ProfessorForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [engagement, setEngagement] = useState("");

  const [msg, setMsg] = useState(null);
  const [list, setList] = useState([]);

  const [editingId, setEditingId] = useState(null);

  const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

  async function fetchList() {
    try {
      const data = await apiGet("/api/professors");
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  useEffect(() => {
    fetchList();
  }, []);

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setTitle("");
    setEngagement("");
    setEditingId(null);
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    const payload = {
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      title: title || undefined,
      engagement: engagement || undefined,
    };
    try {
      if (editingId) {
        await apiPut(`/api/professors/${editingId}`, payload);
        setMsg({ type: "ok", text: "Sačuvano" });
      } else {
        await apiPost("/api/professors", payload);
        setMsg({ type: "ok", text: "Sačuvano" });
      }
      resetForm();
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message || "DB error" });
    }
  }

  function onEdit(p) {
    setEditingId(p.id);
    setName(p.name || "");
    setEmail(p.email || "");
    setPhone(p.phone || "");
    setTitle(p.title || "");
    setEngagement(p.engagement || "");
  }

  async function onDelete(id) {
    if (!confirm("Obrisati profesora?")) return;
    try {
      await apiDelete(`/api/professors/${id}`);
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  async function downloadExcel() {
    try {
      const url = `${API_BASE}/api/professors/export.xlsx`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error("Download nije uspio");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "profesori.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  return (
    <div>
      <div className="header-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
        <h2>Professors</h2>
        <div style={{display:"flex",gap:8}}>
          <button className="btn" onClick={fetchList}>Refresh</button>
          <button className="btn" onClick={downloadExcel}>Preuzmi Excel</button>
        </div>
      </div>

      <form onSubmit={submit}>
        <div className="form-row" style={{flexWrap:"wrap", gap:8}}>
          <input className="input" placeholder="Ime i prezime" value={name} onChange={(e)=>setName(e.target.value)} required />
          <input className="input" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input className="input small" placeholder="Telefon" value={phone} onChange={(e)=>setPhone(e.target.value)} />
          <select className="input small" value={title} onChange={(e)=>setTitle(e.target.value)}>
            {TITLE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
          <select className="input small" value={engagement} onChange={(e)=>setEngagement(e.target.value)}>
            {ENG_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
          <button className="btn" type="submit">{editingId ? "Update" : "Save"}</button>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>Cancel</button>
          )}
        </div>
        {msg && <div className={msg.type === "ok" ? "success" : "error"}>{msg.text}</div>}
      </form>

      <h3>All Professors</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Ime i prezime</th>
            <th>Email</th>
            <th>Telefon</th>
            <th>Zvanje</th>
            <th>Angažman</th>
            <th style={{width:140}}>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan="6">[]</td></tr>
          ) : (
            list.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.email || "-"}</td>
                <td>{p.phone || "-"}</td>
                <td>{p.title ? PRETTY_TITLE[p.title] : "-"}</td>
                <td>{p.engagement ? PRETTY_ENG[p.engagement] : "-"}</td>
                <td>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn" onClick={()=>onEdit(p)}>Edit</button>
                    <button className="btn" onClick={()=>onDelete(p.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
