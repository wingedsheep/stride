#!/usr/bin/env python3
"""
Health data analysis tools for Stride.

Usage:
    python scripts/analyze.py summary          # Full data summary for health report
    python scripts/analyze.py sleep [days]     # Sleep analysis (default: 30)
    python scripts/analyze.py vitals [days]    # Vitals analysis (default: 30)
    python scripts/analyze.py steps [days]     # Steps analysis (default: 30)
    python scripts/analyze.py activities [days] # Activity analysis (default: 90)
    python scripts/analyze.py strength         # Strength progression
    python scripts/analyze.py correlations     # Cross-metric correlations
"""

import json
import os
import sys
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


# ── Parsing helpers ──────────────────────────────────────────────────────────


def parse_md_value(content, label):
    for line in content.split("\n"):
        if label in line:
            try:
                return float(line.split(":")[1].strip().split()[0])
            except (ValueError, IndexError):
                pass
    return None


def parse_md_string(content, label):
    for line in content.split("\n"):
        if label in line:
            parts = line.split(":")
            if len(parts) > 1:
                return parts[1].strip()
    return None


def read_dir(subdir, days=None):
    """Read all .md files from a garmin subdirectory."""
    directory = ROOT / "garmin" / subdir
    if not directory.exists():
        return []

    files = sorted(f for f in directory.iterdir() if f.suffix == ".md" and f.stem[:4].isdigit())

    if days:
        cutoff = (date.today() - timedelta(days=days)).isoformat()
        files = [f for f in files if f.stem >= cutoff]

    return [(f.stem, f.read_text()) for f in files]


def rolling_avg(values, window):
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        s = [v for v in values[start : i + 1] if v is not None]
        result.append(round(sum(s) / len(s), 1) if s else None)
    return result


def trend_direction(values, window=7):
    """Determine if a rolling average is trending up, down, or stable."""
    rolled = rolling_avg(values, window)
    valid = [v for v in rolled if v is not None]
    if len(valid) < window * 2:
        return "insufficient data"
    first_half = sum(valid[: len(valid) // 2]) / (len(valid) // 2)
    second_half = sum(valid[len(valid) // 2 :]) / (len(valid) - len(valid) // 2)
    pct = (second_half - first_half) / first_half * 100 if first_half else 0
    if pct > 3:
        return f"rising (+{pct:.1f}%)"
    elif pct < -3:
        return f"falling ({pct:.1f}%)"
    else:
        return f"stable ({pct:+.1f}%)"


# ── Analysis functions ───────────────────────────────────────────────────────


def gather_metric(subdir, label, days_list=[7, 30, 90, 365]):
    """Gather a metric across multiple time windows."""
    results = {}
    for n in days_list:
        entries = read_dir(subdir, n)
        vals = [parse_md_value(c, label) for _, c in entries]
        vals = [v for v in vals if v is not None]
        if vals:
            results[f"{n}d"] = {
                "avg": round(sum(vals) / len(vals), 1),
                "min": round(min(vals), 1),
                "max": round(max(vals), 1),
                "count": len(vals),
                "trend": trend_direction(vals),
            }
    return results


def analyze_sleep(days=30):
    entries = read_dir("sleep", days)
    data = []
    for dt, content in entries:
        data.append({
            "date": dt,
            "total": parse_md_value(content, "Total sleep"),
            "score": parse_md_value(content, "Sleep score"),
            "deep": parse_md_value(content, "Deep"),
            "light": parse_md_value(content, "Light"),
            "rem": parse_md_value(content, "REM"),
            "awake": parse_md_value(content, "Awake"),
        })

    valid = [d for d in data if d["total"] is not None]
    if not valid:
        return {"error": "No sleep data"}

    totals = [d["total"] for d in valid]
    scores = [d["score"] for d in valid if d["score"] is not None]
    deeps = [d["deep"] for d in valid if d["deep"] is not None]
    rems = [d["rem"] for d in valid if d["rem"] is not None]

    under_6 = sum(1 for t in totals if t < 6)
    over_7 = sum(1 for t in totals if t >= 7)

    rolling_7d = rolling_avg(totals, 7)

    return {
        "period": f"{days}d",
        "days": len(valid),
        "avg_duration": round(sum(totals) / len(totals), 1),
        "avg_score": round(sum(scores) / len(scores), 1) if scores else None,
        "avg_deep": round(sum(deeps) / len(deeps), 1) if deeps else None,
        "avg_rem": round(sum(rems) / len(rems), 1) if rems else None,
        "min_duration": round(min(totals), 1),
        "max_duration": round(max(totals), 1),
        "nights_under_6h": under_6,
        "nights_over_7h": over_7,
        "pct_under_6h": round(under_6 / len(valid) * 100),
        "pct_over_7h": round(over_7 / len(valid) * 100),
        "trend": trend_direction(totals),
        "rolling_7d_latest": rolling_7d[-1] if rolling_7d else None,
        "rolling_7d_first": rolling_7d[6] if len(rolling_7d) > 6 else None,
        "worst_nights": sorted(valid, key=lambda d: d["total"])[:3],
        "best_nights": sorted(valid, key=lambda d: d["total"], reverse=True)[:3],
    }


def analyze_vitals(days=30):
    entries = read_dir("vitals", days)
    rhr_vals, hrv_vals, stress_vals = [], [], []
    dates = []

    for dt, content in entries:
        dates.append(dt)
        rhr_vals.append(parse_md_value(content, "Resting HR"))
        hrv_vals.append(parse_md_value(content, "HRV (last night avg)"))
        stress_vals.append(parse_md_value(content, "Avg stress"))

    rhr_clean = [v for v in rhr_vals if v is not None]
    hrv_clean = [v for v in hrv_vals if v is not None]
    stress_clean = [v for v in stress_vals if v is not None]

    result = {"period": f"{days}d", "days": len(entries)}

    if rhr_clean:
        result["resting_hr"] = {
            "avg": round(sum(rhr_clean) / len(rhr_clean), 1),
            "min": min(rhr_clean),
            "max": max(rhr_clean),
            "trend": trend_direction(rhr_vals),
            "rolling_7d": rolling_avg(rhr_vals, 7)[-5:],
        }

    if hrv_clean:
        result["hrv"] = {
            "avg": round(sum(hrv_clean) / len(hrv_clean), 1),
            "min": min(hrv_clean),
            "max": max(hrv_clean),
            "trend": trend_direction(hrv_vals),
            "rolling_7d": rolling_avg(hrv_vals, 7)[-5:],
        }

    if stress_clean:
        result["stress"] = {
            "avg": round(sum(stress_clean) / len(stress_clean), 1),
            "min": min(stress_clean),
            "max": max(stress_clean),
            "trend": trend_direction(stress_vals),
            "rolling_7d": rolling_avg(stress_vals, 7)[-5:],
        }

    return result


def analyze_steps(days=30):
    entries = read_dir("steps", days)
    vals = []
    for dt, content in entries:
        v = parse_md_value(content, "Total steps")
        if v is not None:
            vals.append({"date": dt, "steps": int(v)})

    if not vals:
        return {"error": "No steps data"}

    steps = [v["steps"] for v in vals]
    goal = 10000
    at_goal = sum(1 for s in steps if s >= goal)

    return {
        "period": f"{days}d",
        "days": len(vals),
        "avg": round(sum(steps) / len(steps)),
        "min": min(steps),
        "max": max(steps),
        "at_goal": at_goal,
        "pct_at_goal": round(at_goal / len(vals) * 100),
        "trend": trend_direction(steps),
        "rolling_7d_latest": rolling_avg(steps, 7)[-1] if len(steps) >= 7 else None,
    }


def analyze_activities(days=90):
    directory = ROOT / "garmin" / "workouts"
    if not directory.exists():
        return {"error": "No workout data"}

    cutoff = (date.today() - timedelta(days=days)).isoformat() if days else None
    files = sorted(f for f in directory.iterdir() if f.suffix == ".md")
    if cutoff:
        files = [f for f in files if f.stem[:10] >= cutoff]

    types = Counter()
    monthly = Counter()
    monthly_duration = defaultdict(float)

    for f in files:
        content = f.read_text()
        t = parse_md_string(content, "Type") or "other"
        types[t] += 1
        month = f.stem[:7]
        monthly[month] += 1
        dur = parse_md_value(content, "Duration")
        if dur:
            monthly_duration[month] += dur

    # All time for comparison
    all_files = sorted(f for f in directory.iterdir() if f.suffix == ".md")

    return {
        "period": f"{days}d" if days else "all",
        "total": len(files),
        "total_all_time": len(all_files),
        "types": dict(types.most_common()),
        "monthly_count": dict(sorted(monthly.items())[-6:]),
        "monthly_duration_min": {k: round(v, 1) for k, v in sorted(monthly_duration.items())[-6:]},
        "avg_per_week": round(len(files) / (days / 7), 1) if days else None,
    }


def analyze_strength():
    log_dir = ROOT / "training" / "log"
    if not log_dir.exists():
        return {"error": "No training logs"}

    files = sorted(f for f in log_dir.iterdir() if f.stem[:4].isdigit() and f.suffix == ".md")

    exercises = defaultdict(list)
    for f in files:
        dt = f.stem[:10]
        content = f.read_text()
        in_exercises = False
        for line in content.split("\n"):
            if "## Exercises" in line:
                in_exercises = True
                continue
            if line.startswith("## "):
                in_exercises = False
            if in_exercises and line.startswith("- "):
                text = line[2:]
                # Extract max weight
                weights = []
                import re
                for m in re.finditer(r"([\d.]+)\s*kg", text):
                    weights.append(float(m.group(1)))
                if weights:
                    name = text.split(":")[0].strip().lower()
                    exercises[name].append({"date": dt, "weight": max(weights)})

    # Summarize progression
    progression = {}
    for name, entries in exercises.items():
        if len(entries) >= 2:
            first = entries[0]
            last = entries[-1]
            progression[name] = {
                "first": first,
                "last": last,
                "change_kg": round(last["weight"] - first["weight"], 1),
                "change_pct": round((last["weight"] - first["weight"]) / first["weight"] * 100, 1),
                "sessions": len(entries),
            }

    return {"exercises": progression}


def analyze_correlations():
    """Find correlations between sleep, HRV, activity, and steps."""
    # Get 90 days of data
    sleep_entries = {dt: parse_md_value(c, "Total sleep") for dt, c in read_dir("sleep", 90)}
    hrv_entries = {dt: parse_md_value(c, "HRV (last night avg)") for dt, c in read_dir("vitals", 90)}
    stress_entries = {dt: parse_md_value(c, "Avg stress") for dt, c in read_dir("vitals", 90)}
    rhr_entries = {dt: parse_md_value(c, "Resting HR") for dt, c in read_dir("vitals", 90)}
    steps_entries = {dt: parse_md_value(c, "Total steps") for dt, c in read_dir("steps", 90)}

    # Workout dates
    workout_dir = ROOT / "garmin" / "workouts"
    workout_dates = set()
    if workout_dir.exists():
        cutoff = (date.today() - timedelta(days=90)).isoformat()
        for f in workout_dir.iterdir():
            if f.suffix == ".md" and f.stem[:10] >= cutoff:
                workout_dates.add(f.stem[:10])

    correlations = {}

    # Sleep vs HRV (next day)
    sleep_hrv_pairs = []
    for dt in sorted(sleep_entries.keys()):
        next_day = (date.fromisoformat(dt) + timedelta(days=1)).isoformat()
        s = sleep_entries.get(dt)
        h = hrv_entries.get(next_day)
        if s and h:
            sleep_hrv_pairs.append((s, h))

    if len(sleep_hrv_pairs) >= 10:
        # Simple correlation direction
        low_sleep = [h for s, h in sleep_hrv_pairs if s < 6]
        high_sleep = [h for s, h in sleep_hrv_pairs if s >= 7]
        correlations["sleep_vs_hrv"] = {
            "description": "HRV the day after short vs long sleep",
            "avg_hrv_after_under_6h": round(sum(low_sleep) / len(low_sleep), 1) if low_sleep else None,
            "avg_hrv_after_over_7h": round(sum(high_sleep) / len(high_sleep), 1) if high_sleep else None,
            "pairs": len(sleep_hrv_pairs),
        }

    # Workout days vs rest days (HRV next day)
    workout_hrv, rest_hrv = [], []
    for dt in sorted(hrv_entries.keys()):
        prev_day = (date.fromisoformat(dt) - timedelta(days=1)).isoformat()
        h = hrv_entries.get(dt)
        if h:
            if prev_day in workout_dates:
                workout_hrv.append(h)
            else:
                rest_hrv.append(h)

    if workout_hrv and rest_hrv:
        correlations["workout_vs_hrv"] = {
            "description": "HRV after workout days vs rest days",
            "avg_hrv_after_workout": round(sum(workout_hrv) / len(workout_hrv), 1),
            "avg_hrv_after_rest": round(sum(rest_hrv) / len(rest_hrv), 1),
        }

    # Steps vs stress
    steps_stress_pairs = []
    for dt in sorted(steps_entries.keys()):
        s = steps_entries.get(dt)
        st = stress_entries.get(dt)
        if s and st:
            steps_stress_pairs.append((s, st))

    if len(steps_stress_pairs) >= 10:
        low_steps = [st for s, st in steps_stress_pairs if s < 5000]
        high_steps = [st for s, st in steps_stress_pairs if s >= 8000]
        correlations["steps_vs_stress"] = {
            "description": "Stress on low-step vs high-step days",
            "avg_stress_under_5k_steps": round(sum(low_steps) / len(low_steps), 1) if low_steps else None,
            "avg_stress_over_8k_steps": round(sum(high_steps) / len(high_steps), 1) if high_steps else None,
        }

    # Sleep vs resting HR
    sleep_rhr_pairs = []
    for dt in sorted(sleep_entries.keys()):
        s = sleep_entries.get(dt)
        r = rhr_entries.get(dt)
        if s and r:
            sleep_rhr_pairs.append((s, r))

    if len(sleep_rhr_pairs) >= 10:
        low_sleep_rhr = [r for s, r in sleep_rhr_pairs if s < 6]
        high_sleep_rhr = [r for s, r in sleep_rhr_pairs if s >= 7]
        correlations["sleep_vs_rhr"] = {
            "description": "Resting HR on short vs long sleep nights",
            "avg_rhr_under_6h": round(sum(low_sleep_rhr) / len(low_sleep_rhr), 1) if low_sleep_rhr else None,
            "avg_rhr_over_7h": round(sum(high_sleep_rhr) / len(high_sleep_rhr), 1) if high_sleep_rhr else None,
        }

    return correlations


def full_summary():
    """Generate a complete data summary for a health report."""
    print("=" * 60)
    print("STRIDE HEALTH DATA SUMMARY")
    print(f"Generated: {date.today().isoformat()}")
    print("=" * 60)

    # Multi-window metrics
    print("\n── SLEEP (multi-window) ──")
    for period, data in gather_metric("sleep", "Total sleep").items():
        print(f"  {period}: avg={data['avg']}hrs, min={data['min']}, max={data['max']}, trend={data['trend']}")

    sleep_scores = gather_metric("sleep", "Sleep score")
    for period, data in sleep_scores.items():
        print(f"  Score {period}: avg={data['avg']}, trend={data['trend']}")

    print("\n── SLEEP DETAIL ──")
    for days in [7, 30, 90, 365]:
        s = analyze_sleep(days)
        if "error" not in s:
            print(f"\n  {days}d: avg={s['avg_duration']}hrs, score={s['avg_score']}, "
                  f"deep={s['avg_deep']}hrs, rem={s['avg_rem']}hrs")
            print(f"    Under 6h: {s['nights_under_6h']}/{s['days']} ({s['pct_under_6h']}%), "
                  f"Over 7h: {s['nights_over_7h']}/{s['days']} ({s['pct_over_7h']}%)")
            print(f"    Trend: {s['trend']}")

    print("\n── VITALS (multi-window) ──")
    for label, key in [("Resting HR", "Resting HR"), ("HRV", "HRV (last night avg)"), ("Avg Stress", "Avg stress")]:
        metrics = gather_metric("vitals", key)
        for period, data in metrics.items():
            print(f"  {label} {period}: avg={data['avg']}, trend={data['trend']}")

    print("\n── VITALS DETAIL ──")
    for days in [7, 30, 90]:
        v = analyze_vitals(days)
        print(f"\n  {days}d:")
        for key in ["resting_hr", "hrv", "stress"]:
            if key in v:
                d = v[key]
                print(f"    {key}: avg={d['avg']}, min={d['min']}, max={d['max']}, trend={d['trend']}")
                print(f"      Recent 7d rolling: {d['rolling_7d']}")

    print("\n── STEPS (multi-window) ──")
    for days in [7, 30, 90, 365]:
        s = analyze_steps(days)
        if "error" not in s:
            print(f"  {days}d: avg={s['avg']}, at_goal={s['at_goal']}/{s['days']} ({s['pct_at_goal']}%), trend={s['trend']}")

    print("\n── ACTIVITIES ──")
    a = analyze_activities(90)
    print(f"  Last 90d: {a['total']} workouts ({a['avg_per_week']}/week)")
    print(f"  All time: {a['total_all_time']}")
    print(f"  Types: {a['types']}")
    print(f"  Monthly count: {a['monthly_count']}")
    print(f"  Monthly duration (min): {a['monthly_duration_min']}")

    a_year = analyze_activities(365)
    print(f"\n  Last 1y: {a_year['total']} workouts ({a_year['avg_per_week']}/week)")
    print(f"  Monthly count: {a_year['monthly_count']}")

    print("\n── STRENGTH ──")
    strength = analyze_strength()
    if "exercises" in strength:
        for name, data in sorted(strength["exercises"].items(), key=lambda x: -abs(x[1]["change_kg"])):
            print(f"  {name}: {data['first']['weight']} → {data['last']['weight']}kg "
                  f"({data['change_kg']:+.0f}kg, {data['change_pct']:+.1f}%) over {data['sessions']} sessions "
                  f"({data['first']['date']} → {data['last']['date']})")

    print("\n── CORRELATIONS ──")
    corr = analyze_correlations()
    for key, data in corr.items():
        print(f"\n  {data['description']}:")
        for k, v in data.items():
            if k != "description":
                print(f"    {k}: {v}")

    print("\n" + "=" * 60)


# ── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "summary"
    days = int(sys.argv[2]) if len(sys.argv) > 2 else None

    if cmd == "summary":
        full_summary()
    elif cmd == "sleep":
        print(json.dumps(analyze_sleep(days or 30), indent=2, default=str))
    elif cmd == "vitals":
        print(json.dumps(analyze_vitals(days or 30), indent=2, default=str))
    elif cmd == "steps":
        print(json.dumps(analyze_steps(days or 30), indent=2, default=str))
    elif cmd == "activities":
        print(json.dumps(analyze_activities(days or 90), indent=2, default=str))
    elif cmd == "strength":
        print(json.dumps(analyze_strength(), indent=2, default=str))
    elif cmd == "correlations":
        print(json.dumps(analyze_correlations(), indent=2, default=str))
    else:
        print(__doc__)
