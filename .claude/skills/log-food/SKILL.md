---
name: log-food
description: Log what was eaten today. Use when the user says "we had X for dinner", "ate X", "log food", or mentions what they ate.
user-invocable: true
argument-hint: "[what was eaten, e.g. 'salmon teriyaki with rice and broccoli']"
allowed-tools: Read, Write, Edit, Glob
---

Log food following `docs/food-tracking-process.md`.

What was eaten: $ARGUMENTS

## Process

1. Check if `food/YYYY-MM-DD.md` (today's date) already exists
2. If it exists, read it and **append** the new entry under the appropriate meal section
3. If it doesn't exist, create it

## File format

```markdown
# Food — YYYY-MM-DD

## Dinner
- <what was eaten>

## Lunch
- <if mentioned>

## Snacks
- <if mentioned>
```

## Guidelines
- Keep entries concise but specific enough to be useful later ("salmon teriyaki with rice and steamed broccoli" not just "fish")
- If the user doesn't specify the meal type, assume dinner (most common)
- Don't ask for calorie counts — keep it lightweight
- If something sounds particularly quick or easy, note it (useful for future suggestions)
- If it's a new recipe they haven't had before, note that too
