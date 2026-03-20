# Food Tracking & Recipe Suggestions

## Logging Food

When the user says "we had X for dinner" / "log dinner" / "ate X today":

Save to `food/YYYY-MM-DD.md`:

```markdown
# Food — YYYY-MM-DD

## Dinner
- <what was eaten>
- Notes: <optional: how it was, quick to make, etc>

## Lunch
- <if mentioned>

## Snacks
- <if mentioned>
```

If the file already exists for that day, append to it rather than overwriting.

### Guidelines
- Keep it simple — the user will often just say "we had pasta with salmon" and that's enough
- Don't ask for calorie counts unless the user brings it up
- Note if a meal was particularly quick/easy (useful for suggesting fallback meals later)
- Note if something was new or a variation on a regular meal

## Suggesting Recipes

When the user asks "what should I eat" / "suggest dinner" / "recipe ideas":

### Data to gather
1. **Preferences** — read `profile/nutrition.md` (likes, dislikes, restrictions)
2. **Recent meals** — read last 7-14 days of `food/` to avoid repetition
3. **Goals** — enough protein, 200g vegetables, not meat every day, fish preferred

### Suggestion logic
- **Avoid repeating** meals from the last 3-4 days
- **Respect restrictions**: slightly lactose intolerant, chickpeas cause gas
- **Prioritize fish** as protein source (user preference), followed by plant-based, then meat
- **Mediterranean or Asian** flavors preferred, but open to everything
- **Consider effort level**: if it's a weeknight and they seem tired (check body battery / journal), suggest something quick. Always have a quick option available
- **Fallback meal**: wrap + Italian veggies + canned tuna (don't suggest this, but reference it if they want something very quick)

### Suggestion format

Give 2-3 options with varying effort levels:

```
**Quick (15 min):** <recipe name>
<brief description, 2-3 sentences>

**Medium (30 min):** <recipe name>
<brief description>

**Weekend project (45+ min):** <recipe name>
<brief description>
```

Each suggestion should:
- Include a protein source
- Hit the ~200g vegetable target
- Be practical with common ingredients
- Note if dairy-free or can be made dairy-free
- Be a real, cookable recipe — not a vague concept

### Over time
As the food log grows, identify patterns:
- Meals they make often (favorites to rotate back to)
- Gaps in variety (e.g. always pasta, rarely rice/grains)
- Protein distribution (are they hitting enough protein on non-meat days?)
- Vegetable variety
