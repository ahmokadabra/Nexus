// frontend/src/components/ProfessorForm.jsx
import React, { useEffect, useState, useMemo } from "react";
import { apiGet, apiPost, apiPut, apiDelete, downloadXlsx } from "../lib/api";

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
  // Create form (dodavanje novih)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [engagement, setEngagement] = useState("");

  // Lista i status
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);

  // Pretraga i sortiranje
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState("asc"); // 'asc' | 'desc'

  // Inline edit stanje
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
    engagement: "",
  });

  async function fetchList() {
    try {
      const data = await apiGet("/api/professors");
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setList([]);
      setMsg({ type: "err", text: e.message });
    }
  }

  useEffect(() => {
    fetchList();
  }, []);

  // Filtrirano + sortirano za prikaz
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter((p) => {
          const bag = [
            p.name || "",
            p.email || "",
            p.phone || "",
            titleLabel(p.title),
            engagementLabel(p.engagement),
          ]
            .join(" ")
            .toLowerCase();
          return bag.includes(q);
        })
      : list;

    const sorted = [...filtered].sort((a, b) => {
      const an = (a.name || "").toLocaleLowerCase();
      const bn = (b.name || "").toLocaleLowerCase();
      if (an < bn) return sortDir === "asc" ? -1 : 1;
      if (an > bn) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [list, query, sortDir]);

  // --- CREATE (gornja forma) ---
  function resetCreateForm() {
    setName("");
    setEmail("");
    setPhone("");
    setTitle("");
    setEngagement("");
  }

  async function submitCreate(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = {
        name: name.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(title ? { title } : {}),
        ...(engagement ? { engagement } : {}),
      };
      await apiPost("/api/professors", payload);
      setMsg({ type: "ok", text: "Saved" });
      resetCreateForm();
      fetchList();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  // --- INLINE EDIT (u tabeli) ---
  function startInlineEdit(row) {
    setEditingId(row.id);
    setDraft({
      name: row.name || "",
      email: row.email || "",
      phone: row.phone || "",
      title: row.title || "",
      engagement: row.engagement || "",
    });
  }
  function cancelInlineEdit() {
    setEditingId(null);
    setDraft({ name: "", email: "", phone: "", title: "", engagement: "" });
  }
  function changeDraft(field, value) {
    setDraft((d) => ({ ...d, [field]: value }));
  }
  async function saveInlineEdit() {
    if (!editingId) return;
    setMsg(null);
    try {
      const payload = {};
      if (draft.name.trim()) payload.name = draft.name.trim();
      if (draft.email.trim()) payload.email = draft.email.trim();
      if (draft.phone.trim()) payload.phone = draft.phone.trim();
      if (draft.title) payload.title = draft.title;
      if (draft.engagement) payload.engagement = draft.engagement;

      await apiPut(`/api/professors/${editingId}`, payload);
      setMsg({ type: "ok", text: "Updated" });
      cancelInlineEdit();
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

  // DOWNLOAD XLSX
  async function onDownload() {
    setMsg(null);
    try {
      await downloadXlsx("/api/professors/export.xlsx", "profesori.xlsx");
    } catch (e) {
      setMsg({ type: "err", text: `Download nije uspio: ${e.message}` });
    }
  }

  // Sort toggle
  function toggleSort() {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2>Professors</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="input"
            style={{ minWidth: 240 }}
            placeholder="Pretraga (ime, email, telefon, zvanje, angažman)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn" onClick={fetchList}>Refresh</button>
          <button className="btn" onClick={onDownload}>Download XLSX</button>
        </div>
      </div>

      {/* GORNJA FORMA: samo dodavanje novih */}
      <form onSubmit={submitCreate}>
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
            className="input"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="form-row">
          <select className="input small" value={title} onChange={(e) => setTitle(e.target.value)}>
            {TITLE_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select className="input small" value={engagement} onChange={(e) => setEngagement(e.target.value)}>
            {ENGAGEMENT_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button className="btn" type="submit">Save</button>
        </div>
        {msg && <div className={msg.type === "ok" ? "success" : "error"}>{msg.text}</div>}
      </form>

      <h3>All Professors</h3>
      <table className="table">
        <thead>
          <tr>
            <th>
              <button
                title={`Sortiraj po imenu (${sortDir === "asc" ? "A–Z" : "Z–A"})`}
                onClick={toggleSort}
                style={{
                  background: "transparent",
                  color: "inherit",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  font: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Name
                <span style={{ fontSize: 12, opacity: 0.8 }}>
                  {sortDir === "asc" ? "▲" : "▼"}
                </span>
              </button>
            </th>
            <th>Email</th>
            <th>Phone</th>
            <th>Zvanje</th>
            <th>Angažman</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr><td colSpan="6">[]</td></tr>
          ) : (
            visible.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <tr key={p.id}>
                  <td>
                    {isEditing ? (
                      <input
                        className="input"
                        value={draft.name}
                        onChange={(e) => changeDraft("name", e.target.value)}
                      />
                    ) : (
                      p.name
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="input"
                        value={draft.email}
                        onChange={(e) => changeDraft("email", e.target.value)}
                        placeholder="email@domain.tld"
                      />
                    ) : (
                      p.email ?? "-"
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="input"
                        value={draft.phone}
                        onChange={(e) => changeDraft("phone", e.target.value)}
                      />
                    ) : (
                      p.phone ?? "-"
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        className="input small"
                        value={draft.title}
                        onChange={(e) => changeDraft("title", e.target.value)}
                      >
                        {TITLE_OPTIONS.map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      titleLabel(p.title)
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        className="input small"
                        value={draft.engagement}
                        onChange={(e) => changeDraft("engagement", e.target.value)}
                      >
                        {ENGAGEMENT_OPTIONS.map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      engagementLabel(p.engagement)
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {isEditing ? (
                      <>
                        <button className="btn" onClick={saveInlineEdit}>Save</button>{" "}
                        <button className="btn" onClick={cancelInlineEdit}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn" onClick={() => startInlineEdit(p)}>Edit</button>{" "}
                        <button className="btn" onClick={() => onDelete(p.id)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
