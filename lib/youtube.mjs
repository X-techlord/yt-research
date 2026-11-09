// YouTube Data API v3 wrapper with caching and a daily quota budget.
// Costs: search.list = 100 units, videos.list = 1, channels.list = 1.
import { cacheGet, cacheSet, quotaAdd, quotaUsed } from './store.mjs';

const BASE = 'https://www.googleapis.com/youtube/v3';
const HOUR = 3600 * 1000;

export class QuotaError extends Error {}

function budget() { return Number(process.env.DAILY_QUOTA_BUDGET || 9000); }

async function call(endpoint, params, cost) {
  const key = process.env.YT_API_KEY;
  if (!key) throw new Error('YT_API_KEY missing — add it to .env');
  if (quotaUsed() + cost > budget()) throw new QuotaError(`Daily quota budget (${budget()}) reached`);
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`${BASE}/${endpoint}?${qs}`);
  const body = await res.json();
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason;
    if (reason === 'quotaExceeded') throw new QuotaError('YouTube says quota exceeded for today');
    // Never echo the URL (it contains the key).
    throw new Error(`YouTube API ${res.status}: ${body?.error?.message || 'error'}`);
  }
  quotaAdd(cost);
  return body;
}

// max=50 costs the same 100 units as 20, and leaves headroom to drop Shorts and still have ~20 videos.
export async function searchVideos(q, { max = 50, regionCode = 'US' } = {}) {
  const ck = `search:${regionCode}:${max}:${q.toLowerCase()}`;
  const hit = cacheGet(ck);
  if (hit) return hit;
  const body = await call('search', { part: 'snippet', type: 'video', q, maxResults: max, order: 'relevance', regionCode }, 100);
  const out = { total: body.pageInfo?.totalResults ?? 0, ids: body.items.map((i) => i.id.videoId) };
  cacheSet(ck, out, 12 * HOUR);
  return out;
}

export async function getVideos(ids) {
  if (!ids.length) return [];
  const ck = 'videos:' + ids.join(',');
  const hit = cacheGet(ck);
  if (hit) return hit;
  const body = await call('videos', { part: 'snippet,statistics,contentDetails', id: ids.join(',') }, 1);
  const out = body.items.map((v) => ({
    id: v.id,
    title: v.snippet.title,
    channelId: v.snippet.channelId,
    channelTitle: v.snippet.channelTitle,
    publishedAt: v.snippet.publishedAt,
    views: Number(v.statistics.viewCount || 0),
    likes: Number(v.statistics.likeCount || 0),
    comments: Number(v.statistics.commentCount || 0),
    duration: v.contentDetails.duration,
    tags: v.snippet.tags || [],
    thumb: v.snippet.thumbnails?.medium?.url || '',
  }));
  cacheSet(ck, out, 6 * HOUR);
  return out;
}

export async function getChannels(ids) {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return {};
  const ck = 'channels:' + uniq.sort().join(',');
  const hit = cacheGet(ck);
  if (hit) return hit;
  const body = await call('channels', { part: 'statistics', id: uniq.join(',') }, 1);
  const out = {};
  for (const c of body.items) {
    out[c.id] = {
      subs: c.statistics.hiddenSubscriberCount ? null : Number(c.statistics.subscriberCount || 0),
      videoCount: Number(c.statistics.videoCount || 0),
      totalViews: Number(c.statistics.viewCount || 0),
    };
  }
  cacheSet(ck, out, 24 * HOUR);
  return out;
}
