// frontend/src/components/ProfessorForm.jsx
import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";

// Opcije koje nudimo u drop-downu (bosanski oblici enum vrijednosti)
const TITLES = [
  "STRUČNJAK_IZ_PRAKSE",
  "ASISTENT",
  "VIŠI_ASISTENT",
  "DOCENT",
  "VANREDNI_PROFESOR",
  "REDOVNI_PROFESOR",
  "PROFESOR_EMERITUS",
];

const ENGAGEMENTS = ["RADNI_ODNOS", "VANJSKI_SARADNIK"];

// Lokalizacija (prikaz) – pokriva i stare engleske vrijednosti iz baze
const TITLE_LABELS = {
  // bosanski
  STRUČNJAK_IZ_PRAKSE: "Stručnjak iz prakse",
  ASISTENT: "Asistent",
  "VIŠI_ASISTENT": "Viši asistent",
  DOCENT: "Docent",
  VANREDNI_PROFESOR: "Vanredni profesor",
  REDOVNI_PROFESOR: "Redovni profesor",
  PROFESOR_EMERITUS: "Profesor emeritus",
  // legacy engleski
  PRACTITIONER: "Stručnjak iz prakse",
  ASSISTANT: "Asistent",
  SENIOR_ASSISTANT: "Viši asistent",
  ASSOCIATE_PROFESSOR: "Vanredni profesor",
  FULL_PROFESSOR: "Redovni profesor",
  PROFESSOR_EMERITUS: "Profesor emeritus",
};

const ENGAGEMENT_LABELS = {
  // bosanski
  RADNI_ODNOS: "Radni odnos",
  VANJSKI_SARADNIK: "Vanjski saradnik",
  // legacy engleski
  EMPLOYED: "Radni odnos",
  EXTERNAL: "Vanjski saradnik",
};

function prettyTitle(t) {
  if (!t) return "";
  return TITLE_LABELS[t] ?? t;
}
function prettyEngagement(e) {
  if (!e) return "";
  return ENGAGEMENT_LABELS[e] ?? e;
}

export default function ProfessorForm() {
  // forma
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [engagement, setEngagement] = useState("");

  // stanje
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // edit
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setMsg(null);
    try {
      const data = await apiGet("/api/professors");
      setList(Array.isArray(data) ? data : []);
    } catch {
      setMsg({ type: "err", text: "Greška pri učitavanju." });
      setList([]);
    } finally {
      setLoading(false);
    }
  }

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

    const payload = {
      name,
      email: email || undefined,
      phone: phone || undefined,
      title: title || undefined,
      engagement: engagement || undefined,
    };

    try {
      if (editId) {
        await apiPut(`/api/professors/${editId}`, payload);
        setMsg({ type: "ok", text: "Profesor ažuriran." });
      } else {
        await apiPost("/api/professors", payload);
        setMsg({ type: "ok", text: "Profesor sačuvan." });
      }
      resetForm();
      refresh();
    } catch {
      setMsg({ type: "err", text: "DB error" });
    }
  }

  function onEdit(p) {
    setEditId(p.id);
    setName(p.name || "");
    setEmail(p.email || "");
    setPhone(p.phone || "");
    setTitle(p.title || "");
    setEngagement(p.engagement || "");
    setMsg(null);
  }

  async function onDelete(id) {
    if (!confirm("Obrisati profesora?")) return;
    setMsg(null);
    try {
      await apiDelete(`/api/professors/${id}`);
      setMsg({ type: "ok", text: "Obrisano." });
      refresh();
    } catch {
      setMsg({ type: "err", text: "Ne može se obrisati." });
    }
  }

  // Excel export (lokalizovani nazivi)
  function exportExcel() {
    if (!list.length) {
      setMsg({ type: "err", text: "Nema podataka za izvoz." });
      return;
    }
    const rows = list.map((p, i) => ({
      Rbr: i + 1,
      Ime: p.name || "",
      Email: p.email || "",
      Telefon: p.phone || "",
      Zvanje: prettyTitle(p.title),
      "Angažman": prettyEngagement(p.engagement),
      Kreirano: p.createdAt ? new Date(p.createdAt).toLocaleString() : "",
      Ažurirano: p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "",
      ID: p.id,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Profesori");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `profesori_${stamp}.xlsx`);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Professors</h2>
        <button className="btn" type="button" onClick={refresh} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
        <button className="btn" type="button" onClick={exportExcel}>
          Download Excel
        </button>
      </div>

      <form onSubmit={submit} style={{ marginTop: 12 }}>
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
            <option value="">Zvanje...</option>
            {TITLES.map((t) => (
              <option key={t} value={t}>
                {prettyTitle(t)}
              </option>
            ))}
          </select>
          <select
            className="input small"
            value={engagement}
            onChange={(e) => setEngagement(e.target.value)}
          >
            <option value="">Angažman...</option>
            {ENGAGEMENTS.map((a) => (
              <option key={a} value={a}>
                {prettyEngagement(a)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn" type="submit">
            {editId ? "Save changes" : "Save"}
          </button>
          {editId && (
            <button
              className="btn"
              type="button"
              onClick={resetForm}
              style={{ background: "#999" }}
            >
              Cancel
            </button>
          )}
        </div>

        {msg && (
          <div
            className={msg.type === "ok" ? "success" : "error"}
            style={{ marginTop: 8 }}
          >
            {msg.text}
          </div>
        )}
      </form>

      <h3 style={{ marginTop: 16 }}>All Professors</h3>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Zvanje</th>
            <th>Angažman</th>
            <th style={{ width: 140 }}>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, idx) => (
            <tr key={p.id}>
              <td>{idx + 1}</td>
              <td>{p.name}</td>
              <td>{p.email || "-"}</td>
              <td>{p.phone || "-"}</td>
              <td>{p.title ? prettyTitle(p.title) : "-"}</td>
              <td>{p.engagement ? prettyEngagement(p.engagement) : "-"}</td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn" type="button" onClick={() => onEdit(p)}>
                    Edit
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => onDelete(p.id)}
                    style={{ background: "#b93737" }}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!list.length && (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", opacity: 0.7 }}>
                Nema podataka.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
