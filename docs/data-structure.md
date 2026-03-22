# Data Structure

All personal data lives under `data/`. This directory is gitignored (except for `.gitkeep` files that preserve the folder structure). When you clone this repo as a template, the empty directory tree is ready to populate.

## Directory Layout

```
data/
  garmin/                      — Synced from Garmin Connect via scripts/garmin_sync.py
    sleep/                     — Daily sleep data (JSON + markdown summary)
    steps/                     — Daily step counts (JSON + markdown summary)
    vitals/                    — Resting HR, HRV, body battery, stress (JSON + markdown)
    workouts/                  — One file per activity (JSON + markdown + splits)

  journal/                     — Daily journal entries (YYYY-MM-DD.md)

  food/                        — Daily food logs (YYYY-MM-DD.md)
    photos/                    — Meal photos (YYYY-MM-DD-meal.jpg)

  training/
    log/                       — Workout notes: exercises, sets, reps, RPE (YYYY-MM-DD-type.md)
    programs/                  — Training plans and periodization

  health/
    summaries/                 — Generated health reports (summary-YYYY-MM-DD.md)
    focus.json                 — Current dashboard focus points

  measurements/
    bloodwork/                 — Lab results (bloodwork-YYYY-MM.md)
    weight.json                — Weight history
    blood-pressure/            — BP readings (YYYY-MM-DD.md or JSON)
    body-composition/          — DEXA scans, body fat %, etc.

  profile/
    goals.md                   — Current training and health goals
    preferences.md             — Food likes/dislikes, workout preferences
    nutrition.md               — Dietary notes, restrictions, meal ideas
```

## Data Sources

| Directory               | Source                  | Format         |
|--------------------------|-------------------------|----------------|
| `garmin/*`               | Garmin Connect API sync | JSON + markdown |
| `journal/`               | Manual (Claude)         | Markdown       |
| `food/`                  | Manual (Claude)         | Markdown + photos |
| `training/log/`          | Manual (Claude)         | Markdown       |
| `training/programs/`     | Generated (Claude)      | Markdown       |
| `health/summaries/`      | Generated (Claude)      | Markdown       |
| `health/focus.json`      | Generated (Claude)      | JSON           |
| `measurements/bloodwork/`| Manual (lab results)    | Markdown       |
| `measurements/weight.json`| Manual                 | JSON           |
| `measurements/blood-pressure/`| Manual              | Markdown/JSON  |
| `measurements/body-composition/`| Manual (DEXA etc.) | Markdown       |
| `profile/*`              | Manual                  | Markdown       |

## Git Behavior

- All `data/` contents are gitignored — personal data never gets committed
- `.gitkeep` files inside each directory are tracked so the folder structure survives cloning
- Raw JSON files in `garmin/` are the source of truth; markdown summaries are regenerated from them
