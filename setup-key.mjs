#!/usr/bin/env node
// Enables YouTube Data API v3 and creates a restricted API key by driving Chrome through OpenCLI.
// You only copy the key from the Chrome window and paste it into .env — this script never reads or prints it.
//
//   node setup-key.mjs [opencliProfileId] [--dry-run] [--force]
//
// --dry-run : do everything except the final "Create" click (to test the flow)
// --force   : run even if .env already has a key
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.join(ROOT, '.env');
const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const SESSION = 'ytkey';
const KEY_NAME = 'yt-research';
let PROFILE = process.argv.slice(2).find((a) => !a.startsWith('--')) || '';

const sleep = (s) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, s * 1000);
const log = (m) => console.log(m);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function readKey() {
  try { return (fs.readFileSync(ENV, 'utf8').match(/^YT_API_KEY=(.*)$/m)?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; }
}

// Run an opencli command; returns the parsed JSON envelope.
function oc(parts) {
  const cmd = ['opencli', ...parts.map((p) => '"' + String(p).replace(/"/g, '\\"') + '"')].join(' ');
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', timeout: 90000 });
  const line = (r.stdout || '').split('\n').find((l) => l.startsWith('{"ok"'));
  if (!line) throw new Error('opencli gave no result: ' + ((r.stderr || r.stdout || '').trim().slice(0, 200) || 'is opencli installed?'));
  const env = JSON.parse(line);
  if (!env.ok) throw new Error(env.error?.message || 'opencli error');
  return env;
}
const b = (sub, ...rest) => oc(['browser', sub, ...rest, '--session', SESSION, '--profile', PROFILE]);
const evalJs = (js) => b('eval', js).data;
const waitFor = (fn, seconds, every = 2) => { for (let t = 0; t < seconds; t += every) { try { if (fn()) return true; } catch {} sleep(every); } return false; };

async function main() {
  if (readKey() && !FORCE) { log('.env already has a YT_API_KEY. Use --force to create another.'); return; }

  // 1. Which Chrome profile?
  let profiles = [];
  try { profiles = oc(['doctor']).data.profiles || []; } catch {}
  if (profiles.length) log('OpenCLI profiles found: ' + profiles.map((p) => p.contextId).join(', '));
  if (!PROFILE) PROFILE = (await rl.question('OpenCLI ID of the Chrome profile to use: ')).trim();
  if (!PROFILE) throw new Error('A profile ID is required.');

  // 2. Open the API page
  const apiUrl = 'https://console.cloud.google.com/apis/library/youtube.googleapis.com';
  log('Opening Google Cloud in that profile…');
  b('open', apiUrl, '--window', 'foreground');
  sleep(5);
  while (String(b('get', 'url').data).includes('accounts.google.com')) {
    await rl.question('Google is asking you to sign in. Sign in in the Chrome window, then press Enter here… ');
    b('open', apiUrl, '--window', 'foreground');
    sleep(5);
  }
  const project = new URL(String(b('get', 'url').data)).searchParams.get('project') || '';
  log(`Cloud project: ${project || '(not detected)'}  — the key will be created in this project.`);

  // 3. Enable YouTube Data API v3 (if needed)
  const labels = () => JSON.parse(evalJs("(() => JSON.stringify([...document.querySelectorAll('button,a')].map(e=>(e.innerText||'').trim()).filter(t=>/^(enable|manage)$/i.test(t))))()"));
  let l = labels();
  if (l.some((t) => /^manage$/i.test(t))) log('YouTube Data API v3 is already enabled.');
  else if (l.some((t) => /^enable$/i.test(t))) {
    log('Enabling YouTube Data API v3…');
    b('click', '--role', 'button', '--name', 'Enable');
    if (!waitFor(() => labels().some((t) => /^manage$/i.test(t)), 40)) throw new Error('Could not confirm the API got enabled — check the Chrome window (billing/terms prompts?).');
    log('Enabled.');
  } else throw new Error('Could not find an Enable/Manage button — check the Chrome window.');

  // 4. Create the key
  b('open', `https://console.cloud.google.com/apis/credentials${project ? '?project=' + project : ''}`, '--window', 'foreground');
  sleep(5);
  b('click', '--role', 'button', '--name', 'Create credentials');
  sleep(2);
  b('click', '--role', 'menuitem', '--name', 'API key');
  sleep(4);
  b('fill', '--role', 'textbox', '--name', 'Name', KEY_NAME);
  b('click', '--role', 'combobox', '--name', 'Select API restrictions');
  sleep(2);
  b('click', '--role', 'option', '--name', 'YouTube Data API v3');
  b('click', '--role', 'button', '--name', 'OK'); // selection only applies after OK
  sleep(1);
  log(`Key "${KEY_NAME}" is filled in and restricted to YouTube Data API v3.`);

  if (DRY) {
    log('--dry-run: stopping before the final Create click.');
    try { b('keys', 'Escape'); } catch {}
    try { b('close'); } catch {}
    return;
  }

  // "Create" is ambiguous with "Create credentials": pick the entry whose text is exactly "Create".
  const entry = b('find', '--role', 'button', '--name', 'Create').data.entries.find((e) => e.text.trim() === 'Create');
  if (!entry) throw new Error('Could not find the Create button.');
  b('click', String(entry.ref));
  log('Creating the key…');
  if (!waitFor(() => String(evalJs("(() => document.body.innerText.includes('API key created'))()")) === 'true', 60)) throw new Error('The key panel did not appear — check the Chrome window.');

  // 5. Hand over to the user
  if (!fs.existsSync(ENV)) fs.copyFileSync(path.join(ROOT, '.env.example'), ENV);
  log('\n=== YOUR TURN ===');
  log('The "API key created" panel is open in Chrome. Click the copy icon next to the key,');
  log(`then paste it into ${ENV} after  YT_API_KEY=  (no quotes/spaces) and save.`);
  log('Waiting for the key to appear in .env (up to 10 min)…');

  if (!waitFor(() => readKey().length >= 30, 600, 3)) throw new Error('Timed out waiting for the key in .env. Run the server later once you paste it.');

  // 6. Verify without printing the key (new keys can take a minute to start working)
  const key = readKey();
  log('Key found in .env (' + key.length + ' chars, not shown). Checking it with YouTube…');
  let ok = false, msg = '';
  for (let i = 0; i < 8 && !ok; i++) {
    const r = await fetch('https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=' + encodeURIComponent(key));
    if (r.ok) ok = true; else { msg = (await r.json().catch(() => ({})))?.error?.message || 'HTTP ' + r.status; if (i < 7) { log('  not active yet, retrying…'); sleep(8); } }
  }
  if (!ok) throw new Error('YouTube rejected the key: ' + msg);
  log('Key works. Start the dashboard with:  node server.mjs');
  try { b('close'); } catch {}
}

main().catch((e) => { console.error('\nSetup stopped: ' + e.message); process.exitCode = 1; }).finally(() => rl.close());
