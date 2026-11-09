# yt-research

Local keyword and title research dashboard for any niche. No dependencies (Node 18+).

**New here? Read [HOW-TO-USE.md](HOW-TO-USE.md)** — a simple-English guide for beginners.

## Setup
1. Copy `.env.example` to `.env` and set `YT_API_KEY` (YouTube Data API v3 key from one Google Cloud project).
2. `node server.mjs`, then open http://localhost:1402

Without a key you still get autocomplete keyword expansion; analysis needs the key.

## No API key yet?
`node setup-key.mjs` — asks for your OpenCLI Chrome-profile ID, enables YouTube Data API v3 and creates a restricted
key; you only copy it into `.env`. (`docs/api-key-setup.md` has the manual steps.)

## Search interest (Google Trends)
"Add search interest" calls Google Trends' internal endpoints over plain HTTP (YouTube Search property, last 12 months).
No browser, key or quota, but unofficial: Google can rate-limit (429). Values are relative: each keyword is shown as a %
of the seed keyword's interest (the seed is the fixed anchor in every comparison). Not absolute search counts. A very
broad seed makes long-tail keywords round to 0-5; use a more specific seed for finer resolution.

## How it works
- **Expand:** seed + a–z + question modifiers via YouTube autocomplete (free, no quota).
- **Analyze (~102 units each):** top 20 results -> views/day, channel sizes, title patterns.
  - Demand = log-scaled median views/day (10k/day = 100)
  - Saturation = 60% share of channels >=100k subs + 40% share of titles containing the exact keyword
  - Opportunity = demand discounted by saturation, plus a bonus for small channels (<=10k subs) with 10k+ views
  - Outliers = videos with views >= 3x their channel's average
- Scores are relative estimates from public data, not real search volume.
- Results cached in `data/cache.json` (search 12h). A local quota ledger stops at `DAILY_QUOTA_BUDGET`.

## Next
Chrome extension overlay, LLM title/idea generation.
