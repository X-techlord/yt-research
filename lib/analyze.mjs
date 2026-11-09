// Pure scoring: turns the top search results for a keyword into demand / saturation / opportunity.
// These are RELATIVE ESTIMATES built from public data — not vidIQ's search-volume numbers.

const STOP = new Set('a an and are as at be by for from how i in is it of on or so that the this to was what why with you your my we do does vs not can will get'.split(' '));

// ISO-8601 duration (PT1H2M3S) -> seconds
export function durationSec(iso = '') {
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}
// YouTube Shorts can be up to 3 minutes, so anything <= 180s is treated as a Short.
export const SHORTS_MAX_SEC = 180;

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const words = (t) => t.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean);

export function analyze(keyword, videos, channels, totalResults = 0, now = Date.now()) {
  const kw = words(keyword);
  const rows = videos.map((v) => {
    const ageDays = Math.max(1, (now - new Date(v.publishedAt).getTime()) / 86400000);
    const ch = channels[v.channelId] || {};
    const channelAvg = ch.videoCount ? ch.totalViews / ch.videoCount : null;
    const tw = new Set(words(v.title));
    return {
      ...v,
      ageDays: Math.round(ageDays),
      viewsPerDay: Math.round(v.views / ageDays),
      subs: ch.subs ?? null,
      channelAvgViews: channelAvg ? Math.round(channelAvg) : null,
      outlierRatio: channelAvg ? Math.round((v.views / channelAvg) * 10) / 10 : null,
      exactMatch: kw.every((w) => tw.has(w)),
    };
  });
  const n = rows.length || 1;

  const medVpd = median(rows.map((r) => r.viewsPerDay));
  const demand = clamp((Math.log10(medVpd + 1) / 4) * 100); // 10,000 views/day median => 100

  const known = rows.filter((r) => r.subs != null);
  const bigShare = known.length ? known.filter((r) => r.subs >= 100000).length / known.length : 0;
  const exactShare = rows.filter((r) => r.exactMatch).length / n;
  const saturation = clamp(100 * (0.6 * bigShare + 0.4 * exactShare));

  const smallWinners = rows.filter((r) => r.subs != null && r.subs <= 10000 && r.views >= 10000);
  const base = demand * (1 - 0.7 * (saturation / 100));
  const opportunity = clamp(base + Math.min(25, smallWinners.length * 6));

  // Title patterns
  const freq = new Map();
  for (const r of rows) for (const w of new Set(words(r.title))) if (!STOP.has(w) && !kw.includes(w) && w.length > 2) freq.set(w, (freq.get(w) || 0) + 1);
  const topWords = [...freq.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w, c]) => ({ word: w, count: c }));
  const pct = (f) => Math.round((rows.filter(f).length / n) * 100);
  const patterns = {
    avgTitleLength: Math.round(rows.reduce((s, r) => s + r.title.length, 0) / n),
    pctWithNumber: pct((r) => /\d/.test(r.title)),
    pctWithBrackets: pct((r) => /[\[\(]/.test(r.title)),
    pctQuestion: pct((r) => /\?|^(how|why|what|can|should)\b/i.test(r.title)),
    pctAllCapsWord: pct((r) => /\b[A-Z]{3,}\b/.test(r.title)),
    topWords,
  };

  return {
    keyword,
    totalResults,
    medianViewsPerDay: Math.round(medVpd),
    demand: Math.round(demand),
    saturation: Math.round(saturation),
    opportunity: Math.round(opportunity),
    bigChannelShare: Math.round(bigShare * 100),
    smallChannelWinners: smallWinners.length,
    patterns,
    topVideos: [...rows].sort((a, b) => b.viewsPerDay - a.viewsPerDay).slice(0, 10),
    outliers: rows.filter((r) => r.outlierRatio >= 3).sort((a, b) => b.outlierRatio - a.outlierRatio).slice(0, 5),
  };
}
