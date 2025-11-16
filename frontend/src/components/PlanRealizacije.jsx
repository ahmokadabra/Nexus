import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut, apiPost } from "../lib/api";
import * as XLSX from "xlsx-js-style";

const TITLE_MAP = {
  PRACTITIONER: "Stručnjak iz prakse",
  ASSISTANT: "Asistent",
  SENIOR_ASSISTANT: "Viši asistent",
  ASSISTANT_PROFESSOR: "Docent",
  ASSOCIATE_PROFESSOR: "Vanr. prof.",
  FULL_PROFESSOR: "Red. prof.",
  PROFESSOR_EMERITUS: "Prof. emeritus",
};
const ENG_MAP = { EMPLOYED: "RO", EXTERNAL: "VS" }; // Radni odnos / Vanjski saradnik

export default function PlanRealizacije() {
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [year, setYear] = useState(1);
  const [plan, setPlan] = useState(null);
  const [rows, setRows] = useState([]);
  const [profs, setProfs] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // učitaj programe + profesore
  useEffect(() => {
    (async () => {
      try {
        const [ps, pf] = await Promise.all([
          apiGet("/api/planrealizacije/programs"),
          apiGet("/api/professors"),
        ]);
        setPrograms(ps);
        setProfs(pf);
        if (ps.length && !selectedProgramId) setSelectedProgramId(ps[0].id);
      } catch (e) {
        setMsg({ type: "err", text: e.message });
      }
    })();
  }, []);

  // helper: izračunaj default "mode" (P | V | PV) po redu
  function inferMode(r) {
    const L = Number(r.lectureTotal ?? 0);
    const E = Number(r.exerciseTotal ?? 0);
    if (L > 0 && E > 0) return "PV";
    if (L > 0) return "P";
    if (E > 0) return "V";
    return "PV";
  }

  async function loadPlan(pid = selectedProgramId, yr = year) {
    setLoading(true);
    setMsg(null);
    try {
      const data = await apiGet(
        `/api/planrealizacije/plan?programId=${encodeURIComponent(
          pid
        )}&year=${yr}`
      );
      setPlan(data.plan);
      setRows(
        (data.rows || []).map((r) => ({
          ...r,
          _edit: {
            professorId: r.professorId || "",
            lectureTotal: r.lectureTotal ?? 0,
            exerciseTotal: r.exerciseTotal ?? 0,
            mode: inferMode(r), // "P" | "V" | "PV"
            saving: false,
          },
        }))
      );
    } catch (e) {
      setPlan(null);
      setRows([]);
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedProgramId) loadPlan(selectedProgramId, year);
  }, [selectedProgramId, year]);

  function changeRow(id, patch) {
    setRows((arr) =>
      arr.map((r) =>
        r.id === id ? { ...r, _edit: { ...r._edit, ...patch } } : r
      )
    );
  }

  async function saveRow(r) {
    if (!r?._edit) return;
    // Ako je izabrano "P", total za vježbe = 0; Ako "V", total za predavanja = 0
    const mode = r._edit.mode || "PV";
    const body = {
      professorId:
        r._edit.professorId === "" ? null : String(r._edit.professorId),
      lectureTotal: mode === "V" ? 0 : Number(r._edit.lectureTotal) || 0,
      exerciseTotal: mode === "P" ? 0 : Number(r._edit.exerciseTotal) || 0,
    };
    changeRow(r.id, { saving: true });
    try {
      const saved = await apiPut(`/api/planrealizacije/rows/${r.id}`, body);
      setMsg({ type: "ok", text: "Sačuvano" });
      setRows((arr) =>
        arr.map((x) =>
          x.id === r.id
            ? {
                ...x,
                professorId: saved.professorId,
                lectureTotal: saved.lectureTotal,
                exerciseTotal: saved.exerciseTotal,
                professor:
                  saved.professor ??
                  (body.professorId
                    ? profs.find((p) => p.id === body.professorId) || null
                    : null),
                _edit: {
                  ...x._edit,
                  lectureTotal: saved.lectureTotal,
                  exerciseTotal: saved.exerciseTotal,
                  mode: inferMode(saved),
                  saving: false,
                },
              }
            : x
        )
      );
    } catch (e) {
      setMsg({ type: "err", text: e.message });
      changeRow(r.id, { saving: false });
    }
  }

  // ⬇️ dodaj novog nastavnika (novi PRNRow za isti plan + predmet)
  async function addTeacherRow(r) {
    try {
      if (!r?.planId || !r?.subjectId) {
        setMsg({
          type: "err",
          text: "Nedostaje planId ili subjectId za dodavanje nastavnika.",
        });
        return;
      }

      const created = await apiPost("/api/planrealizacije/rows/add-teacher", {
        planId: r.planId,
        subjectId: r.subjectId,
      });

      const newRow = {
        ...created,
        _edit: {
          professorId: created.professorId || "",
          lectureTotal: created.lectureTotal ?? 0,
          exerciseTotal: created.exerciseTotal ?? 0,
          mode: inferMode(created),
          saving: false,
        },
      };

      // novi nastavnik ide u isti predmet (grouping po subject.id već radi)
      setRows((arr) => [...arr, newRow]);
      setMsg({ type: "ok", text: "Dodat novi nastavnik za predmet." });
    } catch (e) {
      setMsg({
        type: "err",
        text: e.message || "Greška pri dodavanju nastavnika.",
      });
    }
  }

  // proračuni (za dno tabele) za AKTUELNU godinu (UI)
  const computed = useMemo(() => {
    const total = { RO: { L: 0, E: 0 }, VS: { L: 0, E: 0 }, ALL: { L: 0, E: 0 } };
    rows.forEach((r) => {
      const L = Number(r._edit?.lectureTotal ?? r.lectureTotal ?? 0);
      const E = Number(r._edit?.exerciseTotal ?? r.exerciseTotal ?? 0);
      const bucket = r.professor?.engagement
        ? ENG_MAP[r.professor.engagement]
        : null;
      total.ALL.L += L;
      total.ALL.E += E;
      if (bucket === "RO") {
        total.RO.L += L;
        total.RO.E += E;
      } else if (bucket === "VS") {
        total.VS.L += L;
        total.VS.E += E;
      }
    });
    const sum = (obj) => obj.L + obj.E;
    const sumALL = sum(total.ALL);
    const sumRO = sum(total.RO);
    const sumVS = sum(total.VS);
    const pct = (x) => (sumALL > 0 ? (x / sumALL) * 100 : 0);
    return {
      total,
      sumALL,
      sumRO,
      sumVS,
      pctRO: pct(sumRO),
      pctVS: pct(sumVS),
    };
  }, [rows]);

  // grupiranje po predmetu (za spajanje ćelija u UI)
  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = r.subject?.id || r.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return Array.from(map.values());
  }, [rows]);

  const currentProgram = programs.find((p) => p.id === selectedProgramId);

  // ===== Excel export (xlsx-js-style) =====
  function toCell(v, style = {}, tHint) {
    const isNum = typeof v === "number";
    return {
      v,
      t: tHint || (isNum ? "n" : "s"),
      s: style,
    };
  }

  // ⬇️ NOVO: export za SVE 4 GODINE odabranog programa, svaki u svoj sheet
  async function downloadExcel() {
    if (!currentProgram) return;

    try {
      const wb = XLSX.utils.book_new();

      // Stilovi
      const BORDER = { style: "thin", color: { rgb: "FF444444" } };
      const BORDERS = {
        top: BORDER,
        bottom: BORDER,
        left: BORDER,
        right: BORDER,
      };

      const sTitle = {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFFFF" } },
        fill: { fgColor: { rgb: "FF1F2937" } },
        alignment: { horizontal: "left", vertical: "center" },
      };
      const sSub = {
        font: { bold: false, sz: 11 },
        alignment: { horizontal: "left", vertical: "center" },
      };
      const sTH = {
        font: { bold: true, color: { rgb: "FFFFFFFF" } },
        fill: { fgColor: { rgb: "FF374151" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: BORDERS,
      };
      const sTH2 = {
        font: { bold: true, color: { rgb: "FFFFFFFF" } },
        fill: { fgColor: { rgb: "FF4B5563" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: BORDERS,
      };
      const sTD = {
        alignment: { vertical: "center" },
        border: BORDERS,
      };
      const sTDLeft = {
        alignment: {
          horizontal: "left",
          vertical: "center",
          wrapText: true,
        },
        border: BORDERS,
      };
      const sTDCenter = {
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDERS,
      };
      const sTDNum = {
        alignment: { horizontal: "right", vertical: "center" },
        border: BORDERS,
        numFmt: "0.00",
      };
      const sTDInt = {
        alignment: { horizontal: "right", vertical: "center" },
        border: BORDERS,
        numFmt: "0",
      };
      const sTotal = {
        font: { bold: true },
        border: BORDERS,
        alignment: { horizontal: "right", vertical: "center" },
        fill: { fgColor: { rgb: "FFF3F4F6" } },
      };
      const sTotalLabel = {
        font: { bold: true },
        alignment: { horizontal: "right", vertical: "center" },
        fill: { fgColor: { rgb: "FFF3F4F6" } },
        border: BORDERS,
      };
      const sTotalPctLabel = {
        font: { bold: true },
        alignment: { horizontal: "right", vertical: "center" },
        fill: { fgColor: { rgb: "FFE5E7EB" } },
        border: BORDERS,
      };
      const sTotalPctVal = {
        font: { bold: true },
        alignment: { horizontal: "left", vertical: "center" },
        fill: { fgColor: { rgb: "FFE5E7EB" } },
        border: BORDERS,
        numFmt: "0.00\\%",
      };

      // Kolone (10 kolona bez "Save" dugmeta)
      // A: Predmet, B: P/V, C: Nastavnici, D: Angažman,
      // E: L (uk), F: V (uk), G: Ukupno,
      // H: L/15, I: V/15, J: Uk/15
      const cols = [
        { wch: 40 }, // Predmet
        { wch: 6 }, // P/V
        { wch: 28 }, // Nastavnici
        { wch: 10 }, // Angažman
        { wch: 12 }, // L total
        { wch: 12 }, // E total
        { wch: 12 }, // U total
        { wch: 12 }, // L/15
        { wch: 12 }, // E/15
        { wch: 12 }, // U/15
      ];

      // za sada hardkod: godine 1..4
      const years = [1, 2, 3, 4];

      for (const yr of years) {
        let dataYear;
        try {
          dataYear = await apiGet(
            `/api/planrealizacije/plan?programId=${encodeURIComponent(
              currentProgram.id
            )}&year=${yr}`
          );
        } catch {
          // ako plan za godinu pukne, preskačemo taj sheet
          continue;
        }

        const planY = dataYear.plan;
        const rowsY = Array.isArray(dataYear.rows) ? dataYear.rows : [];

        // proračuni za ovu godinu
        const totals = { RO: { L: 0, E: 0 }, VS: { L: 0, E: 0 }, ALL: { L: 0, E: 0 } };
        rowsY.forEach((r) => {
          const L = Number(r.lectureTotal ?? 0);
          const E = Number(r.exerciseTotal ?? 0);
          const prof =
            r.professor ||
            profs.find((p) => p.id === (r.professorId || r._edit?.professorId));
          const bucket = prof?.engagement
            ? ENG_MAP[prof.engagement]
            : null;
          totals.ALL.L += L;
          totals.ALL.E += E;
          if (bucket === "RO") {
            totals.RO.L += L;
            totals.RO.E += E;
          } else if (bucket === "VS") {
            totals.VS.L += L;
            totals.VS.E += E;
          }
        });

        const sum = (obj) => obj.L + obj.E;
        const sumALL = sum(totals.ALL);
        const sumRO = sum(totals.RO);
        const sumVS = sum(totals.VS);
        const pct = (x) => (sumALL > 0 ? (x / sumALL) * 100 : 0);
        const pctRO = pct(sumRO);
        const pctVS = pct(sumVS);

        // grupiranje po predmetu za ovu godinu
        const groupedMap = new Map();
        rowsY.forEach((r) => {
          const key = r.subject?.id || r.id;
          if (!groupedMap.has(key)) groupedMap.set(key, []);
          groupedMap.get(key).push(r);
        });
        const groupedYear = Array.from(groupedMap.values());

        const data = [];
        const merges = [];

        // Header (title + sub)
        const title = `Plan realizacije nastave`;
        const faculty = planY?.facultyName || "";
        const line3 = `${currentProgram?.name || ""}${
          currentProgram?.code ? ` (${currentProgram.code})` : ""
        } — Godina ${planY?.yearNumber || yr}`;

        // tri reda (merge preko svih 10 kolona)
        data.push([toCell(title, sTitle)]);
        merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } });
        data.push([toCell(faculty, sSub)]);
        merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 9 } });
        data.push([toCell(line3, sSub)]);
        merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 9 } });

        // prazno
        data.push([toCell("")]);

        const headerStart = data.length;

        // Prvi red headera (sa grupama)
        const h1 = [
          toCell("Predmet", sTH),
          toCell("P/V", sTH),
          toCell("Nastavnici", sTH),
          toCell("Angažman", sTH),
          toCell("Pokrivenost ukupno", sTH), // E-G merge
          toCell("", sTH),
          toCell("", sTH),
          toCell("Pokrivenost sedmična", sTH), // H-J merge
          toCell("", sTH),
          toCell("", sTH),
        ];
        data.push(h1);
        merges.push({ s: { r: headerStart, c: 4 }, e: { r: headerStart, c: 6 } });
        merges.push({ s: { r: headerStart, c: 7 }, e: { r: headerStart, c: 9 } });

        // Drugi red headera (kolone)
        const h2 = [
          toCell("", sTH2),
          toCell("", sTH2),
          toCell("", sTH2),
          toCell("", sTH2),
          toCell("Predavanja", sTH2),
          toCell("Vježbe", sTH2),
          toCell("Ukupno", sTH2),
          toCell("Predavanja", sTH2),
          toCell("Vježbe", sTH2),
          toCell("Ukupno", sTH2),
        ];
        data.push(h2);
        // Merge za prva 4 header polja (da izgledaju kao jedna visina)
        merges.push({ s: { r: headerStart, c: 0 }, e: { r: headerStart + 1, c: 0 } });
        merges.push({ s: { r: headerStart, c: 1 }, e: { r: headerStart + 1, c: 1 } });
        merges.push({ s: { r: headerStart, c: 2 }, e: { r: headerStart + 1, c: 2 } });
        merges.push({ s: { r: headerStart, c: 3 }, e: { r: headerStart + 1, c: 3 } });

        // Tabela redovi
        groupedYear.forEach((group) => {
          const firstRowIndex = data.length;

          // info o predmetu uzimamo iz prvog reda grupe
          const subj = group[0]?.subject || {};
          const isElective = !!subj.isElective;
          const ectsVal =
            subj.ects !== null && subj.ects !== undefined ? subj.ects : null;

          const spLinks = Array.isArray(subj.subjectPrograms)
            ? subj.subjectPrograms
            : [];
          const uniqueProgramIds = new Set(spLinks.map((sp) => sp.programId));
          const isJoint = uniqueProgramIds.size > 1;

          const subjectTitle = `${subj.name || ""}${
            subj.code ? ` (${subj.code})` : ""
          }`;

          const subjectLines = [];
          if (subjectTitle.trim()) subjectLines.push(subjectTitle);
          subjectLines.push(isElective ? "Izborni predmet" : "Obavezni predmet");
          if (ectsVal !== null) subjectLines.push(`ECTS: ${ectsVal}`);
          if (isJoint) subjectLines.push("Zajednički predmet");
          const subjectCellValue = subjectLines.join("\n");

          group.forEach((r, idx) => {
            const L = Number(r.lectureTotal ?? 0);
            const E = Number(r.exerciseTotal ?? 0);
            const U = L + E;
            const Lw = L / 15 || 0;
            const Ew = E / 15 || 0;
            const Uw = U / 15 || 0;

            const prof =
              r.professor ||
              profs.find(
                (p) => p.id === (r.professorId || r._edit?.professorId)
              ) ||
              null;
            const anga = prof?.engagement ? ENG_MAP[prof.engagement] : "-";
            const mode = r._edit?.mode || inferMode(r);

            data.push([
              toCell(idx === 0 ? subjectCellValue : "", sTDLeft),
              toCell(mode, sTDCenter),
              toCell(
                prof
                  ? `${prof.name}${
                      prof.title
                        ? ` — ${TITLE_MAP[prof.title] || prof.title}`
                        : ""
                    }`
                  : "—",
                sTDLeft
              ),
              toCell(anga, sTDCenter),
              toCell(L, sTDInt, "n"),
              toCell(E, sTDInt, "n"),
              toCell(U, sTDInt, "n"),
              toCell(Lw, sTDNum, "n"),
              toCell(Ew, sTDNum, "n"),
              toCell(Uw, sTDNum, "n"),
            ]);
          });

          if (group.length > 1) {
            const lastRowIndex = data.length - 1;
            merges.push({
              s: { r: firstRowIndex, c: 0 },
              e: { r: lastRowIndex, c: 0 },
            });
          }
        });

        // Totali (tri reda, svaki sa brojevima i desno udjelima)
        data.push([
          toCell("Ukupno iz radnog odnosa (RO):", sTotalLabel),
          toCell("", sTotal),
          toCell("", sTotal),
          toCell("", sTotal),
          toCell(totals.RO.L, sTotal, "n"),
          toCell(totals.RO.E, sTotal, "n"),
          toCell(sumRO, sTotal, "n"),
          toCell(totals.RO.L / 15, sTotal, "n"),
          toCell(totals.RO.E / 15, sTotal, "n"),
          toCell(sumRO / 15, sTotal, "n"),
        ]);
        data[data.length - 1].push(
          toCell("Udio RO:", sTotalPctLabel),
          toCell(pctRO / 100, sTotalPctVal, "n")
        );
        merges.push({
          s: { r: data.length - 1, c: 0 },
          e: { r: data.length - 1, c: 3 },
        });

        data.push([
          toCell("Ukupno iz honorarnog angažmana (VS):", sTotalLabel),
          toCell("", sTotal),
          toCell("", sTotal),
          toCell("", sTotal),
          toCell(totals.VS.L, sTotal, "n"),
          toCell(totals.VS.E, sTotal, "n"),
          toCell(sumVS, sTotal, "n"),
          toCell(totals.VS.L / 15, sTotal, "n"),
          toCell(totals.VS.E / 15, sTotal, "n"),
          toCell(sumVS / 15, sTotal, "n"),
        ]);
        data[data.length - 1].push(
          toCell("Udio VS:", sTotalPctLabel),
          toCell(pctVS / 100, sTotalPctVal, "n")
        );
        merges.push({
          s: { r: data.length - 1, c: 0 },
          e: { r: data.length - 1, c: 3 },
        });

        data.push([
          toCell("Ukupno:", sTotalLabel),
          toCell("", sTotal),
          toCell("", sTotal),
          toCell("", sTotal),
          toCell(totals.ALL.L, sTotal, "n"),
          toCell(totals.ALL.E, sTotal, "n"),
          toCell(sumALL, sTotal, "n"),
          toCell(totals.ALL.L / 15, sTotal, "n"),
          toCell(totals.ALL.E / 15, sTotal, "n"),
          toCell(sumALL / 15, sTotal, "n"),
        ]);
        data[data.length - 1].push(
          toCell("Ukupno:", sTotalPctLabel),
          toCell(1, sTotalPctVal, "n")
        ); // 100%
        merges.push({
          s: { r: data.length - 1, c: 0 },
          e: { r: data.length - 1, c: 3 },
        });

        // Pretvori u sheet
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws["!cols"] = [...cols, { wch: 12 }, { wch: 10 }]; // dvije dodatne za "Udio"
        ws["!merges"] = merges;

        const sheetName = `G${planY?.yearNumber || yr}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      const fname = `PRN_${
        currentProgram?.code || currentProgram?.name || "Program"
      }_sve_godine.xlsx`;
      XLSX.writeFile(wb, fname);
    } catch (e) {
      setMsg({
        type: "err",
        text: e.message || "Greška pri exportu u Excel.",
      });
    }
  }

  // ===== RENDER =====
  return (
    <div>
      {/* gore – samo godina + download; naslov izbrisan */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div /> {/* prazno mjesto umjesto <h2>Plan realizacije nastave</h2> */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4].map((y) => (
              <button
                key={y}
                className="btn"
                style={{ opacity: year === y ? 1 : 0.7 }}
                onClick={() => setYear(y)}
              >
                Godina {y}
              </button>
            ))}
          </div>
          <button
            className="btn"
            onClick={downloadExcel}
            disabled={!currentProgram}
          >
            Download Excel (sve godine)
          </button>
        </div>
      </div>

      {/* Tabs programi */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          margin: "8px 0",
        }}
      >
        {programs.map((p) => (
          <button
            key={p.id}
            className="btn"
            style={{
              background: selectedProgramId === p.id ? "#2a2f3a" : "transparent",
              border: "1px solid #3a4152",
            }}
            onClick={() => setSelectedProgramId(p.id)}
            title={p.name}
          >
            {p.code || p.name}
          </button>
        ))}
      </div>

      {msg && (
        <div className={msg.type === "ok" ? "success" : "error"}>{msg.text}</div>
      )}

      {loading ? (
        <div>Učitavanje…</div>
      ) : !currentProgram ? (
        <div>Nema programa.</div>
      ) : !plan ? (
        <div>Nema podataka za prikaz.</div>
      ) : (
        <>
          {/* ovaj dodatni header (naziv faksa + program + godina) ostavljen je kako jeste */}
          <div style={{ margin: "12px 0" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              Plan realizacije nastave
            </div>
            <div>{plan.facultyName}</div>
            <div>
              {currentProgram.name} ({currentProgram.code}) — Godina{" "}
              {plan.yearNumber}
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Predmet</th>
                <th style={{ width: 70 }}>P/V</th>
                <th>Nastavnici</th>
                <th>Angažman</th>
                <th colSpan={3}>Pokrivenost ukupno</th>
                <th colSpan={3}>Pokrivenost sedmična</th>
                <th></th>
              </tr>
              <tr>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th>Predavanja</th>
                <th>Vježbe</th>
                <th>Ukupno</th>
                <th>Predavanja</th>
                <th>Vježbe</th>
                <th>Ukupno</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {grouped.length === 0 ? (
                <tr>
                  <td colSpan={11}>Nema redova</td>
                </tr>
              ) : (
                grouped.map((group, gi) => {
                  const subj = group[0]?.subject || {};
                  const subjectName = subj.name || "";
                  const subjectCode = subj.code ? ` (${subj.code})` : "";
                  const ectsVal =
                    subj.ects !== null && subj.ects !== undefined
                      ? subj.ects
                      : null;
                  const isElective = !!subj.isElective;

                  const spLinks = Array.isArray(subj.subjectPrograms)
                    ? subj.subjectPrograms
                    : [];
                  const uniqueProgramIds = new Set(
                    spLinks.map((sp) => sp.programId)
                  );
                  const isJoint = uniqueProgramIds.size > 1;

                  return group.map((r, idx) => {
                    const L = Number(
                      r._edit?.lectureTotal ?? r.lectureTotal ?? 0
                    );
                    const E = Number(
                      r._edit?.exerciseTotal ?? r.exerciseTotal ?? 0
                    );
                    const U = L + E;
                    const Lw = L / 15 || 0;
                    const Ew = E / 15 || 0;
                    const Uw = U / 15 || 0;
                    const profId =
                      r._edit?.professorId ?? r.professorId ?? "";
                    const prof =
                      profs.find((p) => p.id === profId) || r.professor || null;
                    const anga = prof?.engagement
                      ? ENG_MAP[prof.engagement]
                      : "-";
                    const mode = r._edit?.mode || "PV";

                    return (
                      <tr key={`${r.id}-${idx}`}>
                        {/* subject cell merged vizuelno: prvi red prikazuje, ostali prazni */}
                        <td
                          rowSpan={idx === 0 ? group.length : 1}
                          style={{
                            display: idx === 0 ? undefined : "none",
                            verticalAlign: "top",
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>
                            {subjectName}
                            {subjectCode}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              opacity: 0.85,
                              marginTop: 2,
                            }}
                          >
                            {isElective
                              ? "Izborni predmet"
                              : "Obavezni predmet"}
                          </div>
                          {ectsVal !== null && (
                            <div
                              style={{
                                fontSize: 12,
                                opacity: 0.85,
                                marginTop: 2,
                              }}
                            >
                              ECTS: {ectsVal}
                            </div>
                          )}
                          {isJoint && (
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                marginTop: 2,
                              }}
                            >
                              Zajednički predmet
                            </div>
                          )}
                        </td>

                        {/* P/V select (usko) */}
                        <td>
                          <select
                            className="input"
                            value={mode}
                            onChange={(e) =>
                              changeRow(r.id, { mode: e.target.value })
                            }
                            style={{ maxWidth: 68 }}
                          >
                            <option value="P">P</option>
                            <option value="V">V</option>
                            <option value="PV">P/V</option>
                          </select>
                        </td>

                        {/* profesor */}
                        <td style={{ minWidth: 220 }}>
                          <select
                            className="input"
                            value={String(profId)}
                            onChange={(e) =>
                              changeRow(r.id, { professorId: e.target.value })
                            }
                          >
                            <option value="">— odaberi —</option>
                            {profs.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                                {p.title
                                  ? ` — ${TITLE_MAP[p.title] || p.title}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>{anga}</td>

                        {/* Predavanja */}
                        <td>
                          <input
                            className="input small"
                            value={
                              mode === "V"
                                ? 0
                                : r._edit?.lectureTotal ??
                                  r.lectureTotal ??
                                  0
                            }
                            onChange={(e) =>
                              changeRow(r.id, {
                                lectureTotal: e.target.value,
                              })
                            }
                            inputMode="numeric"
                            style={{
                              maxWidth: 90,
                              opacity: mode === "V" ? 0.5 : 1,
                            }}
                            disabled={mode === "V"}
                          />
                        </td>

                        {/* Vježbe */}
                        <td>
                          <input
                            className="input small"
                            value={
                              mode === "P"
                                ? 0
                                : r._edit?.exerciseTotal ??
                                  r.exerciseTotal ??
                                  0
                            }
                            onChange={(e) =>
                              changeRow(r.id, {
                                exerciseTotal: e.target.value,
                              })
                            }
                            inputMode="numeric"
                            style={{
                              maxWidth: 90,
                              opacity: mode === "P" ? 0.5 : 1,
                            }}
                            disabled={mode === "P"}
                          />
                        </td>

                        <td>{U}</td>
                        <td>{Lw.toFixed(2)}</td>
                        <td>{Ew.toFixed(2)}</td>
                        <td>{Uw.toFixed(2)}</td>

                        <td
                          style={{
                            whiteSpace: "nowrap",
                            display: "flex",
                            gap: 4,
                          }}
                        >
                          <button
                            className="btn"
                            disabled={r._edit?.saving}
                            onClick={() => saveRow(r)}
                          >
                            {r._edit?.saving ? "..." : "Save"}
                          </button>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => addTeacherRow(r)}
                            title="Dodaj nastavnika za ovaj predmet"
                          >
                            +
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })
              )}

              {/* Totali */}
              <tr>
                <td
                  colSpan={4}
                  style={{ textAlign: "right", fontWeight: 600 }}
                >
                  Ukupno iz radnog odnosa (RO):
                </td>
                <td>{computed.total.RO.L}</td>
                <td>{computed.total.RO.E}</td>
                <td>{computed.sumRO}</td>
                <td>{(computed.total.RO.L / 15).toFixed(2)}</td>
                <td>{(computed.total.RO.E / 15).toFixed(2)}</td>
                <td>{(computed.sumRO / 15).toFixed(2)}</td>

                {/* Udio RO desno, u istom redu */}
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ opacity: 0.8 }}>Udio RO:</span>
                    <strong>{computed.pctRO.toFixed(2)}%</strong>
                  </div>
                </td>
              </tr>

              <tr>
                <td
                  colSpan={4}
                  style={{ textAlign: "right", fontWeight: 600 }}
                >
                  Ukupno iz honorarnog angažmana (VS):
                </td>
                <td>{computed.total.VS.L}</td>
                <td>{computed.total.VS.E}</td>
                <td>{computed.sumVS}</td>
                <td>{(computed.total.VS.L / 15).toFixed(2)}</td>
                <td>{(computed.total.VS.E / 15).toFixed(2)}</td>
                <td>{(computed.sumVS / 15).toFixed(2)}</td>

                {/* Udio VS desno */}
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ opacity: 0.8 }}>Udio VS:</span>
                    <strong>{computed.pctVS.toFixed(2)}%</strong>
                  </div>
                </td>
              </tr>

              <tr>
                <td
                  colSpan={4}
                  style={{ textAlign: "right", fontWeight: 700 }}
                >
                  Ukupno:
                </td>
                <td>{computed.total.ALL.L}</td>
                <td>{computed.total.ALL.E}</td>
                <td>{computed.sumALL}</td>
                <td>{(computed.total.ALL.L / 15).toFixed(2)}</td>
                <td>{(computed.total.ALL.E / 15).toFixed(2)}</td>
                <td>{(computed.sumALL / 15).toFixed(2)}</td>

                {/* Ukupno 100% desno */}
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ opacity: 0.8 }}>Ukupno:</span>
                    <strong>100%</strong>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
