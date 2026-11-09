// Google Trends "YouTube Search" interest over plain HTTP — the same internal endpoints trends.google.com calls.
// Unofficial: no key, no quota, but Google may rate-limit (429) or change it. Values are RELATIVE, never absolute counts.
//
// Trends scales every comparison so the peak term = 100. To compare keywords across batches we always include one
// fixed ANCHOR term (the niche seed) in every request and report each keyword as a % of the anchor's average interest.
import { cacheGet, cacheSet } from './store.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const DAY = 24 * 3600 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (t) => JSON.parse(t.replace(/^\)\]\}',?\n?/, ''));
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export class TrendsError extends Error {}

let session = { cookie: '', at: 0 };
async function getCookie(force = false) {
  if (!force && session.cookie && Date.now() - session.at < 30 * 60 * 1000) return session.cookie;
  const r = await fetch('https://trends.google.com/trends/?geo=US', { headers: { 'User-Agent': UA } });
  session = { cookie: r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; '), at: Date.now() };
  return session.cookie;
}

async function get(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const cookie = await getCookie(attempt > 0);
    const r = await fetch(url, { headers: { 'User-Agent': UA, cookie } });
    if (r.status === 429) {
      if (attempt === 0) { await sleep(4000); continue; }
      throw new TrendsError('Google Trends is rate-limiting this IP (429). Wait a few minutes and retry with fewer keywords.');
    }
    if (!r.ok) throw new TrendsError('Google Trends HTTP ' + r.status);
    return strip(await r.text());
  }
}

// One comparison of up to 5 terms. Returns the weekly series for each, in order.
async function compare(terms, geo) {
  const req = { comparisonItem: terms.map((keyword) => ({ keyword, geo, time: 'today 12-m' })), category: 0, property: 'youtube' };
  const ex = await get('https://trends.google.com/trends/api/explore?hl=en-US&tz=0&req=' + encodeURIComponent(JSON.stringify(req)));
  const ts = ex.widgets?.find((w) => w.id === 'TIMESERIES');
  if (!ts) throw new TrendsError('Google Trends returned no timeline widget');
  const dm = await get('https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=0&req=' + encodeURIComponent(JSON.stringify(ts.request)) + '&token=' + ts.token);
  const rows = dm.default?.timelineData || [];
  return terms.map((_, i) => rows.map((p) => Number(p.value?.[i] ?? 0)));
}

function summarize(series, anchorAvg) {
  const avg = mean(series);
  const recent = mean(series.slice(-13));
  const prior = mean(series.slice(-26, -13));
  const ratio = (recent + 0.5) / (prior + 0.5);
  return {
    interest: anchorAvg > 0 ? Math.round((100 * avg) / anchorAvg) : null, // 100 = same interest as the anchor
    growthPct: Math.round((ratio - 1) * 100),
    trend: ratio > 1.25 ? 'rising' : ratio < 0.8 ? 'falling' : 'steady',
  };
}

// keywords -> { [keyword]: {interest, growthPct, trend} }
export async function interest(anchor, keywords, geo = 'US') {
  const a = anchor.trim().toLowerCase();
  const out = {};
  const todo = [];
  for (const raw of keywords) {
    const kw = raw.trim().toLowerCase();
    if (!kw || out[raw] || todo.includes(kw)) continue;
    if (kw === a) { out[raw] = { interest: 100, growthPct: 0, trend: 'steady' }; continue; }
    const hit = cacheGet(`tr:${geo}:${a}:${kw}`);
    if (hit) out[raw] = hit; else todo.push(kw);
  }
  for (let i = 0; i < todo.length; i += 4) {
    const chunk = todo.slice(i, i + 4);
    const series = await compare([a, ...chunk], geo);
    const anchorAvg = mean(series[0]);
    chunk.forEach((kw, j) => {
      const res = summarize(series[j + 1], anchorAvg);
      cacheSet(`tr:${geo}:${a}:${kw}`, res, DAY);
      out[kw] = res;
    });
    if (i + 4 < todo.length) await sleep(1500); // be gentle
  }
  // keyed by the caller's original spelling
  const final = {};
  for (const raw of keywords) final[raw] = out[raw] || out[raw.trim().toLowerCase()] || null;
  return final;
}
