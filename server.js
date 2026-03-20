const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = 3000;
const ROOT = __dirname;
const LOG_DIR = path.join(ROOT, "training", "log");
const GARMIN_DIR = path.join(ROOT, "garmin");

// ── Markdown value parser helpers ───────────────────────────────────────────

function extractMdValue(content, label) {
  const re = new RegExp(`\\*\\*${label}\\*\\*:\\s*(.+)`, "i");
  const m = content.match(re);
  if (!m) return null;
  const raw = m[1].trim();
  const num = parseFloat(raw);
  return isNaN(num) ? null : num;
}

function extractMdString(content, label) {
  const re = new RegExp(`\\*\\*${label}\\*\\*:\\s*(.+)`, "i");
  const m = content.match(re);
  return m ? m[1].trim() : null;
}

// ── Training log parsing ────────────────────────────────────────────────────

function parseWeight(text) {
  const weights = [];
  const matches = text.matchAll(/([\d.]+)\s*kg/g);
  for (const m of matches) weights.push(parseFloat(m[1]));
  return weights.length ? Math.max(...weights) : null;
}

function parseSetsReps(text) {
  const parts = [];
  const setMatches = text.matchAll(/(\d+)x(\d+)/g);
  for (const m of setMatches) parts.push({ sets: parseInt(m[1]), reps: parseInt(m[2]) });
  if (parts.length) return parts;
  const repMatch = text.match(/(\d+(?:-\d+)+)/);
  if (repMatch) {
    const reps = repMatch[1].split("-").map(Number);
    return reps.map((r) => ({ sets: 1, reps: r }));
  }
  return [];
}

function parseTrainingLog(filepath) {
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.split("\n");
  const basename = path.basename(filepath, ".md");
  const dateMatch = basename.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return null;

  const date = dateMatch[1];
  let title = "";
  const exercises = [];
  let notes = "";
  let inExercises = false;
  let inNotes = false;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = line.replace("# ", "").trim();
    } else if (line.match(/^##\s*Exercises/i)) {
      inExercises = true; inNotes = false;
    } else if (line.match(/^##\s*Notes/i)) {
      inNotes = true; inExercises = false;
    } else if (line.startsWith("## ")) {
      inExercises = false; inNotes = false;
    } else if (inExercises && line.startsWith("- ")) {
      const text = line.replace(/^-\s*/, "");
      const [namePart, ...rest] = text.split(":");
      const detail = rest.join(":").trim();
      const name = namePart.trim();
      exercises.push({
        name, raw: text,
        maxWeight: parseWeight(detail || text),
        setsReps: parseSetsReps(detail || text),
      });
    } else if (inNotes && line.trim()) {
      notes += (notes ? " " : "") + line.trim();
    }
  }
  return { date, title, exercises, notes };
}

const EXERCISE_ALIASES = {
  "leg press": "Leg Press", "chest press": "Chest Press",
  "shoulder press": "Shoulder Press", "lat pulldown": "Lat Pulldown",
  "leg curl": "Leg Curl", "leg extension": "Leg Extension",
  "bicep curl machine": "Bicep Curl", "bicep curl": "Bicep Curl",
  "dumbbell curls": "Dumbbell Curls", "dumbbell rows": "Dumbbell Rows",
  "push-ups": "Push-ups", "goblet squats": "Goblet Squats",
  "lunges": "Lunges", "plank": "Plank", "hanging crunches": "Hanging Crunches",
};

function canonicalize(name) {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(EXERCISE_ALIASES)) {
    if (lower.includes(key)) return val;
  }
  return name;
}

function getSessions() {
  if (!fs.existsSync(LOG_DIR)) return [];
  const files = fs.readdirSync(LOG_DIR).filter((f) => f.match(/^\d{4}-\d{2}-\d{2}.*\.md$/));
  const sessions = [];
  for (const file of files) {
    const parsed = parseTrainingLog(path.join(LOG_DIR, file));
    if (parsed) {
      parsed.exercises = parsed.exercises.map((e) => ({ ...e, canonical: canonicalize(e.name) }));
      sessions.push(parsed);
    }
  }
  sessions.sort((a, b) => a.date.localeCompare(b.date));
  return sessions;
}

function getProgression(sessions) {
  const tracked = ["Leg Press", "Chest Press", "Shoulder Press", "Lat Pulldown", "Leg Curl", "Leg Extension"];
  const progression = {};
  for (const name of tracked) progression[name] = [];
  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (tracked.includes(ex.canonical) && ex.maxWeight) {
        progression[ex.canonical].push({ date: session.date, weight: ex.maxWeight });
      }
    }
  }
  for (const key of Object.keys(progression)) {
    if (progression[key].length === 0) delete progression[key];
  }
  return progression;
}

// ── Garmin data parsing ─────────────────────────────────────────────────────

function readGarminDir(subdir, days) {
  const dir = path.join(GARMIN_DIR, subdir);
  if (!fs.existsSync(dir)) return [];

  let files = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f.match(/^\d{4}-\d{2}-\d{2}/));
  files.sort();

  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    files = files.filter((f) => f.slice(0, 10) >= cutoffStr);
  }

  return files.map((f) => ({
    date: f.slice(0, 10),
    content: fs.readFileSync(path.join(dir, f), "utf-8"),
  }));
}

function getSleep(days) {
  return readGarminDir("sleep", days).map(({ date, content }) => ({
    date,
    totalHrs: extractMdValue(content, "Total sleep"),
    score: extractMdValue(content, "Sleep score"),
    deep: extractMdValue(content, "Deep"),
    light: extractMdValue(content, "Light"),
    rem: extractMdValue(content, "REM"),
    awake: extractMdValue(content, "Awake"),
  })).filter((d) => d.totalHrs !== null);
}

function getVitals(days) {
  return readGarminDir("vitals", days).map(({ date, content }) => ({
    date,
    restingHR: extractMdValue(content, "Resting HR"),
    hrvNight: extractMdValue(content, "HRV \\(last night avg\\)"),
    hrvWeekly: extractMdValue(content, "HRV \\(weekly avg\\)"),
    avgStress: extractMdValue(content, "Avg stress"),
    bodyBattery: (() => {
      const raw = extractMdString(content, "Body battery");
      if (!raw) return null;
      const parts = raw.split("–").map((s) => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { min: parts[0], max: parts[1] };
      }
      return null;
    })(),
  }));
}

function getActivities(days) {
  const dir = path.join(GARMIN_DIR, "workouts");
  if (!fs.existsSync(dir)) return [];

  let files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  files.sort();

  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    files = files.filter((f) => f.slice(0, 10) >= cutoffStr);
  }

  return files.map((f) => {
    const content = fs.readFileSync(path.join(dir, f), "utf-8");
    const titleMatch = content.match(/^#\s+(.+)/);
    return {
      date: f.slice(0, 10),
      filename: f,
      title: titleMatch ? titleMatch[1].trim() : f,
      type: extractMdString(content, "Type"),
      duration: extractMdValue(content, "Duration"),
      distance: extractMdValue(content, "Distance"),
      calories: extractMdValue(content, "Calories"),
      avgHR: extractMdValue(content, "Avg HR"),
      maxHR: extractMdValue(content, "Max HR"),
    };
  });
}

function getActivitySummary() {
  const all = getActivities(null);
  const types = {};
  for (const a of all) {
    const t = a.type || "other";
    types[t] = (types[t] || 0) + 1;
  }

  // Monthly counts and duration for last 12 months
  const monthly = {};
  const monthlyDuration = {};
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  for (const a of all) {
    if (a.date >= cutoff.toISOString().slice(0, 10)) {
      const month = a.date.slice(0, 7);
      monthly[month] = (monthly[month] || 0) + 1;
      monthlyDuration[month] = (monthlyDuration[month] || 0) + (a.duration || 0);
    }
  }

  return { total: all.length, types, monthly, monthlyDuration };
}

function parseHealthSummary(filepath) {
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.split("\n");
  const basename = path.basename(filepath, ".md");
  const date = basename.replace("summary-", "");

  const focusAreas = [];
  const sections = {};
  let overall = "";
  let inOverall = false;
  let currentFocus = null;
  let currentSection = null;
  let sectionContent = [];

  for (const line of lines) {
    if (line.match(/^## Overall/)) { inOverall = true; currentSection = null; continue; }
    if (line.match(/^## (.+)/)) {
      inOverall = false;
      if (currentSection) sections[currentSection] = sectionContent.join("\n").trim();
      currentSection = line.match(/^## (.+)/)[1];
      sectionContent = [];
      continue;
    }
    if (inOverall && line.trim()) { overall += (overall ? " " : "") + line.trim(); }
    if (currentSection) sectionContent.push(line);

    const focusMatch = line.match(/^### \d+\.\s+(.+)/);
    if (focusMatch) {
      currentFocus = { title: focusMatch[1], target: null };
      focusAreas.push(currentFocus);
      continue;
    }

    if (currentFocus && line.includes("**Current:")) {
      const currentMatch = line.match(/\*\*Current:\s*(.+)\*\*/);
      if (currentMatch) currentFocus.current = currentMatch[1];
    }

    if (currentFocus && line.includes("**Target:")) {
      const targetMatch = line.match(/\*\*Target:\s*(.+)\*\*/);
      if (targetMatch) currentFocus.target = targetMatch[1];
    }
  }
  if (currentSection) sections[currentSection] = sectionContent.join("\n").trim();

  return { date, overall, focusAreas, sections, raw: content };
}

function getHealthSummaries() {
  const dir = path.join(ROOT, "health");
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith("summary-") && f.endsWith(".md"))
    .sort();

  return files.map((f) => parseHealthSummary(path.join(dir, f)));
}

function getLatestHealthSummary() {
  const all = getHealthSummaries();
  return all.length ? all[all.length - 1] : null;
}

function getSteps(days) {
  return readGarminDir("steps", days).map(({ date, content }) => ({
    date,
    steps: extractMdValue(content, "Total steps"),
    goal: extractMdValue(content, "Goal"),
  })).filter((d) => d.steps !== null);
}

function getSessionDetail(dateStr) {
  // Garmin activities for this date
  const workoutDir = path.join(GARMIN_DIR, "workouts");
  const garminActivities = [];
  if (fs.existsSync(workoutDir)) {
    const files = fs.readdirSync(workoutDir).filter((f) => f.startsWith(dateStr) && f.endsWith(".md"));
    for (const f of files) {
      const content = fs.readFileSync(path.join(workoutDir, f), "utf-8");
      const titleMatch = content.match(/^#\s+(.+)/);
      const slug = f.replace(".md", "");

      // Load JSON for detailed data
      const jsonPath = path.join(workoutDir, slug + ".json");
      let jsonData = null;
      if (fs.existsSync(jsonPath)) {
        try { jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8")); } catch {}
      }

      // Load splits if available
      const splitsPath = path.join(workoutDir, slug + ".splits.json");
      let splits = null;
      if (fs.existsSync(splitsPath)) {
        try { splits = JSON.parse(fs.readFileSync(splitsPath, "utf-8")); } catch {}
      }

      const activity = {
        filename: f,
        title: titleMatch ? titleMatch[1].trim() : f,
        type: extractMdString(content, "Type"),
        duration: extractMdValue(content, "Duration"),
        distance: extractMdValue(content, "Distance"),
        calories: extractMdValue(content, "Calories"),
        avgHR: extractMdValue(content, "Avg HR"),
        maxHR: extractMdValue(content, "Max HR"),
      };

      // Add detailed fields from JSON
      if (jsonData) {
        activity.activityId = jsonData.activityId;
        activity.avgSpeed = jsonData.averageSpeed;
        activity.maxSpeed = jsonData.maxSpeed;
        activity.avgCadence = jsonData.averageRunningCadenceInStepsPerMinute;
        activity.elevationGain = jsonData.elevationGain;
        activity.elevationLoss = jsonData.elevationLoss;
        activity.avgStrideLength = jsonData.avgStrideLength;
      }

      // Add lap data from splits
      if (splits && splits.lapDTOs) {
        activity.laps = splits.lapDTOs.map((lap, i) => ({
          index: i + 1,
          distance: lap.distance,
          duration: lap.duration,
          avgSpeed: lap.averageSpeed,
          maxSpeed: lap.maxSpeed,
          avgHR: lap.averageHR,
          maxHR: lap.maxHR,
          avgCadence: lap.averageRunCadence,
          elevationGain: lap.elevationGain,
          elevationLoss: lap.elevationLoss,
          calories: lap.calories,
        }));
      }

      garminActivities.push(activity);
    }
  }

  // Training log notes for this date
  const trainingNotes = [];
  if (fs.existsSync(LOG_DIR)) {
    const files = fs.readdirSync(LOG_DIR).filter((f) => f.startsWith(dateStr) && f.endsWith(".md"));
    for (const f of files) {
      const parsed = parseTrainingLog(path.join(LOG_DIR, f));
      if (parsed) {
        parsed.exercises = parsed.exercises.map((e) => ({ ...e, canonical: canonicalize(e.name) }));
        trainingNotes.push(parsed);
      }
    }
  }

  // Sleep for this date
  const sleepFile = path.join(GARMIN_DIR, "sleep", `${dateStr}.md`);
  let sleep = null;
  if (fs.existsSync(sleepFile)) {
    const content = fs.readFileSync(sleepFile, "utf-8");
    sleep = {
      totalHrs: extractMdValue(content, "Total sleep"),
      score: extractMdValue(content, "Sleep score"),
      deep: extractMdValue(content, "Deep"),
      rem: extractMdValue(content, "REM"),
    };
  }

  // Vitals for this date
  const vitalsFile = path.join(GARMIN_DIR, "vitals", `${dateStr}.md`);
  let vitals = null;
  if (fs.existsSync(vitalsFile)) {
    const content = fs.readFileSync(vitalsFile, "utf-8");
    vitals = {
      restingHR: extractMdValue(content, "Resting HR"),
      hrvNight: extractMdValue(content, "HRV \\(last night avg\\)"),
      avgStress: extractMdValue(content, "Avg stress"),
    };
  }

  // Steps
  const stepsFile = path.join(GARMIN_DIR, "steps", `${dateStr}.md`);
  let steps = null;
  if (fs.existsSync(stepsFile)) {
    const content = fs.readFileSync(stepsFile, "utf-8");
    steps = extractMdValue(content, "Total steps");
  }

  // Journal
  const journalFile = path.join(ROOT, "journal", `${dateStr}.md`);
  let journal = null;
  if (fs.existsSync(journalFile)) {
    journal = fs.readFileSync(journalFile, "utf-8");
  }

  return {
    date: dateStr,
    garminActivities,
    trainingNotes,
    sleep,
    vitals,
    steps,
    journal,
  };
}

// ── Journal parsing ──────────────────────────────────────────────────────────

function getJournalEntries(days) {
  const dir = path.join(ROOT, "journal");
  if (!fs.existsSync(dir)) return [];

  let files = fs.readdirSync(dir).filter((f) => f.match(/^\d{4}-\d{2}-\d{2}\.md$/));
  files.sort();

  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    files = files.filter((f) => f.slice(0, 10) >= cutoffStr);
  }

  return files.map((f) => {
    const content = fs.readFileSync(path.join(dir, f), "utf-8");
    const titleMatch = content.match(/^# (.+)/m);
    return {
      date: f.slice(0, 10),
      title: titleMatch ? titleMatch[1].trim() : f.slice(0, 10),
      content,
    };
  });
}

// ── Food log parsing ─────────────────────────────────────────────────────────

function getFoodEntries(days) {
  const dir = path.join(ROOT, "food");
  if (!fs.existsSync(dir)) return [];

  let files = fs.readdirSync(dir).filter((f) => f.match(/^\d{4}-\d{2}-\d{2}\.md$/));
  files.sort();

  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    files = files.filter((f) => f.slice(0, 10) >= cutoffStr);
  }

  return files.map((f) => {
    const content = fs.readFileSync(path.join(dir, f), "utf-8");
    const titleMatch = content.match(/^# (.+)/m);
    return {
      date: f.slice(0, 10),
      title: titleMatch ? titleMatch[1].trim() : f.slice(0, 10),
      content,
    };
  });
}

// ── Profile parsing ──────────────────────────────────────────────────────────

function getProfile() {
  const dir = path.join(ROOT, "profile");
  if (!fs.existsSync(dir)) return {};

  const result = {};
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  for (const f of files) {
    result[f.replace(".md", "")] = fs.readFileSync(path.join(dir, f), "utf-8");
  }
  return result;
}

// ── Plans parsing ────────────────────────────────────────────────────────────

function getPlans() {
  const dir = path.join(ROOT, "training", "programs");
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  return files.map((f) => {
    const content = fs.readFileSync(path.join(dir, f), "utf-8");
    const titleMatch = content.match(/^# (.+)/m);
    const dateMatch = f.match(/(\d{4}-\d{2}-\d{2})/);

    // Determine type from filename
    let type = "plan";
    if (f.startsWith("next-session-")) type = "next-session";

    return {
      filename: f,
      date: dateMatch ? dateMatch[1] : null,
      title: titleMatch ? titleMatch[1].trim() : f.replace(".md", ""),
      type,
      content,
    };
  });
}

// ── HTTP server ─────────────────────────────────────────────────────────────

const MIME = {
  ".html": "text/html", ".css": "text/css",
  ".js": "application/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".webp": "image/webp",
};

function json(res, data) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const days = parsed.query.days ? parseInt(parsed.query.days) : null;

  // API routes
  if (pathname === "/api/sessions") return json(res, getSessions());
  if (pathname === "/api/progression") return json(res, getProgression(getSessions()));
  if (pathname === "/api/sleep") return json(res, getSleep(days || 30));
  if (pathname === "/api/vitals") return json(res, getVitals(days || 30));
  if (pathname === "/api/activities") return json(res, getActivities(days || 90));
  if (pathname === "/api/activity-summary") return json(res, getActivitySummary());
  if (pathname === "/api/steps") return json(res, getSteps(days || 30));
  if (pathname === "/api/health-summary") return json(res, getLatestHealthSummary());
  if (pathname.match(/^\/api\/session\/\d{4}-\d{2}-\d{2}$/)) {
    const dateStr = pathname.split("/").pop();
    return json(res, getSessionDetail(dateStr));
  }
  if (pathname === "/api/health-summaries") return json(res, getHealthSummaries());
  if (pathname === "/api/plans") return json(res, getPlans());
  if (pathname === "/api/weight") {
    const fp = path.join(ROOT, "health", "weight.json");
    if (fs.existsSync(fp)) {
      try { return json(res, JSON.parse(fs.readFileSync(fp, "utf-8"))); } catch {}
    }
    return json(res, []);
  }
  if (pathname === "/api/focus") {
    const fp = path.join(ROOT, "health", "focus.json");
    if (fs.existsSync(fp)) {
      try { return json(res, JSON.parse(fs.readFileSync(fp, "utf-8"))); } catch {}
    }
    return json(res, []);
  }
  if (pathname === "/api/journal") return json(res, getJournalEntries(days || 90));
  if (pathname === "/api/food") return json(res, getFoodEntries(days || 90));
  if (pathname === "/api/profile") return json(res, getProfile());

  // Food photos
  if (pathname.startsWith("/photos/food/")) {
    const photoPath = path.join(ROOT, "food", "photos", pathname.replace("/photos/food/", ""));
    const ext = path.extname(photoPath);
    if (fs.existsSync(photoPath)) {
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(fs.readFileSync(photoPath));
      return;
    }
  }

  // Static files
  let filePath = pathname === "/" ? "/index.html" : pathname;
  filePath = path.join(ROOT, "web", filePath);
  const ext = path.extname(filePath);

  if (fs.existsSync(filePath)) {
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Stride → http://localhost:${PORT}`);
});
