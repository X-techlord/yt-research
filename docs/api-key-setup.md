# YouTube API key setup runbook (via OpenCLI)

Use this whenever `.env` has no `YT_API_KEY` (missing file, missing line, or empty value).
Goal: get the user to the page where they copy the key. **The user copies and pastes it into `.env` themselves.**

## Rules
- **Ask first:** "What is the OpenCLI ID (profile/context ID) of the Chrome profile to use?" Do not guess. Run
  `opencli doctor` — each entry in `profiles[].contextId` is a valid ID — but still let the user choose.
- **Never** type a password, create a Google account, or bypass a verification prompt. If the browser lands on
  `accounts.google.com`, stop and ask the user to sign in on that tab, then continue.
- **Never** print, log or store the key. If you take a screenshot of the key panel, save it to the scratchpad and
  delete it right after. After the user pastes it, verify only presence / length (~39) / `AIza` prefix.
- Say which Cloud project the console opened on (`project=` in the URL) and offer a different/dedicated one.
- Restrict the key to **YouTube Data API v3** only.
- OpenCLI flags go **after** the subcommand: `opencli browser <cmd> ... --session ytkey --profile <ID>`.
  (`opencli browser ytkey open` does not work; use `--session`.)

## Steps (P = `--profile <ID>`, S = `--session ytkey`)
1. Open the API page (foreground so the user can see it):
   `opencli browser open "https://console.cloud.google.com/apis/library/youtube.googleapis.com" $S $P --window foreground`
   then `opencli browser wait time 4 $S $P` and `opencli browser get url $S $P`.
   - URL on `accounts.google.com` -> user must sign in (see Rules).
2. Enable the API. List buttons with
   `opencli browser eval "(() => JSON.stringify([...document.querySelectorAll('button,a')].map(e=>(e.innerText||'').trim()).filter(t=>/enable|manage/i.test(t))))()" $S $P`
   - `Manage` present -> already enabled, nothing to do.
   - `Enable` present -> `opencli browser click --role button --name "Enable" $S $P`, wait ~6s, re-check for `Manage`.
3. Open credentials: `opencli browser open "https://console.cloud.google.com/apis/credentials?project=<PROJECT>" $S $P`, wait 4s.
4. `opencli browser click --role button --name "Create credentials" $S $P`, wait 2s,
   then `opencli browser click --role menuitem --name "API key" $S $P`, wait 4s.
5. In the "Create API key" panel:
   - `opencli browser fill --role textbox --name "Name" "yt-research" $S $P`
   - `opencli browser click --role combobox --name "Select API restrictions" $S $P`, wait 2s
   - `opencli browser click --role option --name "YouTube Data API v3" $S $P`
   - `opencli browser click --role button --name "OK" $S $P`  (the selection only applies after OK)
6. Click **Create**. The name "Create" is ambiguous with "Create credentials", so run
   `opencli browser find --role button --name "Create" $S $P` and click the `ref` of the entry whose text is exactly
   `Create` (the submit button), not `Create credentials`. Wait ~10s; it shows "Creating..." first.
7. When the "API key created" panel shows the key, **stop** and tell the user:
   copy it with the copy icon, put it in `D:\Ai\yt-research\.env` as `YT_API_KEY=<key>` (copy `.env.example` if needed;
   no quotes/spaces), and say when done.
8. After they confirm: check `.env` (presence/length/prefix only), `node server.mjs`, and run one analysis to prove it
   works (`/api/status` -> `hasKey:true`, then `/api/analyze?keyword=...`).
