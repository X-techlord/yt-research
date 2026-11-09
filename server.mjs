// Local dashboard server. Zero dependencies (Node 18+). Run: node server.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Minimal .env loader (never printed).
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const { expand } = await import('./lib/autocomplete.mjs');
const { searchVideos, getVideos, getChannels, QuotaError } = await import('./lib/youtube.mjs');
const { analyze, durationSec, SHORTS_MAX_SEC } = await import('./lib/analyze.mjs');
const { quotaUsed } = await import('./lib/store.mjs');
const { interest, TrendsError } = await import('./lib/trends.mjs');

const PORT = Number(process.env.PORT || 1402);
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

const TOP_N = 20;

async function analyzeKeyword(keyword, longform) {
  const s = await searchVideos(keyword);
  const order = new Map(s.ids.map((id, i) => [id, i]));
  const all = (await getVideos(s.ids)).sort((a, b) => order.get(a.id) - order.get(b.id));
  const isShort = (v) => durationSec(v.duration) <= SHORTS_MAX_SEC;
  const shortsHidden = longform ? all.filter(isShort).length : 0;
  const videos = (longform ? all.filter((v) => !isShort(v)) : all).slice(0, TOP_N);
  const channels = await getChannels(videos.map((v) => v.channelId));
  const result = analyze(keyword, videos, channels, s.total);
  return { ...result, longform, shortsHidden, analyzed: videos.length };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api/status') {
      return json(res, 200, {
        hasKey: !!process.env.YT_API_KEY,
        quotaUsed: quotaUsed(),
        quotaBudget: Number(process.env.DAILY_QUOTA_BUDGET || 9000),
      });
    }
    if (url.pathname === '/api/expand') {
      const seed = (url.searchParams.get('seed') || '').trim();
      if (!seed) return json(res, 400, { error: 'seed required' });
      return json(res, 200, { seed, keywords: await expand(seed) });
    }
    if (url.pathname === '/api/trends') {
      const anchor = (url.searchParams.get('anchor') || '').trim();
      const ks = url.searchParams.getAll('k').map((k) => k.trim()).filter(Boolean).slice(0, 24);
      if (!anchor || !ks.length) return json(res, 400, { error: 'anchor and at least one k required' });
      const geo = (url.searchParams.get('geo') || 'US').toUpperCase();
      return json(res, 200, { anchor, geo, results: await interest(anchor, ks, geo) });
    }
    if (url.pathname === '/api/analyze') {
      const kw = (url.searchParams.get('keyword') || '').trim();
      if (!kw) return json(res, 400, { error: 'keyword required' });
      const longform = url.searchParams.get('longform') !== '0'; // default: hide Shorts
      const result = await analyzeKeyword(kw, longform);
      return json(res, 200, { ...result, quotaUsed: quotaUsed() });
    }
    // static files
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const full = path.join(ROOT, 'public', file);
    if (!full.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(full)) { res.writeHead(404); return res.end('not found'); }
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(full)] || 'text/plain';
    res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
    res.end(fs.readFileSync(full));
  } catch (e) {
    json(res, e instanceof QuotaError || e instanceof TrendsError ? 429 : 500, { error: e.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`yt-research running at http://localhost:${PORT}`);
  if (!process.env.YT_API_KEY) {
    console.log('\nNO YT_API_KEY in .env — analysis is disabled (keyword expansion still works).');
    console.log('Run:  node setup-key.mjs   (asks for your OpenCLI profile ID, enables the API and creates the key;');
    console.log('you only copy the key into .env). Manual steps: docs/api-key-setup.md');
  }
});
