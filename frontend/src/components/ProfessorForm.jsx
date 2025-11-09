import React, { useEffect, useState } from "react";
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [engagement, setEngagement] = useState("");
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);

  const [editId, setEditId] = useState(null);

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

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setTitle("");
    setEngagement("");
    setEditId(null);
  }

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

      if (editId) {
        await apiPut(`/api/professors/${editId}`, payload);
        setMsg({ type: "ok", text: "Updated" });
      } else {
        await apiPost("/api/professors", payload);
        setMsg({ type: "ok", text: "Saved" });
      }
      resetForm();
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  function onEdit(p) {
    setEditId(p.id);
    setName(p.name || "");
    setEmail(p.email || "");
    setPhone(p.phone || "");
    setTitle(p.title || "");
    setEngagement(p.engagement || "");
  }

  async function onDelete(id) {
    if (!confirm("Delete?")) return;
    try {
      await apiDelete(`/api/professors/${id}`);
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  async function downloadXlsx() {
    setMsg(null);
    try {
      const url = apiUrl("/api/professors/export.xlsx");
      const res = await fetch(url, { method: "GET" });
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

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h2>Professors</h2>
        <div style={{display:"flex", gap:8}}>
          <button className="btn" onClick={fetchList}>Refresh</button>
          <button className="btn" onClick={downloadXlsx}>Download XLSX</button>
        </div>
      </div>

      <form onSubmit={submit}>
        <div className="form-row">
          <input className="input" placeholder="Full name"
                 value={name} onChange={(e)=>setName(e.target.value)} required />
          <input className="input" placeholder="Email"
                 value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input className="input" placeholder="Phone"
                 value={phone} onChange={(e)=>setPhone(e.target.value)} />
        </div>
        <div className="form-row">
          <select className="input small" value={title} onChange={(e)=>setTitle(e.target.value)}>
            {TITLE_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select className="input small" value={engagement} onChange={(e)=>setEngagement(e.target.value)}>
            {ENGAGEMENT_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button className="btn" type="submit">{editId ? "Update" : "Save"}</button>
          {editId && <button type="button" className="btn" onClick={resetForm}>Cancel</button>}
        </div>
        {msg && <div className={msg.type==="ok"?"success":"error"}>{msg.text}</div>}
      </form>

      <h3>All Professors</h3>
      <table className="table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Zvanje</th><th>Angažman</th><th></th></tr></thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan="6">[]</td></tr>
          ) : (
            list.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.email ?? "-"}</td>
                <td>{p.phone ?? "-"}</td>
                <td>{titleLabel(p.title)}</td>
                <td>{engagementLabel(p.engagement)}</td>
                <td style={{whiteSpace:"nowrap"}}>
                  <button className="btn" onClick={()=>onEdit(p)}>Edit</button>{" "}
                  <button className="btn" onClick={()=>onDelete(p.id)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
