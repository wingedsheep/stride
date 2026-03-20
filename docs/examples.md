# Examples

Default formats for each content type. These are the baseline — if the user asks for more or less detail, adapt accordingly. The goal is consistency when no specific preference is given.

---

## Health Summary

```markdown
# Health Summary — YYYY-MM-DD

## Overall

One paragraph, brutally honest. Name what's going well and what isn't. Identify root causes directly — don't hide behind vague language.

## Focus Areas

### 1. Category — short assessment
- **Current: key metric snapshot with numbers**
- Trend data: compare 7d/30d/90d/1y
- Context that explains the numbers
- **Target: concrete, measurable goal**
- **Advice: specific, actionable recommendation**
- **Commitment: one checkable action for next time**

### 2. Another category — short assessment
- (same structure)

## The honest picture

2-3 paragraphs. Connect the categories. Name root causes as choices. Be honest about what's going well and what isn't. End with what would have the biggest impact.

## Vitals

| Metric | 7d | 30d | 90d | 1y | Trend |
|---|---|---|---|---|---|
| Resting HR | X bpm | X | X | X | Direction |
| HRV | X ms | X | X | X | Direction |

## Medical

Only if there's something to report. Few bullets.

## What's going well

Short list. No padding.

## Commitments

1. **Category**: specific action
2. **Category**: specific action
```

**Key traits:** honest, personal, data-backed. Every focus area has a Commitment. "The honest picture" is the heart — a narrative, not a list.

---

## Training Plan

```markdown
# Plan — start date t/m end date

> 2-3 sentences context: where things stand, what caused it, what this plan focuses on.

## Top priorities

1. **Priority one** — current number → target. One sentence on the action.
2. **Priority two** — same format.
3. **Priority three** — same format.

## Training

| Day | What |
|---|---|
| Day 1 | Session type — key exercises |
| Day 2 | Session type — key exercises |
| Day 3 | Cardio option |

One sentence on overall strategy.

## The rest

Few bullets on anything else relevant (nutrition, stress, medical). Only if there's something to say.

## Baseline → goal

| | Now | Target |
|---|---|---|
| Metric 1 | current | goal |
| Metric 2 | current | goal |
| Metric 3 | current | goal |

**One sentence summary.**
```

**Key traits:** fits on one screen, ~50 lines max, blockquote with context, numbered priorities, simple table, no week-by-week breakdown by default.

---

## Next Session Plan

```markdown
# Next Session — YYYY-MM-DD

## Recovery check
Sleep: X hrs (score Y). HRV: X ms. Body battery: X. Days since last session: N. → Assessment.

## Plan: Session type

| Exercise | Plan | Why |
|---|---|---|
| Warm-up | Duration | |
| Exercise 1 | sets x reps @ weight | Rationale |
| Exercise 2 | sets x reps @ weight | Rationale |

## Watch for
One or two notes on what to pay attention to.
```

**Key traits:** recovery check as context, simple table, brief note on what to watch.

---

## Food Log

```markdown
# Food — YYYY-MM-DD

## Dinner
- Description of what was eaten
- ![dinner](/photos/food/YYYY-MM-DD-dinner.jpg)

## Lunch
- Description

## Snacks
- Description
```

**Key traits:** simple, specific enough to be useful later, photos optional with `![label](/photos/food/YYYY-MM-DD-meal.jpg)`.

---

## Journal

```markdown
# YYYY-MM-DD — Day of week

## What I did
- Activities, events, notable things

## Notes
- Context useful for later analysis
```

**Key traits:** short, factual, context that's useful for cross-referencing with health data later.
