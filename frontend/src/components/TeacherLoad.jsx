// frontend/src/components/TeacherLoad.jsx 
import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import * as XLSX from "xlsx-js-style";

// Tabovi u UI
const VIEW_TABS = [
  { id: "SUMMARY", label: "Ukupan pregled" },
  { id: "GROUPS", label: "Grupe" },
];

// Ovo zadržavamo samo za Excel (sheet-ove po fakultetima)
const FACULTY_PROGRAMS = {
  EF: ["spFIR", "spSMDP"], // FIR + SMiDP
  FTN: ["spRI"], // RI
  BF: ["spEP"], // EP
  FTUG: ["spTUG"], // TUG
};

function belongsToFaculty(row, facultyId) {
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
// + primjena grupnih podešavanja (groupSettings)
function buildSummaryGroups(allRows, groupSettings = {}) {
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
        subjectKey: subjKey,
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
    subjects: Array.from(g.subjectsMap.values()).map((s) => {
      // koliko je grupa za ovaj predmet (iz taba "Grupe")
      let groupsCount = 1;
      const conf = groupSettings[s.subjectKey];
      if (conf) {
        const students = Number(conf.students);
        const maxPerGroup = Number(conf.maxPerGroup);
        if (students > 0 && maxPerGroup > 0) {
          groupsCount = Math.ceil(students / maxPerGroup);
        }
      }

      return {
        subjectName: s.subjectName,
        subjectCode: s.subjectCode,
        spFIR: s.spFIR,
        spRI: s.spRI,
        spTUG: s.spTUG,
        spSMDP: s.spSMDP,
        spEP: s.spEP,
        yearNumber: Array.from(s.yearSet).join(", "),
        semester: Array.from(s.semesterSet).join(", "),
        lectureHours: s.lectureHours * groupsCount,
        exerciseHours: s.exerciseHours * groupsCount,
        totalPV: s.totalPV * groupsCount,
        totalWeighted: s.totalWeighted * groupsCount,
        weekly: s.weekly * groupsCount,
        opterecenjePremaNormama: s.opterecenjePremaNormama,
      };
    }),
  }));
}

// grupisanje za pojedinačne fakulte (bez deduplikacije predmeta) – koristimo samo za Excel
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
// ako se proslijedi groupSettings, onda se i ovdje skaliraju sati po broju grupa
function createSheetFromGroups(groups, titleForInfoRow, groupSettings) {
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
      let multiplier = 1;

      if (groupSettings) {
        const subjKey = getSubjectKey(r);
        const conf = groupSettings[subjKey];
        if (conf) {
          const students = Number(conf.students);
          const maxPerGroup = Number(conf.maxPerGroup);
          if (students > 0 && maxPerGroup > 0) {
            multiplier = Math.ceil(students / maxPerGroup);
          }
        }
      }

      const lecture = Number(r.lectureHours || 0) * multiplier;
      const exercise = Number(r.exerciseHours || 0) * multiplier;
      const totalPV = Number(r.totalPV || 0) * multiplier;
      const totalWeighted = Number(r.totalWeighted || 0) * multiplier;
      const weekly = Number(r.weekly || 0) * multiplier;

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
        lecture,
        exercise,
        totalPV,
        totalWeighted,
        weekly,
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
  const [activeView, setActiveView] = useState("SUMMARY");

  // podešavanja za grupe po predmetu: { [subjectKey]: { students, maxPerGroup } }
  const [groupSettings, setGroupSettings] = useState({});

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

  // UKUPAN PREGLED – grupisano po profesoru + predmetu, deduplikacija predmeta
  // i primijenjena podešavanja iz taba "Grupe"
  const summaryGroups = useMemo(() => {
    if (!rows.length) return [];
    return buildSummaryGroups(rows, groupSettings);
  }, [rows, groupSettings]);

  // Tabela "Grupe" – lista svih predmeta (deduplikacija po predmetu)
  const groupSubjects = useMemo(() => {
    const map = new Map();

    rows.forEach((r) => {
      const subjKey = getSubjectKey(r);
      if (!subjKey) return;

      if (!map.has(subjKey)) {
        map.set(subjKey, {
          key: subjKey,
          subjectName: r.subjectName,
          subjectCode: r.subjectCode,
          professors: new Set(),
        });
      }
      const entry = map.get(subjKey);
      if (r.professorName) entry.professors.add(r.professorName);
    });

    const list = Array.from(map.values()).map((e) => ({
      key: e.key,
      subjectName: e.subjectName,
      subjectCode: e.subjectCode,
      professors: Array.from(e.professors),
    }));

    // sort po nazivu predmeta
    list.sort((a, b) =>
      (a.subjectName || "").localeCompare(b.subjectName || "", "hr")
    );
    return list;
  }, [rows]);

  const activeLabel =
    VIEW_TABS.find((t) => t.id === activeView)?.label || "";

  // Download Excel – sheet "Ukupno" (sa grupama) + sheet-ovi po fakultetima (EF, FTN, BF, FTUG)
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

      // 1) Ukupno – već grupisano i skalirano prema groupSettings
      const summary = buildSummaryGroups(rows, groupSettings);
      const wsSummary = createSheetFromGroups(
        summary,
        "Ukupan pregled opterećenja (svi studijski programi)",
        null // ovdje NE skaliramo ponovo – već je urađeno u buildSummaryGroups
      );
      XLSX.utils.book_append_sheet(wb, wsSummary, "Ukupno");

      // 2) EF
      const efRows = rows.filter((r) => belongsToFaculty(r, "EF"));
      const efGroups = buildFacultyGroups(efRows);
      const wsEF = createSheetFromGroups(
        efGroups,
        "Ekonomski fakultet (FIR, SMiDP)",
        groupSettings
      );
      XLSX.utils.book_append_sheet(wb, wsEF, "EF");

      // 3) FTN
      const ftnRows = rows.filter((r) => belongsToFaculty(r, "FTN"));
      const ftnGroups = buildFacultyGroups(ftnRows);
      const wsFTN = createSheetFromGroups(
        ftnGroups,
        "Fakultet tehničkih nauka (RI)",
        groupSettings
      );
      XLSX.utils.book_append_sheet(wb, wsFTN, "FTN");

      // 4) BF
      const bfRows = rows.filter((r) => belongsToFaculty(r, "BF"));
      const bfGroups = buildFacultyGroups(bfRows);
      const wsBF = createSheetFromGroups(
        bfGroups,
        "Biotehnički fakultet (EP)",
        groupSettings
      );
      XLSX.utils.book_append_sheet(wb, wsBF, "BF");

      // 5) FTUG
      const ftugRows = rows.filter((r) => belongsToFaculty(r, "FTUG"));
      const ftugGroups = buildFacultyGroups(ftugRows);
      const wsFTUG = createSheetFromGroups(
        ftugGroups,
        "Fakultet turizma, ugostiteljstva i gastronomije (TUG)",
        groupSettings
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
      {/* Tabovi: Ukupan pregled / Grupe */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {VIEW_TABS.map((t) => (
          <button
            key={t.id}
            className="btn"
            style={{
              background:
                activeView === t.id ? "#2a2f3a" : "transparent",
              border: "1px solid #3a4152",
              opacity: activeView === t.id ? 1 : 0.7,
            }}
            onClick={() => setActiveView(t.id)}
          >
            {t.label}
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
      ) : activeView === "GROUPS" ? (
        // ===== TAB: GRUPE =====
        <table className="table">
          <thead>
            <tr>
              <th>Predmet</th>
              <th>Nastavnici</th>
              <th>Broj studenata</th>
              <th>Max u grupi</th>
              <th>Broj grupa</th>
            </tr>
          </thead>
          <tbody>
            {groupSubjects.length === 0 ? (
              <tr>
                <td colSpan={5}>Nema podataka za prikaz.</td>
              </tr>
            ) : (
              groupSubjects.map((s) => {
                const settings = groupSettings[s.key] || {};
                const studentsVal =
                  settings.students !== undefined
                    ? settings.students
                    : "";
                const maxVal =
                  settings.maxPerGroup !== undefined
                    ? settings.maxPerGroup
                    : "";

                const studentsNum = Number(studentsVal);
                const maxNum = Number(maxVal);
                const groupsCount =
                  studentsNum > 0 && maxNum > 0
                    ? Math.ceil(studentsNum / maxNum)
                    : "";

                return (
                  <tr key={s.key}>
                    <td>
                      {s.subjectName}
                      {s.subjectCode ? ` (${s.subjectCode})` : ""}
                    </td>
                    <td>
                      {s.professors && s.professors.length
                        ? s.professors.join(", ")
                        : "—"}
                    </td>
                    <td>
                      <input
                        className="input small"
                        type="number"
                        min={0}
                        value={studentsVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGroupSettings((prev) => ({
                            ...prev,
                            [s.key]: {
                              ...(prev[s.key] || {}),
                              students: val,
                            },
                          }));
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="input small"
                        type="number"
                        min={0}
                        value={maxVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGroupSettings((prev) => ({
                            ...prev,
                            [s.key]: {
                              ...(prev[s.key] || {}),
                              maxPerGroup: val,
                            },
                          }));
                        }}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {groupsCount}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      ) : (
        // ===== TAB: UKUPAN PREGLED =====
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
            {summaryGroups.length === 0 ? (
              <tr>
                <td colSpan={17}>Nema podataka za prikaz.</td>
              </tr>
            ) : (
              summaryGroups.map((g, gi) =>
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

                    {/* Sati – već skalirani prema broju grupa */}
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
