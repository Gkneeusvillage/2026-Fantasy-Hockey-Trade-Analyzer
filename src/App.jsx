import React, { useState, useMemo } from "react";

/* =========================
   League Constants
========================= */

const SALARY_CAP = 117_600_000;

const SKATER_CATEGORIES = ["G", "A", "PTS", "BLK", "FOW", "HIT", "SOG", "STP", "Tk"];
const GOALIE_CATEGORIES = ["GAA", "SV%", "SHO", "W", "SV", "GA"];
const ALL_CATEGORIES = [...SKATER_CATEGORIES, ...GOALIE_CATEGORIES];

const CATEGORY_WEIGHTS = Object.fromEntries(
  ALL_CATEGORIES.map(c => [c, 1])
);

const PLAYOFF_WEIGHTS = {
  G: 1.15,
  A: 1.0,
  PTS: 1.0,
  SOG: 0.85,
  HIT: 0.85,
  BLK: 0.85,
  FOW: 0.85,
  STP: 1.25,
  Tk: 1.1,

  W: 1.15,
  SHO: 1.3,
  "SV%": 1.1,
  GAA: 1.1,
  SV: 0.85,
  GA: 0.85
};

/* =========================
   Utility Helpers
========================= */

const normalizeName = (name = "") =>
  name.toLowerCase().replace(/[^a-z]/g, "");

const num = v => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/* =========================
   Main App
========================= */

export default function App() {
  const [players, setPlayers] = useState([]);
  const [playoffFocus, setPlayoffFocus] = useState(false);

  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [teamC, setTeamC] = useState([]);

  /* =========================
     CSV Upload
  ========================= */

  const handleCSVUpload = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const lines = reader.result.split("\n").filter(Boolean);
      const headers = lines[0].split(",").map(h => h.trim());

      const parsed = lines.slice(1).map(row => {
        const cols = row.split(",");
        const obj = {};
        headers.forEach((h, i) => (obj[h] = cols[i]?.trim() || ""));
        obj._key = normalizeName(obj.Name);
        return obj;
      });

      setPlayers(parsed);
    };
    reader.readAsText(file);
  };

  /* =========================
     Player Index
  ========================= */

  const playerIndex = useMemo(() => {
    const map = {};
    players.forEach(p => {
      if (p._key) map[p._key] = p;
    });
    return map;
  }, [players]);

  const addPlayer = (name, setter) => {
    const key = normalizeName(name);
    if (!playerIndex[key]) return;
    setter(prev => (prev.includes(key) ? prev : [...prev, key]));
  };

  /* =========================
     Scoring Engine
  ========================= */

  const scoreTeam = team => {
    const totals = {};
    ALL_CATEGORIES.forEach(c => (totals[c] = 0));
    let salary = 0;

    team.forEach(key => {
      const p = playerIndex[key];
      if (!p) return;

      salary += num(p.AAV);

      ALL_CATEGORIES.forEach(cat => {
        const base = num(p[cat]);
        const weight =
          CATEGORY_WEIGHTS[cat] *
          (playoffFocus ? PLAYOFF_WEIGHTS[cat] || 1 : 1);
        totals[cat] += base * weight;
      });
    });

    return { totals, salary };
  };

  const teams = {
    A: scoreTeam(teamA),
    B: scoreTeam(teamB),
    C: scoreTeam(teamC)
  };

  /* =========================
     Category Winners
  ========================= */

  const categoryResults = ALL_CATEGORIES.map(cat => {
    const values = {
      A: teams.A.totals[cat],
      B: teams.B.totals[cat],
      C: teams.C.totals[cat]
    };

    const max = Math.max(...Object.values(values));
    const winners = Object.entries(values)
      .filter(([, v]) => v === max)
      .map(([k]) => k);

    return { cat, winners };
  });

  /* =========================
     Verdict Logic
  ========================= */

  const winCounts = { A: 0, B: 0, C: 0 };

  categoryResults.forEach(r => {
    if (r.winners.length === 1) {
      winCounts[r.winners[0]]++;
    }
  });

  const rankedTeams = Object.entries(winCounts).sort(
    (a, b) => b[1] - a[1]
  );

  const verdict =
    rankedTeams[0][1] === rankedTeams[1][1]
      ? "Trade is balanced"
      : `Team ${rankedTeams[0][0]} gains the most value`;

  /* =========================
     Render
  ========================= */

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Fantasy Hockey Trade Analyzer (3-Team)
      </h1>

      <input type="file" accept=".csv" onChange={handleCSVUpload} />

      <div className="my-4">
        <label>
          <input
            type="checkbox"
            checked={playoffFocus}
            onChange={() => setPlayoffFocus(!playoffFocus)}
          />{" "}
          Playoff Focus
        </label>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-3 gap-6">
        {[
          ["Team A", setTeamA],
          ["Team B", setTeamB],
          ["Team C", setTeamC]
        ].map(([label, setter]) => (
          <div key={label}>
            <h2 className="font-semibold">{label}</h2>
            <input
              placeholder="Type player name + Enter"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  addPlayer(e.target.value, setter);
                  e.target.value = "";
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Category Impact */}
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Per-Category Impact</h2>
        <ul>
          {categoryResults.map(r => (
            <li key={r.cat}>
              {r.cat}:{" "}
              {r.winners.length > 1
                ? "⚖️ Tie"
                : r.winners[0] === "A"
                ? "⬅️ Team A"
                : r.winners[0] === "B"
                ? "➡️ Team B"
                : "⬆️ Team C"}
            </li>
          ))}
        </ul>
      </div>

      {/* Verdict Panel */}
      <div className="mt-6 p-4 border rounded">
        <h2 className="font-bold text-lg">Trade Verdict</h2>
        <p>{verdict}</p>

        {["A", "B", "C"].map(t => (
          <p key={t} className="text-sm">
            Team {t} Salary: ${teams[t].salary.toLocaleString()}
            {teams[t].salary > SALARY_CAP && (
              <span className="text-red-600"> ⚠ Over Cap</span>
            )}
          </p>
        ))}
      </div>
    </div>
  );
}
