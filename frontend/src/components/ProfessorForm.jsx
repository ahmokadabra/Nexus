// frontend/src/components/ProfessorForm.jsx
import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";
import * as XLSX from "xlsx";

// Enum -> label (B/H/S) mapiranja
const TITLE_OPTIONS = [
  { value: "",                   label: "— bez zvanja —" },
  { value: "PRACTITIONER",       label: "Stručnjak iz prakse" },
  { value: "ASSISTANT",          label: "Asistent" },
  { value: "SENIOR_ASSISTANT",   label: "Viši asistent" },
  { value: "ASSISTANT_PROFESSOR",label: "Docent" },
  { value: "ASSOCIATE_PROFESSOR",label: "Vanredni profesor" },
  { value: "FULL_PROFESSOR",     label: "Redovni profesor" },
  { value: "PROFESSOR_EMERITUS", label: "Profesor emeritus" },
];
const TITLE_LABELS = Object.fromEntries(TITLE_OPTIONS.map(o => [o.value, o.label]));

const ENGAGEMENT_OPTIONS = [
  { value: "",         label: "— bez angažmana —" },
  { value: "EMPLOYED", label: "Radni odnos" },
  { value: "EXTERNAL", label: "Vanjski saradnik" }
];
const ENGAGEMENT_LABELS = Object.fromEntries(ENGAGEMENT_OPTIONS.map(o => [o.value, o.label]));

export default function ProfessorForm() {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [phone, setPhone]       = useState("");
  const [title, setTitle]       = useState("");
  const [engagement, setEngagement] = useState("");

  const [list, setList]         = useState([]);
  const [msg, setMsg]           = useState(null);

  // edit state
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchList(); }, []);

  async function fetchList() {
    try {
      const data = await apiGet("/api/professors");
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    }
  }

  function normalizePayload() {
    return {
      name,
      email: email || undefined,
      phone: phone || undefined,
      title: title || undefined,               // šaljemo enum vrijednost ili undefined
      engagement: engagement || undefined,     // enum ili undefined
    };
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    const payload = normalizePayload();

    try {
      if (editingId) {
        // update
        const res = await apiPut(`/api/professors/${editingId}`, payload);
        if (res && res.id) {
          setMsg({ type: "ok", text: "Ažurirano." });
          resetForm();
          fetchList();
        } else {
          setMsg({ type: "err", text: res?.message || "Greška pri ažuriranju" });
        }
      } else {
        // create
        const res = await apiPost("/api/professors", payload);
        if (res && res.id) {
          setMsg({ type: "ok", text: "Sačuvano." });
          resetForm();
          fetchList();
        } else {
          setMsg({ type: "err", text: res?.message || "Greška pri čuvanju" });
        }
      }
    } catch (err) {
      setMsg({ type: "err", text: err.message || "Greška" });
    }
  }

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setTitle("");
    setEngagement("");
    setEditingId(null);
  }

  function startEdit(p) {
    setEditingId(p.id);
    setName(p.name || "");
    setEmail(p.email || "");
    setPhone(p.phone || "");
    setTitle(p.title || "");
    setEngagement(p.engagement || "");
    setMsg(null);
  }

  async function remove(id) {
    if (!confirm("Obrisati profesora?")) return;
    setMsg(null);
    try {
      await apiDelete(`/api/professors/${id}`);
      setMsg({ type: "ok", text: "Obrisano." });
      if (editingId === id) resetForm();
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message || "Ne može se obrisati." });
    }
  }

  function exportExcel() {
    // koristimo B/H/S labele pri exportu
    const rows = (list || []).map(p => ({
      Ime: p.name || "",
      Email: p.email || "",
      Telefon: p.phone || "",
      Zvanje: p.title ? (TITLE_LABELS[p.title] || p.title) : "",
      "Angažman": p.engagement ? (ENGAGEMENT_LABELS[p.engagement] || p.engagement) : "",
      Kreirano: p.createdAt ? new Date(p.createdAt).toLocaleString() : "",
      Ažurirano: p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Profesori");
    XLSX.writeFile(wb, "Profesori.xlsx");
  }

  return (
    <div>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <h2>Professors</h2>
        <div style={{display: "flex", gap: 8}}>
          <button className="btn" onClick={fetchList}>Refresh</button>
          <button className="btn" onClick={exportExcel}>Download Excel</button>
        </div>
      </div>

      <form onSubmit={submit}>
        <div className="form-row">
          <input className="input" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="input small" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
        </div>

        <div className="form-row">
          <select className="input" value={title} onChange={e=>setTitle(e.target.value)}>
            {TITLE_OPTIONS.map(opt => (
              <option key={opt.value || "none"} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select className="input" value={engagement} onChange={e=>setEngagement(e.target.value)}>
            {ENGAGEMENT_OPTIONS.map(opt => (
              <option key={opt.value || "none"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div style={{display:"flex", gap:8}}>
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
            <th>Name</th><th>Email</th><th>Phone</th><th>Zvanje</th><th>Angažman</th><th style={{width:150}}>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {(list || []).map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.email || "-"}</td>
              <td>{p.phone || "-"}</td>
              <td>{p.title ? (TITLE_LABELS[p.title] || p.title) : "-"}</td>
              <td>{p.engagement ? (ENGAGEMENT_LABELS[p.engagement] || p.engagement) : "-"}</td>
              <td>
                <div style={{display:"flex", gap:8}}>
                  <button className="btn" onClick={() => startEdit(p)}>Edit</button>
                  <button className="btn" onClick={() => remove(p.id)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {(!list || list.length === 0) && (
            <tr><td colSpan={6} style={{textAlign:"center"}}>Nema zapisa</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
