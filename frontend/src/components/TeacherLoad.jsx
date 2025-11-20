// frontend/src/components/TeacherLoad.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import * as XLSX from "xlsx-js-style";

// Tabovi u UI
const VIEW_TABS = [
  { id: "SUMMARY", label: "Ukupan pregled" },
  { id: "GROUPS", label: "Grupe" },
];

// Za Excel sheetove po fakultetima
const FACULTY_PROGRAMS = {
  EF: ["spFIR", "spSMDP"], // FIR + SMiDP
  FTN: ["spRI"], // RI
  BF: ["spEP"], // EP
  FTUG: ["spTUG"], // TUG
};

// Godine i studijski programi za matricu broja studenata
const YEARS = [1, 2, 3, 4];
const PROGRAM_KEYS = ["FIR", "RI", "SMDP", "TUG", "EP"];

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

// helper za inicijalizaciju matrice broja studenata
function createEmptyYearProgStudents() {
  const obj = {};
  YEARS.forEach((y) => {
    obj[y] = {};
    PROGRAM_KEYS.forEach((p) => {
      obj[y][p] = "";
    });
  });
  return obj;
}

// grupisanje za UKUPAN pregled – deduplikacija predmeta po profesoru
//  + grupirana logika: broj studenata po godini/SP iz matrice + max u grupi po predmetu
function buildSummaryGroups(
  allRows,
  subjectGroupConfig = {},
  yearProgStudents = null
) {
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
        yearProgramPairs: new Set(), // kombinacije godina+SP (npr. "1|FIR")
        lectureHours: 0,
        exerciseHours: 0,
        totalPV: 0,
        totalWeighted: 0,
        weekly: 0,
        opterecenjePremaNormama: null,
      };
      g.subjectsMap.set(subjKey, subj);
    }

    // Programi + X i parovi (godina, program)
    const year = r.yearNumber;
    const programs = [];
    if (r.spFIR) {
      subj.spFIR = "X";
      programs.push("FIR");
    }
    if (r.spRI) {
      subj.spRI = "X";
      programs.push("RI");
    }
    if (r.spTUG) {
      subj.spTUG = "X";
      programs.push("TUG");
    }
    if (r.spSMDP) {
      subj.spSMDP = "X";
      programs.push("SMDP");
    }
    if (r.spEP) {
      subj.spEP = "X";
      programs.push("EP");
    }

    if (year != null && year !== "") {
      subj.yearSet.add(year);
      programs.forEach((p) => {
        subj.yearProgramPairs.add(`${year}|${p}`);
      });
    }

    if (r.semester != null && r.semester !== "") {
      subj.semesterSet.add(r.semester);
    }

    // Sati – NE sabiramo po SP, već uzimamo maksimum (isti predmet na više SP)
    const L = Number(r.lectureHours || 0);
    const E = Number(r.exerciseHours || 0);
    const TPV = Number(r.totalPV || 0);
    const TW = Number(r.totalWeighted || 0);
    const W = Number(r.weekly || 0);

    subj.lectureHours = Math.max(subj.lectureHours, L);
    subj.exerciseHours = Math.max(subj.exerciseHours, E);
    subj.totalPV = Math.max(subj.totalPV, TPV);
    subj.totalWeighted = Math.max(subj.totalWeighted, TW);
    subj.weekly = Math.max(subj.weekly, W);

    if (r.opterecenjePremaNormama != null) {
      subj.opterecenjePremaNormama = r.opterecenjePremaNormama;
    }
  });

  // pretvaranje u listu sa primjenjenim brojem grupa
  return Array.from(map.values()).map((g) => ({
    professor: g.professor,
    subjects: Array.from(g.subjectsMap.values()).map((s) => {
      // broj studenata za ovaj predmet – sumira sve (godina,SP) iz matrice
      let studentsTotal = 0;
      if (
        yearProgStudents &&
        s.yearProgramPairs &&
        s.yearProgramPairs.size > 0
      ) {
        s.yearProgramPairs.forEach((yp) => {
          const [yearStr, progCode] = yp.split("|");
          const yearKey = String(yearStr);
          const val = yearProgStudents[yearKey]?.[progCode];
          const num = Number(val || 0);
          if (!Number.isNaN(num)) {
            studentsTotal += num;
          }
        });
      }

      const conf = subjectGroupConfig[s.subjectKey];
      const maxPerGroup = Number(conf?.maxPerGroup || 0);

      let groupsCount = 1;
      if (studentsTotal > 0 && maxPerGroup > 0) {
        groupsCount = Math.ceil(studentsTotal / maxPerGroup);
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

// helper: kreiranje jednog sheet-a iz grupisanih podataka (već agregirani podaci)
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

  if (titleForInfoRow) {
    data.push([titleForInfoRow]);
  }

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

  // podešavanja za max u grupi po predmetu: { [subjectKey]: { maxPerGroup } }
  const [subjectGroupConfig, setSubjectGroupConfig] = useState({});

  // broj studenata po (godina, studijski program)
  const [yearProgStudents, setYearProgStudents] = useState(() =>
    createEmptyYearProgStudents()
  );

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

  // UKUPAN PREGLED – grupisano po profesoru + predmetu, bez dupliranja po SP,
  // i sa primjenjenim brojem grupa (iz yearProgStudents + subjectGroupConfig)
  const summaryGroups = useMemo(() => {
    if (!rows.length) return [];
    return buildSummaryGroups(rows, subjectGroupConfig, yearProgStudents);
  }, [rows, subjectGroupConfig, yearProgStudents]);

  // Tabela "Grupe" – lista svih predmeta (deduplikacija po predmetu)
  // + info: godine, SP, broj studenata (iz gornje matrice)
  const groupSubjects = useMemo(() => {
    const map = new Map();

    rows.forEach((r) => {
      const subjKey = getSubjectKey(r);
      if (!subjKey) return;

      let entry = map.get(subjKey);
      if (!entry) {
        entry = {
          key: subjKey,
          subjectName: r.subjectName,
          subjectCode: r.subjectCode,
          professors: new Set(),
          yearSet: new Set(),
          programSet: new Set(),
          yearProgramPairs: new Set(),
        };
        map.set(subjKey, entry);
      }

      if (r.professorName) entry.professors.add(r.professorName);

      const year = r.yearNumber;
      const programs = [];
      if (r.spFIR) {
        entry.programSet.add("FIR");
        programs.push("FIR");
      }
      if (r.spRI) {
        entry.programSet.add("RI");
        programs.push("RI");
      }
      if (r.spSMDP) {
        entry.programSet.add("SMDP");
        programs.push("SMDP");
      }
      if (r.spTUG) {
        entry.programSet.add("TUG");
        programs.push("TUG");
      }
      if (r.spEP) {
        entry.programSet.add("EP");
        programs.push("EP");
      }

      if (year != null && year !== "") {
        entry.yearSet.add(year);
        programs.forEach((p) => {
          entry.yearProgramPairs.add(`${year}|${p}`);
        });
      }
    });

    const list = Array.from(map.values()).map((e) => {
      // izračun broja studenata iz yearProgStudents
      let studentsTotal = 0;
      if (yearProgStudents && e.yearProgramPairs.size > 0) {
        e.yearProgramPairs.forEach((yp) => {
          const [yearStr, progCode] = yp.split("|");
          const yearKey = String(yearStr);
          const val = yearProgStudents[yearKey]?.[progCode];
          const num = Number(val || 0);
          if (!Number.isNaN(num)) {
            studentsTotal += num;
          }
        });
      }

      return {
        key: e.key,
        subjectName: e.subjectName,
        subjectCode: e.subjectCode,
        professors: Array.from(e.professors),
        yearsText: Array.from(e.yearSet)
          .sort((a, b) => Number(a) - Number(b))
          .join(", "),
        programsText: Array.from(e.programSet).join(", "),
        studentsTotal,
      };
    });

    list.sort((a, b) =>
      (a.subjectName || "").localeCompare(b.subjectName || "", "hr")
    );
    return list;
  }, [rows, yearProgStudents]);

  const activeLabel =
    VIEW_TABS.find((t) => t.id === activeView)?.label || "";

  // Download Excel – sheet "Ukupno" + EF/FTN/BF/FTUG, sve sa istom logikom
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

      // 1) Ukupno (svi SP)
      const summary = buildSummaryGroups(
        rows,
        subjectGroupConfig,
        yearProgStudents
      );
      const wsSummary = createSheetFromGroups(
        summary,
        "Ukupan pregled opterećenja (svi studijski programi)"
      );
      XLSX.utils.book_append_sheet(wb, wsSummary, "Ukupno");

      // 2) EF
      const efRows = rows.filter((r) => belongsToFaculty(r, "EF"));
      const efGroups = buildSummaryGroups(
        efRows,
        subjectGroupConfig,
        yearProgStudents
      );
      const wsEF = createSheetFromGroups(
        efGroups,
        "Ekonomski fakultet (FIR, SMiDP)"
      );
      XLSX.utils.book_append_sheet(wb, wsEF, "EF");

      // 3) FTN
      const ftnRows = rows.filter((r) => belongsToFaculty(r, "FTN"));
      const ftnGroups = buildSummaryGroups(
        ftnRows,
        subjectGroupConfig,
        yearProgStudents
      );
      const wsFTN = createSheetFromGroups(
        ftnGroups,
        "Fakultet tehničkih nauka (RI)"
      );
      XLSX.utils.book_append_sheet(wb, wsFTN, "FTN");

      // 4) BF
      const bfRows = rows.filter((r) => belongsToFaculty(r, "BF"));
      const bfGroups = buildSummaryGroups(
        bfRows,
        subjectGroupConfig,
        yearProgStudents
      );
      const wsBF = createSheetFromGroups(
        bfGroups,
        "Biotehnički fakultet (EP)"
      );
      XLSX.utils.book_append_sheet(wb, wsBF, "BF");

      // 5) FTUG
      const ftugRows = rows.filter((r) => belongsToFaculty(r, "FTUG"));
      const ftugGroups = buildSummaryGroups(
        ftugRows,
        subjectGroupConfig,
        yearProgStudents
      );
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
        <>
          {/* GORNJA TABELA – broj studenata po godinama i SP */}
          <div style={{ marginBottom: 16 }}>
            <h3>Broj studenata po godinama i studijskim programima</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Godina</th>
                  <th>FIR</th>
                  <th>RI</th>
                  <th>SMiDP</th>
                  <th>TUG</th>
                  <th>EP</th>
                </tr>
              </thead>
              <tbody>
                {YEARS.map((year) => (
                  <tr key={year}>
                    <td>{year}. godina</td>
                    {PROGRAM_KEYS.map((prog) => (
                      <td key={prog}>
                        <input
                          className="input small"
                          type="number"
                          min={0}
                          value={
                            yearProgStudents[year]?.[prog] ?? ""
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setYearProgStudents((prev) => ({
                              ...prev,
                              [year]: {
                                ...(prev[year] || {}),
                                [prog]: val,
                              },
                            }));
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* DONJA TABELA – predmeti + izračunati broj studenata + max u grupi */}
          <table className="table">
            <thead>
              <tr>
                <th>Predmet</th>
                <th>Godina</th>
                <th>Studijski programi</th>
                <th>Nastavnici</th>
                <th>Broj studenata</th>
                <th>Max u grupi</th>
                <th>Broj grupa</th>
              </tr>
            </thead>
            <tbody>
              {groupSubjects.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nema podataka za prikaz.</td>
                </tr>
              ) : (
                groupSubjects.map((s) => {
                  const conf = subjectGroupConfig[s.key] || {};
                  const maxVal =
                    conf.maxPerGroup !== undefined
                      ? conf.maxPerGroup
                      : "";

                  const studentsTotal = s.studentsTotal || 0;
                  const maxNum = Number(maxVal);
                  const groupsCount =
                    studentsTotal > 0 && maxNum > 0
                      ? Math.ceil(studentsTotal / maxNum)
                      : "";

                  return (
                    <tr key={s.key}>
                      <td>
                        {s.subjectName}
                        {s.subjectCode ? ` (${s.subjectCode})` : ""}
                      </td>
                      <td>{s.yearsText}</td>
                      <td>{s.programsText}</td>
                      <td>
                        {s.professors && s.professors.length
                          ? s.professors.join(", ")
                          : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {studentsTotal || ""}
                      </td>
                      <td>
                        <input
                          className="input small"
                          type="number"
                          min={0}
                          value={maxVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSubjectGroupConfig((prev) => ({
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
        </>
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
