# Signal Bot — Conversational Interface for Stride

**Status:** Backlog
**Created:** 2026-03-20

## Problem

Stride is powerful but requires sitting at a laptop with Claude Code open. The most natural interface for quick
logging ("had salmon for dinner", "slept terribly", "what should I train tomorrow") is texting from your phone.

## Vision

Text a Signal number, get Stride-quality responses — with full access to your data, all skills, same tone and reasoning.

## Architecture

```
Phone (Signal) → signal-cli-rest-api → bridge service → Claude → Stride repo
       ↑                                                              |
       └──────────────────── response ←───────────────────────────────┘
```

## Components

### 1. Signal Gateway

- **signal-cli-rest-api** in Docker — handles Signal protocol, exposes REST/webhook API
- Dedicated phone number (prepaid SIM or VoIP)
- Receives messages via webhook, sends responses via REST

### 2. Bridge Service (Node.js)

- Webhook endpoint receives incoming Signal messages
- Routes to Claude (SDK or API)
- Sends response back via signal-cli API
- Handles message splitting (Signal has a ~6000 char limit per message)
- Simple queue to avoid concurrent sessions

### 3. AI Backend — Two-tier approach

- **Tier 1 (Claude Code SDK):** For the single-user/self-hosted case. Uses Claude Max auth, full repo access, all
  skills. No API cost.
- **Tier 2 (Claude API):** For multi-user scaling. Uses API key with tool definitions. More control over cost and
  concurrency.

### 4. Hosting

- VPS or home server (even a Raspberry Pi for single-user)
- Stride repo cloned locally
- Garmin sync on cron (every 2 hours)
- systemd services for signal-cli and bridge

## Implementation Plan

### Phase 1 — Single-user MVP (self-hosted, Claude Max)

1. Set up signal-cli-rest-api in Docker on a VPS
2. Register a phone number and link it
3. Write bridge service (~150 lines Node.js):
    - Webhook listener for incoming messages
    - Spawn Claude Code SDK session with `cwd: /path/to/life-tracker`
    - Send response back to Signal
4. Authenticate Claude Code on the server (one-time OAuth)
5. Set up systemd services, basic logging
6. Test with real usage for a week

### Phase 2 — Robustness

- Message queue (avoid overlapping sessions)
- Error handling and retry logic
- Timeout handling (kill sessions that take >60s)
- Rate limiting (self-protection against accidental spam)
- Garmin auto-sync before health queries
- Media support (photos of meals for food logging)

### Phase 3 — Multi-user scaling (see below)

---

## Scaling to Multiple Users

The hard part isn't Signal or the bridge — it's the AI cost. Each message with full context is expensive. Here's the
strategy:

### Cost Reduction

#### 1. Model routing — use the cheapest model that works

| Task                                       | Model  | Why                                |
|--------------------------------------------|--------|------------------------------------|
| Log food, log journal                      | Haiku  | Simple append, no reasoning needed |
| Quick lookups ("what did I eat yesterday") | Haiku  | File read + format                 |
| Workout planning, dinner suggestions       | Sonnet | Moderate reasoning                 |
| Health summaries, trend analysis           | Opus   | Deep cross-domain reasoning        |

A classifier (Haiku itself, or regex patterns) routes each message to the right tier. Most messages are simple logs —
Haiku is ~60x cheaper than Opus.

#### 2. Prompt caching

- System prompt (CLAUDE.md + profile + preferences) rarely changes → cache it
- Anthropic's prompt caching gives 90% discount on cached tokens
- For each user, the system prompt is ~2-3K tokens cached, only the message + recent context is fresh

#### 3. Minimal context loading

- Don't dump the whole repo into context every time
- "Log food" only needs today's food file + nutrition preferences
- "Plan workout" needs recent logs + recovery data + goals
- A routing layer decides which files to load per request type

#### 4. Pre-computed summaries

- Run health summaries on a schedule (weekly), cache the result
- Quick status questions hit the cached summary instead of re-analyzing everything
- `analyze.py` outputs are cached and refreshed on cron

### Architecture for Multi-User

```
Users (Signal) → Signal Gateway → Message Router
                                       |
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
               Haiku (logs)    Sonnet (planning)    Opus (analysis)
                    |                  |                  |
                    └──────────────────┼──────────────────┘
                                       ▼
                              User Data Store
                          (per-user Stride repo or DB)
```

#### Data isolation

- Each user gets their own data directory (or git repo)
- Shared system prompt / CLAUDE.md, per-user profile and data
- Could use a simple filesystem layout: `users/{user_id}/garmin/`, `users/{user_id}/food/`, etc.

#### Cost estimate (per user, per month, assuming 10 messages/day)

| Tier                 | Messages   | Model     | Est. cost     |
|----------------------|------------|-----------|---------------|
| Simple logs          | 5/day      | Haiku     | ~$0.50/mo     |
| Planning/suggestions | 3/day      | Sonnet    | ~$3/mo        |
| Deep analysis        | 2/day      | Opus      | ~$5/mo        |
| **Total**            | **10/day** | **mixed** | **~$8.50/mo** |

With prompt caching, likely **$4-6/mo per active user**. Viable as a $10-15/mo subscription.

### Alternative: Local/Open-Source Models

For the simpler tiers (logging, lookups), a local model (Llama, Mistral) could handle it at zero marginal cost. Only
escalate to Claude API for complex reasoning. This drops costs further but adds deployment complexity.

## Open Questions

- Signal vs Telegram vs WhatsApp? Signal is most privacy-friendly but signal-cli can be finicky. Telegram has a much
  better bot API.
- How to handle conversation context? Each message is currently stateless. Do we want short-term memory within a "
  session"?
- Photo support for food logging — use Claude's vision to identify meals from photos?
- Voice messages — transcribe with Whisper, then process as text?
