import React, { useState, useMemo } from "react";

const SALARY_CAP = 117_600_000;
const [playoffFocus, setPlayoffFocus] = useState(false);

/* =========================
   Playoff Category Weights
========================= */
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
   League Category Weights
========================= */
const CATEGORY_EPSILON = 1; // deadband to avoid noise

const compareCategory = (a, b) => {
  if (Math.abs(a - b) <= CATEGORY_EPSILON) return "even";
  return a > b ? "win" : "loss";
};

const categoryIcon = (result) => {
  if (result === "win") return "▲";
  if (result === "loss") return "▼";
  return "—";
};

const categoryColor = (result) => {
  if (result === "win") return "text-green-600";
  if (result === "loss") return "text-red-600";
  return "text-gray-400";
};
const SKATER_CATS = ["G", "A", "PTS", "BLK", "FOW", "HIT", "SOG", "STP", "Tk"];
const GOALIE_CATS = ["GAA", "SV%", "SHO", "W", "SV", "GA"];

/* =========================
   Draft Pick Modeling
========================= */
const pickValue = (label, mode) => {
  if (!label) return 0;
  const l = label.toLowerCase();
  if (!l.includes("1st") && !l.includes("2nd")) return 0;

  const round = l.includes("1st") ? 1 : 2;

  // 14-team league: both rounds are effectively NHL 1st-round talent
  const base = round === 1 ? 55 : 35;

  return mode === "rebuild" ? base * 1.4 : base * 0.7;
};

/* =========================
   Trade Mode Multipliers
========================= */
const MODE_MULTIPLIER = {
  contend: { now: 1.25, future: 0.8, cap: 0.7 },
  rebuild: { now: 0.85, future: 1.4, cap: 1.1 }
};

/* =========================
   Helpers
========================= */
const clean = (v) => String(v || "").trim();

const normalizeCSV = (text) => {
  const rows = text.split("\n").map(r => r.split(","));
  const headers = rows.shift().map(h => h.trim());
  return rows.map(row =>
    headers.reduce((o, h, i) => {
      o[h] = clean(row[i]);
      return o;
    }, {})
  );
};

export default function App() {
  const [players, setPlayers] = useState([]);
  const [tradeMode, setTradeMode] = useState("contend");
  const [teams, setTeams] = useState([
    { name: "User’s Team", players: [""] },
    { name: "Competitor", players: [""] }
  ]);

  /* =========================
     CSV Upload
  ========================= */
  const uploadCSV = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPlayers(normalizeCSV(r.result));
    r.readAsText(f);
  };

  /* =========================
     Player Matching
  ========================= */
  const matchPlayer = (input) => {
    if (!input) return null;
    const q = input.toLowerCase();
    return players.find(p =>
      clean(p.Player).toLowerCase().includes(q)
    );
  };

  /* =========================
     Scoring
  ========================= */
  const scorePlayer = (p) => {
    if (!p) return { now: 0, future: 0, cap: 0, cats: {} };

    const isG = clean(p.Position) === "G";
    const cats = isG ? GOALIE_CATS : SKATER_CATS;

    let catScore = 0;
    const catBreakdown = {};

    cats.forEach(c => {
      const v = Number(p[c] || 0);
      catBreakdown[c] = v;
      catScore += v;
    });

    const age = Number(p.Age || 28);
    const future = age < 24 ? 30 : age > 30 ? -20 : 0;
    const cap = -Number(p.Salary || 0) / 1_000_000;

    return { now: catScore, future, cap, cats: catBreakdown };
  };

  const evaluateTeam = (team) => {
    return team.players.reduce(
      (acc, entry) => {
        const p = matchPlayer(entry);
        if (!p && entry.toLowerCase().includes("pick")) {
          acc.future += pickValue(entry, tradeMode);
          return acc;
        }
        const s = scorePlayer(p);
        acc.now += s.now;
        acc.future += s.future;
        acc.cap += s.cap;
        Object.keys(s.cats).forEach(k => {
          acc.cats[k] = (acc.cats[k] || 0) + s.cats[k];
        });
        return acc;
      },
      { now: 0, future: 0, cap: 0, cats: {} }
    );
  };

  const results = useMemo(
    () => teams.map(evaluateTeam),
    [teams, players, tradeMode]
  );

  const totalValue = (r) => {
    const m = MODE_MULTIPLIER[tradeMode];
    return (
      r.now * m.now +
      r.future * m.future +
      r.cap * m.cap
    );
  };
  <div className="mt-8">
  <h2 className="text-lg font-semibold mb-3 text-center">
    Category Impact Breakdown
  </h2>

  <div className="overflow-x-auto">
    <table className="w-full border text-sm">
      <thead>
        <tr className="bg-gray-100">
          <th className="border p-2">Category</th>
          <th className="border p-2">{teams[0].name}</th>
          <th className="border p-2">{teams[1].name}</th>
        </tr>
      </thead>
      <tbody>
        {categoryResults.map(row => (
          <tr key={row.category}>
            <td className="border p-2 font-medium text-center">
              {row.category}
            </td>
            <td className={`border p-2 text-center ${categoryColor(row.resultA)}`}>
              {row.teamA} {categoryIcon(row.resultA)}
            </td>
            <td className={`border p-2 text-center ${categoryColor(row.resultB)}`}>
              {row.teamB} {categoryIcon(row.resultB)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>


  /* =========================
     Verdict
  ========================= */
  const weight = playoffFocus ? (PLAYOFF_WEIGHTS[cat] || 1) : 1;
  totals += value * weight;

  <p className="text-xs text-gray-500 mt-1">
  Mode: {playoffFocus ? "Playoff Focus (Category Volatility Weighted)" : "Regular Season"}
  </p>

const totals = results.map(totalValue);
  const best = Math.max(...totals);
  const winner =
    totals.filter(v => Math.abs(v - best) < 5).length > 1
      ? "Even Trade"
      : teams[totals.indexOf(best)].name + " Wins";
      const allCategories = [...SKATER_CATS, ...GOALIE_CATS];

const categoryResults = useMemo(() => {
  if (results.length < 2) return [];

  const base = results[0].cats || {};
  const compare = results[1].cats || {};

  return allCategories.map(cat => {
    const a = base[cat] || 0;
    const b = compare[cat] || 0;

    return {
      category: cat,
      teamA: a,
      teamB: b,
      resultA: compareCategory(a, b),
      resultB: compareCategory(b, a)
    };
  });
}, [results]);


  /* =========================
     UI
  ========================= */
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-4">
        🏒 Fantasy Hockey Trade Analyzer
      </h1>

      <input type="file" accept=".csv" onChange={uploadCSV} />

      <div className="flex justify-center gap-4 my-6">
        {["contend", "rebuild"].map(m => (
          <button
            key={m}
            onClick={() => setTradeMode(m)}
            className={`px-4 py-2 rounded ${
              tradeMode === m
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
            }`}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>

  <div className="flex justify-center my-4">
  <label className="flex items-center gap-3 cursor-pointer">
    <span className="text-sm font-medium">Regular Season</span>

    <input
      type="checkbox"
      checked={playoffFocus}
      onChange={() => setPlayoffFocus(!playoffFocus)}
      className="w-4 h-4"
    />

    <span className="text-sm font-medium">Playoff Focus</span>
  </label>
  </div>

      <div className="grid md:grid-cols-3 gap-6">
        {teams.map((t, i) => (
          <div key={i}>
            <h2 className="font-semibold mb-2">{t.name}</h2>
            {t.players.map((p, idx) => (
              <input
                key={idx}
                value={p}
                placeholder="Player or Pick"
                onChange={(e) => {
                  const copy = [...teams];
                  copy[i].players[idx] = e.target.value;
                  setTeams(copy);
                }}
                className="border p-2 w-full mb-2"
              />
            ))}
            <button
              className="text-sm underline"
              onClick={() => {
                const copy = [...teams];
                copy[i].players.push("");
                setTeams(copy);
              }}
            >
              + Add Asset
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t pt-4 text-center">
        <h2 className="text-xl font-bold">{winner}</h2>
        {results.map((r, i) => (
          <p key={i} className="text-sm text-gray-600">
            {teams[i].name}: {Math.round(totalValue(r))}
          </p>
        ))}
      </div>
    </div>
  );
}
