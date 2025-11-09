// frontend/src/components/ProfessorForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";

const TITLE_OPTIONS = [
  { value: "",                    label: "— Zvanje —" },
  { value: "PRACTITIONER",        label: "Stručnjak iz prakse" },
  { value: "ASSISTANT",           label: "Asistent" },
  { value: "SENIOR_ASSISTANT",    label: "Viši asistent" },
  { value: "ASSISTANT_PROFESSOR", label: "Docent" },
  { value: "ASSOCIATE_PROFESSOR", label: "Vanredni profesor" },
  { value: "FULL_PROFESSOR",      label: "Redovni profesor" },
  { value: "PROFESSOR_EMERITUS",  label: "Profesor emeritus" },
];

const ENGAGEMENT_OPTIONS = [
  { value: "",          label: "— Angažman —" },
  { value: "EMPLOYED",  label: "Radni odnos" },
  { value: "EXTERNAL",  label: "Vanjski saradnik" },
];

const titleLabel = (v) => {
  const f = TITLE_OPTIONS.find(o => o.value === v);
  return f?.label ?? "-";
};
const engagementLabel = (v) => {
  const f = ENGAGEMENT_OPTIONS.find(o => o.value === v);
  return f?.label ?? "-";
};

export default function ProfessorForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [engagement, setEngagement] = useState("");

  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const csvData = useMemo(() => list.map(p => ({
    Name: p.name || "",
    Email: p.email || "",
    Phone: p.phone || "",
    Title: titleLabel(p.title),
    Engagement: engagementLabel(p.engagement),
  })), [list]);

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
    setEditingId(p.id);
    setName(p.name || "");
    setEmail(p.email || "");
    setPhone(p.phone || "");
    setTitle(p.title || "");
    setEngagement(p.engagement || "");
    setMsg(null);
  }

  async function onDelete(id) {
    if (!confirm("Delete this professor?")) return;
    try {
      await apiDelete(`/api/professors/${id}`);
      setMsg({ type: "ok", text: "Deleted" });
      if (editingId === id) resetForm();
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  function downloadCSV() {
    if (!csvData.length) return;
    const headers = Object.keys(csvData[0]);
    const rows = csvData.map(obj =>
      headers.map(h => {
        const v = (obj[h] ?? "").toString().replace(/"/g, '""');
        return `"${v}"`;
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "profesori.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <h2>Professors</h2>

      <form onSubmit={submit}>
        <div className="form-row">
          <input className="input" placeholder="Full name"
                 value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input" placeholder="Email"
                 value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="input small" placeholder="Phone"
                 value={phone} onChange={e=>setPhone(e.target.value)} />
        </div>

        <div className="form-row">
          <select className="input" value={title} onChange={e=>setTitle(e.target.value)}>
            {TITLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="input" value={engagement} onChange={e=>setEngagement(e.target.value)}>
            {ENGAGEMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="form-row" style={{ gap: 8 }}>
          <button className="btn" type="submit">{editingId ? "Update" : "Save"}</button>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>Cancel</button>
          )}
          <button type="button" className="btn" onClick={downloadCSV}>Download CSV</button>
        </div>

        {msg && <div className={msg.type==="ok"?"success":"error"}>{msg.text}</div>}
      </form>

      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
        <h3 style={{ margin:0 }}>All Professors</h3>
        <button className="btn" type="button" onClick={fetchList}>Refresh</button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Phone</th><th>Zvanje</th><th>Angažman</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan="6">[]</td></tr>
          ) : (
            list.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.email || "-"}</td>
                <td>{p.phone || "-"}</td>
                <td>{titleLabel(p.title)}</td>
                <td>{engagementLabel(p.engagement)}</td>
                <td style={{ display:"flex", gap:8 }}>
                  <button className="btn" type="button" onClick={() => onEdit(p)}>Edit</button>
                  <button className="btn" type="button" onClick={() => onDelete(p.id)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
