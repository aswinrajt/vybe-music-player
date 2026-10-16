import { useState } from "react";
import { AlertTriangle, ListMusic, Loader2, Pause, Play, SkipBack, SkipForward, Volume1, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/player/PlayerProvider";
import { FavButton, fmt } from "./bits";

export function PlayerBar() {
  const p = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);
  const t = p.current;
  const pct = p.duration ? (p.currentTime / p.duration) * 100 : 0;
  const vol = p.muted ? 0 : p.volume;
  const idx = t ? p.queue.findIndex((x) => x.id === t.id) : -1;
  const VolIcon = vol === 0 ? VolumeX : vol < 0.5 ? Volume1 : Volume2;

  return (
    <>
      {queueOpen && (
        <aside aria-label="Queue" className="fixed bottom-28 right-4 z-40 max-h-[60vh] w-[min(22rem,calc(100vw-2rem))] overflow-auto rounded-2xl border bg-popover p-3 shadow-glow animate-in fade-in slide-in-from-bottom-2">
          <div className="mb-2 flex items-center justify-between px-2">
            <h2 className="font-semibold">Up next</h2>
            <button onClick={() => setQueueOpen(false)} aria-label="Close queue" className="rounded-full p-1 hover:bg-accent"><X className="size-4" /></button>
          </div>
          {p.queue.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Queue is empty. Play something!</p>
          ) : (
            p.queue.map((q, i) => (
              <div key={q.id} className={cn("flex items-center gap-3 rounded-lg px-2 py-1.5", i === idx && "bg-accent")}>
                <button onClick={() => p.playTrack(q, p.queue)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <img src={q.artworkUrl} alt="" width={32} height={32} className="size-8 rounded object-cover" />
                  <span className="min-w-0">
                    <span className={cn("block truncate text-sm", i === idx && "text-primary")}>{q.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{q.artist}</span>
                  </span>
                </button>
                {i !== idx && (
                  <button onClick={() => p.removeFromQueue(q.id)} aria-label={`Remove ${q.title} from queue`} className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
                )}
              </div>
            ))
          )}
        </aside>
      )}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-surface backdrop-blur-xl md:bottom-0">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 md:gap-6 md:px-6 md:py-3">
          {/* Track info */}
          <div className="flex min-w-0 flex-1 items-center gap-3 md:w-1/4 md:flex-none">
            {t ? (
              <>
                <img src={t.artworkUrl} alt="" width={48} height={48} className={cn("size-11 rounded-lg object-cover md:size-14", p.status === "playing" && "shadow-glow")} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.title}</p>
                  {p.status === "error" ? (
                    <p className="flex items-center gap-1 truncate text-xs text-destructive" role="alert"><AlertTriangle className="size-3" /> Playback failed</p>
                  ) : (
                    <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
                  )}
                </div>
                <FavButton id={t.id} className="hidden sm:inline-flex" />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing playing — try Surprise Me</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center md:flex-1">
            <div className="flex items-center gap-1 md:gap-3">
              <button onClick={p.prev} disabled={!t} aria-label="Previous track" className="hidden rounded-full p-2 text-muted-foreground hover:text-foreground disabled:opacity-40 sm:block"><SkipBack className="size-5" fill="currentColor" /></button>
              <button
                onClick={p.toggle}
                disabled={!t}
                aria-label={p.status === "playing" ? "Pause" : p.status === "error" ? "Retry" : "Play"}
                className="grid size-10 place-items-center rounded-full bg-foreground text-background transition-transform hover:scale-105 disabled:opacity-40"
              >
                {p.status === "loading" ? <Loader2 className="size-5 animate-spin" /> : p.status === "playing" ? <Pause className="size-5" fill="currentColor" /> : <Play className="ml-0.5 size-5" fill="currentColor" />}
              </button>
              <button onClick={p.next} disabled={!t || idx >= p.queue.length - 1} aria-label="Next track" className="rounded-full p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"><SkipForward className="size-5" fill="currentColor" /></button>
            </div>
            <div className="mt-1 hidden w-full max-w-xl items-center gap-2 text-xs tabular-nums text-muted-foreground md:flex">
              <span className="w-10 text-right">{fmt(p.currentTime)}</span>
              <input
                type="range" min={0} max={p.duration || 0} step={0.1} value={p.currentTime}
                onChange={(e) => p.seek(Number(e.target.value))}
                disabled={!t || !p.duration} aria-label="Seek"
                className="range flex-1" style={{ ["--pct" as string]: `${pct}%` }}
              />
              <span className="w-10">{fmt(p.duration)}</span>
            </div>
          </div>

          {/* Volume + queue */}
          <div className="flex items-center justify-end gap-2 md:w-1/4">
            <button onClick={p.toggleMute} aria-label={p.muted ? "Unmute" : "Mute"} className="hidden rounded-full p-2 text-muted-foreground hover:text-foreground md:block"><VolIcon className="size-5" /></button>
            <input
              type="range" min={0} max={1} step={0.01} value={vol}
              onChange={(e) => p.setVolume(Number(e.target.value))}
              aria-label="Volume" className="range hidden w-24 md:block" style={{ ["--pct" as string]: `${vol * 100}%` }}
            />
            <button onClick={() => setQueueOpen((o) => !o)} aria-label="Toggle queue" aria-expanded={queueOpen} className={cn("rounded-full p-2 hover:text-foreground", queueOpen ? "text-primary" : "text-muted-foreground")}><ListMusic className="size-5" /></button>
          </div>
        </div>
        {/* Mobile progress */}
        <input
          type="range" min={0} max={p.duration || 0} step={0.1} value={p.currentTime}
          onChange={(e) => p.seek(Number(e.target.value))} disabled={!t || !p.duration} aria-label="Seek"
          className="range absolute inset-x-0 top-0 block w-full rounded-none md:hidden" style={{ ["--pct" as string]: `${pct}%`, height: 3 }}
        />
        {p.error && <p className="sr-only" role="status">{p.error}</p>}
      </div>
    </>
  );
}
