---
name: suggest-dinner
description: Suggest dinner recipes based on preferences, recent meals, and dietary goals. Use when the user asks "what should I eat", "suggest dinner", "recipe ideas", "what should I cook", or similar.
user-invocable: true
argument-hint: "[optional: constraints like 'quick', 'fish', 'no pasta']"
allowed-tools: Read, Glob, Agent
---

Suggest dinner ideas. See `docs/food-tracking-process.md` for full dietary context.

Arguments: $ARGUMENTS

## Data to gather

- Read `data/profile/nutrition.md` for preferences and restrictions
- Read recent `data/food/` entries (last 7-14 days) to avoid repetition and spot patterns
- Optionally check today's vitals/journal for energy level context

## Key constraints

- Slightly lactose intolerant, chickpeas cause gas
- Prefers fish over meat, wants to reduce meat frequency
- Mediterranean and Asian cuisines preferred, but open to everything
- Aims for ~200g vegetables per meal
- Fallback meal: wrap + Italian veggies + canned tuna (don't suggest this unless they ask for something very quick)

## Suggestions

Give 2-3 options at different effort levels (quick ~15min / medium ~30min / weekend ~45min+). Each should be a real, specific, cookable recipe with enough detail to actually make it — not "some kind of stir fry."

Vary the suggestions: different cuisines, different proteins, different base (rice/noodles/bread/potato). Don't repeat what was eaten in the last few days.

If $ARGUMENTS specifies constraints (like "quick" or "fish"), respect those.

## Pattern recognition (as food log grows)

Over time, use the food log to identify:
- **Favorites** — meals that appear often, good to rotate back to
- **Variety gaps** — e.g. always pasta, rarely rice/grains; always salmon, never white fish
- **Protein balance** — are non-meat days getting enough protein?
- **Vegetable variety** — rotating through different types, not just the same bag of Italian veggies
