// frontend/src/components/TeacherLoad.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";

export default function TeacherLoad() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const data = await apiGet("/api/planrealizacije/teacher-load");
        setRows(data.rows || []);
      } catch (e) {
        setMsg({ type: "err", text: e.message || "Greška pri učitavanju opterećenja" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Grupisanje po profesoru, da ime/zvanje/angažman budu u spojenoj ćeliji,
  // a predmeti idu jedan ispod drugog.
  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = r.professorId || r.professorName || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          professor: {
            name: r.professorName,
            titleLabel: r.professorTitleLabel,
            engagementLabel: r.engagementLabel,
          },
          subjects: [],
        });
      }
      map.get(key).subjects.push(r);
    });
    return Array.from(map.values());
  }, [rows]);

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>
        Pregled ukupnog opterećenja nastavnika i saradnika na svim studijskim programima Univerziteta FINRA Tuzla
      </h2>

      {msg && (
        <div className={msg.type === "err" ? "error" : "success"}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div>Učitavanje opterećenja…</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Ime i prezime</th>
              <th>Naučno zvanje</th>
              <th>Radni status</th>
              <th>Predmet</th>
              <th>SP FIR</th>
              <th>SP RI</th>
              <th>SP TUG</th>
              <th>SP SMiDP</th>
              <th>EP</th>
              <th>Godina</th>
              <th>Semestar</th>
              <th>Br. časova P</th>
              <th>Br. časova V</th>
              <th>Ukupno časova P–V</th>
              <th>Ukupno časova (P + 0.5V)</th>
              <th>Br. časova – sedmično</th>
              <th>Opterećenje prema normama</th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 ? (
              <tr>
                <td colSpan={17}>Nema podataka za prikaz.</td>
              </tr>
            ) : (
              grouped.map((g, gi) =>
                g.subjects.map((r, idx) => (
                  <tr key={`${gi}-${r.rowId}-${idx}`}>
                    {/* Ime i prezime (spojena ćelija po profesoru) */}
                    <td
                      rowSpan={idx === 0 ? g.subjects.length : 1}
                      style={idx === 0 ? {} : { display: "none" }}
                    >
                      {g.professor.name || "—"}
                    </td>

                    {/* Naučno zvanje */}
                    <td
                      rowSpan={idx === 0 ? g.subjects.length : 1}
                      style={idx === 0 ? {} : { display: "none" }}
                    >
                      {g.professor.titleLabel || ""}
                    </td>

                    {/* Radni status (RO / VS) */}
                    <td
                      rowSpan={idx === 0 ? g.subjects.length : 1}
                      style={idx === 0 ? {} : { display: "none" }}
                    >
                      {g.professor.engagementLabel || ""}
                    </td>

                    {/* Predmet */}
                    <td>
                      {r.subjectName}
                      {r.subjectCode ? ` (${r.subjectCode})` : ""}
                    </td>

                    {/* Studijski programi – X gdje pripada */}
                    <td style={{ textAlign: "center" }}>{r.spFIR}</td>
                    <td style={{ textAlign: "center" }}>{r.spRI}</td>
                    <td style={{ textAlign: "center" }}>{r.spTUG}</td>
                    <td style={{ textAlign: "center" }}>{r.spSMDP}</td>
                    <td style={{ textAlign: "center" }}>{r.spEP}</td>

                    {/* Godina i semestar */}
                    <td style={{ textAlign: "center" }}>{r.yearNumber}</td>
                    <td style={{ textAlign: "center" }}>{r.semester}</td>

                    {/* Sati */}
                    <td style={{ textAlign: "right" }}>{r.lectureHours}</td>
                    <td style={{ textAlign: "right" }}>{r.exerciseHours}</td>
                    <td style={{ textAlign: "right" }}>{r.totalPV}</td>
                    <td style={{ textAlign: "right" }}>
                      {r.totalWeighted.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {r.weekly.toFixed(2)}
                    </td>

                    {/* Opterećenje prema normama – za sada prazno / placeholder */}
                    <td style={{ textAlign: "center" }}>
                      {r.opterecenjePremaNormama == null
                        ? ""
                        : r.opterecenjePremaNormama}
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
