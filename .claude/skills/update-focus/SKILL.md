---
name: update-focus
description: Update the current focus points shown on the dashboard Overview page. Use when the user says "update focus", "change focus points", "my priorities are now X", or when creating a new health summary or plan that changes priorities.
user-invocable: true
argument-hint: "[new focus points or context for updating them]"
allowed-tools: Read, Write, Edit, Glob, Bash, Grep
---

Update the focus points displayed on the dashboard Overview page.

Focus points are stored in `data/health/focus.json` as a JSON array.

User input: $ARGUMENTS

## Process

1. Read the current `data/health/focus.json`
2. If the user specifies new focus points, update them directly
3. If the user asks to derive focus points from recent data:
   - Read the latest health summary in `data/health/summaries/`
   - Read the latest plan in `data/training/programs/`
   - Read recent vitals and sleep trends
   - Identify the 3-5 most important current priorities
4. Write the updated `data/health/focus.json`

## Format

```json
[
  {
    "title": "Short label",
    "target": "Brief target description"
  }
]
```

## Guidelines
- Keep it to 3-5 focus points — these should be scannable at a glance
- Titles should be 1-2 words max
- Targets should be one short sentence — concrete and measurable where possible
- Focus points should reflect what's most important RIGHT NOW, not long-term aspirations
- When a health summary or plan is created, consider whether focus points need updating
