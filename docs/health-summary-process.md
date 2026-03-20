# Health Summary Process

When a health summary is requested, produce a detailed report saved to `health/summary-YYYY-MM-DD.md`.

## Data Gathering

Pull actual numbers across multiple time windows (7d, 30d, 90d, 1y) for:

- **Sleep**: avg duration, score, deep/REM hours, nights under 6hrs
- **Vitals**: resting HR, HRV (nightly), avg stress
- **Steps**: daily avg, days at 10k goal
- **Activity frequency**: workouts per month, compare to previous year
- **Strength**: current weights vs previous, % of average for age/weight
- **Bloodwork**: latest values and any flags from `health/bloodwork-*.md`
- **Blood pressure**: readings from bloodwork files

Always compare current (7d/30d) to longer baselines (90d/1y) to identify trends — don't just report snapshots.

## Report Structure

Use this format in `health/summary-YYYY-MM-DD.md`:

1. **`## Overall`** — one-paragraph honest assessment
2. **`## Focus Areas`** — numbered `###` subsections, each with:
   - A `**Current:**` line — key metric snapshot (e.g. "5.6 hrs avg, score 65"). This is displayed prominently on the dashboard focus cards
   - Actual numbers and trend direction in bullet points
   - A `**Target:**` line — what to aim for
   - An `**Advice:**` line with concrete actionable suggestions
3. **`## Vitals Trends`** — resting HR, HRV, stress with period comparisons
4. **`## Blood Pressure`** — readings and monitoring advice
5. **`## Bloodwork Status`** — latest results, pending follow-ups
6. **`## What's Going Well`** — positive trends, things to maintain

## Guidelines

- Always show trend direction (improving/declining/stable) backed by data
- Give specific, practical advice (not "exercise more" but "add a 20-min walk after lunch")
- The summary should read like a report from a sports medicine doctor
- The dashboard Health tab automatically picks up new `health/summary-*.md` files
