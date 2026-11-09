// Keyword expansion via YouTube's public autocomplete endpoint (unofficial, free, no quota).
import { cacheGet, cacheSet } from './store.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = 24 * 3600 * 1000;

export async function suggest(q) {
  const key = 'ac:' + q.toLowerCase();
  const hit = cacheGet(key);
  if (hit) return hit;
  const url = 'https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=en&q=' + encodeURIComponent(q);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('autocomplete HTTP ' + res.status);
  const data = await res.json();
  const list = Array.isArray(data[1]) ? data[1] : [];
  cacheSet(key, list, 3 * DAY);
  return list;
}

const QUESTIONS = ['how to', 'why', 'what is', 'best', 'vs', 'for beginners', 'mistakes', 'tips'];

// Expands a seed by alphabet and question modifiers. Returns ranked unique keywords.
// A keyword's "autocompleteScore" is higher when it shows up near the top, and across more probes.
export async function expand(seed, { alphabet = true, questions = true } = {}) {
  const probes = [seed];
  if (alphabet) for (const c of 'abcdefghijklmnopqrstuvwxyz') probes.push(`${seed} ${c}`);
  if (questions) for (const m of QUESTIONS) probes.push(`${m} ${seed}`, `${seed} ${m}`);

  const scores = new Map();
  for (const p of probes) {
    let list = [];
    try { list = await suggest(p); } catch { continue; }
    list.forEach((kw, i) => {
      const w = (10 - Math.min(i, 9)) / 10 + (p === seed ? 1 : 0);
      scores.set(kw, (scores.get(kw) || 0) + w);
    });
    await sleep(120); // human-ish pacing
  }
  return [...scores.entries()]
    .map(([keyword, s]) => ({ keyword, autocompleteScore: Math.round(s * 100) / 100 }))
    .sort((a, b) => b.autocompleteScore - a.autocompleteScore);
}
