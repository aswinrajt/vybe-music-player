import type { Activity, Mood, Track } from "./types";

export function score(t: Track, mood?: Mood | null, activity?: Activity | null) {
  return (mood && t.moods.includes(mood) ? 2 : 0) + (activity && t.activities.includes(activity) ? 1 : 0);
}

export function recommend(tracks: Track[], mood?: Mood | null, activity?: Activity | null) {
  if (!mood && !activity) return tracks;
  return tracks.filter((t) => score(t, mood, activity) > 0).sort((a, b) => score(b, mood, activity) - score(a, mood, activity));
}

/**
 * Pick a random suitable track. Excludes unplayable ids, prefers the best match
 * score, and avoids recently played tracks when an alternative exists.
 */
export function surprise(
  tracks: Track[],
  opts: { mood?: Mood | null; activity?: Activity | null; recent?: string[]; unplayable?: string[]; rand?: () => number },
): Track | null {
  const rand = opts.rand ?? Math.random;
  const playable = tracks.filter((t) => !opts.unplayable?.includes(t.id));
  if (!playable.length) return null;
  const matched = recommend(playable, opts.mood, opts.activity);
  let pool = matched.length ? matched : playable;
  const fresh = pool.filter((t) => !opts.recent?.includes(t.id));
  if (fresh.length) pool = fresh;
  else if (pool.length > 1 && opts.recent?.[0]) pool = pool.filter((t) => t.id !== opts.recent![0]);
  const best = Math.max(...pool.map((t) => score(t, opts.mood, opts.activity)));
  const top = pool.filter((t) => score(t, opts.mood, opts.activity) === best);
  return top[Math.floor(rand() * top.length)] ?? null;
}
