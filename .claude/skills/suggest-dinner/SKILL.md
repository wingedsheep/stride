---
name: suggest-dinner
description: Suggest dinner recipes based on preferences, recent meals, and dietary goals. Use when the user asks "what should I eat", "suggest dinner", "recipe ideas", "what should I cook", or similar.
user-invocable: true
argument-hint: "[optional: constraints like 'quick', 'fish', 'no pasta']"
allowed-tools: Read, Glob, Agent
---

Suggest dinner ideas following `docs/food-tracking-process.md`.

Arguments: $ARGUMENTS

## Step 1: Gather context (use a subagent)

Launch a subagent to gather:
- Read `profile/nutrition.md` for dietary preferences, restrictions, targets
- Read all files in `food/` from the last 14 days to see recent meals
- Read today's `journal/YYYY-MM-DD.md` if it exists (might mention mood/energy)
- Read today's `garmin/vitals/YYYY-MM-DD.md` for body battery (suggests effort level)
- Summarize: what was eaten recently, any patterns (too much pasta? not enough fish?), energy level today

## Step 2: Suggest recipes

Based on the context and any $ARGUMENTS constraints:

### Rules
- **Don't repeat** meals from the last 3-4 days
- **Respect restrictions**: slightly lactose intolerant, chickpeas cause gas
- **Prioritize fish** as protein source, then plant-based, then meat (user wants to reduce meat)
- **Mediterranean or Asian** flavors preferred
- **~200g vegetables** per serving
- If body battery is low or it's a weeknight, lean toward quick options
- If $ARGUMENTS mentions "quick" — only suggest 15-min meals

### Output format

Give 2-3 options:

**Quick (15 min):** Recipe name
Brief description. Key ingredients. Why this works tonight.

**Medium (30 min):** Recipe name
Brief description. Key ingredients.

**Weekend/relaxed (45+ min):** Recipe name
Brief description. Key ingredients.

Each recipe should:
- Be a real, specific, cookable recipe (not "some kind of stir fry")
- Include enough detail to actually cook it (key ingredients, rough method)
- Note protein source and approximate vegetable content
- Flag if dairy-free or can be easily adapted
- Be varied — different cuisines, different proteins, different base (rice/noodles/bread/potato)
