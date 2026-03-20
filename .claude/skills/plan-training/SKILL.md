---
name: plan-training
description: Create a multi-week or multi-month training plan. Use when the user asks "make a training plan", "plan my week", "plan my month", "plan until <event>", or similar.
user-invocable: true
argument-hint: "[duration or target date, e.g. '4 weeks' or 'until marathon in June']"
allowed-tools: Read, Bash, Grep, Glob, Agent
---

Create a multi-period training plan following the multi-week section in `docs/training-plan-process.md`.

Arguments: $ARGUMENTS

## Step 1: Gather data (use parallel subagents)

Launch these subagents in parallel:

**Agent 1 — Full training history**: Read ALL files in `training/log/`. Run `source .venv/bin/activate && python scripts/analyze.py strength` and `python scripts/analyze.py activities 365`. Summarize: complete exercise progression, training frequency per month over the past year, activity types and their frequency, realistic training frequency (what they've actually achieved, not aspirational).

**Agent 2 — Current fitness & recovery**: Run `source .venv/bin/activate && python scripts/analyze.py summary`. Focus on: current vitals baselines, sleep trends, step counts, overall fitness trajectory (improving or declining).

**Agent 3 — Goals & context**: Read `profile/goals.md`, `profile/preferences.md`, `profile/nutrition.md`. Read any existing plan in `training/programs/plan-*.md`. Read the latest `health/summary-*.md` for focus areas. Summarize: all goals (strength, running, grounding/yoga), preferences, health priorities, what the latest summary recommends.

## Step 2: Design the plan

Determine the plan duration from $ARGUMENTS (default: 4 weeks if not specified).

Planning principles:
- **Be realistic about frequency** — base it on recent actual frequency, then step up gradually (e.g. if doing 1.5x/week, plan for 2x, not 5x)
- **Address all goals**: strength (2x/week), running (gradual return), yoga/meditation (grounding goal)
- **Progressive overload**: plan weight increases every 1-2 weeks for progressing lifts
- **Prioritize weaknesses**: more volume for lagging lifts (shoulder press, chest press plateau)
- **Include deload**: if plan is 4+ weeks, include a lighter week
- **Consider the health summary**: if sleep is the top priority, don't plan 6 sessions/week

## Step 3: Write the plan

Save to `training/programs/plan-YYYY-MM-DD-to-YYYY-MM-DD.md`:

```
# Training Plan — Start → End

## Overview
<what this plan aims to achieve, based on current status>

## Weekly Template
| Day | Activity | Focus | Duration |
|-----|----------|-------|----------|
| ... | ...      | ...   | ...      |

## Strength Targets
| Exercise | Current | Target (end of plan) | Strategy |
|----------|---------|---------------------|----------|
| ...      | ...     | ...                 | ...      |

## Week-by-week

### Week 1: Re-establish routine
...

### Week 2: Build
...

## Running Plan
<gradual return plan if running is a goal>

## Recovery & Grounding
<yoga/meditation schedule, when to rest>

## Adjustments
<when to modify the plan — signs of overtraining, life getting busy, etc.>
```
