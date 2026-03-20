---
name: health-summary
description: Generate a comprehensive health summary report with trends, correlations, and actionable advice. Use when the user asks "how am I doing", "health summary", "analyze my health", or similar.
user-invocable: true
allowed-tools: Read, Bash, Grep, Glob, Agent
---

Generate a health summary report following `docs/health-summary-process.md`.

## Step 1: Gather data (use parallel subagents)

Launch these subagents in parallel to gather data:

**Agent 1 — Metrics & Trends**: Run `source .venv/bin/activate && python scripts/analyze.py summary` and return the full output.

**Agent 2 — Recent training context**: Read ALL files in `training/log/` from the last 3 months. Read `training/programs/` for any active plans. Summarize: what exercises, what weights, frequency, any notes about weak days or PRs.

**Agent 3 — Recent recovery & journal context**: Read the last 14 days of `garmin/sleep/`, `garmin/vitals/`, and any `journal/` entries. Summarize: sleep patterns, worst/best nights, HRV trajectory, any journal entries noting stress or notable events.

**Agent 4 — Bloodwork & profile**: Read all files in `health/bloodwork-*.md`, `profile/goals.md`, `profile/nutrition.md`. Read the most recent `health/summary-*.md` for comparison. Summarize: outstanding health flags, goals, what changed since last summary.

## Step 2: Analyze

Using all subagent outputs, identify:
- Trend direction for each metric (improving / declining / stable) with specific numbers
- Cross-metric correlations (the analyze.py correlations output helps here)
- Progress toward goals
- What changed since the last summary
- The single highest-leverage intervention right now

## Step 3: Write the report

Save to `health/summary-YYYY-MM-DD.md` (today's date). Follow the structure in `docs/health-summary-process.md`:

1. `## Overall` — one paragraph
2. `## Focus Areas` — numbered sections with `**Current:**`, `**Target:**`, `**Advice:**`
3. `## Practical Advice` — This week / This month / Why this order. Every recommendation must reference specific data
4. `## Vitals Trends` — with rolling average comparisons
5. `## Blood Pressure`
6. `## Bloodwork Status`
7. `## What's Going Well`

The dashboard Health tab automatically picks up the new file.
