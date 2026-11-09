// Tiny JSON-file cache + daily quota ledger. No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const FILE = path.join(DIR, 'cache.json');
fs.mkdirSync(DIR, { recursive: true });

let db = { cache: {}, quota: {} };
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
db.cache ||= {}; db.quota ||= {};

let timer = null;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => fs.writeFileSync(FILE, JSON.stringify(db)), 200);
}

export function cacheGet(key) {
  const e = db.cache[key];
  if (!e) return null;
  if (e.exp < Date.now()) { delete db.cache[key]; return null; }
  return e.val;
}
export function cacheSet(key, val, ttlMs) {
  db.cache[key] = { exp: Date.now() + ttlMs, val };
  save();
}

// YouTube quota resets at midnight Pacific Time.
export function quotaDay() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}
export function quotaUsed() { return db.quota[quotaDay()] || 0; }
export function quotaAdd(units) {
  const d = quotaDay();
  db.quota[d] = (db.quota[d] || 0) + units;
  save();
}
