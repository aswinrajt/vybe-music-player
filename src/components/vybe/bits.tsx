import { Heart, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/player/PlayerProvider";
import type { Track } from "@/lib/music/types";

export function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function Chips<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T | null; onChange: (v: T | null) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            aria-pressed={on}
            onClick={() => onChange(on ? null : o)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-all",
              on ? "border-transparent bg-gradient-primary text-primary-foreground shadow-glow" : "bg-card hover:border-primary/50 hover:bg-accent",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function Equalizer() {
  return (
    <span className="flex h-3.5 items-end gap-0.5" aria-hidden>
      {[0, 0.2, 0.4].map((d) => (
        <span key={d} className="eq-bar h-full w-0.5 rounded bg-primary" style={{ animationDelay: `${d}s` }} />
      ))}
    </span>
  );
}

export function FavButton({ id, className }: { id: string; className?: string }) {
  const { favourites, toggleFavourite } = usePlayer();
  const on = favourites.includes(id);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggleFavourite(id); }}
      aria-label={on ? "Remove from favourites" : "Add to favourites"}
      aria-pressed={on}
      className={cn("rounded-full p-2 transition-colors hover:bg-accent", on ? "text-primary" : "text-muted-foreground", className)}
    >
      <Heart className="size-4" fill={on ? "currentColor" : "none"} />
    </button>
  );
}

export function TrackCard({ track, list }: { track: Track; list: Track[] }) {
  const { current, status, playTrack, toggle } = usePlayer();
  const isCur = current?.id === track.id;
  const playing = isCur && (status === "playing" || status === "loading");
  return (
    <div className="group relative rounded-2xl bg-card p-3 transition-all hover:-translate-y-1 hover:shadow-glow">
      <div className="relative overflow-hidden rounded-xl">
        <img src={track.artworkUrl} alt="" loading="lazy" width={816} height={816} className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <button
          onClick={() => (isCur ? toggle() : playTrack(track, list))}
          aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
          className={cn("absolute bottom-3 right-3 grid size-11 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow transition-all", playing ? "opacity-100" : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:opacity-100")}
        >
          {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="ml-0.5 size-5" fill="currentColor" />}
        </button>
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("truncate font-semibold", isCur && "text-primary")}>{track.title}</p>
          <p className="truncate text-sm text-muted-foreground">{track.artist} · {track.genre}</p>
        </div>
        <FavButton id={track.id} className="-mr-1 shrink-0" />
      </div>
    </div>
  );
}

export function TrackRow({ track, list, n }: { track: Track; list: Track[]; n: number }) {
  const { current, status, playTrack, toggle } = usePlayer();
  const isCur = current?.id === track.id;
  return (
    <div
      className={cn("group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-accent/60", isCur && "bg-accent/60")}
    >
      <button
        onClick={() => (isCur ? toggle() : playTrack(track, list))}
        aria-label={isCur && status === "playing" ? `Pause ${track.title}` : `Play ${track.title}`}
        className="grid w-6 place-items-center text-sm text-muted-foreground"
      >
        {isCur && status === "playing" ? <Equalizer /> : <span className="group-hover:hidden">{n}</span>}
        <Play className={cn("hidden size-4 text-foreground", !(isCur && status === "playing") && "group-hover:block")} fill="currentColor" />
      </button>
      <img src={track.artworkUrl} alt="" loading="lazy" width={40} height={40} className="size-10 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", isCur && "text-primary")}>{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
      </div>
      <div className="hidden gap-1 md:flex">
        {track.moods.map((m) => <span key={m} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{m}</span>)}
      </div>
      <span className="hidden w-24 text-right text-xs text-muted-foreground sm:block">{track.genre}</span>
      <FavButton id={track.id} />
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-busy="true" aria-label="Loading tracks">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl bg-card p-3">
          <div className="aspect-square rounded-xl bg-muted" />
          <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
          <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
