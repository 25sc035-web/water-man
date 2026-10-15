/**
 * water-model.js (FINAL): save this file as water-model.js and remove blend-optimizer.js from your page.
 *
 * evaluate(processes, factory, options)
 *   processes: [{ name, water }]                      water in L/day  (optional per-process maxTds / maxHardness)
 *   factory:   { waterCost, workingDays, capacity, dischargeLimit, freshTds, freshHardness,
 *                treatedTds, treatedHardness, treatedAvailable, lossPct }
 *   options:   { enabled: ['rinse','etp',...] }  or  { scenario: 'standard' | 'advanced' | 'eco_max' }
 *
 * Everything is computed from the inputs. All assumptions are in the three blocks directly below:
 * declare them as assumptions in your demo, and replace them with sourced values if you have them.
 */

// ---------------- ASSUMPTIONS (editable) ----------------
const ASSUMPTIONS = {
  lossPct: 0.0825,                       // share of process water leaving with fabric/steam
  maxShare: 0.5,                         // max share of any stage's water that may be treated water
  fresh: { tds: 150, hardness: 80 },     // mg/L
};

// Recycling pathways the user can switch on/off
//  type 'reduce'   = cuts a stage's water demand directly (process change)
//  type 'internal' = reuses a stage's own rinse water (no treatment needed)
//  type 'etp'      = reuses treated ETP water, limited by quality and ETP yield
const PATHWAYS = {
  rinse:     { name: "Rinse water recovery",        type: "internal", stage: /wash|rins|bleach/i, pct: 0.30, capex: 35000,  opexPerKL: 2 },
  counter:   { name: "Counter-current washing",     type: "reduce",   stage: /wash|rins/i,        pct: 0.25, capex: 60000,  opexPerKL: 0 },
  lowliquor: { name: "Low-liquor dyeing nozzles",   type: "reduce",   stage: /dye/i,              pct: 0.15, capex: 80000,  opexPerKL: 0 },
  etp:       { name: "ETP treated-water reuse",     type: "etp", yield: 0.90, tds: 650, hardness: 200, capex: 150000, opexPerKL: 5 },
  ro:        { name: "RO membrane + zero discharge", type: "etp", yield: 0.75, tds: 50,  hardness: 10,  capex: 450000, opexPerKL: 35, zld: true },
};

const SCENARIO_SETS = {
  standard: ["rinse", "etp"],
  advanced: ["rinse", "counter", "lowliquor", "etp"],
  eco_max:  ["rinse", "counter", "lowliquor", "ro"],
};

// Quality limits per stage (matched by process name; override with p.maxTds / p.maxHardness)
const STAGE_LIMITS = [
  { match: /wash|rins/i, maxTds: 1000, maxHardness: 250 },
  { match: /bleach/i,    maxTds: 500,  maxHardness: 150 },
  { match: /dye/i,       maxTds: 300,  maxHardness: 100 },
  { match: /finish/i,    maxTds: 600,  maxHardness: 150 },
];

// ---------------- helpers ----------------
function limitsFor(p) {
  const f = STAGE_LIMITS.find((l) => l.match.test(p.name || ""));
  return { maxTds: p.maxTds ?? f?.maxTds ?? null, maxHardness: p.maxHardness ?? f?.maxHardness ?? null };
}

// largest treated fraction x with  x*C_treated + (1-x)*C_fresh <= C_max
function maxFraction(limit, fresh, treated) {
  if (limit == null || treated <= limit) return 1;
  if (fresh >= limit) return 0;
  return (limit - fresh) / (treated - fresh);
}

function isNum(v) { return v !== undefined && v !== null && v !== "" && !isNaN(Number(v)); }

// ---------------- core model ----------------
function evaluate(processes, factory, options = {}) {
  const fact = factory || {};
  const enabled = (options.enabled || SCENARIO_SETS[options.scenario] || SCENARIO_SETS.standard).filter((id) => PATHWAYS[id]);

  const waterCost = Number(fact.waterCost) || 50;               // Rs per 1000 L
  const workingDays = Number(fact.workingDays) || 26;
  const capacity = Number(fact.capacity) || 1000;               // kg/day
  const lossPct = isNum(fact.lossPct) ? Number(fact.lossPct) : ASSUMPTIONS.lossPct;
  const dischargeLimit = isNum(fact.dischargeLimit) ? Number(fact.dischargeLimit) : null;
  const fresh = {
    tds: Number(fact.freshTds) || ASSUMPTIONS.fresh.tds,
    hardness: Number(fact.freshHardness) || ASSUMPTIONS.fresh.hardness,
  };

  // 1. Baseline stages
  const stages = (Array.isArray(processes) ? processes : []).map((p) => ({
    name: p.name, original: Number(p.water) || 0, water: Number(p.water) || 0, internal: 0, ...limitsFor(p),
  }));
  const baselineDemand = stages.reduce((t, s) => t + s.original, 0);

  // 2. Process changes that cut demand directly
  enabled.filter((id) => PATHWAYS[id].type === "reduce").forEach((id) => {
    const pw = PATHWAYS[id];
    stages.forEach((s) => { if (pw.stage.test(s.name || "")) s.water *= 1 - pw.pct; });
  });
  const demandAfterReduction = stages.reduce((t, s) => t + s.water, 0);

  // 3. Internal rinse-water reuse
  enabled.filter((id) => PATHWAYS[id].type === "internal").forEach((id) => {
    const pw = PATHWAYS[id];
    stages.forEach((s) => { if (pw.stage.test(s.name || "")) s.internal += s.water * pw.pct; });
  });
  const internalReuse = stages.reduce((t, s) => t + s.internal, 0);
  stages.forEach((s) => { s.remaining = s.water - s.internal; });
  const processIntake = demandAfterReduction - internalReuse;   // water that must come from outside the process

  // 4. Wastewater and ETP reuse (quality-limited)
  const wastewater = Math.round(processIntake * (1 - lossPct));
  const treatId = enabled.includes("ro") ? "ro" : enabled.includes("etp") ? "etp" : null;
  const tp = treatId ? PATHWAYS[treatId] : null;
  const treated = tp ? { tds: Number(fact.treatedTds) || tp.tds, hardness: Number(fact.treatedHardness) || tp.hardness } : null;
  let remainingSupply = tp ? (isNum(fact.treatedAvailable) ? Number(fact.treatedAvailable) : Math.round(wastewater * tp.yield)) : 0;
  const supplyStart = remainingSupply;

  const order = [...stages].sort((a, b) => (b.maxTds ?? Infinity) - (a.maxTds ?? Infinity));
  order.forEach((s) => {
    s.etpReuse = 0; s.limitedBy = "none"; s.maxFraction = 0;
    if (!tp) return;
    const x = Math.min(maxFraction(s.maxTds, fresh.tds, treated.tds), maxFraction(s.maxHardness, fresh.hardness, treated.hardness), ASSUMPTIONS.maxShare);
    s.maxFraction = +x.toFixed(3);
    s.etpReuse = Math.min(s.remaining * x, remainingSupply);
    remainingSupply -= s.etpReuse;
    s.limitedBy = s.etpReuse < s.remaining * x - 1e-9 ? "supply" : (x < ASSUMPTIONS.maxShare ? "quality" : "safety cap");
  });
  const etpReuse = stages.reduce((t, s) => t + s.etpReuse, 0);

  // 5. Fresh water, discharge, percentages (single baseline = original demand)
  const totalFresh = demandAfterReduction - internalReuse - etpReuse;
  const waterSaved = baselineDemand - totalFresh;
  const savingPercent = baselineDemand > 0 ? +((waterSaved / baselineDemand) * 100).toFixed(1) : 0;
  const etpLosses = tp ? wastewater - Math.round(wastewater * tp.yield) : 0;      // sludge / brine / evaporation
  const finalDischarge = tp?.zld ? 0 : Math.max(0, Math.round(wastewater - etpReuse - etpLosses));
  const dischargeCompliant = dischargeLimit == null ? null : finalDischarge <= dischargeLimit;

  // 6. Money: avoided water cost minus running cost of the enabled pathways
  const opexDay = (internalReuse / 1000) * (enabled.includes("rinse") ? PATHWAYS.rinse.opexPerKL : 0)
                + (etpReuse / 1000) * (tp ? tp.opexPerKL : 0);
  const netPerDay = (waterSaved / 1000) * waterCost - opexDay;
  const monthlyCostSaving = Math.round(netPerDay * workingDays);
  const capex = enabled.reduce((t, id) => t + PATHWAYS[id].capex, 0);
  const paybackMonths = monthlyCostSaving > 0 ? +(capex / monthlyCostSaving).toFixed(1) : null;

  return {
    enabled,
    totalDemand: baselineDemand,             // original demand (baseline for all percentages)
    totalFresh: Math.round(totalFresh),
    totalRecycled: Math.round(waterSaved),   // water no longer taken fresh (reduction + internal + ETP reuse)
    demandReduction: Math.round(baselineDemand - demandAfterReduction),
    internalReuse: Math.round(internalReuse),
    etpReuse: Math.round(etpReuse),
    savingPercent,
    rawWastewaterGenerated: wastewater,
    etpLosses, finalDischarge, dischargeLimit, dischargeCompliant,
    unusedTreatedWater: Math.round(remainingSupply),
    monthlyCostSaving, annualCostSaving: monthlyCostSaving * 12, capex, paybackMonths,
    specificWaterBefore: capacity > 0 ? +(baselineDemand / capacity).toFixed(1) : 0,   // L per kg
    specificWaterAfter: capacity > 0 ? +(totalFresh / capacity).toFixed(1) : 0,
    perStage: stages.map((s) => ({
      name: s.name, baseline: Math.round(s.original), afterReduction: Math.round(s.water),
      internal: Math.round(s.internal), etpReuse: Math.round(s.etpReuse),
      fresh: Math.round(s.water - s.internal - s.etpReuse),
      maxFraction: s.maxFraction, limitedBy: s.limitedBy,
    })),
  };
}

// ---------------- ranking of recommendations ----------------
// Each pathway evaluated on its own, then ranked by net monthly saving.
function rankRecommendations(processes, factory) {
  return Object.keys(PATHWAYS).map((id) => {
    const r = evaluate(processes, factory, { enabled: [id] });
    return {
      id, name: PATHWAYS[id].name, savedLPerDay: r.totalRecycled,
      netPerMonth: r.monthlyCostSaving, capex: r.capex, paybackMonths: r.paybackMonths,
      priority: r.paybackMonths == null ? "Low" : r.paybackMonths <= 6 ? "High" : r.paybackMonths <= 12 ? "Medium" : "Low",
    };
  }).sort((a, b) => b.netPerMonth - a.netPerMonth).map((r, i) => ({ rank: i + 1, ...r }));
}

// ---------------- scenario comparison ----------------
function compareScenarios(processes, factory) {
  return Object.keys(SCENARIO_SETS).map((k) => {
    const r = evaluate(processes, factory, { scenario: k });
    return { scenario: k, pathways: r.enabled.map((id) => PATHWAYS[id].name), savingPercent: r.savingPercent,
             saved: r.totalRecycled, fresh: r.totalFresh, discharge: r.finalDischarge,
             compliant: r.dischargeCompliant, netPerMonth: r.monthlyCostSaving, capex: r.capex, paybackMonths: r.paybackMonths };
  });
}

// ---------------- simple predictive analytics ----------------
function projectUsage({ dailyWater, growthPctPerMonth = 2, months = 6, waterCost = 50, workingDays = 26 }) {
  return Array.from({ length: months }, (_, m) => {
    const w = dailyWater * Math.pow(1 + growthPctPerMonth / 100, m + 1);
    return { month: m + 1, dailyWater: Math.round(w), monthlyCost: Math.round((w / 1000) * waterCost * workingDays) };
  });
}

if (typeof window !== "undefined") Object.assign(window, { evaluate, rankRecommendations, compareScenarios, projectUsage, PATHWAYS, ASSUMPTIONS, SCENARIO_SETS, STAGE_LIMITS });
if (typeof module !== "undefined" && module.exports) module.exports = { evaluate, rankRecommendations, compareScenarios, projectUsage, PATHWAYS, ASSUMPTIONS, SCENARIO_SETS, STAGE_LIMITS };

// ---- self-test: node water-model.js ----
if (typeof module !== "undefined" && require.main === module) {
  const procs = [
    { name: "Washing", water: 14000 }, { name: "Bleaching", water: 8000 },
    { name: "Dyeing", water: 16000 },  { name: "Finishing", water: 2000 },
  ];
  const fac = { waterCost: 50, workingDays: 26, capacity: 1000, dischargeLimit: 1450 };
  console.table(rankRecommendations(procs, fac));
  console.table(compareScenarios(procs, fac).map(({ pathways, ...r }) => r));
  console.log(JSON.stringify(evaluate(procs, fac, { scenario: "advanced" }), null, 1));
}
