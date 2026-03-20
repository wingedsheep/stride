# Stride

A file-based personal health tracker powered by [Claude Code](https://claude.ai/claude-code). Your health data lives as structured markdown files — synced from Garmin, enriched with manual notes, and queryable through conversation.

## How it works

```
You ←→ Claude Code ←→ Markdown files ←→ Dashboard
```

- **Garmin sync** pulls your workouts, sleep, vitals, and steps into markdown files
- **You** add journal entries, workout notes, food preferences, and goals by just talking to Claude
- **Claude** reads across all your data to answer questions, spot patterns, and generate health summaries
- **Dashboard** visualizes everything at `localhost:3000`

## Setup

```bash
# Install Python dependencies
just setup

# Add your Garmin credentials
cp .env.example .env
# Edit .env with your email and password

# Pull your Garmin history
just sync-days 365

# Start the dashboard
just serve
```

## Project structure

```
garmin/              Synced Garmin data (workouts, sleep, vitals, steps)
journal/             Daily journal entries
training/log/        Workout notes (weights, sets, RPE)
health/              Blood work and periodic health summaries
profile/             Goals, nutrition preferences, personal info
web/ + server.js     Dashboard frontend and API
scripts/             Garmin sync script
docs/                Process documentation
```

All personal data directories are gitignored — only code is committed.

## Dashboard

Run `just serve` and open http://localhost:3000. Tabs:

- **Overview** — at-a-glance stats (sleep, HR, HRV, steps, activities)
- **Strength** — lift progression charts with age/gender averages
- **Health** — timeline of periodic health summaries
- **Sleep** — duration, score, and sleep stage breakdowns
- **Steps** — daily counts with goal tracking
- **Vitals** — resting HR, HRV, stress trends
- **Activities** — monthly counts, type breakdown, activity log

## Asking questions

This project is designed to be used with Claude Code. Just ask:

- *"How did I sleep this week?"*
- *"What should my next workout look like?"*
- *"Can you spot any patterns between my sleep and training?"*
- *"Make a health summary"* — generates a detailed report with trends and advice
- *"Log today's workout: leg press 3x12 @ 115kg..."*

Claude reads your files, cross-references Garmin data with your notes, and gives answers grounded in your actual history.

## Syncing

```bash
just sync              # Sync today
just sync-days 7       # Sync last week
just sync-days 365     # Sync last year
```

Or directly:
```bash
python scripts/garmin_sync.py --days 30
python scripts/garmin_sync.py --date 2025-06-15
```
