#!/usr/bin/env python3
"""
Sync data from Garmin Connect and write it to structured files.

Usage:
    python scripts/garmin_sync.py                  # Sync today
    python scripts/garmin_sync.py --days 7         # Sync last 7 days
    python scripts/garmin_sync.py --date 2026-03-15  # Sync specific date
"""

import argparse
import json
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from garminconnect import Garmin

# Project root is one level up from scripts/
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")


TOKEN_DIR = ROOT / ".garmin-tokens"


def get_client() -> Garmin:
    """Authenticate with Garmin Connect, using cached tokens when possible."""
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    if not email or not password:
        print("Error: Set GARMIN_EMAIL and GARMIN_PASSWORD in .env")
        sys.exit(1)

    TOKEN_DIR.mkdir(exist_ok=True)
    client = Garmin(email, password)

    # Try cached tokens first, fall back to fresh login
    token_file = TOKEN_DIR / "oauth1_token.json"
    if token_file.exists():
        client.login(tokenstore=str(TOKEN_DIR))
    else:
        client.login()
        client.garth.dump(str(TOKEN_DIR))

    return client


def save_json(data: dict | list, path: Path):
    """Save raw JSON data."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


def save_markdown(content: str, path: Path):
    """Save markdown file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        f.write(content)


# ── Workouts ─────────────────────────────────────────────────────────────────


def sync_activities(client: Garmin, start: date, end: date):
    """Sync activities/workouts for a date range."""
    activities = client.get_activities_by_date(
        start.isoformat(), end.isoformat()
    )

    for activity in activities:
        act_date = activity.get("startTimeLocal", "")[:10]
        act_type = activity.get("activityType", {}).get("typeKey", "unknown")
        act_name = activity.get("activityName", act_type)
        slug = f"{act_date}-{act_type}".lower().replace(" ", "-")

        # Save raw JSON
        save_json(activity, ROOT / f"data/garmin/workouts/{slug}.json")

        # Generate markdown summary
        duration_min = round(activity.get("duration", 0) / 60, 1)
        distance_km = round(activity.get("distance", 0) / 1000, 2) if activity.get("distance") else None
        calories = activity.get("calories", None)
        avg_hr = activity.get("averageHR", None)
        max_hr = activity.get("maxHR", None)

        md = f"# {act_name} — {act_date}\n\n"
        md += f"- **Type**: {act_type}\n"
        md += f"- **Duration**: {duration_min} min\n"
        if distance_km:
            md += f"- **Distance**: {distance_km} km\n"
        if calories:
            md += f"- **Calories**: {calories}\n"
        if avg_hr:
            md += f"- **Avg HR**: {avg_hr} bpm\n"
        if max_hr:
            md += f"- **Max HR**: {max_hr} bpm\n"

        save_markdown(md, ROOT / f"data/garmin/workouts/{slug}.md")

    print(f"  Synced {len(activities)} activities")


# ── Sleep ────────────────────────────────────────────────────────────────────


def sync_sleep(client: Garmin, day: date):
    """Sync sleep data for a single day."""
    try:
        sleep_data = client.get_sleep_data(day.isoformat())
    except Exception:
        return

    if not sleep_data:
        return

    save_json(sleep_data, ROOT / f"data/garmin/sleep/{day.isoformat()}.json")

    daily = sleep_data.get("dailySleepDTO") or {}
    duration_hrs = round((daily.get("sleepTimeSeconds") or 0) / 3600, 1)
    deep_hrs = round((daily.get("deepSleepSeconds") or 0) / 3600, 1)
    light_hrs = round((daily.get("lightSleepSeconds") or 0) / 3600, 1)
    rem_hrs = round((daily.get("remSleepSeconds") or 0) / 3600, 1)
    awake_hrs = round((daily.get("awakeSleepSeconds") or 0) / 3600, 1)
    scores = (daily.get("sleepScores") or {})
    score = (scores.get("overall") or {}).get("value", "N/A")

    md = f"# Sleep — {day.isoformat()}\n\n"
    md += f"- **Total sleep**: {duration_hrs} hrs\n"
    md += f"- **Sleep score**: {score}\n"
    md += f"- **Deep**: {deep_hrs} hrs\n"
    md += f"- **Light**: {light_hrs} hrs\n"
    md += f"- **REM**: {rem_hrs} hrs\n"
    md += f"- **Awake**: {awake_hrs} hrs\n"

    save_markdown(md, ROOT / f"data/garmin/sleep/{day.isoformat()}.md")
    print(f"  Synced sleep for {day}")


# ── Vitals (HR, HRV, Stress, Body Battery) ──────────────────────────────────


def sync_vitals(client: Garmin, day: date):
    """Sync heart rate, HRV, stress, and body battery for a single day."""
    vitals = {}

    try:
        hr_data = client.get_heart_rates(day.isoformat())
        vitals["heart_rate"] = hr_data
    except Exception:
        pass

    try:
        hrv_data = client.get_hrv_data(day.isoformat())
        vitals["hrv"] = hrv_data
    except Exception:
        pass

    try:
        stress_data = client.get_stress_data(day.isoformat())
        vitals["stress"] = stress_data
    except Exception:
        pass

    try:
        bb_data = client.get_body_battery(day.isoformat())
        vitals["body_battery"] = bb_data
    except Exception:
        pass

    if not vitals:
        return

    save_json(vitals, ROOT / f"data/garmin/vitals/{day.isoformat()}.json")

    # Extract key metrics — API can return None for any of these
    hr_data = vitals.get("heart_rate") or {}
    resting_hr = hr_data.get("restingHeartRate", "N/A")

    hrv_data = vitals.get("hrv") or {}
    hrv_summary = hrv_data.get("hrvSummary") or {}
    weekly_avg_hrv = hrv_summary.get("weeklyAvg", "N/A")
    last_night_hrv = hrv_summary.get("lastNightAvg", "N/A")

    stress_info = vitals.get("stress") or {}
    avg_stress = stress_info.get("avgStressLevel", "N/A")
    max_stress = stress_info.get("maxStressLevel", "N/A")

    bb_list = vitals.get("body_battery") or []
    if isinstance(bb_list, list) and bb_list:
        bb_values = [
            b.get("charged", 0) for b in bb_list
            if isinstance(b, dict) and b.get("charged") is not None
        ]
        bb_max = max(bb_values) if bb_values else "N/A"
        bb_min = min(bb_values) if bb_values else "N/A"
    else:
        bb_max = bb_min = "N/A"

    md = f"# Vitals — {day.isoformat()}\n\n"
    md += f"- **Resting HR**: {resting_hr} bpm\n"
    md += f"- **HRV (last night avg)**: {last_night_hrv} ms\n"
    md += f"- **HRV (weekly avg)**: {weekly_avg_hrv} ms\n"
    md += f"- **Avg stress**: {avg_stress}\n"
    md += f"- **Max stress**: {max_stress}\n"
    md += f"- **Body battery**: {bb_min}–{bb_max}\n"

    save_markdown(md, ROOT / f"data/garmin/vitals/{day.isoformat()}.md")
    print(f"  Synced vitals for {day}")


# ── Steps ────────────────────────────────────────────────────────────────────


def sync_steps(client: Garmin, day: date):
    """Sync daily step count."""
    try:
        steps_data = client.get_daily_steps(day.isoformat(), day.isoformat())
    except Exception:
        return

    if not steps_data:
        return

    # API returns a list, take first entry
    entry = steps_data[0] if isinstance(steps_data, list) and steps_data else steps_data
    if isinstance(entry, dict):
        total = entry.get("totalSteps") or entry.get("steps") or 0
        goal = entry.get("stepGoal") or entry.get("dailyStepGoal") or "N/A"
    else:
        total = 0
        goal = "N/A"

    save_json(steps_data, ROOT / f"data/garmin/steps/{day.isoformat()}.json")

    md = f"# Steps — {day.isoformat()}\n\n"
    md += f"- **Total steps**: {total}\n"
    md += f"- **Goal**: {goal}\n"

    save_markdown(md, ROOT / f"data/garmin/steps/{day.isoformat()}.md")
    print(f"  Synced steps for {day}")


# ── Main ─────────────────────────────────────────────────────────────────────


def sync_day(client: Garmin, day: date):
    """Sync all data for a single day."""
    print(f"\nSyncing {day.isoformat()}...")
    try:
        sync_sleep(client, day)
    except Exception as e:
        print(f"  Warning: sleep sync failed for {day}: {e}")
    try:
        sync_vitals(client, day)
    except Exception as e:
        print(f"  Warning: vitals sync failed for {day}: {e}")
    try:
        sync_steps(client, day)
    except Exception as e:
        print(f"  Warning: steps sync failed for {day}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Sync Garmin Connect data")
    parser.add_argument("--days", type=int, default=1, help="Number of days to sync (default: 1 = today)")
    parser.add_argument("--date", type=str, help="Specific date to sync (YYYY-MM-DD)")
    parser.add_argument("--start-date", type=str, help="Resume sync from this date (YYYY-MM-DD), skipping activities")
    parser.add_argument("--skip-activities", action="store_true", help="Skip activity sync (useful when resuming)")
    args = parser.parse_args()

    client = get_client()

    if args.date:
        day = date.fromisoformat(args.date)
        sync_day(client, day)
        sync_activities(client, day, day)
    elif args.start_date:
        start = date.fromisoformat(args.start_date)
        end = date.today()
        print(f"Resuming sync from {start} to {end}")

        if not args.skip_activities:
            sync_activities(client, start, end)

        current = start
        while current <= end:
            sync_day(client, current)
            current += timedelta(days=1)
    else:
        end = date.today()
        start = end - timedelta(days=args.days - 1)
        print(f"Syncing from {start} to {end}")

        if not args.skip_activities:
            sync_activities(client, start, end)

        current = start
        while current <= end:
            sync_day(client, current)
            current += timedelta(days=1)

    print("\nDone!")


if __name__ == "__main__":
    main()
