# Health Summary Process

When a health summary is requested, produce a detailed report saved to `data/health/summaries/summary-YYYY-MM-DD.md`.

## Data Gathering

Pull actual numbers across multiple time windows (7d, 30d, 90d, 1y) for:

- **Sleep**: avg duration, score, deep/REM hours, nights under 6hrs
- **Vitals**: resting HR, HRV (nightly), avg stress
- **Steps**: daily avg, days at 10k goal
- **Activity frequency**: workouts per month, compare to previous year
- **Strength**: current weights vs previous, % of average for age/weight
- **Bloodwork**: latest values and any flags from `data/measurements/bloodwork/`
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

Use this format in `data/health/summaries/summary-YYYY-MM-DD.md`:

1. **`## Overall`** — one paragraph, brutally honest. Say what's going well and what isn't. Name root causes directly ("you're averaging 5.7 hours because you're coding Argentum until 2 AM"), don't hide behind passive language.

2. **`## Focus Areas`** — numbered `###` subsections. Each one should:
   - Have a `**Current:**` line — key metric snapshot (displayed on dashboard focus cards)
   - Include actual numbers and trend direction, always compared to baseline (90d/1y)
   - Have a `**Target:**` line — concrete, measurable
   - Have an `**Advice:**` line — specific, actionable
   - End with a **`Commitment:`** line — one concrete, checkable thing. Not "sleep more" but "Screens off at 23:00 every weeknight." This is the thing that gets checked in the next summary.

3. **`## The honest picture`** — this is the core. Write it like you're talking to a friend, not writing a medical report. Connect the dots between categories. Explain *why* things are the way they are, name the trade-offs ("Argentum is fun but it's costing you 1.5 hours of sleep per night"), and be clear about what matters most and what's noise. Include:
   - What's actually going wrong and why
   - What's going well (don't skip this — but don't use it to soften bad news)
   - The one thing that would have the biggest cascade effect if fixed
   - How things compare to the last summary — better, worse, stalled?

4. **`## Vitals`** — resting HR, HRV, stress, weight, body fat. Use rolling averages. Always compare to 1y baseline.

5. **`## Medical`** — blood pressure, bloodwork, anything pending. Only if relevant.

6. **`## Commitments`** — collect all commitments from focus areas into one list. These get reviewed in the next summary.

## Tone

- **Direct.** "Your sleep is bad" not "your sleep could be improved."
- **Data-backed.** Every statement references a specific number or trend.
- **Opinionated.** Say what you actually think, not a neutral list of observations.
- **Personal.** Reference journal context, known habits, life circumstances (work deadlines, side projects, weekend plans). The report should feel like it was written by someone who knows the person.
- **Honest about trade-offs.** If the user is making a choice that hurts their health (late coding sessions), name it as a choice, don't pretend it's a mystery.

## What NOT to do

- Don't write a medical report. Write like a coach who has all the data.
- Don't list metrics without interpretation. "HRV 57ms" means nothing. "HRV 57ms, down from 61 a year ago, drops to 48 after bad sleep nights" tells a story.
- Don't give generic advice. "Exercise more" is useless. "Train Tuesday and Thursday — your January data proves you can do 10 sessions/month when you schedule them" is useful.
- Don't sugarcoat. If the trend is bad, say so. The user explicitly wants honesty.

The dashboard Reports tab automatically picks up new `data/health/summaries/summary-*.md` files.

See `docs/examples.md` for a reference example of the expected format and tone.
