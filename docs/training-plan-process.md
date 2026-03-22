# Training Plan Process

## Next Session Plan

When the user asks "plan my next workout" / "what should I do next" / "next session":

### Data to gather
1. **Recent training logs** — read the last 3-5 entries from `data/training/log/` to see what was done, weights, notes
2. **Garmin activity history** — check last 2 weeks of `data/garmin/workouts/` for all activity (not just strength)
3. **Recovery status** — read today's (or most recent) vitals: HRV, resting HR, body battery, sleep score
4. **Goals** — read `data/profile/goals.md`
5. **Current progression** — run `python scripts/analyze.py strength` to see where each lift is trending
6. **Days since last session** — calculate from the most recent training log date

### Plan structure

Save to `data/training/programs/next-session-YYYY-MM-DD.md` (automatically visible on the dashboard Plans tab):

```markdown
# Next Session Plan — YYYY-MM-DD

## Recovery Check
- Last night's sleep: X hrs (score Y)
- HRV: X ms (7d avg: Y)
- Body battery: X
- Days since last session: N
- Recovery assessment: good / moderate / poor

## Session Goal
<what to focus on based on recovery and progression>

## Warm-up
- Roeien: 8-10 min

## Main Work
- Exercise: sets x reps @ weight (rationale)
...

## Notes
<why this plan, what to watch for, when to back off>
```

### Planning logic

- **Recovery is poor** (body battery < 30, HRV < 50, sleep < 5hrs): light session, reduce weights 10%, focus on form
- **Recovery is moderate**: maintain current weights, aim for same reps
- **Recovery is good** (body battery > 60, HRV > 60, sleep > 7hrs): push — add weight or volume
- **Plateaued exercise**: change stimulus (pause reps, drop sets, different rep range)
- **Days since last session > 10**: don't increase weight, focus on re-establishing the movement
- **Muscles recently worked** (< 48hrs): target different muscle groups

### Progression rules
- If last session hit all prescribed reps cleanly → increase weight by smallest increment (2.5kg machines, 1kg dumbbells)
- If last session failed reps on last set → repeat same weight
- If exercise has plateaued for 3+ sessions → change rep scheme or add intensity technique
- Always reference the actual numbers from previous sessions

## Multi-Week / Multi-Month Plan

When the user asks "make a plan for next week/month" / "plan until <event>":

### Additional data
- Count weeks until target date (if event-based)
- Activity frequency from `python scripts/analyze.py activities`
- All goals from `data/profile/goals.md` (strength, running, yoga/meditation)
- **Recent activity types** — check `data/garmin/workouts/` to see what the user is already doing. Don't prescribe ramp-ups for things they already do.
- Journal entries for life context (work pressure, social plans, mood)

### Plan structure

Save to `data/training/programs/plan-YYYY-MM-DD-to-YYYY-MM-DD.md` (automatically visible on the dashboard Plans tab).

**Default: keep it short.** A plan should fit on one screen unless the user asks for more detail. If they want week-by-week breakdowns, periodization, or specific exercises — do that. These are defaults, not rules. Default structure:

1. Opening context (blockquote, 2-3 sentences)
2. "Three things that matter" — the actual plan, max 4 numbered priorities
3. Training schedule — one simple table
4. Brief notes on anything else relevant (few bullets, only if needed)
5. Baseline → goal table (5-6 metrics max)
6. One-sentence summary

**By default, skip:** week-by-week breakdowns, exact weights/sets/reps (that's next-session plans), sections with nothing to say, info the user already knows. But if the user asks for detail, provide it.

### Planning principles
- **Holistic**: consider sleep, stress, mental health, not just training. Sometimes "sleep more, train less" is the right plan.
- **Realistic**: base on actual recent frequency, not aspirational. 1.5x → 2-3x, not 5x.
- **Opinionated**: say what matters most. Don't present everything as equal.
- **Running**: check recent data first. If already running, don't prescribe a beginner ramp-up.

See `docs/examples.md` for reference examples of all content types.
