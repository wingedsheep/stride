---
name: plan-training
description: Create a multi-week or multi-month training plan. Use when the user asks "make a training plan", "plan my week", "plan my month", "plan until <event>", or similar.
user-invocable: true
argument-hint: "[duration or target date, e.g. '4 weeks' or 'until marathon in June']"
allowed-tools: Read, Bash, Grep, Glob, Agent
---

Create a multi-period training plan. Save to `training/programs/plan-YYYY-MM-DD-to-YYYY-MM-DD.md`.

Arguments: $ARGUMENTS

## Data to gather (use parallel subagents)

1. **Full training history**: Read ALL `training/log/` files. Run `source .venv/bin/activate && python scripts/analyze.py strength` and `python scripts/analyze.py activities 365`. Need: complete progression, and realistic training frequency (what they've actually achieved, not aspirational).
2. **Current fitness & recovery**: Run `source .venv/bin/activate && python scripts/analyze.py summary`. Where do things stand right now?
3. **Goals & context**: Read `profile/goals.md`, `profile/preferences.md`. Read latest `health/summary-*.md` for focus areas and advice.

## Output structure

```markdown
# Training Plan — Start → End

## Overview
<what this plan aims to achieve, current starting point>

## Weekly Template
| Day | Activity | Focus | Duration |
|-----|----------|-------|----------|

## Strength Targets
| Exercise | Current | Target | Strategy |
|----------|---------|--------|----------|

## Week-by-week
### Week 1: ...
### Week 2: ...

## Running / Cardio Plan
<gradual return if applicable — don't jump to long distances>

## Recovery & Grounding
<yoga, meditation, rest days>

## When to Adjust
<signs to modify the plan — overtraining, life gets busy, etc.>
```

## Guidance

Use your own reasoning, but keep these principles in mind:

- **Realistic frequency first** — base it on what the user has actually achieved recently, then step up gradually. Going from 1.5x/week to 2-2.5x is realistic. Going to 5x is not
- **Address all goals**: strength (primary), running (return), grounding (yoga/meditation) — don't just plan gym sessions
- **Progressive overload**: plan specific weight increases every 1-2 weeks for progressing lifts. For plateaued exercises, plan stimulus changes
- **Prioritize weaknesses**: more volume for lagging muscle groups (shoulder press, chest press)
- **Include deload**: for plans 4+ weeks, build in a lighter recovery week
- **Consider the health summary**: if sleep is the #1 issue, an aggressive training plan will make things worse — address the foundation first
- **Running return**: if the user is restarting, plan gradual increases (not 0 to 10k in week 1)
- Duration defaults to 4 weeks if not specified in $ARGUMENTS
