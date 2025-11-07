// frontend/src/components/ProfessorForm.jsx
import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";

const TITLE_OPTIONS = [
  { v: "", label: "— Zvanje —" },
  { v: "PRACTITIONER", label: "Stručnjak iz prakse" },
  { v: "ASSISTANT", label: "Asistent" },
  { v: "SENIOR_ASSISTANT", label: "Viši asistent" },
  { v: "DOCENT", label: "Docent" },
  { v: "ASSOCIATE_PROFESSOR", label: "Vanredni profesor" },
  { v: "FULL_PROFESSOR", label: "Redovni profesor" },
  { v: "EMERITUS", label: "Profesor emeritus" },
];

const ENGAGEMENT_OPTIONS = [
  { v: "", label: "— Angažman —" },
  { v: "EMPLOYED", label: "Radni odnos" },
  { v: "EXTERNAL", label: "Vanjski saradnik" },
];

function humanTitle(v) {
  const m = TITLE_OPTIONS.find((o) => o.v === v);
  return m?.label ?? "-";
}

function humanEngagement(v) {
  const m = ENGAGEMENT_OPTIONS.find((o) => o.v === v);
  return m?.label ?? "-";
}

export default function ProfessorForm() {
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);

  const [idEditing, setIdEditing] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [engagement, setEngagement] = useState(""); // ⬅️ novo

  async function load() {
    try {
      const data = await apiGet("/api/professors");
      setList(data);
    } catch {
      setList([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setIdEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setTitle("");
    setEngagement("");
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);

    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      title: title || null,
      engagement: engagement || null, // ⬅️ novo
    };

    try {
      if (idEditing) {
        await apiPut(`/api/professors/${idEditing}`, payload);
        setMsg({ type: "ok", text: "Updated" });
      } else {
        await apiPost("/api/professors", payload);
        setMsg({ type: "ok", text: "Saved" });
      }
      resetForm();
      load();
    } catch (err) {
      setMsg({
        type: "err",
        text: err?.message || "Error",
      });
    }
  }

  function startEdit(p) {
    setIdEditing(p.id);
    setName(p.name || "");
    setEmail(p.email || "");
    setPhone(p.phone || "");
    setTitle(p.title || "");
    setEngagement(p.engagement || "");
  }

  async function remove(id) {
    if (!confirm("Delete?")) return;
    try {
      await apiDelete(`/api/professors/${id}`);
      load();
    } catch (err) {
      setMsg({ type: "err", text: err?.message || "Error" });
    }
  }

  return (
    <div>
      <h2>Professors</h2>

      <form onSubmit={submit}>
        <div className="form-row" style={{ flexWrap: "wrap", gap: 8 }}>
          <input
            className="input"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input small"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <select
            className="input small"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          >
            {TITLE_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>

          {/* ⬇️ NOVI dropdown */}
          <select
            className="input small"
            value={engagement}
            onChange={(e) => setEngagement(e.target.value)}
          >
            {ENGAGEMENT_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn" type="submit">
            {idEditing ? "Update" : "Save"}
          </button>
          {idEditing && (
            <button className="btn" type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
          <button
            className="btn"
            type="button"
            onClick={load}
            title="Refresh list"
          >
            Refresh
          </button>
        </div>

        {msg && (
          <div className={msg.type === "ok" ? "success" : "error"}>
            {msg.text}
          </div>
        )}
      </form>

      <h3 style={{ marginTop: 16 }}>All Professors</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Phone</th>
            <th>Title</th>
            <th>Engagement</th>{/* ⬅️ nova kolona */}
            <th style={{ width: 140 }}></th>
          </tr>
        </thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.email || "-"}</td>
              <td>{p.phone || "-"}</td>
              <td>{humanTitle(p.title)}</td>
              <td>{humanEngagement(p.engagement)}</td>
              <td>
                <button className="btn" onClick={() => startEdit(p)}>
                  Edit
                </button>{" "}
                <button
                  className="btn"
                  onClick={() => remove(p.id)}
                  style={{ background: "#c62828" }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", opacity: 0.7 }}>
                (No data)
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
