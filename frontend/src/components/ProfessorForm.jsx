// frontend/src/components/ProfessorForm.jsx
import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";

export default function ProfessorForm() {
  // forma
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // stanje
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);

  async function fetchList() {
    setLoading(true);
    setMsg(null);
    try {
      const data = await apiGet("/api/professors");
      setList(data);
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Failed to load professors." });
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, []);

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setEditingId(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      if (editingId) {
        await apiPut(`/api/professors/${editingId}`, {
          name, email: email || undefined, phone: phone || undefined,
        });
        setMsg({ type: "ok", text: "Professor updated." });
      } else {
        await apiPost("/api/professors", {
          name, email: email || undefined, phone: phone || undefined,
        });
        setMsg({ type: "ok", text: "Professor saved." });
      }
      resetForm();
      fetchList();
    } catch (e) {
      // P2002 (unique email) ili generički
      const payload = e.payload || {};
      const nice =
        payload?.message ||
        (payload?.code === "P2002" ? "Email already exists." : "") ||
        e.message ||
        "Error";
      setMsg({ type: "error", text: nice });
    }
  }

  function onEdit(p) {
    setEditingId(p.id);
    setName(p.name || "");
    setEmail(p.email || "");
    setPhone(p.phone || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onDelete(id) {
    if (!confirm("Delete this professor?")) return;
    setMsg(null);
    try {
      await apiDelete(`/api/professors/${id}`);
      setMsg({ type: "ok", text: "Deleted." });
      // optimistički refresh
      setList((prev) => prev.filter((x) => x.id !== id));
      if (editingId === id) resetForm();
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Cannot delete." });
    }
  }

  return (
    <div>
      <div className="form-header">
        <h2>Professors</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={fetchList} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          {editingId && (
            <button className="btn" type="button" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit}>
        {editingId ? (
          <div className="hint" style={{ marginBottom: 8 }}>
            Editing <strong>{editingId}</strong>
          </div>
        ) : null}

        <div className="form-row">
          <input
            className="input"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Email (optional, unique)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input small"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {editingId ? "Update" : "Save"}
        </button>

        {msg && (
          <div className={msg.type === "ok" ? "success" : "error"} style={{ marginTop: 8 }}>
            {msg.text}
          </div>
        )}
      </form>

      <h3 style={{ marginTop: 16 }}>All Professors</h3>

      {loading && list.length === 0 ? (
        <div className="hint">Loading...</div>
      ) : list.length === 0 ? (
        <div className="hint">No professors yet.</div>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Phone</th><th style={{ width: 140 }}>Actions</th></tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.email || "-"}</td>
                <td>{p.phone || "-"}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn" type="button" onClick={() => onEdit(p)}>Edit</button>
                    <button className="btn" type="button" onClick={() => onDelete(p.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
