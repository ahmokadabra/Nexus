// frontend/src/components/TeacherLoad.jsx 
import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import * as XLSX from "xlsx-js-style";

const FACULTY_TABS = [
  { id: "SUMMARY", label: "Ukupan pregled" },
  { id: "EF", label: "Ekonomski fakultet (FIR, SMiDP)" },
  { id: "FTN", label: "Fakultet tehničkih nauka (RI)" },
  { id: "BF", label: "Biotehnički fakultet (EP)" },
  {
    id: "FTUG",
    label: "Fakultet turizma, ugostiteljstva i gastronomije (TUG)",
  },
];

const FACULTY_PROGRAMS = {
  EF: ["spFIR", "spSMDP"], // FIR + SMiDP
  FTN: ["spRI"], // RI
  BF: ["spEP"], // EP
  FTUG: ["spTUG"], // TUG
};

function belongsToFaculty(row, facultyId) {
  if (facultyId === "SUMMARY") return true;
  const keys = FACULTY_PROGRAMS[facultyId] || [];
  return keys.some((k) => !!row[k]);
}

// ključ za predmet (da se isti predmet ne duplira po SP)
function getSubjectKey(r) {
  if (r.subjectId != null) return `ID:${r.subjectId}`;
  if (r.subjectCode)
    return `CODE:${String(r.subjectCode).trim().toUpperCase()}`;
  return `NAME:${(r.subjectName || "").trim().toLowerCase()}`;
}

// grupisanje za UKUPAN pregled – deduplikacija predmeta po profesoru
function buildSummaryGroups(allRows) {
  const map = new Map();

  allRows.forEach((r) => {
    const profKey = r.professorId || r.professorName || "unknown";
    if (!map.has(profKey)) {
      map.set(profKey, {
        professor: {
          name: r.professorName,
          titleLabel: r.professorTitleLabel,
          engagementLabel: r.engagementLabel,
        },
        subjectsMap: new Map(),
      });
    }
    const g = map.get(profKey);

    const subjKey = getSubjectKey(r);
    let subj = g.subjectsMap.get(subjKey);
    if (!subj) {
      subj = {
        subjectName: r.subjectName,
        subjectCode: r.subjectCode,
        spFIR: "",
        spRI: "",
        spTUG: "",
        spSMDP: "",
        spEP: "",
        yearSet: new Set(),
        semesterSet: new Set(),
        lectureHours: 0,
        exerciseHours: 0,
        totalPV: 0,
        totalWeighted: 0,
        weekly: 0,
        opterecenjePremaNormama: null,
      };
      g.subjectsMap.set(subjKey, subj);
    }

    // SP X-ice
    if (r.spFIR) subj.spFIR = "X";
    if (r.spRI) subj.spRI = "X";
    if (r.spTUG) subj.spTUG = "X";
    if (r.spSMDP) subj.spSMDP = "X";
    if (r.spEP) subj.spEP = "X";

    // Godine / semestri – skupljamo sve jedinstvene
    if (r.yearNumber != null && r.yearNumber !== "") {
      subj.yearSet.add(r.yearNumber);
    }
    if (r.semester != null && r.semester !== "") {
      subj.semesterSet.add(r.semester);
    }

    // Zbir sati
    subj.lectureHours += Number(r.lectureHours || 0);
    subj.exerciseHours += Number(r.exerciseHours || 0);
    subj.totalPV += Number(r.totalPV || 0);
    subj.totalWeighted += Number(r.totalWeighted || 0);
    subj.weekly += Number(r.weekly || 0);

    if (r.opterecenjePremaNormama != null) {
      subj.opterecenjePremaNormama = r.opterecenjePremaNormama;
    }
  });

  return Array.from(map.values()).map((g) => ({
    professor: g.professor,
    subjects: Array.from(g.subjectsMap.values()).map((s) => ({
      subjectName: s.subjectName,
      subjectCode: s.subjectCode,
      spFIR: s.spFIR,
      spRI: s.spRI,
      spTUG: s.spTUG,
      spSMDP: s.spSMDP,
      spEP: s.spEP,
      yearNumber: Array.from(s.yearSet).join(", "),
      semester: Array.from(s.semesterSet).join(", "),
      lectureHours: s.lectureHours,
      exerciseHours: s.exerciseHours,
      totalPV: s.totalPV,
      totalWeighted: s.totalWeighted,
      weekly: s.weekly,
      opterecenjePremaNormama: s.opterecenjePremaNormama,
    })),
  }));
}

// grupisanje za pojedinačne fakulte (bez deduplikacije predmeta)
function buildFacultyGroups(rowsForFaculty) {
  const map = new Map();
  rowsForFaculty.forEach((r) => {
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
}

// helper: kreiranje jednog sheet-a iz grupisanih podataka
function createSheetFromGroups(groups, titleForInfoRow) {
  const header = [
    "Ime i prezime",
    "Naučno zvanje",
    "Radni status",
    "Predmet",
    "SP FIR",
    "SP RI",
    "SP TUG",
    "SP SMiDP",
    "EP",
    "Godina",
    "Semestar",
    "Br. časova P",
    "Br. časova V",
    "Ukupno časova P–V",
    "Ukupno časova (P + 0.5V)",
    "Br. časova – sedmično",
    "Opterećenje prema normama",
  ];

  const data = [];

  // prvi red – info o sheet-u (nije obavezno, ali pomaže)
  if (titleForInfoRow) {
    data.push([titleForInfoRow]);
  }

  // header
  data.push(header);

  groups.forEach((g) => {
    g.subjects.forEach((r, idx) => {
      data.push([
        idx === 0 ? (g.professor.name || "—") : "",
        idx === 0 ? (g.professor.titleLabel || "") : "",
        idx === 0 ? (g.professor.engagementLabel || "") : "",
        `${r.subjectName || ""}${
          r.subjectCode ? ` (${r.subjectCode})` : ""
        }`,
        r.spFIR || "",
        r.spRI || "",
        r.spTUG || "",
        r.spSMDP || "",
        r.spEP || "",
        r.yearNumber ?? "",
        r.semester ?? "",
        Number(r.lectureHours || 0),
        Number(r.exerciseHours || 0),
        Number(r.totalPV || 0),
        Number(r.totalWeighted || 0),
        Number(r.weekly || 0),
        r.opterecenjePremaNormama == null
          ? ""
          : r.opterecenjePremaNormama,
      ]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // širine kolona
  ws["!cols"] = [
    { wch: 30 }, // ime
    { wch: 20 }, // zvanje
    { wch: 12 }, // status
    { wch: 40 }, // predmet
    { wch: 8 }, // FIR
    { wch: 8 }, // RI
    { wch: 8 }, // TUG
    { wch: 10 }, // SMiDP
    { wch: 8 }, // EP
    { wch: 8 }, // godina
    { wch: 10 }, // semestar
    { wch: 12 }, // P
    { wch: 12 }, // V
    { wch: 16 }, // P-V
    { wch: 20 }, // P+0.5V
    { wch: 16 }, // sedmično
    { wch: 20 }, // opterećenje
  ];

  // stil za header
  const headerStyle = {
    font: { bold: true },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "FF444444" } },
      bottom: { style: "thin", color: { rgb: "FF444444" } },
      left: { style: "thin", color: { rgb: "FF444444" } },
      right: { style: "thin", color: { rgb: "FF444444" } },
    },
  };

  const headerRowIndex = titleForInfoRow ? 1 : 0;
  for (let c = 0; c < header.length; c++) {
    const cellAddress = XLSX.utils.encode_cell({
      r: headerRowIndex,
      c,
    });
    if (ws[cellAddress]) {
      ws[cellAddress].s = headerStyle;
    }
  }

  return ws;
}

export default function TeacherLoad() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [activeFaculty, setActiveFaculty] = useState("SUMMARY");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const data = await apiGet("/api/planrealizacije/teacher-load");
        setRows(data.rows || []);
      } catch (e) {
        setMsg({
          type: "err",
          text: e.message || "Greška pri učitavanju opterećenja",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtriranje po fakultetu (osim za "Ukupan pregled" gdje vraćamo sve)
  const filteredRows = useMemo(() => {
    return rows.filter((r) => belongsToFaculty(r, activeFaculty));
  }, [rows, activeFaculty]);

  // Grupisanje po aktivnom tabu
  const grouped = useMemo(() => {
    if (filteredRows.length === 0) return [];

    if (activeFaculty === "SUMMARY") {
      // deduplikacija predmeta za ukupan pregled
      return buildSummaryGroups(filteredRows);
    }

    // pojedinačni fakulteti – bez deduplikacije predmeta
    return buildFacultyGroups(filteredRows);
  }, [filteredRows, activeFaculty]);

  const activeLabel =
    FACULTY_TABS.find((f) => f.id === activeFaculty)?.label || "";

  // Download Excel za sve: SUMMARY + svi fakulteti, svaki u svoj sheet
  async function downloadExcel() {
    if (!rows.length) {
      setMsg({
        type: "err",
        text: "Nema podataka za export u Excel.",
      });
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // 1) Ukupno (SUMMARY)
      const summaryGroups = buildSummaryGroups(rows);
      const wsSummary = createSheetFromGroups(
        summaryGroups,
        "Ukupan pregled opterećenja (svi studijski programi)"
      );
      XLSX.utils.book_append_sheet(wb, wsSummary, "Ukupno");

      // 2) EF
      const efRows = rows.filter((r) => belongsToFaculty(r, "EF"));
      const efGroups = buildFacultyGroups(efRows);
      const wsEF = createSheetFromGroups(
        efGroups,
        "Ekonomski fakultet (FIR, SMiDP)"
      );
      XLSX.utils.book_append_sheet(wb, wsEF, "EF");

      // 3) FTN
      const ftnRows = rows.filter((r) => belongsToFaculty(r, "FTN"));
      const ftnGroups = buildFacultyGroups(ftnRows);
      const wsFTN = createSheetFromGroups(
        ftnGroups,
        "Fakultet tehničkih nauka (RI)"
      );
      XLSX.utils.book_append_sheet(wb, wsFTN, "FTN");

      // 4) BF
      const bfRows = rows.filter((r) => belongsToFaculty(r, "BF"));
      const bfGroups = buildFacultyGroups(bfRows);
      const wsBF = createSheetFromGroups(
        bfGroups,
        "Biotehnički fakultet (EP)"
      );
      XLSX.utils.book_append_sheet(wb, wsBF, "BF");

      // 5) FTUG
      const ftugRows = rows.filter((r) => belongsToFaculty(r, "FTUG"));
      const ftugGroups = buildFacultyGroups(ftugRows);
      const wsFTUG = createSheetFromGroups(
        ftugGroups,
        "Fakultet turizma, ugostiteljstva i gastronomije (TUG)"
      );
      XLSX.utils.book_append_sheet(wb, wsFTUG, "FTUG");

      XLSX.writeFile(wb, "Opterecenje_nastavnika_svi_fakulteti.xlsx");
    } catch (e) {
      setMsg({
        type: "err",
        text: e.message || "Greška pri exportu u Excel.",
      });
    }
  }

  return (
    <div>
      {/* Tabovi za ukupan pregled + fakultete */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {FACULTY_TABS.map((f) => (
          <button
            key={f.id}
            className="btn"
            style={{
              background:
                activeFaculty === f.id ? "#2a2f3a" : "transparent",
              border: "1px solid #3a4152",
              opacity: activeFaculty === f.id ? 1 : 0.7,
            }}
            onClick={() => setActiveFaculty(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Download Excel dugme */}
      <div style={{ marginBottom: 12 }}>
        <button
          className="btn"
          onClick={downloadExcel}
          disabled={!rows.length}
        >
          Download Excel (svi fakulteti)
        </button>
      </div>

      <h2 style={{ marginBottom: 12 }}>
        Pregled ukupnog opterećenja nastavnika i saradnika na svim
        studijskim programima Univerziteta FINRA Tuzla
        {activeLabel ? ` — ${activeLabel}` : ""}
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
                  <tr
                    key={`${gi}-${idx}-${
                      r.subjectCode || r.subjectName || "row"
                    }`}
                  >
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
                    <td style={{ textAlign: "center" }}>
                      {r.spFIR || ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {r.spRI || ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {r.spTUG || ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {r.spSMDP || ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {r.spEP || ""}
                    </td>

                    {/* Godina i semestar */}
                    <td style={{ textAlign: "center" }}>
                      {r.yearNumber}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {r.semester}
                    </td>

                    {/* Sati */}
                    <td style={{ textAlign: "right" }}>
                      {r.lectureHours}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {r.exerciseHours}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {r.totalPV}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {Number(r.totalWeighted || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {Number(r.weekly || 0).toFixed(2)}
                    </td>

                    {/* Opterećenje prema normama */}
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
