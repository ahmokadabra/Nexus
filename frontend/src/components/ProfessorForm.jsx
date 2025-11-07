// frontend/src/components/ProfessorForm.jsx
import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete } from "../lib/api";

// Enum iz backenda -> labeli na bosanskom
const TITLE_OPTIONS = [
  { value: "", label: "(bez zvanja)" },
  { value: "PRACTICE_EXPERT", label: "Stručnjak iz prakse" },
  { value: "ASSISTANT", label: "Asistent" },
  { value: "SENIOR_ASSISTANT", label: "Viši asistent" },
  { value: "DOCENT", label: "Docent" },
  { value: "ASSOCIATE_PROFESSOR", label: "Vanredni profesor" },
  { value: "FULL_PROFESSOR", label: "Redovni profesor" },
  { value: "PROFESSOR_EMERITUS", label: "Profesor emeritus" },
];

function renderTitle(v) {
  const m = TITLE_OPTIONS.find(o => o.value === v);
  return m ? m.label : "-";
}

export default function ProfessorForm() {
  const empty = { name: "", email: "", phone: "", title: "" };
  const [form, setForm] = useState(empty);
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchList() {
    setLoading(true);
    setMsg(null);
    try {
      const data = await apiGet("/api/professors");
      setList(data);
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm(s => ({ ...s, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await apiPost("/api/professors", {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        title: form.title || undefined,
      });
      setForm(empty);
      await fetchList();
      setMsg({ type: "ok", text: "Sačuvano" });
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  async function onDelete(id) {
    if (!confirm("Obrisati profesora?")) return;
    setMsg(null);
    try {
      await apiDelete(`/api/professors/${id}`);
      await fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2>Professors</h2>
        <button className="btn" onClick={fetchList} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <form onSubmit={submit}>
        <div className="form-row">
          <input className="input" name="name" placeholder="Puno ime"
                 value={form.name} onChange={onChange} required />
          <input className="input" name="email" placeholder="Email"
                 value={form.email} onChange={onChange} />
          <input className="input small" name="phone" placeholder="Telefon"
                 value={form.phone} onChange={onChange} />
          <select className="input small" name="title" value={form.title} onChange={onChange}>
            {TITLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <button className="btn" type="submit" disabled={loading}>Save</button>
        {msg && <div className={msg.type==="ok"?"success":"error"} style={{marginTop:8}}>{msg.text}</div>}
      </form>

      <h3>All Professors</h3>
      {loading && list.length===0 ? (
        <div>Loading…</div>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Ime</th><th>Zvanje</th><th>Email</th><th>Telefon</th><th style={{width:120}}>Akcije</th></tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{renderTitle(p.title)}</td>
                <td>{p.email || "-"}</td>
                <td>{p.phone || "-"}</td>
                <td><button className="btn" onClick={() => onDelete(p.id)}>Delete</button></td>
              </tr>
            ))}
            {list.length===0 && <tr><td colSpan={5} style={{textAlign:"center",opacity:.7}}>Nema podataka</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
