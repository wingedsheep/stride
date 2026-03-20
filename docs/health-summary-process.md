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

### Using rolling averages for trend detection

The dashboard uses rolling averages adapted to time window (3d for 2W, 7d for 1M, 14d for 3M, 30d for 1Y). Use the same approach when analyzing data for the summary:

```python
# Example: compute rolling averages to detect trends
def rolling_avg(values, window):
    return [sum(values[max(0,i-window+1):i+1]) / len(values[max(0,i-window+1):i+1]) for i in range(len(values))]
```

When reporting trends, use rolling averages to smooth noise and identify real direction changes:

- **Compare rolling averages across periods**, not raw daily values. "Your 7-day rolling HRV avg dropped from 62→54ms over the past month" is more useful than "HRV was 48 yesterday"
- **Identify inflection points**: where did a rolling average start trending up or down? Correlate with events (e.g. "HRV started declining around Feb 15, coinciding with the drop in training frequency")
- **Cross-metric correlations**: compare rolling averages across different metrics to find patterns (e.g. "7d rolling sleep avg and 7d rolling HRV move together — when sleep drops below 6hrs avg, HRV follows within 3-5 days")
- **Rate of change**: is a metric declining slowly or sharply? "Resting HR rose 1 bpm/month over 3 months" vs "resting HR jumped 3 bpm in the past week"

### Analysis tools

Use `scripts/analyze.py` to gather data. These tools compute rolling averages, trends, and correlations:

```bash
# Full summary — run this first when writing a health report
python scripts/analyze.py summary

# Individual areas with custom time windows
python scripts/analyze.py sleep 30
python scripts/analyze.py vitals 90
python scripts/analyze.py steps 365
python scripts/analyze.py activities 90
python scripts/analyze.py strength
python scripts/analyze.py correlations
```

The `summary` command outputs all data needed for a health report:
- Multi-window averages (7d/30d/90d/1y) with trend direction for each metric
- Rolling 7d averages with recent values
- Sleep detail: under 6h / over 7h counts, worst/best nights
- Strength progression with % change
- Cross-metric correlations: sleep↔HRV, sleep↔RHR, workout↔HRV, steps↔stress

The `correlations` command specifically looks for patterns between metrics to ground advice in data.

## Report Structure

Use this format in `health/summary-YYYY-MM-DD.md`:

1. **`## Overall`** — one-paragraph honest assessment
2. **`## Focus Areas`** — numbered `###` subsections, each with:
   - A `**Current:**` line — key metric snapshot (e.g. "5.6 hrs avg, score 65"). This is displayed prominently on the dashboard focus cards
   - Actual numbers and trend direction in bullet points
   - A `**Target:**` line — what to aim for
   - An `**Advice:**` line with concrete actionable suggestions
3. **`## Practical Advice`** — the most important section. Organized by timeframe:
   - `### This week — start here` — 2-3 immediate, concrete actions. Each one should explain *what* to do, *why* the data supports it, and *what effect* to expect
   - `### This month` — 2-3 medium-term actions with reasoning
   - `### Why this order matters` — explain the priority logic (e.g. sleep is the multiplier because the data shows HRV drops 15ms after bad nights)
   - Every piece of advice must be grounded in the actual data — reference specific numbers, dates, patterns
4. **`## Vitals Trends`** — resting HR, HRV, stress with period comparisons. Use rolling averages to describe trends, not raw daily values
5. **`## Blood Pressure`** — readings and monitoring advice
6. **`## Bloodwork Status`** — latest results, pending follow-ups
7. **`## What's Going Well`** — positive trends, things to maintain

## Guidelines

- Always show trend direction (improving/declining/stable) backed by data
- Use rolling averages to describe trends — they match what the user sees on the dashboard
- Identify cross-metric correlations (sleep ↔ HRV, activity ↔ resting HR, etc.)
- Practical advice is the core of the report — not an afterthought. Each recommendation should have reasoning that references actual data points
- The summary should read like a report from a sports medicine doctor
- The dashboard Health tab automatically picks up new `health/summary-*.md` files
