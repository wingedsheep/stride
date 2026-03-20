---
name: plan-workout
description: Plan the next training session based on recent training, recovery status, and goals. Use when the user asks "plan my next workout", "what should I train", "next session", or similar.
user-invocable: true
allowed-tools: Read, Bash, Grep, Glob, Agent
---

Plan the next training session following `docs/training-plan-process.md`.

## Step 1: Gather data (use parallel subagents)

Launch these subagents in parallel:

**Agent 1 — Training history**: Read ALL files in `training/log/` (every session matters for progression tracking). Run `source .venv/bin/activate && python scripts/analyze.py strength` for lift progression. Summarize: every exercise with weights/sets/reps from recent sessions, identify plateaus, what was trained most recently and when.

**Agent 2 — Recovery status**: Read today's (or most recent) files from `garmin/sleep/`, `garmin/vitals/`, `garmin/steps/`. Also read the last 7 days for context. Check `garmin/workouts/` for the last 2 weeks to see all activity (running, yoga, etc. — not just strength). Summarize: sleep quality, HRV vs 7d average, body battery, days since last workout, recent activity types.

**Agent 3 — Goals & profile**: Read `profile/goals.md`, `profile/preferences.md`. Read any active training plan from `training/programs/plan-*.md`. Summarize: what the user is training for, preferences, what the plan says to do next.

## Step 2: Plan the session

Based on recovery status:
- **Poor recovery** (body battery < 30, HRV well below average, sleep < 5hrs): suggest a light session — reduce weights 10%, fewer sets, focus on form and mobility
- **Moderate recovery**: maintain current weights, same volume
- **Good recovery** (body battery > 60, HRV above average, sleep > 7hrs): push — increase weight on exercises that were completed cleanly last time

Based on training history:
- Target muscle groups not trained in the last 48+ hours
- Progress exercises that hit all reps last time (add smallest increment)
- Change stimulus for plateaued exercises (pause reps, drop sets, different rep scheme)
- If it's been 10+ days since last session, don't increase weight

## Step 3: Write the plan

Save to `training/programs/next-session-YYYY-MM-DD.md`:

```
# Next Session Plan — YYYY-MM-DD

## Recovery Check
- Last night's sleep: X hrs (score Y)
- HRV: X ms (vs 7d avg Y)
- Body battery: X
- Days since last strength session: N
- Assessment: good / moderate / poor

## Session Goal
<one sentence on what to focus on>

## Warm-up
- Roeien: 8-10 min

## Main Work
- Exercise: sets x reps @ weight
  Rationale: <why this weight — reference last session>
...

## Cool-down / Extras
<optional: stretching, yoga if grounding goal is active>

## Notes
<what to watch for, when to back off>
```

Reference actual numbers from previous sessions for every weight recommendation.
