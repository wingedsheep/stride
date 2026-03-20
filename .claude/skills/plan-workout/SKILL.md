---
name: plan-workout
description: Plan the next training session based on recent training, recovery status, and goals. Use when the user asks "plan my next workout", "what should I train", "next session", or similar.
user-invocable: true
allowed-tools: Read, Bash, Grep, Glob, Agent
---

Plan the next training session. Save to `training/programs/next-session-YYYY-MM-DD.md`.

## Data to gather (use parallel subagents)

1. **Training history**: Read ALL files in `training/log/`. Run `source .venv/bin/activate && python scripts/analyze.py strength`. Need the full picture — every exercise, every weight, every note about how it felt.
2. **Recovery status**: Read recent `garmin/sleep/`, `garmin/vitals/`, and `garmin/workouts/` (last 2 weeks). How recovered is the user? What other activities have they done recently?
3. **Goals & plans**: Read `profile/goals.md` and any active plan in `training/programs/plan-*.md`.

## Output structure

```markdown
# Next Session Plan — YYYY-MM-DD

## Recovery Check
<sleep, HRV, body battery, days since last session — quick assessment>

## Session Goal
<one sentence: what to focus on and why>

## Warm-up
<e.g. roeien 8-10 min>

## Main Work
<exercises with sets x reps @ weight, each with brief rationale referencing last session>

## Notes
<anything to watch for, when to back off, optional cool-down/stretching>
```

## Guidance

Reference actual numbers from previous sessions for every weight recommendation. Use your own reasoning, but keep these principles in mind:

**Recovery-based intensity:**
- Poor recovery (body battery < 30, HRV well below avg, sleep < 5hrs): reduce weights ~10%, fewer sets, focus on form and mobility
- Moderate recovery: maintain current weights and volume
- Good recovery (body battery > 60, HRV above avg, sleep > 7hrs): push — add weight or volume

**Progression logic:**
- Last session hit all prescribed reps cleanly → increase weight (2.5kg machines, 1kg dumbbells)
- Last session failed reps on the last set → repeat same weight
- Exercise plateaued for 3+ sessions → change stimulus (pause reps, drop sets, different rep range, more volume)
- 10+ days since last session → don't increase, focus on re-establishing the movement

**Other considerations:**
- Avoid training the same muscle groups within 48 hours
- Consider all goals — not just strength. If the user hasn't done yoga/running in a while and those are goals, mention it
- Notes from previous sessions matter — "zwakke dag" or "net gehaald" are signals about readiness
