import { createFileRoute } from "@tanstack/react-router";
import { usePlayer } from "@/player/PlayerProvider";
import { EmptyState, GridSkeleton, TrackRow } from "@/components/vybe/bits";
import type { Track } from "@/lib/music/types";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your Library — VYBE" },
      { name: "description", content: "Your favourite and recently played tracks on VYBE." },
      { property: "og:title", content: "Your Library — VYBE" },
      { property: "og:description", content: "Your favourite and recently played tracks on VYBE." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { tracks, favourites, recent, catalogLoading, clearRecent } = usePlayer();
  const pick = (ids: string[]) => ids.map((id) => tracks.find((t) => t.id === id)).filter(Boolean) as Track[];
  const favs = pick(favourites);
  const rec = pick(recent);

  return (
    <div className="space-y-10">
      <h1 className="text-4xl font-extrabold">Library</h1>
      <section>
        <h2 className="mb-3 text-xl font-bold">Favourites</h2>
        {catalogLoading ? <GridSkeleton /> : favs.length === 0 ? (
          <EmptyState title="No favourites yet" body="Tap the heart on any song to save it here." />
        ) : (
          <div className="rounded-2xl border bg-card p-2">{favs.map((t, i) => <TrackRow key={t.id} track={t} list={favs} n={i + 1} />)}</div>
        )}
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Recently played</h2>
          {rec.length > 0 && <button onClick={clearRecent} className="text-sm text-muted-foreground hover:text-foreground">Clear</button>}
        </div>
        {catalogLoading ? null : rec.length === 0 ? (
          <EmptyState title="Nothing played yet" body="Songs you play will show up here." />
        ) : (
          <div className="rounded-2xl border bg-card p-2">{rec.map((t, i) => <TrackRow key={t.id} track={t} list={rec} n={i + 1} />)}</div>
        )}
      </section>
    </div>
  );
}
