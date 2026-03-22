---
name: sync-garmin
description: Sync Garmin data. Use when the user says "sync", "update garmin", "pull garmin data", or similar. Always resyncs at least the last 3 days to catch delayed updates.
user-invocable: true
argument-hint: "[number of days to sync, default 2]"
allowed-tools: Bash, Read
---

Sync the latest data from Garmin Connect.

User input: $ARGUMENTS

## Process

1. Determine how many days to sync:
   - Default: 3 days (today + 2 previous days, to catch delayed Garmin data)
   - If the user specifies a number, use that but minimum 3
   - If the user says "last week", use 7
2. Run: `source .venv/bin/activate && python scripts/garmin_sync.py --days <N>`
3. Report what was synced

## Important
- Always sync at least 3 days — Garmin data can be incomplete or delayed, so always re-sync the last previously synced day to catch updates
- If sync fails with auth error, tell the user to check `.env` credentials
- After syncing, briefly report what data was pulled (sleep, vitals, activities, steps)
