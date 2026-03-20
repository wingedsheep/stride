# Stride

This is a personal life tracker powered by structured files and Claude Code.

## Project Structure

```
garmin/           — Synced Garmin data
  workouts/       — One markdown file per workout (auto-generated from sync)
  sleep/          — Daily sleep data
  vitals/         — Resting HR, HRV, body battery, stress, etc.
journal/          — Daily journal entries (one file per day: YYYY-MM-DD.md)
training/
  log/            — Workout notes: weights, sets, reps, RPE, how it felt
  programs/       — Training plans and programming
health/           — Blood work, medical tests, and periodic health summaries
docs/             — Process documentation (e.g. how to write health summaries)
profile/          — Persistent personal info
  preferences.md  — Food likes/dislikes, workout preferences
  goals.md        — Current training goals
  nutrition.md    — Dietary notes, restrictions, meal ideas
web/              — Dashboard frontend (HTML/CSS/JS)
server.js         — Node server: parses training logs, serves API + static files
scripts/          — Sync and utility scripts
```

## How to work with this data

### When the user asks about their data
- Search across `garmin/`, `journal/`, and `training/log/` to find relevant entries
- Cross-reference Garmin metrics (sleep, HRV, stress) with journal entries to spot patterns
- Always ground answers in actual data — cite specific dates and values

### When the user asks for advice (next workout, nutrition, patterns)
- Read their `profile/goals.md` to understand what they're training for
- Read `profile/preferences.md` for food/workout preferences
- Look at recent `training/log/` entries and `garmin/workouts/` for recent activity
- Look at `garmin/sleep/` and `garmin/vitals/` for recovery signals
- Consider the full picture: sleep quality, HRV trends, stress, recent training load

### When the user wants to log something
- **Daily journal**: Create or append to `journal/YYYY-MM-DD.md`
- **Workout notes**: Create `training/log/YYYY-MM-DD-<type>.md`
- **Profile updates**: Edit the relevant file in `profile/`

### File formats

#### Journal entry (journal/YYYY-MM-DD.md)
```markdown
# YYYY-MM-DD — Day of week

## How I feel
<mood, energy, stress notes>

## What I did
<activities, events, notable things>

## Notes
<anything else>
```

#### Workout log (training/log/YYYY-MM-DD-<type>.md)
```markdown
# Workout — <type> — YYYY-MM-DD

## Exercises
- Exercise name: sets x reps @ weight (RPE X)

## Notes
<how it felt, what to adjust next time>
```

## Garmin Sync

Run `python scripts/garmin_sync.py` to pull the latest data from Garmin Connect.
Credentials are stored in `.env` (never committed).

The sync script pulls:
- Activities/workouts
- Sleep data
- Heart rate (resting)
- HRV
- Body battery
- Stress

Data is stored as both raw JSON (for analysis) and summarized markdown (for reading).

## Health Summaries

When asked to produce a health summary, follow the process in `docs/health-summary-process.md`.
Save output to `health/summary-YYYY-MM-DD.md` — it automatically appears in the dashboard Health tab.

## Important
- Never commit `.env` — it contains Garmin credentials
- Raw JSON files in garmin/ are the source of truth; markdown summaries are regenerated from them
- When analyzing trends, compare multiple time windows (7d, 30d, 90d, 1y) — don't just report snapshots
- Garmin API frequently returns None — always use `or {}` / `or 0` when parsing
