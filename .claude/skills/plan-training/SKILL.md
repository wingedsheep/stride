---
name: plan-training
description: Create a multi-week or multi-month training plan. Use when the user asks "make a training plan", "plan my week", "plan my month", "plan until <event>", or similar.
user-invocable: true
argument-hint: "[duration or target date, e.g. '4 weeks' or 'until marathon in June']"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

Create a holistic plan. Save to `training/programs/plan-YYYY-MM-DD-to-YYYY-MM-DD.md` (automatically visible on dashboard Plans tab).

Arguments: $ARGUMENTS

## Data to gather (use parallel subagents)

1. **Metrics & trends**: Run `source .venv/bin/activate && python scripts/analyze.py summary`. Where do things stand?
2. **Training history**: Read recent `training/log/` files. Run `python scripts/analyze.py strength` and `python scripts/analyze.py activities 365`.
3. **Goals & context**: Read `profile/goals.md`, `profile/preferences.md`, `profile/nutrition.md`. Read latest `health/summary-*.md`. Read recent `journal/` entries for life context.
4. **Current plan**: Read any existing plans in `training/programs/` to understand what was planned before.

## Writing the plan

**Default: short and to the point.** Unless the user asks for more detail, a plan should fit on one screen. See `docs/examples.md` for the default format.

Default structure:
1. **Opening quote** — one paragraph context
2. **The 3 things that matter** — max 3-4 priorities, one sentence each
3. **Training schedule** — one simple table
4. **Brief notes on anything else relevant** — few bullets, only if needed
5. **Baseline → goal table** — 5-6 metrics max
6. **One-sentence summary**

If the user asks for a detailed plan (week-by-week, specific exercises, periodization), give them that. These are defaults, not limits. Match the level of detail to what's requested.

## Principles

- **Holistic** — this isn't just a training plan. Consider sleep, stress, mental health, life context. Sometimes "do less, sleep more" is the right plan.
- **Honest** — if the user trains 1.4x/week, don't plan for 5x. Step up gradually.
- **Opinionated** — say what matters most and why. Don't present everything as equally important.
- **Scannable** — someone should be able to glance at this and know what to do this week.
- Duration defaults to 4 weeks if not specified.
