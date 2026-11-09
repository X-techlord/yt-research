# yt-research — local YouTube keyword/title research dashboard

Zero-dependency Node app (`node server.mjs`, http://localhost:1402). Not part of the "Ricks Clips" video workflow.
See README.md for how scoring works. Secrets live in `.env` — never print it.

## Rule: missing YouTube API key
If `.env` has no `YT_API_KEY` (or the value is empty) when you are asked to run, test or use the pipeline:
1. **Ask the user for the OpenCLI ID of the Chrome profile to use.** Do not guess or reuse one silently.
2. Once given, run `node setup-key.mjs <profileId>` (needs the Bash sandbox disabled). It opens Chrome through OpenCLI
   with that profile, enables YouTube Data API v3, creates an API key restricted to that API, stops on the "API key
   created" panel so the **user** copies it into `.env`, then waits for it and verifies it. If the script fails, fall
   back to the manual steps in `docs/api-key-setup.md`. Use `--dry-run` to test without creating a key.
3. Never enter passwords or bypass sign-in; never print, log or keep the key (delete any screenshot showing it).
