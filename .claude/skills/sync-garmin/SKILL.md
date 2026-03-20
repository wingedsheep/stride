---
name: sync-garmin
description: Sync Garmin data. Use when the user says "sync", "update garmin", "pull garmin data", or similar. Always resyncs at least the last 2 days to catch delayed updates.
user-invocable: true
argument-hint: "[number of days to sync, default 2]"
allowed-tools: Bash, Read
---

Sync the latest data from Garmin Connect.

User input: $ARGUMENTS

## Process

1. Determine how many days to sync:
   - Default: 2 days (today + yesterday, to catch delayed Garmin data)
   - If the user specifies a number, use that but minimum 2
   - If the user says "last week", use 7
2. Run: `source .venv/bin/activate && python scripts/garmin_sync.py --days <N>`
3. Report what was synced

## Important
- Always sync at least 2 days — Garmin data for the current day is often incomplete or delayed, so yesterday's data may have been updated since last sync
- If sync fails with auth error, tell the user to check `.env` credentials
- After syncing, briefly report what data was pulled (sleep, vitals, activities, steps)
