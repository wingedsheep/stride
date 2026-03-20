// ── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  "Leg Press": "#c4653a",
  "Chest Press": "#6b7c4e",
  "Shoulder Press": "#4a7c8a",
  "Lat Pulldown": "#a0826d",
  "Leg Curl": "#7a5c6e",
  "Leg Extension": "#d4845f",
};

const AVG_MALE_37 = {
  "Leg Press": 165, "Chest Press": 55, "Shoulder Press": 30,
  "Lat Pulldown": 50, "Leg Curl": 40, "Leg Extension": 45,
};

const PALETTE = {
  terracotta: "#c4653a", olive: "#6b7c4e", sea: "#4a7c8a",
  clay: "#a0826d", fig: "#7a5c6e", sand: "#d4845f",
};

// ── Shared chart defaults ────────────────────────────────────────────────────

const FONT = { family: "IBM Plex Sans" };

function baseOpts(yLabel, yCallback) {
  return {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#2c2825",
        titleFont: { ...FONT, size: 11, weight: "400" },
        bodyFont: { ...FONT, size: 12, weight: "600" },
        padding: 10, cornerRadius: 6, displayColors: false,
      },
    },
    scales: {
      x: {
        type: "time", time: { unit: "day", tooltipFormat: "d MMM yyyy" },
        grid: { display: false },
        ticks: { font: { ...FONT, size: 10, weight: "300" }, color: "#8a837c", maxTicksLimit: 7 },
        border: { display: false },
      },
      y: {
        grid: { color: "rgba(0,0,0,0.04)", drawTicks: false },
        ticks: {
          font: { ...FONT, size: 10, weight: "300" }, color: "#8a837c", padding: 6,
          callback: yCallback || ((v) => v),
        },
        border: { display: false },
      },
    },
  };
}

function makeDataset(data, color, opts = {}) {
  return {
    data,
    borderColor: color,
    backgroundColor: color + "20",
    borderWidth: 2,
    pointBackgroundColor: color,
    pointBorderColor: "#faf8f4",
    pointBorderWidth: 1.5,
    pointRadius: data.length > 60 ? 0 : 3,
    pointHoverRadius: 5,
    fill: true,
    tension: 0.3,
    ...opts,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatShort(d) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length * 10) / 10;
}

// Chart instance registry for cleanup on re-render
const charts = {};
function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}
function registerChart(id, chart) {
  charts[id] = chart;
}

// ── Navigation ───────────────────────────────────────────────────────────────

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.section).classList.add("active");
  });
});

// ── Overview ─────────────────────────────────────────────────────────────────

async function renderOverview() {
  const [sleep, vitals, activities, steps] = await Promise.all([
    fetch("/api/sleep?days=7").then((r) => r.json()),
    fetch("/api/vitals?days=7").then((r) => r.json()),
    fetch("/api/activities?days=30").then((r) => r.json()),
    fetch("/api/steps?days=7").then((r) => r.json()),
  ]);

  const grid = document.getElementById("overview-grid");
  grid.innerHTML = "";

  const lastSleep = sleep[sleep.length - 1];
  const avgSleep = avg(sleep.map((s) => s.totalHrs));
  const avgScore = avg(sleep.filter((s) => s.score).map((s) => s.score));

  const lastVitals = vitals.filter((v) => v.restingHR)[vitals.filter((v) => v.restingHR).length - 1];
  const avgHRV = avg(vitals.filter((v) => v.hrvNight).map((v) => v.hrvNight));
  const avgRHR = avg(vitals.filter((v) => v.restingHR).map((v) => v.restingHR));

  const avgSteps = steps.length ? Math.round(avg(steps.map((s) => s.steps))) : 0;
  const lastSteps = steps.length ? steps[steps.length - 1] : null;

  const cards = [
    {
      label: "Sleep (7d avg)",
      value: avgSleep, unit: "hrs",
      sub: lastSleep ? `Last night: ${lastSleep.totalHrs} hrs` : "",
      subClass: lastSleep && lastSleep.totalHrs < 6 ? "warn" : "neutral",
    },
    {
      label: "Sleep Score (7d avg)",
      value: Math.round(avgScore), unit: "",
      sub: lastSleep && lastSleep.score ? `Last night: ${lastSleep.score}` : "",
      subClass: avgScore >= 75 ? "good" : avgScore >= 60 ? "neutral" : "warn",
    },
    {
      label: "Resting HR (7d avg)",
      value: Math.round(avgRHR), unit: "bpm",
      sub: lastVitals ? `Today: ${lastVitals.restingHR} bpm` : "",
      subClass: "neutral",
    },
    {
      label: "HRV (7d avg)",
      value: Math.round(avgHRV), unit: "ms",
      sub: lastVitals && lastVitals.hrvNight ? `Last night: ${lastVitals.hrvNight} ms` : "",
      subClass: avgHRV >= 50 ? "good" : "warn",
    },
    {
      label: "Steps (7d avg)",
      value: avgSteps.toLocaleString(), unit: "",
      sub: lastSteps ? `Today: ${lastSteps.steps.toLocaleString()}` : "",
      subClass: avgSteps >= 10000 ? "good" : avgSteps >= 7000 ? "neutral" : "warn",
    },
    {
      label: "Activities (30d)",
      value: activities.length, unit: "",
      sub: activities.length ? `Latest: ${activities[activities.length - 1].type}` : "",
      subClass: "neutral",
    },
  ];

  cards.forEach((c, i) => {
    const el = document.createElement("div");
    el.className = "stat-card";
    el.style.animationDelay = `${i * 0.06}s`;
    el.innerHTML = `
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${c.value}<span>${c.unit}</span></div>
      <div class="stat-sub ${c.subClass}">${c.sub}</div>
    `;
    grid.appendChild(el);
  });

  // Recent activities
  const list = document.getElementById("overview-activities");
  list.innerHTML = "";
  activities.slice(-8).reverse().forEach((a) => renderActivityRow(list, a));
}

// ── Strength ─────────────────────────────────────────────────────────────────

async function renderStrength() {
  const [progression, sessions] = await Promise.all([
    fetch("/api/progression").then((r) => r.json()),
    fetch("/api/sessions").then((r) => r.json()),
  ]);

  const grid = document.getElementById("strength-charts");
  grid.innerHTML = "";

  for (const [name, dataPoints] of Object.entries(progression)) {
    if (dataPoints.length < 2) continue;
    createStrengthChart(grid, name, dataPoints, COLORS[name] || "#6b7c4e");
  }

  const sessionsEl = document.getElementById("strength-sessions");
  sessionsEl.innerHTML = "";
  [...sessions].reverse().forEach((s, i) => renderSession(sessionsEl, s, i));
}

function createStrengthChart(container, name, dataPoints, color) {
  const card = document.createElement("div");
  card.className = "chart-card";

  const current = dataPoints[dataPoints.length - 1].weight;
  const first = dataPoints[0].weight;
  const delta = current - first;
  const deltaClass = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
  const deltaStr = delta > 0 ? `+${delta} kg` : delta < 0 ? `${delta} kg` : "—";
  const avgW = AVG_MALE_37[name];
  const pct = avgW ? Math.round((current / avgW) * 100) : null;
  const avgTag = avgW ? `<span class="avg-tag">avg ${avgW} kg · ${pct}%</span>` : "";

  card.innerHTML = `
    <h3>${name}</h3>
    <div class="weight-current">${current}<span>kg</span></div>
    <div class="weight-delta ${deltaClass}">${deltaStr} since ${formatShort(dataPoints[0].date)} ${avgTag}</div>
    <div class="chart-wrap"><canvas></canvas></div>
  `;
  container.appendChild(card);

  const datasets = [
    makeDataset(dataPoints.map((p) => ({ x: p.date, y: p.weight })), color, { label: "You", borderWidth: 2.5, pointRadius: 4 }),
  ];

  if (avgW) {
    datasets.push({
      label: "Avg (M, 37)",
      data: [{ x: dataPoints[0].date, y: avgW }, { x: dataPoints[dataPoints.length - 1].date, y: avgW }],
      borderColor: "#8a837c", borderWidth: 1.5, borderDash: [6, 4],
      pointRadius: 0, pointHoverRadius: 0, fill: false, tension: 0,
    });
  }

  const opts = baseOpts("kg", (v) => v + " kg");
  opts.scales.x.time.unit = "week";

  if (avgW) {
    const all = dataPoints.map((p) => p.weight).concat(avgW);
    const pad = (Math.max(...all) - Math.min(...all)) * 0.15 || 10;
    opts.scales.y.min = Math.max(0, Math.floor(Math.min(...all) - pad));
    opts.scales.y.max = Math.ceil(Math.max(...all) + pad);
    opts.plugins.legend = {
      display: true, position: "bottom",
      labels: { boxWidth: 12, boxHeight: 2, padding: 8, font: { ...FONT, size: 10, weight: "300" }, color: "#8a837c" },
    };
  }

  const canvas = card.querySelector("canvas");
  new Chart(canvas, { type: "line", data: { datasets }, options: opts });
}

function renderSession(container, session, index) {
  const card = document.createElement("div");
  card.className = "session-card";
  card.style.animationDelay = `${0.04 * index}s`;

  const exercises = session.exercises
    .filter((e) => !e.name.toLowerCase().includes("roeien") && !e.name.toLowerCase().includes("hardlopen"))
    .map((e) => `<div class="exercise-item">
        <span class="exercise-name">${e.canonical}</span>
        <span class="exercise-detail">${e.maxWeight ? e.maxWeight + " kg" : ""}</span>
      </div>`).join("");

  const notes = session.notes ? `<div class="session-notes">${session.notes}</div>` : "";

  card.innerHTML = `
    <div class="session-header">
      <span class="session-date">${formatDate(session.date)}</span>
      <span class="session-title">${session.title}</span>
    </div>
    <div class="exercise-list">${exercises}</div>
    ${notes}
  `;
  container.appendChild(card);
}

// ── Sleep ────────────────────────────────────────────────────────────────────

async function renderSleep(days = 14) {
  const data = await fetch(`/api/sleep?days=${days}`).then((r) => r.json());

  // Duration chart
  destroyChart("sleep-dur");
  const durOpts = baseOpts("hrs", (v) => v + "h");
  durOpts.plugins.tooltip.callbacks = {
    label: (item) => `${item.parsed.y} hrs`,
  };
  registerChart("sleep-dur", new Chart(document.getElementById("sleep-duration-chart"), {
    type: "bar",
    data: {
      labels: data.map((d) => d.date),
      datasets: [{
        data: data.map((d) => d.totalHrs),
        backgroundColor: data.map((d) => d.totalHrs >= 7 ? PALETTE.olive + "90" : d.totalHrs >= 6 ? PALETTE.clay + "90" : PALETTE.terracotta + "90"),
        borderRadius: 4, borderSkipped: false,
      }],
    },
    options: { ...durOpts, scales: { ...durOpts.scales, y: { ...durOpts.scales.y, min: 0, max: 12 } } },
  }));

  // Score chart
  destroyChart("sleep-score");
  const scoreOpts = baseOpts("score");
  registerChart("sleep-score", new Chart(document.getElementById("sleep-score-chart"), {
    type: "line",
    data: {
      datasets: [makeDataset(
        data.filter((d) => d.score).map((d) => ({ x: d.date, y: d.score })),
        PALETTE.sea,
      )],
    },
    options: { ...scoreOpts, scales: { ...scoreOpts.scales, y: { ...scoreOpts.scales.y, min: 0, max: 100 } } },
  }));

  // Stages chart
  destroyChart("sleep-stages");
  const stagesOpts = baseOpts("hrs", (v) => v + "h");
  stagesOpts.plugins.legend = {
    display: true, position: "bottom",
    labels: { boxWidth: 10, boxHeight: 10, padding: 10, font: { ...FONT, size: 10, weight: "400" }, color: "#8a837c" },
  };
  stagesOpts.scales.x.stacked = true;
  stagesOpts.scales.y.stacked = true;
  registerChart("sleep-stages", new Chart(document.getElementById("sleep-stages-chart"), {
    type: "bar",
    data: {
      labels: data.map((d) => d.date),
      datasets: [
        { label: "Deep", data: data.map((d) => d.deep || 0), backgroundColor: "#3d5a80", borderRadius: 2, borderSkipped: false },
        { label: "REM", data: data.map((d) => d.rem || 0), backgroundColor: "#7a5c6e", borderRadius: 2, borderSkipped: false },
        { label: "Light", data: data.map((d) => d.light || 0), backgroundColor: "#a0826d80", borderRadius: 2, borderSkipped: false },
        { label: "Awake", data: data.map((d) => d.awake || 0), backgroundColor: "#c4653a60", borderRadius: 2, borderSkipped: false },
      ],
    },
    options: stagesOpts,
  }));
}

// ── Vitals ───────────────────────────────────────────────────────────────────

async function renderVitals(days = 14) {
  const data = await fetch(`/api/vitals?days=${days}`).then((r) => r.json());

  // Resting HR
  destroyChart("rhr");
  const rhrData = data.filter((d) => d.restingHR).map((d) => ({ x: d.date, y: d.restingHR }));
  const rhrOpts = baseOpts("bpm", (v) => v + " bpm");
  rhrOpts.plugins.tooltip.callbacks = { label: (i) => `${i.parsed.y} bpm` };
  registerChart("rhr", new Chart(document.getElementById("rhr-chart"), {
    type: "line",
    data: { datasets: [makeDataset(rhrData, PALETTE.terracotta)] },
    options: rhrOpts,
  }));

  // HRV
  destroyChart("hrv");
  const hrvData = data.filter((d) => d.hrvNight).map((d) => ({ x: d.date, y: d.hrvNight }));
  const hrvOpts = baseOpts("ms", (v) => v + " ms");
  hrvOpts.plugins.tooltip.callbacks = { label: (i) => `${i.parsed.y} ms` };
  registerChart("hrv", new Chart(document.getElementById("hrv-chart"), {
    type: "line",
    data: { datasets: [makeDataset(hrvData, PALETTE.olive)] },
    options: hrvOpts,
  }));

  // Stress — 7-day rolling average
  destroyChart("stress");
  const rawStress = data.filter((d) => d.avgStress);
  const window = 7;
  const rollingStress = rawStress.map((d, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = rawStress.slice(start, i + 1).map((s) => s.avgStress);
    return { x: d.date, y: Math.round(slice.reduce((a, b) => a + b, 0) / slice.length) };
  });
  const stressOpts = baseOpts("stress");
  stressOpts.plugins.tooltip.callbacks = { label: (i) => `7d avg: ${i.parsed.y}` };
  registerChart("stress", new Chart(document.getElementById("stress-chart"), {
    type: "line",
    data: {
      datasets: [makeDataset(rollingStress, PALETTE.terracotta)],
    },
    options: { ...stressOpts, scales: { ...stressOpts.scales, y: { ...stressOpts.scales.y, min: 0, max: 100 } } },
  }));
}

// ── Steps ────────────────────────────────────────────────────────────────────

async function renderSteps(days = 14) {
  const data = await fetch(`/api/steps?days=${days}`).then((r) => r.json());

  // Stats
  const statsEl = document.getElementById("steps-stats");
  statsEl.innerHTML = "";

  const avgS = data.length ? Math.round(avg(data.map((d) => d.steps))) : 0;
  const maxS = data.length ? Math.max(...data.map((d) => d.steps)) : 0;
  const minS = data.length ? Math.min(...data.map((d) => d.steps)) : 0;
  const goal = data.find((d) => d.goal)?.goal || 10000;
  const daysAtGoal = data.filter((d) => d.steps >= goal).length;

  [
    { label: "Average", value: avgS.toLocaleString(), sub: `Goal: ${goal.toLocaleString()}`, subClass: avgS >= goal ? "good" : "neutral" },
    { label: "Best Day", value: maxS.toLocaleString(), sub: "", subClass: "good" },
    { label: "Lowest", value: minS.toLocaleString(), sub: "", subClass: minS < 5000 ? "warn" : "neutral" },
    { label: "Days at Goal", value: daysAtGoal, unit: `/ ${data.length}`, sub: `${data.length ? Math.round(daysAtGoal / data.length * 100) : 0}%`, subClass: daysAtGoal / data.length >= 0.5 ? "good" : "warn" },
  ].forEach((c, i) => {
    const el = document.createElement("div");
    el.className = "stat-card";
    el.style.animationDelay = `${i * 0.06}s`;
    el.innerHTML = `
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${c.value}${c.unit ? `<span>${c.unit}</span>` : ""}</div>
      <div class="stat-sub ${c.subClass}">${c.sub}</div>
    `;
    statsEl.appendChild(el);
  });

  // Chart
  destroyChart("steps");
  const opts = baseOpts("steps", (v) => v >= 1000 ? (v / 1000).toFixed(0) + "k" : v);
  opts.plugins.tooltip.callbacks = { label: (i) => `${i.parsed.y.toLocaleString()} steps` };

  const datasets = [{
    data: data.map((d) => d.steps),
    backgroundColor: data.map((d) => d.steps >= goal ? PALETTE.olive + "90" : d.steps >= 7000 ? PALETTE.clay + "90" : PALETTE.terracotta + "70"),
    borderRadius: 4, borderSkipped: false,
  }];

  // Goal line
  if (goal) {
    datasets.push({
      type: "line", label: "Goal",
      data: Array(data.length).fill(goal),
      borderColor: "#8a837c", borderWidth: 1.5, borderDash: [6, 4],
      pointRadius: 0, fill: false,
    });
    opts.plugins.legend = {
      display: true, position: "bottom",
      labels: { boxWidth: 12, boxHeight: 2, padding: 8, font: { ...FONT, size: 10, weight: "300" }, color: "#8a837c" },
    };
  }

  registerChart("steps", new Chart(document.getElementById("steps-chart"), {
    type: "bar",
    data: { labels: data.map((d) => d.date), datasets },
    options: opts,
  }));
}

// ── Activities ───────────────────────────────────────────────────────────────

async function renderActivities(listDays = 90) {
  const [summary, activities] = await Promise.all([
    fetch("/api/activity-summary").then((r) => r.json()),
    fetch(`/api/activities?days=${listDays}`).then((r) => r.json()),
  ]);

  // Monthly chart
  destroyChart("monthly");
  const months = Object.entries(summary.monthly).sort((a, b) => a[0].localeCompare(b[0]));
  const monthOpts = baseOpts("count");
  monthOpts.scales.x = {
    type: "category",
    grid: { display: false },
    ticks: { font: { ...FONT, size: 10, weight: "300" }, color: "#8a837c" },
    border: { display: false },
  };
  registerChart("monthly", new Chart(document.getElementById("monthly-chart"), {
    type: "bar",
    data: {
      labels: months.map((m) => m[0]),
      datasets: [{
        data: months.map((m) => m[1]),
        backgroundColor: PALETTE.sea + "90",
        borderRadius: 4, borderSkipped: false,
      }],
    },
    options: monthOpts,
  }));

  // Types doughnut
  destroyChart("types");
  const typeEntries = Object.entries(summary.types).sort((a, b) => b[1] - a[1]);
  const typeColors = [PALETTE.terracotta, PALETTE.olive, PALETTE.sea, PALETTE.fig, PALETTE.clay, PALETTE.sand];
  registerChart("types", new Chart(document.getElementById("types-chart"), {
    type: "doughnut",
    data: {
      labels: typeEntries.map((t) => t[0]),
      datasets: [{
        data: typeEntries.map((t) => t[1]),
        backgroundColor: typeEntries.map((_, i) => typeColors[i % typeColors.length] + "cc"),
        borderWidth: 2, borderColor: "#faf8f4",
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "55%",
      plugins: {
        legend: {
          position: "right",
          labels: { font: { ...FONT, size: 11, weight: "400" }, color: "#5a534d", padding: 8, boxWidth: 12, boxHeight: 12 },
        },
        tooltip: {
          backgroundColor: "#2c2825",
          bodyFont: { ...FONT, size: 12, weight: "600" },
          padding: 10, cornerRadius: 6, displayColors: true,
          callbacks: { label: (i) => ` ${i.label}: ${i.parsed} activities` },
        },
      },
    },
  }));

  // Activity list
  const list = document.getElementById("activities-list");
  list.innerHTML = "";
  [...activities].reverse().forEach((a) => renderActivityRow(list, a));
}

function renderActivityRow(container, a) {
  const row = document.createElement("div");
  row.className = "activity-row";
  const type = (a.type || "other").replace("_", " ");
  row.innerHTML = `
    <span class="a-date">${formatShort(a.date)}</span>
    <span class="a-title">${a.title}</span>
    <span class="a-type" data-type="${a.type || ""}">${type}</span>
    <span class="a-duration">${a.duration ? a.duration + " min" : "—"}</span>
    <span class="a-cal">${a.calories ? Math.round(a.calories) + " kcal" : "—"}</span>
  `;
  container.appendChild(row);
}

// ── Health History ────────────────────────────────────────────────────────────

function mdToHtml(text) {
  return text
    .split("\n")
    .map((line) => {
      if (line.match(/^### .+/)) {
        const inner = line.replace(/^### /, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        return `<div class="md-h3">${inner}</div>`;
      }
      if (line.match(/^## .+/)) return "";
      if (line.match(/^# .+/)) return "";

      line = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

      if (line.match(/^- /)) return `<div class="md-li">${line.replace(/^- /, "")}</div>`;
      if (!line.trim()) return `<div class="md-spacer"></div>`;
      return `<div class="md-p">${line}</div>`;
    })
    .join("\n");
}

async function renderHealthHistory() {
  const summaries = await fetch("/api/health-summaries").then((r) => r.json());
  const container = document.getElementById("health-history");
  container.innerHTML = "";

  const timeline = document.createElement("div");
  timeline.className = "health-timeline";
  container.appendChild(timeline);

  [...summaries].reverse().forEach((s, i) => {
    const report = document.createElement("div");
    report.className = "report";
    report.style.animationDelay = `${i * 0.08}s`;

    // Focus items with numbers
    const focusHtml = s.focusAreas.map((f, fi) => `
      <div class="focus-item">
        <span class="focus-num">${fi + 1}</span>
        <div class="focus-title">${f.title}</div>
        <div class="focus-target">${f.target || ""}</div>
      </div>
    `).join("");

    // Detail sections (skip "Focus Areas")
    const sectionsHtml = Object.entries(s.sections || {})
      .filter(([title]) => title !== "Focus Areas")
      .map(([title, body]) => `
        <div class="report-section">
          <div class="report-section-title">${title}</div>
          ${mdToHtml(body)}
        </div>
      `).join("");

    const bodyId = `report-body-${i}`;
    const isFirst = i === 0;

    report.innerHTML = `
      <div class="report-date">${formatDate(s.date)}</div>
      <div class="report-card">
        <div class="report-hero">
          <div class="report-title">Health Summary</div>
          <div class="report-overall">${s.overall || ""}</div>
        </div>
        ${s.focusAreas.length ? `<div class="report-focus">${focusHtml}</div>` : ""}
        ${sectionsHtml ? `
          <button class="report-toggle" data-target="${bodyId}">
            ${isFirst ? "Hide details" : "Show details"}
          </button>
          <div class="report-body ${isFirst ? "" : "collapsed"}" id="${bodyId}">
            ${sectionsHtml}
          </div>
        ` : ""}
      </div>
    `;

    timeline.appendChild(report);
  });

  // Toggle handlers
  timeline.querySelectorAll(".report-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const body = document.getElementById(btn.dataset.target);
      const collapsed = body.classList.toggle("collapsed");
      btn.textContent = collapsed ? "Show details" : "Hide details";
    });
  });
}

// ── Range buttons ────────────────────────────────────────────────────────────

document.querySelectorAll(".page").forEach((page) => {
  page.querySelectorAll(".range-bar").forEach((bar) => {
    bar.querySelectorAll(".range-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        bar.querySelectorAll(".range-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const days = parseInt(btn.dataset.days);
        const section = page.id;
        if (section === "sleep") renderSleep(days);
        else if (section === "vitals") renderVitals(days);
        else if (section === "steps") renderSteps(days);
        else if (section === "activities") renderActivities(days);
      });
    });
  });
});

// ── Init ─────────────────────────────────────────────────────────────────────

renderOverview();
renderStrength();
renderHealthHistory();
renderSleep(14);
renderVitals(14);
renderSteps(14);
renderActivities(90);
