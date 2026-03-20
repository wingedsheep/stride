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
        filter: (item, data) => {
          const ds = data.datasets || [];
          const hasRolling = ds.some((d) => d._rollingValues);
          if (!hasRolling) return true;
          return !!ds[item.datasetIndex]?._rollingValues;
        },
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

function rollingWindow(days) {
  if (days <= 14) return 3;
  if (days <= 30) return 7;
  if (days <= 90) return 14;
  return 30;
}

function rollingAvg(values, windowSize) {
  return values.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const slice = values.slice(start, i + 1).filter((v) => v != null);
    return slice.length ? Math.round(slice.reduce((a, b) => a + b, 0) / slice.length * 10) / 10 : null;
  });
}

function makeRollingDataset(labels, values, windowSize, color) {
  const rolled = rollingAvg(values, windowSize);
  return {
    label: `${windowSize}d avg`,
    data: labels.map((l, i) => ({ x: l, y: rolled[i] })),
    borderColor: color,
    borderWidth: 2.5,
    pointRadius: 0,
    pointHoverRadius: 4,
    fill: false,
    tension: 0.35,
    order: 0,
    _rollingValues: rolled,
  };
}

// Tooltip filter: only show rolling avg dataset when both daily + rolling exist
function rollingTooltipFilter(item, chart) {
  const datasets = chart.datasets || [];
  const hasRolling = datasets.some((d) => d._rollingValues);
  if (!hasRolling) return true;
  return !!datasets[item.datasetIndex]?._rollingValues;
}

function rollingTooltipOpts() {
  return { filter: rollingTooltipFilter };
}

// Chart instance registry for cleanup on re-render
const charts = {};
function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}
function registerChart(id, chart) {
  charts[id] = chart;
}

// ── Session Detail ───────────────────────────────────────────────────────────

async function openSession(dateStr) {
  const data = await fetch(`/api/session/${dateStr}`).then((r) => r.json());
  const panel = document.getElementById("session-panel");

  // Title from first Garmin activity or training note
  const mainActivity = data.garminActivities[0];
  const mainNote = data.trainingNotes[0];
  const title = mainActivity?.title || mainNote?.title || `Session — ${dateStr}`;

  // Garmin metrics
  let metricsHtml = "";
  if (mainActivity) {
    const avgSpeedKmh = mainActivity.avgSpeed ? Math.round(mainActivity.avgSpeed * 3.6 * 10) / 10 : null;
    const maxSpeedKmh = mainActivity.maxSpeed ? Math.round(mainActivity.maxSpeed * 3.6 * 10) / 10 : null;

    const metrics = [
      mainActivity.duration ? { label: "Duration", value: mainActivity.duration, unit: " min" } : null,
      mainActivity.distance ? { label: "Distance", value: mainActivity.distance, unit: " km" } : null,
      avgSpeedKmh ? { label: "Avg Speed", value: avgSpeedKmh, unit: " km/h", class: "speed-metric" } : null,
      maxSpeedKmh ? { label: "Max Speed", value: maxSpeedKmh, unit: " km/h", class: "speed-metric" } : null,
      mainActivity.calories ? { label: "Calories", value: Math.round(mainActivity.calories), unit: " kcal" } : null,
      mainActivity.avgHR ? { label: "Avg HR", value: mainActivity.avgHR, unit: " bpm" } : null,
      mainActivity.maxHR ? { label: "Max HR", value: mainActivity.maxHR, unit: " bpm" } : null,
      mainActivity.avgCadence ? { label: "Cadence", value: Math.round(mainActivity.avgCadence), unit: " spm" } : null,
      mainActivity.elevationGain ? { label: "Elev Gain", value: Math.round(mainActivity.elevationGain), unit: " m" } : null,
    ].filter(Boolean);

    metricsHtml = `
      <div class="detail-section">
        <div class="detail-section-title">Garmin Data</div>
        <div class="detail-metrics" id="detail-metrics-grid">
          ${metrics.map((m) => `
            <div class="detail-metric${m.class ? ` ${m.class}` : ""}">
              <div class="dm-label">${m.label}</div>
              <div class="dm-value">${m.value}<span>${m.unit}</span></div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // Multiple Garmin activities on same day
  let extraActivities = "";
  if (data.garminActivities.length > 1) {
    extraActivities = data.garminActivities.slice(1).map((a) => `
      <div class="detail-section">
        <div class="detail-section-title">${a.title}</div>
        <div class="detail-metrics">
          ${[
            a.duration ? { label: "Duration", value: a.duration, unit: " min" } : null,
            a.distance ? { label: "Distance", value: a.distance, unit: " km" } : null,
            a.calories ? { label: "Calories", value: Math.round(a.calories), unit: " kcal" } : null,
          ].filter(Boolean).map((m) => `
            <div class="detail-metric">
              <div class="dm-label">${m.label}</div>
              <div class="dm-value">${m.value}<span>${m.unit}</span></div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");
  }

  // Lap charts for activities with split data
  let lapChartsHtml = "";
  const activityWithLaps = data.garminActivities.find((a) => a.laps && a.laps.length > 1);
  if (activityWithLaps) {
    const isRunning = (activityWithLaps.type || "").includes("running");
    lapChartsHtml = `
      <div class="detail-section">
        <div class="detail-section-title" style="display:flex;align-items:center;justify-content:space-between">
          Per-km splits
          <div class="range-bar" style="margin:0" id="pace-mode-bar">
            <button class="range-btn active" data-mode="speed">Speed</button>
            <button class="range-btn" data-mode="pace">Pace</button>
          </div>
        </div>
        <div class="detail-chart-row">
          <div class="detail-mini-chart" style="grid-column:span 2">
            <div class="dmc-label" id="pace-chart-label">${isRunning ? "Pace (min/km)" : "Speed (km/h)"}</div>
            <canvas id="detail-pace-chart" style="height:100px !important"></canvas>
          </div>
        </div>
        <div class="detail-chart-row" style="margin-top:0.5rem">
          <div class="detail-mini-chart">
            <div class="dmc-label">Heart Rate (bpm)</div>
            <canvas id="detail-lap-hr-chart" style="height:80px !important"></canvas>
          </div>
          <div class="detail-mini-chart">
            <div class="dmc-label">Elevation (m)</div>
            <canvas id="detail-lap-elev-chart" style="height:80px !important"></canvas>
          </div>
        </div>
      </div>
    `;
  }

  // Training notes (exercises)
  let exercisesHtml = "";
  for (const note of data.trainingNotes) {
    const exercises = note.exercises
      .filter((e) => !e.name.toLowerCase().includes("roeien") && !e.name.toLowerCase().includes("hardlopen"))
      .map((e) => {
        const detail = e.raw.includes(":") ? e.raw.split(":").slice(1).join(":").trim() : "";
        return `
          <div class="detail-exercise">
            <span class="de-name">${e.canonical}</span>
            <span class="de-detail">${detail}</span>
          </div>
        `;
      }).join("");

    const warmup = note.exercises
      .filter((e) => e.name.toLowerCase().includes("roeien") || e.name.toLowerCase().includes("hardlopen"))
      .map((e) => e.raw).join(", ");

    exercisesHtml += `
      <div class="detail-section">
        <div class="detail-section-title">Exercises</div>
        ${warmup ? `<div style="font-size:0.72rem;color:var(--ink-muted);margin-bottom:0.4rem">Warm-up: ${warmup}</div>` : ""}
        ${exercises}
        ${note.notes ? `<div class="detail-notes" style="margin-top:0.6rem">${note.notes}</div>` : ""}
      </div>
    `;
  }

  // Day context (sleep, vitals, steps)
  let contextHtml = "";
  const contextItems = [];
  if (data.sleep) {
    if (data.sleep.totalHrs) contextItems.push({ label: "Sleep", value: `${data.sleep.totalHrs} hrs` });
    if (data.sleep.score) contextItems.push({ label: "Sleep score", value: data.sleep.score });
    if (data.sleep.deep) contextItems.push({ label: "Deep sleep", value: `${data.sleep.deep} hrs` });
    if (data.sleep.rem) contextItems.push({ label: "REM", value: `${data.sleep.rem} hrs` });
  }
  if (data.vitals) {
    if (data.vitals.restingHR) contextItems.push({ label: "Resting HR", value: `${data.vitals.restingHR} bpm` });
    if (data.vitals.hrvNight) contextItems.push({ label: "HRV", value: `${data.vitals.hrvNight} ms` });
    if (data.vitals.avgStress) contextItems.push({ label: "Avg stress", value: data.vitals.avgStress });
  }
  if (data.steps) contextItems.push({ label: "Steps", value: data.steps.toLocaleString() });

  if (contextItems.length) {
    contextHtml = `
      <div class="detail-section">
        <div class="detail-section-title">That Day</div>
        <div class="detail-context">
          ${contextItems.map((c) => `
            <div class="detail-context-item">
              <span class="dc-label">${c.label}</span>
              <span class="dc-value">${c.value}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // Journal
  let journalHtml = "";
  if (data.journal) {
    const journalBody = data.journal.split("\n").filter((l) => !l.startsWith("# ")).join("\n").trim();
    if (journalBody) {
      journalHtml = `
        <div class="detail-section">
          <div class="detail-section-title">Journal</div>
          <div class="detail-journal">${journalBody.replace(/^##\s+/gm, "").replace(/^- /gm, "· ")}</div>
        </div>
      `;
    }
  }

  // Sparkline charts placeholder
  const chartsHtml = `
    <div class="detail-chart-row">
      <div class="detail-mini-chart">
        <div class="dmc-label">Sleep (7 days around)</div>
        <canvas id="detail-sleep-spark"></canvas>
      </div>
      <div class="detail-mini-chart">
        <div class="dmc-label">HRV (7 days around)</div>
        <canvas id="detail-hrv-spark"></canvas>
      </div>
    </div>
  `;

  panel.innerHTML = `
    <button class="detail-close" id="detail-close">×</button>
    <div class="detail-date">${formatDate(dateStr)}</div>
    <div class="detail-title">${title}</div>
    ${metricsHtml}
    ${lapChartsHtml}
    ${extraActivities}
    ${exercisesHtml}
    ${contextHtml}
    ${chartsHtml}
    ${journalHtml}
  `;

  const overlay = document.getElementById("session-overlay");
  overlay.classList.remove("hidden");

  document.getElementById("detail-close").addEventListener("click", closeSession);
  document.getElementById("overlay-backdrop").addEventListener("click", closeSession);

  // Render lap charts
  if (activityWithLaps) {
    const laps = activityWithLaps.laps;
    const isRunning = (activityWithLaps.type || "").includes("running");
    const lapLabels = laps.map((l) => `${l.index}`);

    const miniOpts = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: "#2c2825", bodyFont: { ...FONT, size: 11, weight: "600" },
        padding: 8, cornerRadius: 5, displayColors: false,
      }},
      scales: {
        x: { grid: { display: false }, ticks: { font: { ...FONT, size: 9 }, color: "#8a837c" }, border: { display: false } },
        y: { grid: { color: "rgba(0,0,0,0.04)", drawTicks: false }, ticks: { font: { ...FONT, size: 9 }, color: "#8a837c", padding: 4 }, border: { display: false } },
      },
    };

    function speedToKmh(ms) { return ms ? Math.round(ms * 3.6 * 10) / 10 : 0; }
    function speedToPace(ms) { return ms ? Math.round(1000 / ms / 60 * 100) / 100 : 0; }
    function formatPace(decimalMin) {
      const mins = Math.floor(decimalMin);
      const secs = Math.round((decimalMin - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    function renderPaceChart(mode) {
      destroyChart("detail-pace");
      const isPace = mode === "pace";
      const values = laps.map((l) => isPace ? speedToPace(l.avgSpeed) : speedToKmh(l.avgSpeed));
      const avgVal = values.reduce((a, b) => a + b, 0) / values.length;
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      const range = maxVal - minVal;
      const pad = Math.max(range * 0.2, isPace ? 0.2 : 0.5);

      const label = document.getElementById("pace-chart-label");
      if (label) label.textContent = isPace ? "Pace (min/km)" : "Speed (km/h)";

      const paceOpts = JSON.parse(JSON.stringify(miniOpts));
      paceOpts.scales.x.ticks = { ...paceOpts.scales.x.ticks, font: { family: "IBM Plex Sans", size: 9 }, color: "#8a837c" };
      paceOpts.scales.y.ticks = { font: { family: "IBM Plex Sans", size: 9 }, color: "#8a837c", padding: 4 };
      paceOpts.scales.y.grid = { color: "rgba(0,0,0,0.04)", drawTicks: false };
      paceOpts.scales.y.display = true;
      paceOpts.scales.x.display = true;

      if (isPace) {
        paceOpts.scales.y.reverse = true;
        paceOpts.scales.y.min = Math.max(0, minVal - pad);
        paceOpts.scales.y.max = maxVal + pad;
        paceOpts.scales.y.ticks.callback = (v) => formatPace(v);
        paceOpts.plugins.tooltip.callbacks = { label: (i) => formatPace(i.parsed.y) + " /km" };
      } else {
        paceOpts.scales.y.min = Math.max(0, Math.floor((minVal - pad) * 2) / 2);
        paceOpts.scales.y.max = Math.ceil((maxVal + pad) * 2) / 2;
        paceOpts.scales.y.ticks.callback = (v) => v.toFixed(1);
        paceOpts.plugins.tooltip.callbacks = { label: (i) => i.parsed.y.toFixed(1) + " km/h" };
      }

      // Km labels
      const kmLabels = laps.map((l) => `km ${l.index}`);

      registerChart("detail-pace", new Chart(document.getElementById("detail-pace-chart"), {
        type: "bar",
        data: {
          labels: kmLabels,
          datasets: [
            {
              label: isPace ? "Pace" : "Speed",
              data: values,
              backgroundColor: values.map((v) => isPace
                ? (v < avgVal ? PALETTE.olive + "90" : v > avgVal * 1.03 ? PALETTE.terracotta + "70" : PALETTE.clay + "60")
                : (v > avgVal ? PALETTE.olive + "90" : v < avgVal * 0.97 ? PALETTE.terracotta + "70" : PALETTE.clay + "60")
              ),
              borderRadius: 4, borderSkipped: false,
            },
            {
              label: "Average",
              type: "line",
              data: Array(values.length).fill(avgVal),
              borderColor: "#8a837c",
              borderWidth: 1.5,
              borderDash: [5, 3],
              pointRadius: 0,
              fill: false,
            },
          ],
        },
        options: {
          ...paceOpts,
          plugins: {
            ...paceOpts.plugins,
            legend: {
              display: true, position: "bottom",
              labels: { boxWidth: 12, boxHeight: 2, padding: 8, font: { family: "IBM Plex Sans", size: 9, weight: "300" }, color: "#8a837c" },
            },
          },
        },
      }));
    }

    function updateSpeedMetrics(mode) {
      const isPace = mode === "pace";
      document.querySelectorAll(".speed-metric").forEach((el) => {
        const label = el.querySelector(".dm-label");
        const value = el.querySelector(".dm-value");
        if (!label || !value) return;

        const isAvg = label.textContent.includes("Avg");
        const speedMs = isAvg ? activityWithLaps.avgSpeed || mainActivity.avgSpeed : activityWithLaps.maxSpeed || mainActivity.maxSpeed;
        if (!speedMs) return;

        if (isPace) {
          const totalSec = 1000 / speedMs;
          const mins = Math.floor(totalSec / 60);
          const secs = Math.round(totalSec % 60);
          label.textContent = isAvg ? "Avg Pace" : "Max Pace";
          value.innerHTML = `${mins}:${secs.toString().padStart(2, "0")}<span> /km</span>`;
        } else {
          const kmh = Math.round(speedMs * 3.6 * 10) / 10;
          label.textContent = isAvg ? "Avg Speed" : "Max Speed";
          value.innerHTML = `${kmh}<span> km/h</span>`;
        }
      });
    }

    renderPaceChart("speed");

    // Pace/speed toggle — updates both chart and metrics
    const modeBar = document.getElementById("pace-mode-bar");
    if (modeBar) {
      modeBar.querySelectorAll(".range-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          modeBar.querySelectorAll(".range-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          renderPaceChart(btn.dataset.mode);
          updateSpeedMetrics(btn.dataset.mode);
        });
      });
    }

    // HR per lap
    const hrValues = laps.map((l) => l.avgHR).filter(Boolean);
    if (hrValues.length) {
      const hrOpts = JSON.parse(JSON.stringify(miniOpts));
      hrOpts.plugins.tooltip.callbacks = { label: (i) => `${i.parsed.y} bpm` };
      new Chart(document.getElementById("detail-lap-hr-chart"), {
        type: "line",
        data: {
          labels: lapLabels.slice(0, hrValues.length),
          datasets: [{
            data: hrValues,
            borderColor: PALETTE.terracotta, backgroundColor: PALETTE.terracotta + "20",
            borderWidth: 2, pointRadius: 3, pointBackgroundColor: PALETTE.terracotta,
            fill: true, tension: 0.3,
          }],
        },
        options: hrOpts,
      });
    }

    // Elevation per lap
    const elevGain = laps.map((l) => l.elevationGain || 0);
    const elevLoss = laps.map((l) => -(l.elevationLoss || 0));
    if (elevGain.some((v) => v > 0) || elevLoss.some((v) => v < 0)) {
      const elevOpts = JSON.parse(JSON.stringify(miniOpts));
      elevOpts.plugins.tooltip.callbacks = { label: (i) => `${i.parsed.y > 0 ? "+" : ""}${i.parsed.y} m` };
      elevOpts.scales.y.stacked = true;
      elevOpts.scales.x.stacked = true;
      new Chart(document.getElementById("detail-lap-elev-chart"), {
        type: "bar",
        data: {
          labels: lapLabels,
          datasets: [
            { label: "Gain", data: elevGain, backgroundColor: PALETTE.olive + "80", borderRadius: 2, borderSkipped: false },
            { label: "Loss", data: elevLoss, backgroundColor: PALETTE.terracotta + "60", borderRadius: 2, borderSkipped: false },
          ],
        },
        options: elevOpts,
      });
    }
  }

  // Render sparkline charts with surrounding days
  const [sleepContext, vitalsContext] = await Promise.all([
    fetch(`/api/sleep?days=30`).then((r) => r.json()),
    fetch(`/api/vitals?days=30`).then((r) => r.json()),
  ]);

  // Find 3 days before and after the session date
  const sleepIdx = sleepContext.findIndex((d) => d.date === dateStr);
  const vitalsIdx = vitalsContext.findIndex((d) => d.date === dateStr);
  const sparkRange = 3;

  const sleepSlice = sleepContext.slice(Math.max(0, sleepIdx - sparkRange), sleepIdx + sparkRange + 1);
  const vitalsSlice = vitalsContext.slice(Math.max(0, vitalsIdx - sparkRange), vitalsIdx + sparkRange + 1);

  const sparkOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    elements: { point: { radius: 0 } },
  };

  if (sleepSlice.length > 1) {
    new Chart(document.getElementById("detail-sleep-spark"), {
      type: "bar",
      data: {
        labels: sleepSlice.map((d) => d.date),
        datasets: [{
          data: sleepSlice.map((d) => d.totalHrs),
          backgroundColor: sleepSlice.map((d) =>
            d.date === dateStr ? PALETTE.terracotta : d.totalHrs >= 7 ? PALETTE.olive + "70" : PALETTE.clay + "60"
          ),
          borderRadius: 3, borderSkipped: false,
        }],
      },
      options: { ...sparkOpts, scales: { ...sparkOpts.scales, y: { display: false, min: 0 } } },
    });
  }

  if (vitalsSlice.length > 1) {
    const hrvSlice = vitalsSlice.filter((d) => d.hrvNight);
    new Chart(document.getElementById("detail-hrv-spark"), {
      type: "line",
      data: {
        datasets: [{
          data: hrvSlice.map((d) => ({ x: d.date, y: d.hrvNight })),
          borderColor: PALETTE.olive,
          borderWidth: 2,
          pointRadius: hrvSlice.map((d) => d.date === dateStr ? 5 : 2),
          pointBackgroundColor: hrvSlice.map((d) => d.date === dateStr ? PALETTE.terracotta : PALETTE.olive),
          fill: false, tension: 0.3,
        }],
      },
      options: { ...sparkOpts, scales: { x: { display: false, type: "time" }, y: { display: false } } },
    });
  }
}

function closeSession() {
  document.getElementById("session-overlay").classList.add("hidden");
}

// Close on escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSession();
});

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
  card.dataset.date = session.date;
  card.style.animationDelay = `${0.04 * index}s`;
  card.addEventListener("click", () => openSession(session.date));

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

// ── Recovery (Sleep + Body Battery + HRV) ────────────────────────────────────

async function renderRecovery(days = 14) {
  const [sleepData, vitalsData] = await Promise.all([
    fetch(`/api/sleep?days=${days}`).then((r) => r.json()),
    fetch(`/api/vitals?days=${days}`).then((r) => r.json()),
  ]);

  const w = rollingWindow(days);
  const showRolling = sleepData.length > w;
  const legendWithRolling = {
    display: true, position: "bottom",
    labels: { boxWidth: 12, boxHeight: 2, padding: 8, font: { ...FONT, size: 10, weight: "300" }, color: "#8a837c" },
  };

  // Duration chart — bars for daily + line for rolling avg
  destroyChart("sleep-dur");
  const durOpts = baseOpts("hrs", (v) => v + "h");
  const durDatasets = [{
    type: "bar", label: "Daily",
    data: sleepData.map((d) => d.totalHrs),
    backgroundColor: sleepData.map((d) => d.totalHrs >= 7 ? PALETTE.olive + "70" : d.totalHrs >= 6 ? PALETTE.clay + "50" : PALETTE.terracotta + "40"),
    borderRadius: 3, borderSkipped: false, order: 1,
  }];
  if (showRolling) {
    const rolled = rollingAvg(sleepData.map((d) => d.totalHrs), w);
    durDatasets.push({
      type: "line", label: `${w}d avg`,
      data: rolled,
      borderColor: PALETTE.sea, borderWidth: 2.5,
      pointRadius: 0, pointHoverRadius: 4,
      fill: false, tension: 0.35, order: 0,
      _rollingValues: rolled,
    });
    durOpts.plugins.legend = legendWithRolling;
  }
  registerChart("sleep-dur", new Chart(document.getElementById("sleep-duration-chart"), {
    type: "bar",
    data: { labels: sleepData.map((d) => d.date), datasets: durDatasets },
    options: { ...durOpts, scales: { ...durOpts.scales, y: { ...durOpts.scales.y, min: 0 } } },
  }));

  // Score chart
  destroyChart("sleep-score");
  const scoreOpts = baseOpts("score");
  const scoreFiltered = sleepData.filter((d) => d.score);
  const scoreDatasets = [
    makeDataset(scoreFiltered.map((d) => ({ x: d.date, y: d.score })), PALETTE.sea + "50", { label: "Daily", borderWidth: 1.5, pointRadius: scoreFiltered.length > 60 ? 0 : 2, fill: false, order: 1 }),
  ];
  if (showRolling) {
    scoreDatasets.push(makeRollingDataset(scoreFiltered.map((d) => d.date), scoreFiltered.map((d) => d.score), w, PALETTE.sea));
    scoreOpts.plugins.legend = legendWithRolling;
  }
  registerChart("sleep-score", new Chart(document.getElementById("sleep-score-chart"), {
    type: "line",
    data: { datasets: scoreDatasets },
    options: { ...scoreOpts, scales: { ...scoreOpts.scales, y: { ...scoreOpts.scales.y, min: 0, max: 100 } } },
  }));

  // Body battery chart — rolling avg of the peak value
  destroyChart("bb");
  const bbData = vitalsData.filter((d) => d.bodyBattery);
  const bbOpts = baseOpts("battery");
  const bbDatasets = [
    makeDataset(bbData.map((d) => ({ x: d.date, y: d.bodyBattery.max })), PALETTE.olive + "50", { label: "Peak", borderWidth: 1.5, pointRadius: bbData.length > 60 ? 0 : 2, fill: false, order: 1 }),
    makeDataset(bbData.map((d) => ({ x: d.date, y: d.bodyBattery.min })), PALETTE.terracotta + "50", { label: "Low", borderWidth: 1.5, pointRadius: 0, fill: false, order: 1 }),
  ];
  if (showRolling) {
    bbDatasets.push(makeRollingDataset(bbData.map((d) => d.date), bbData.map((d) => d.bodyBattery.max), w, PALETTE.olive));
  }
  bbOpts.plugins.legend = legendWithRolling;
  registerChart("bb", new Chart(document.getElementById("bb-chart"), {
    type: "line",
    data: { datasets: bbDatasets },
    options: { ...bbOpts, scales: { ...bbOpts.scales, y: { ...bbOpts.scales.y, min: 0, max: 100 } } },
  }));

  // HRV chart
  destroyChart("recovery-hrv");
  const hrvFiltered = vitalsData.filter((d) => d.hrvNight);
  const hrvOpts = baseOpts("ms", (v) => v + " ms");
  const hrvDatasets = [
    makeDataset(hrvFiltered.map((d) => ({ x: d.date, y: d.hrvNight })), PALETTE.olive + "50", { label: "Daily", borderWidth: 1.5, pointRadius: hrvFiltered.length > 60 ? 0 : 2, fill: false, order: 1 }),
  ];
  if (showRolling) {
    hrvDatasets.push(makeRollingDataset(hrvFiltered.map((d) => d.date), hrvFiltered.map((d) => d.hrvNight), w, PALETTE.olive));
    hrvOpts.plugins.legend = legendWithRolling;
  }
  registerChart("recovery-hrv", new Chart(document.getElementById("recovery-hrv-chart"), {
    type: "line",
    data: { datasets: hrvDatasets },
    options: hrvOpts,
  }));

  // Resting HR
  destroyChart("rhr");
  const rhrFiltered = vitalsData.filter((d) => d.restingHR);
  const rhrOpts = baseOpts("bpm", (v) => v + " bpm");
  const rhrDatasets = [
    makeDataset(rhrFiltered.map((d) => ({ x: d.date, y: d.restingHR })), PALETTE.terracotta + "50", { label: "Daily", borderWidth: 1.5, pointRadius: rhrFiltered.length > 60 ? 0 : 2, fill: false, order: 1 }),
  ];
  if (showRolling) {
    rhrDatasets.push(makeRollingDataset(rhrFiltered.map((d) => d.date), rhrFiltered.map((d) => d.restingHR), w, PALETTE.terracotta));
    rhrOpts.plugins.legend = legendWithRolling;
  }
  registerChart("rhr", new Chart(document.getElementById("rhr-chart"), {
    type: "line",
    data: { datasets: rhrDatasets },
    options: rhrOpts,
  }));

  // Stress — rolling average
  destroyChart("stress");
  const stressFiltered = vitalsData.filter((d) => d.avgStress);
  const stressOpts = baseOpts("stress");
  const stressDatasets = [
    makeDataset(stressFiltered.map((d) => ({ x: d.date, y: d.avgStress })), PALETTE.terracotta + "40", { label: "Daily", borderWidth: 1, pointRadius: 0, fill: false, order: 1 }),
  ];
  stressDatasets.push(makeRollingDataset(stressFiltered.map((d) => d.date), stressFiltered.map((d) => d.avgStress), w, PALETTE.terracotta));
  stressOpts.plugins.legend = legendWithRolling;
  const stressMax = stressFiltered.length ? Math.max(...stressFiltered.map((d) => d.avgStress)) : 50;
  const stressMin = stressFiltered.length ? Math.min(...stressFiltered.map((d) => d.avgStress)) : 0;
  const stressPad = Math.max(5, (stressMax - stressMin) * 0.15);
  registerChart("stress", new Chart(document.getElementById("stress-chart"), {
    type: "line",
    data: { datasets: stressDatasets },
    options: { ...stressOpts, scales: { ...stressOpts.scales, y: { ...stressOpts.scales.y, min: Math.max(0, Math.floor(stressMin - stressPad)), max: Math.ceil(stressMax + stressPad) } } },
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
      labels: sleepData.map((d) => d.date),
      datasets: [
        { label: "Deep", data: sleepData.map((d) => d.deep || 0), backgroundColor: "#3d5a80", borderRadius: 2, borderSkipped: false },
        { label: "REM", data: sleepData.map((d) => d.rem || 0), backgroundColor: "#7a5c6e", borderRadius: 2, borderSkipped: false },
        { label: "Light", data: sleepData.map((d) => d.light || 0), backgroundColor: "#a0826d80", borderRadius: 2, borderSkipped: false },
        { label: "Awake", data: sleepData.map((d) => d.awake || 0), backgroundColor: "#c4653a60", borderRadius: 2, borderSkipped: false },
      ],
    },
    options: stagesOpts,
  }));
}

// (Vitals are now part of the Recovery tab)

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

  // Chart — bars for daily + line for rolling avg
  destroyChart("steps");
  const opts = baseOpts("steps", (v) => v >= 1000 ? (v / 1000).toFixed(0) + "k" : v);

  const sw = rollingWindow(days);
  const datasets = [{
    type: "bar", label: "Daily",
    data: data.map((d) => d.steps),
    backgroundColor: data.map((d) => d.steps >= goal ? PALETTE.olive + "70" : d.steps >= 7000 ? PALETTE.clay + "50" : PALETTE.terracotta + "40"),
    borderRadius: 3, borderSkipped: false, order: 1,
  }];
  if (data.length > sw) {
    const rolled = rollingAvg(data.map((d) => d.steps), sw);
    datasets.push({
      type: "line", label: `${sw}d avg`,
      data: rolled,
      borderColor: PALETTE.sea, borderWidth: 2.5,
      pointRadius: 0, pointHoverRadius: 4,
      fill: false, tension: 0.35, order: 0,
      _rollingValues: rolled,
    });
  }
  if (goal) {
    datasets.push({
      type: "line", label: "Goal",
      data: Array(data.length).fill(goal),
      borderColor: "#8a837c", borderWidth: 1.5, borderDash: [6, 4],
      pointRadius: 0, fill: false, order: 0,
    });
  }
  opts.plugins.legend = {
    display: true, position: "bottom",
    labels: { boxWidth: 12, boxHeight: 2, padding: 8, font: { ...FONT, size: 10, weight: "300" }, color: "#8a837c" },
  };

  const allSteps = data.map((d) => d.steps);
  const stepsMax = Math.max(...allSteps, goal || 0);
  const stepsPad = stepsMax * 0.08;

  registerChart("steps", new Chart(document.getElementById("steps-chart"), {
    type: "bar",
    data: { labels: data.map((d) => d.date), datasets },
    options: { ...opts, scales: { ...opts.scales, y: { ...opts.scales.y, min: 0, max: Math.ceil((stepsMax + stepsPad) / 1000) * 1000 } } },
  }));
}

// ── Activities ───────────────────────────────────────────────────────────────

let _activitySummary = null;

function renderMonthlyChart(mode = "count") {
  if (!_activitySummary) return;
  const summary = _activitySummary;

  destroyChart("monthly");
  const isCount = mode === "count";
  const source = isCount ? summary.monthly : summary.monthlyDuration;
  const months = Object.entries(source).sort((a, b) => a[0].localeCompare(b[0]));
  const monthOpts = baseOpts(isCount ? "count" : "hrs", isCount ? undefined : (v) => Math.round(v / 60) + "h");
  monthOpts.scales.x = {
    type: "category",
    grid: { display: false },
    ticks: { font: { ...FONT, size: 10, weight: "300" }, color: "#8a837c" },
    border: { display: false },
  };
  monthOpts.plugins.tooltip.callbacks = {
    label: (i) => isCount ? `${i.parsed.y} workouts` : `${Math.round(i.parsed.y / 60)} hrs ${Math.round(i.parsed.y % 60)} min`,
  };

  document.getElementById("monthly-chart-title").textContent = isCount ? "Monthly Activity Count" : "Monthly Activity Duration";

  registerChart("monthly", new Chart(document.getElementById("monthly-chart"), {
    type: "bar",
    data: {
      labels: months.map((m) => m[0]),
      datasets: [{
        data: months.map((m) => m[1]),
        backgroundColor: isCount ? PALETTE.sea + "90" : PALETTE.olive + "90",
        borderRadius: 4, borderSkipped: false,
      }],
    },
    options: monthOpts,
  }));
}

async function renderActivities(listDays = 90) {
  const [summary, activities] = await Promise.all([
    fetch("/api/activity-summary").then((r) => r.json()),
    fetch(`/api/activities?days=${listDays}`).then((r) => r.json()),
  ]);

  _activitySummary = summary;
  const activeMode = document.querySelector("#monthly-mode-bar .range-btn.active")?.dataset.mode || "count";
  renderMonthlyChart(activeMode);

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
  row.dataset.date = a.date;
  row.addEventListener("click", () => openSession(a.date));
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

// Extract focus area details from the raw sections (the bullet points under each ### heading)
function extractFocusDetails(sections) {
  const body = sections["Focus Areas"];
  if (!body) return {};
  const details = {};
  let currentKey = null;
  for (const line of body.split("\n")) {
    const headingMatch = line.match(/^### \d+\.\s+(.+)/);
    if (headingMatch) {
      currentKey = headingMatch[1];
      details[currentKey] = [];
      continue;
    }
    if (currentKey && line.startsWith("- ")) {
      // Skip Current/Target/Advice lines — we render those separately
      if (line.match(/\*\*Current:/) || line.match(/\*\*Target:/) || line.match(/\*\*Advice:/)) continue;
      details[currentKey] = details[currentKey] || [];
      details[currentKey].push(line.replace(/^- /, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"));
    }
  }
  return details;
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

    const focusDetails = extractFocusDetails(s.sections || {});

    // Parse advice lines from sections
    const adviceByTitle = {};
    const focusBody = (s.sections || {})["Focus Areas"] || "";
    let curTitle = null;
    for (const line of focusBody.split("\n")) {
      const hm = line.match(/^### \d+\.\s+(.+)/);
      if (hm) { curTitle = hm[1]; continue; }
      if (curTitle && line.match(/\*\*Advice:/)) {
        const m = line.match(/\*\*Advice:\s*(.+)\*\*/);
        if (m) adviceByTitle[curTitle] = m[1];
      }
    }

    // Focus cards — compact with expandable details
    const focusHtml = s.focusAreas.map((f, fi) => {
      const details = focusDetails[f.title] || [];
      const advice = adviceByTitle[f.title];
      const detailId = `focus-detail-${i}-${fi}`;

      return `
        <div class="focus-card">
          <div class="focus-card-header">
            <span class="focus-num">${fi + 1}</span>
            <div class="focus-card-title">${f.title}</div>
          </div>
          <div class="focus-card-metrics">
            ${f.current ? `<div class="focus-current">${f.current}</div>` : ""}
            ${f.target ? `<div class="focus-target-line"><span class="focus-target-label">Target</span> ${f.target}</div>` : ""}
          </div>
          ${details.length || advice ? `
            <button class="focus-detail-toggle" data-target="${detailId}">Details</button>
            <div class="focus-detail collapsed" id="${detailId}">
              ${details.map((d) => `<div class="md-li">${d}</div>`).join("")}
              ${advice ? `<div class="focus-advice">${advice}</div>` : ""}
            </div>
          ` : ""}
        </div>
      `;
    }).join("");

    // Detail sections — skip Focus Areas (rendered above)
    const detailSections = Object.entries(s.sections || {})
      .filter(([title]) => title !== "Focus Areas");

    // Split into columns: vitals/BP on left, bloodwork/good on right
    const sectionsHtml = detailSections.map(([title, body]) => `
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
        ${s.focusAreas.length ? `<div class="report-focus-grid">${focusHtml}</div>` : ""}
        ${sectionsHtml ? `
          <button class="report-toggle" data-target="${bodyId}">
            ${isFirst ? "Hide details" : "Show details"}
          </button>
          <div class="report-body ${isFirst ? "" : "collapsed"}" id="${bodyId}">
            <div class="report-sections-grid">${sectionsHtml}</div>
          </div>
        ` : ""}
      </div>
    `;

    timeline.appendChild(report);
  });

  // Toggle handlers
  timeline.querySelectorAll(".report-toggle, .focus-detail-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const body = document.getElementById(btn.dataset.target);
      const collapsed = body.classList.toggle("collapsed");
      if (btn.classList.contains("report-toggle")) {
        btn.textContent = collapsed ? "Show details" : "Hide details";
      } else {
        btn.textContent = collapsed ? "Details" : "Less";
      }
    });
  });
}

// ── Plans ────────────────────────────────────────────────────────────────────

function planMdToHtml(content) {
  const lines = content.split("\n");
  let html = "";
  let inTable = false;
  let tableRows = [];

  function flushTable() {
    if (!tableRows.length) return;
    const headerCells = tableRows[0];
    let t = `<table class="plan-table"><thead><tr>${headerCells.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>`;
    for (let r = 2; r < tableRows.length; r++) {
      t += `<tr>${tableRows[r].map((c) => `<td>${c}</td>`).join("")}</tr>`;
    }
    t += "</tbody></table>";
    html += t;
    tableRows = [];
    inTable = false;
  }

  for (const line of lines) {
    // Skip the H1 title — we render that separately
    if (line.match(/^# /)) continue;

    // Table rows
    if (line.match(/^\|/)) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => c.match(/^[-:]+$/))) {
        // separator row — keep it for index tracking
        tableRows.push(cells);
        inTable = true;
        continue;
      }
      tableRows.push(cells);
      inTable = true;
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Blockquote
    if (line.match(/^>\s*/)) {
      html += `<div class="plan-quote">${line.replace(/^>\s*/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</div>`;
      continue;
    }

    // Headings
    if (line.match(/^## /)) {
      html += `<h3 class="plan-h2">${line.replace(/^## /, "")}</h3>`;
      continue;
    }
    if (line.match(/^### /)) {
      html += `<h4 class="plan-h3">${line.replace(/^### /, "")}</h4>`;
      continue;
    }

    // Horizontal rule
    if (line.match(/^---\s*$/)) {
      html += `<hr class="plan-hr">`;
      continue;
    }

    // List items
    if (line.match(/^- /)) {
      html += `<div class="plan-li">${line.replace(/^- /, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</div>`;
      continue;
    }

    // Regular text
    if (line.trim()) {
      html += `<div class="plan-p">${line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</div>`;
    }
  }

  if (inTable) flushTable();
  return html;
}

async function renderPlans() {
  const plans = await fetch("/api/plans").then((r) => r.json());
  const container = document.getElementById("plans-list");
  container.innerHTML = "";

  if (!plans.length) {
    container.innerHTML = `<div style="color:var(--ink-muted);font-size:0.85rem;">No plans yet.</div>`;
    return;
  }

  const timeline = document.createElement("div");
  timeline.className = "health-timeline";
  container.appendChild(timeline);

  [...plans].reverse().forEach((p, i) => {
    const report = document.createElement("div");
    report.className = "report";
    report.style.animationDelay = `${i * 0.08}s`;

    const bodyId = `plan-body-${i}`;
    const isFirst = i === 0;
    const typeBadge = p.type === "next-session"
      ? `<span class="plan-type-badge plan-type-session">Next Session</span>`
      : `<span class="plan-type-badge plan-type-plan">Plan</span>`;

    // Extract first blockquote or first paragraph as summary
    const contentLines = p.content.split("\n").filter((l) => !l.match(/^# /));
    let summary = "";
    for (const line of contentLines) {
      if (line.match(/^>\s*(.+)/)) {
        summary = line.replace(/^>\s*/, "").replace(/\*\*(.+?)\*\*/g, "$1");
        break;
      }
    }
    if (!summary) {
      // Find first non-empty, non-heading, non-hr line
      for (const line of contentLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.match(/^[#>-]/) && !trimmed.match(/^---/)) {
          summary = trimmed.replace(/\*\*(.+?)\*\*/g, "$1");
          break;
        }
      }
    }

    const bodyHtml = planMdToHtml(p.content);

    report.innerHTML = `
      <div class="report-date">${p.date ? formatDate(p.date) : "Undated"}</div>
      <div class="report-card">
        <div class="report-hero">
          <div class="report-title" style="display:flex;align-items:center;gap:0.6rem;">
            ${p.title}
            ${typeBadge}
          </div>
          ${summary ? `<div class="report-overall">${summary}</div>` : ""}
        </div>
        <button class="report-toggle" data-target="${bodyId}">
          ${isFirst ? "Hide details" : "Show details"}
        </button>
        <div class="report-body plan-body ${isFirst ? "" : "collapsed"}" id="${bodyId}">
          ${bodyHtml}
        </div>
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

// ── Journal ──────────────────────────────────────────────────────────────────

function journalMdToHtml(content) {
  return content.split("\n").map((line) => {
    if (line.match(/^# /)) return "";
    if (line.match(/^## /)) return `<h3 class="plan-h2">${line.replace(/^## /, "")}</h3>`;
    if (line.match(/^- /)) return `<div class="plan-li">${line.replace(/^- /, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</div>`;
    if (line.trim()) return `<div class="plan-p">${line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</div>`;
    return "";
  }).join("\n");
}

async function renderJournal(days) {
  const entries = await fetch(`/api/journal?days=${days || 30}`).then((r) => r.json());
  const container = document.getElementById("journal-list");
  container.innerHTML = "";

  if (!entries.length) {
    container.innerHTML = `<div style="color:var(--ink-muted);font-size:0.85rem;">No journal entries yet.</div>`;
    return;
  }

  const timeline = document.createElement("div");
  timeline.className = "health-timeline";
  container.appendChild(timeline);

  [...entries].reverse().forEach((entry, i) => {
    const el = document.createElement("div");
    el.className = "report";
    el.style.animationDelay = `${i * 0.06}s`;

    const bodyId = `journal-body-${i}`;
    const isFirst = i === 0;

    // Extract first few list items as preview
    const items = entry.content.split("\n").filter((l) => l.match(/^- /)).slice(0, 3);
    const preview = items.map((l) => l.replace(/^- /, "")).join(" · ");

    el.innerHTML = `
      <div class="report-date">${formatDate(entry.date)}</div>
      <div class="report-card">
        <div class="report-hero">
          <div class="report-title">${entry.title}</div>
          ${preview ? `<div class="report-overall">${preview}</div>` : ""}
        </div>
        <button class="report-toggle" data-target="${bodyId}">
          ${isFirst ? "Hide details" : "Show details"}
        </button>
        <div class="report-body plan-body ${isFirst ? "" : "collapsed"}" id="${bodyId}">
          ${journalMdToHtml(entry.content)}
        </div>
      </div>
    `;
    timeline.appendChild(el);
  });

  timeline.querySelectorAll(".report-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const body = document.getElementById(btn.dataset.target);
      const collapsed = body.classList.toggle("collapsed");
      btn.textContent = collapsed ? "Show details" : "Hide details";
    });
  });
}

// ── Food ─────────────────────────────────────────────────────────────────────

async function renderFood(days) {
  const entries = await fetch(`/api/food?days=${days || 30}`).then((r) => r.json());
  const container = document.getElementById("food-list");
  container.innerHTML = "";

  if (!entries.length) {
    container.innerHTML = `<div style="color:var(--ink-muted);font-size:0.85rem;">No food logs yet.</div>`;
    return;
  }

  const timeline = document.createElement("div");
  timeline.className = "health-timeline";
  container.appendChild(timeline);

  [...entries].reverse().forEach((entry, i) => {
    const el = document.createElement("div");
    el.className = "report";
    el.style.animationDelay = `${i * 0.06}s`;

    const bodyId = `food-body-${i}`;
    const isFirst = i === 0;

    const items = entry.content.split("\n").filter((l) => l.match(/^- /)).slice(0, 3);
    const preview = items.map((l) => l.replace(/^- /, "")).join(" · ");

    el.innerHTML = `
      <div class="report-date">${formatDate(entry.date)}</div>
      <div class="report-card">
        <div class="report-hero">
          <div class="report-title">${entry.title}</div>
          ${preview ? `<div class="report-overall">${preview}</div>` : ""}
        </div>
        <button class="report-toggle" data-target="${bodyId}">
          ${isFirst ? "Hide details" : "Show details"}
        </button>
        <div class="report-body plan-body ${isFirst ? "" : "collapsed"}" id="${bodyId}">
          ${journalMdToHtml(entry.content)}
        </div>
      </div>
    `;
    timeline.appendChild(el);
  });

  timeline.querySelectorAll(".report-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const body = document.getElementById(btn.dataset.target);
      const collapsed = body.classList.toggle("collapsed");
      btn.textContent = collapsed ? "Show details" : "Hide details";
    });
  });
}

// ── Profile ──────────────────────────────────────────────────────────────────

async function renderProfile() {
  const profile = await fetch("/api/profile").then((r) => r.json());
  const container = document.getElementById("profile-content");
  container.innerHTML = "";

  const sections = [
    { key: "goals", label: "Goals" },
    { key: "nutrition", label: "Nutrition" },
    { key: "preferences", label: "Preferences" },
  ];

  for (const { key, label } of sections) {
    if (!profile[key]) continue;

    const card = document.createElement("div");
    card.className = "profile-card";
    card.innerHTML = `
      <div class="profile-card-title">${label}</div>
      <div class="profile-card-body">
        ${journalMdToHtml(profile[key])}
      </div>
    `;
    container.appendChild(card);
  }
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
        if (section === "recovery") renderRecovery(days);
        else if (section === "steps") renderSteps(days);
        else if (section === "activities") renderActivities(days);
        else if (section === "journal") renderJournal(days);
        else if (section === "food") renderFood(days);
      });
    });
  });
});

// Monthly count/duration toggle
document.querySelectorAll("#monthly-mode-bar .range-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#monthly-mode-bar .range-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderMonthlyChart(btn.dataset.mode);
  });
});

// ── Init ─────────────────────────────────────────────────────────────────────

renderOverview();
renderStrength();
renderHealthHistory();
renderRecovery(14);
renderSteps(14);
renderActivities(90);
renderPlans();
renderJournal(30);
renderFood(30);
renderProfile();
