---
name: health-summary
description: Generate a comprehensive health summary report with trends, correlations, and actionable advice. Use when the user asks "how am I doing", "health summary", "analyze my health", or similar.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

Generate a health summary report. Save to `data/health/summaries/summary-YYYY-MM-DD.md`.

Follow `docs/health-summary-process.md` for structure, tone, and formatting conventions (the dashboard parses `**Current:**`, `**Target:**`, `**Advice:**` lines in Focus Areas).

## Data gathering

Use parallel subagents to gather context efficiently:

1. **Metrics & trends**: Run `source .venv/bin/activate && python scripts/analyze.py summary` — gives rolling averages, multi-window comparisons (7d/30d/90d/1y), trend directions, and cross-metric correlations.
2. **Training context**: Read all `data/training/log/` files and any active plans in `data/training/programs/`.
3. **Recent recovery & journal**: Read last 14 days of `data/garmin/sleep/`, `data/garmin/vitals/`, and any `data/journal/` entries.
4. **Bloodwork & profile**: Read `data/measurements/bloodwork/`, `data/profile/goals.md`, `data/profile/nutrition.md`, and the most recent `data/health/summaries/summary-*.md` for comparison.
5. **Weight**: Read `data/measurements/weight.json` for body composition trend.
6. **Previous commitments**: Check the last summary's `## Commitments` section — review which were kept and which weren't.

## Analysis

With the gathered data, identify:
- **Trend direction** for each metric — improving, declining, or stable, with specific numbers
- **Cross-metric correlations** — e.g. sleep duration vs next-day HRV, workout days vs recovery
- **Root causes** — don't just describe symptoms, name the behaviors driving them
- **What changed** since the last health summary — better, worse, or stalled?
- **Previous commitments** — were they kept? Be honest about it.
- **The single highest-leverage intervention** right now

## Writing the report

Be direct, honest, and personal. Write like a coach who knows the person — reference their journal, habits, life context (work, side projects, social plans). Every claim backed by a number.

Each focus area must end with a **Commitment:** — one specific, checkable action. These get collected at the bottom and reviewed next time.

The dashboard Reports tab automatically picks up the new file. Also consider running `/update-focus` if priorities have changed.
