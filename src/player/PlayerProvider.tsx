import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { musicProvider } from "@/lib/music/provider";
import { recommend, surprise as pickSurprise } from "@/lib/music/recommend";
import type { Activity, Mood, Track } from "@/lib/music/types";
import { load, save } from "@/lib/storage";

type Status = "idle" | "loading" | "playing" | "paused" | "error";

interface PlayerCtx {
  tracks: Track[];
  catalogLoading: boolean;
  catalogError: string | null;
  current: Track | null;
  queue: Track[];
  status: Status;
  error: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  favourites: string[];
  recent: string[];
  mood: Mood | null;
  activity: Activity | null;
  theme: "dark" | "light";
  playTrack: (t: Track, queue?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleFavourite: (id: string) => void;
  setMood: (m: Mood | null) => void;
  setActivity: (a: Activity | null) => void;
  setTheme: (t: "dark" | "light") => void;
  surpriseMe: () => void;
  removeFromQueue: (id: string) => void;
  clearRecent: () => void;
}

const Ctx = createContext<PlayerCtx | null>(null);

export function usePlayer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer must be used within PlayerProvider");
  return c;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [index, setIndex] = useState(-1);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVol] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [mood, setMoodS] = useState<Mood | null>(null);
  const [activity, setActivityS] = useState<Activity | null>(null);
  const [theme, setThemeS] = useState<"dark" | "light">("dark");
  const [unplayable, setUnplayable] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    setFavourites(load("favourites", []));
    setRecent(load("recent", []));
    setMoodS(load("mood", null));
    setActivityS(load("activity", null));
    setThemeS(load("theme", "dark"));
    setVol(load("volume", 0.8));
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) save("favourites", favourites); }, [favourites, hydrated]);
  useEffect(() => { if (hydrated) save("recent", recent); }, [recent, hydrated]);
  useEffect(() => { if (hydrated) save("mood", mood); }, [mood, hydrated]);
  useEffect(() => { if (hydrated) save("activity", activity); }, [activity, hydrated]);
  useEffect(() => { if (hydrated) save("volume", volume); }, [volume, hydrated]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (hydrated) save("theme", theme);
  }, [theme, hydrated]);

  useEffect(() => {
    musicProvider
      .listTracks()
      .then(setTracks)
      .catch(() => setCatalogError("Couldn't load the music catalogue."))
      .finally(() => setCatalogLoading(false));
  }, []);

  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);
  const queue = useMemo(() => queueIds.map((id) => byId.get(id)).filter(Boolean) as Track[], [queueIds, byId]);
  const current = index >= 0 ? queue[index] ?? null : null;

  // Single shared audio element
  useEffect(() => {
    const a = new Audio();
    a.preload = "metadata";
    audioRef.current = a;
    const on = (e: string, f: () => void) => a.addEventListener(e, f);
    on("loadstart", () => setStatus("loading"));
    on("waiting", () => setStatus("loading"));
    on("playing", () => setStatus("playing"));
    on("pause", () => setStatus((s) => (s === "error" ? s : "paused")));
    on("timeupdate", () => setCurrentTime(a.currentTime));
    on("durationchange", () => setDuration(isFinite(a.duration) ? a.duration : 0));
    return () => { a.pause(); a.src = ""; };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
  }, [volume, muted]);

  const advance = useCallback((dir: 1 | -1) => {
    setIndex((i) => {
      const n = i + dir;
      return n >= 0 && n < queueIds.length ? n : i;
    });
  }, [queueIds.length]);

  // Ended / error handlers depend on queue
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => {
      if (index < queueIds.length - 1) setIndex(index + 1);
      else setStatus("paused");
    };
    const onError = () => {
      if (!a.src || !current) return;
      setStatus("error");
      setError(`"${current.title}" couldn't be played. The source may be unavailable.`);
      setUnplayable((u) => (u.includes(current.id) ? u : [...u, current.id]));
      toast.error(`Couldn't play "${current.title}"`);
    };
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => { a.removeEventListener("ended", onEnded); a.removeEventListener("error", onError); };
  }, [index, queueIds.length, current]);

  // Load source when current track changes
  const currentId = current?.id;
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    a.src = current.audioUrl;
    a.play().catch((e: DOMException) => {
      if (e.name === "NotAllowedError") setStatus("paused");
    });
    setRecent((r) => [current.id, ...r.filter((x) => x !== current.id)].slice(0, 20));
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: current.title, artist: current.artist, artwork: [{ src: current.artworkUrl }] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const playTrack = useCallback((t: Track, q?: Track[]) => {
    const list = q && q.some((x) => x.id === t.id) ? q : [t];
    const ids = list.map((x) => x.id);
    if (current?.id === t.id) {
      const a = audioRef.current;
      if (a) { a.currentTime = 0; a.play().catch(() => {}); }
    }
    setQueueIds(ids);
    setIndex(ids.indexOf(t.id));
  }, [current?.id]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (status === "error") { setError(null); a.load(); a.play().catch(() => {}); return; }
    if (a.paused) a.play().catch(() => setStatus("paused"));
    else a.pause();
  }, [current, status]);

  const next = useCallback(() => advance(1), [advance]);
  const prev = useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) { a.currentTime = 0; return; }
    advance(-1);
  }, [advance]);

  const seek = useCallback((s: number) => {
    const a = audioRef.current;
    if (a && isFinite(s)) { a.currentTime = s; setCurrentTime(s); }
  }, []);

  const surpriseMe = useCallback(() => {
    const t = pickSurprise(tracks, { mood, activity, recent, unplayable });
    if (!t) { toast.error("No playable tracks available right now."); return; }
    toast(`Surprise: ${t.title}`, { description: [mood, activity].filter(Boolean).join(" · ") || "Anything goes" });
    const rest = recommend(tracks, mood, activity).filter((x) => x.id !== t.id && !unplayable.includes(x.id));
    playTrack(t, [t, ...rest]);
  }, [tracks, mood, activity, recent, unplayable, playTrack]);

  const value: PlayerCtx = {
    tracks, catalogLoading, catalogError, current, queue, status, error, currentTime, duration, volume, muted,
    favourites, recent, mood, activity, theme,
    playTrack, toggle, next, prev, seek,
    setVolume: (v) => { setVol(v); if (v > 0) setMuted(false); },
    toggleMute: () => setMuted((m) => !m),
    toggleFavourite: (id) => setFavourites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [id, ...f])),
    setMood: setMoodS, setActivity: setActivityS, setTheme: setThemeS, surpriseMe,
    removeFromQueue: (id) => {
      const i = queueIds.indexOf(id);
      if (i < 0 || i === index) return;
      setQueueIds((q) => q.filter((x) => x !== id));
      if (i < index) setIndex(index - 1);
    },
    clearRecent: () => setRecent([]),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
