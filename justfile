# Stride

# List available commands
default:
    @just --list

# Start the dashboard
serve:
    node server.js

# Sync today's Garmin data
sync:
    source .venv/bin/activate && python scripts/garmin_sync.py

# Sync last N days of Garmin data
sync-days days:
    source .venv/bin/activate && python scripts/garmin_sync.py --days {{days}}

# Full health data summary (for health reports)
analyze:
    source .venv/bin/activate && python scripts/analyze.py summary

# Analyze a specific area
analyze-sleep days="30":
    source .venv/bin/activate && python scripts/analyze.py sleep {{days}}

analyze-vitals days="30":
    source .venv/bin/activate && python scripts/analyze.py vitals {{days}}

analyze-steps days="30":
    source .venv/bin/activate && python scripts/analyze.py steps {{days}}

analyze-activities days="90":
    source .venv/bin/activate && python scripts/analyze.py activities {{days}}

analyze-strength:
    source .venv/bin/activate && python scripts/analyze.py strength

analyze-correlations:
    source .venv/bin/activate && python scripts/analyze.py correlations

# Install dependencies
setup:
    python3 -m venv .venv
    source .venv/bin/activate && pip install -r scripts/requirements.txt
