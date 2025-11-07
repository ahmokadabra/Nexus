// frontend/src/components/ProfessorForm.jsx
import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";

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
  const m = TITLE_OPTIONS.find((o) => o.value === (v || ""));
  return m ? m.label : "-";
}

export default function ProfessorForm() {
  const empty = { name: "", email: "", phone: "", title: "" };
  const [form, setForm] = useState(empty);
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

  useEffect(() => {
    fetchList();
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    const payload = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      title: form.title || undefined, // enum vrijednost
    };

    try {
      if (editingId) {
        await apiPut(`/api/professors/${editingId}`, payload);
        setMsg({ type: "ok", text: "Ažurirano" });
      } else {
        await apiPost("/api/professors", payload);
        setMsg({ type: "ok", text: "Sačuvano" });
      }
      setForm(empty);
      setEditingId(null);
      await fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  function onEdit(p) {
    setForm({
      name: p.name || "",
      email: p.email || "",
      phone: p.phone || "",
      title: p.title || "",
    });
    setEditingId(p.id);
    setMsg(null);
  }

  function onCancel() {
    setForm(empty);
    setEditingId(null);
    setMsg(null);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Professors</h2>
        <button className="btn" onClick={fetchList} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <form onSubmit={submit}>
        <div className="form-row">
          <input
            className="input"
            name="name"
            placeholder="Puno ime"
            value={form.name}
            onChange={onChange}
            required
          />
          <input
            className="input"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={onChange}
          />
          <input
            className="input small"
            name="phone"
            placeholder="Telefon"
            value={form.phone}
            onChange={onChange}
          />
          <select
            className="input small"
            name="title"
            value={form.title}
            onChange={onChange}
          >
            {TITLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="submit" disabled={loading}>
            {editingId ? "Update" : "Save"}
          </button>
          {editingId && (
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>

        {msg && (
          <div className={msg.type === "ok" ? "success" : "error"} style={{ marginTop: 8 }}>
            {msg.text}
          </div>
        )}
      </form>

      <h3>All Professors</h3>
      {loading && list.length === 0 ? (
        <div>Loading…</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Ime</th>
              <th>Zvanje</th>
              <th>Email</th>
              <th>Telefon</th>
              <th style={{ width: 160 }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{renderTitle(p.title)}</td>
                <td>{p.email || "-"}</td>
                <td>{p.phone || "-"}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => onEdit(p)}>
                    Edit
                  </button>
                  <button className="btn" onClick={() => onDelete(p.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", opacity: 0.7 }}>
                  Nema podataka
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
