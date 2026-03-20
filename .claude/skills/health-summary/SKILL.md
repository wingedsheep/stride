---
name: health-summary
description: Generate a comprehensive health summary report with trends, correlations, and actionable advice. Use when the user asks "how am I doing", "health summary", "analyze my health", or similar.
user-invocable: true
allowed-tools: Read, Bash, Grep, Glob, Agent
---

Generate a health summary report. Save to `health/summary-YYYY-MM-DD.md`.

See `docs/health-summary-process.md` for report structure and formatting conventions (the dashboard parses `**Current:**`, `**Target:**`, `**Advice:**` lines in Focus Areas).

## Data gathering

Use parallel subagents to gather context efficiently:

1. **Metrics & trends**: Run `source .venv/bin/activate && python scripts/analyze.py summary` — gives rolling averages, multi-window comparisons (7d/30d/90d/1y), trend directions, and cross-metric correlations.
2. **Training context**: Read all `training/log/` files and any active plans in `training/programs/`.
3. **Recent recovery & journal**: Read last 14 days of `garmin/sleep/`, `garmin/vitals/`, and any `journal/` entries.
4. **Bloodwork & profile**: Read `health/bloodwork-*.md`, `profile/goals.md`, `profile/nutrition.md`, and the most recent `health/summary-*.md` for comparison.

## Analysis

With the gathered data, identify:
- **Trend direction** for each metric — improving, declining, or stable, with specific numbers
- **Cross-metric correlations** — e.g. sleep duration vs next-day HRV, workout days vs recovery, steps vs stress
- **Progress toward goals** — how do current numbers compare to targets?
- **What changed** since the last health summary — better, worse, or stalled?
- **The single highest-leverage intervention** right now — what one change would have the biggest cascade effect?

## Writing the report

Use your own judgement on what matters most. The analysis data gives you the numbers — your job is to find the story in them and give practical, data-grounded advice.

Practical advice is the core of the report. Each recommendation should explain *what* to do, *why* the data supports it, and *what effect* to expect. Organize by timeframe: this week (immediate actions) → this month (medium-term) → why this order matters (priority logic).

The dashboard Health tab automatically picks up the new file.
