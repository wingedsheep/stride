# Training Plan Process

## Next Session Plan

When the user asks "plan my next workout" / "what should I do next" / "next session":

### Data to gather
1. **Recent training logs** — read the last 3-5 entries from `training/log/` to see what was done, weights, notes
2. **Garmin activity history** — check last 2 weeks of `garmin/workouts/` for all activity (not just strength)
3. **Recovery status** — read today's (or most recent) vitals: HRV, resting HR, body battery, sleep score
4. **Goals** — read `profile/goals.md`
5. **Current progression** — run `python scripts/analyze.py strength` to see where each lift is trending
6. **Days since last session** — calculate from the most recent training log date

### Plan structure

Save to `training/programs/next-session-YYYY-MM-DD.md`:

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
- All goals from `profile/goals.md` (strength, running, yoga/meditation)

### Plan structure

Save to `training/programs/plan-YYYY-MM-DD-to-YYYY-MM-DD.md`:

```markdown
# Training Plan — Start Date → End Date

## Goals for this period
<specific, measurable targets based on current data>

## Weekly template
| Day | Activity | Focus |
|-----|----------|-------|
| Mon | Strength | Upper body |
| Wed | Strength | Lower body |
| Fri | Running  | Easy 30 min |
| Sat | Yoga     | Flexibility + mindfulness |

## Week-by-week progression
### Week 1: ...
### Week 2: ...

## Key targets
- Leg press: current 115kg → target Xkg
- Chest press: break 40kg plateau
- Running: build to X km/week
- Steps: maintain 8k+/day

## Deload / rest
<when to back off, signs to watch for>
```

### Planning principles
- **Frequency first**: aim for the frequency target from goals before adding volume
- **Progressive overload**: plan weight increases every 1-2 weeks for exercises that are progressing
- **Address weaknesses**: allocate more volume to lagging muscle groups (shoulder press, chest press)
- **Include recovery goals**: yoga/meditation sessions count toward the grounding goal
- **Be realistic**: base frequency on what the user has actually achieved recently, not aspirational targets. If they've been training 1.5x/week, plan for 2x, not 4x
- **Running**: follow a gradual return plan, don't jump to long distances
