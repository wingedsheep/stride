# Stride

# Start the dashboard
serve:
    node server.js

# Sync today's Garmin data
sync:
    source .venv/bin/activate && python scripts/garmin_sync.py

# Sync last N days of Garmin data
sync-days days:
    source .venv/bin/activate && python scripts/garmin_sync.py --days {{days}}

# Install dependencies
setup:
    python3 -m venv .venv
    source .venv/bin/activate && pip install -r scripts/requirements.txt
