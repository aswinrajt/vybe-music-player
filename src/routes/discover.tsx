import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ACTIVITIES, MOODS, type Activity, type Mood } from "@/lib/music/types";
import { usePlayer } from "@/player/PlayerProvider";
import { Chips, EmptyState, GridSkeleton, TrackRow } from "@/components/vybe/bits";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover — VYBE" },
      { name: "description", content: "Browse and filter songs by mood, activity and genre." },
      { property: "og:title", content: "Discover — VYBE" },
      { property: "og:description", content: "Browse and filter songs by mood, activity and genre." },
    ],
  }),
  component: Discover,
});

function Discover() {
  const { tracks, catalogLoading } = usePlayer();
  const [mood, setMood] = useState<Mood | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const genres = useMemo(() => [...new Set(tracks.map((t) => t.genre))].sort(), [tracks]);
  const list = tracks.filter(
    (t) =>
      (!mood || t.moods.includes(mood)) &&
      (!activity || t.activities.includes(activity)) &&
      (!genre || t.genre === genre) &&
      (!q || `${t.title} ${t.artist}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold">Discover</h1>
      <label className="flex items-center gap-2 rounded-full border bg-card px-4 py-2.5 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search songs" aria-label="Search songs" className="w-full bg-transparent text-sm outline-none" />
      </label>
      <div className="space-y-4">
        <Filter label="Mood"><Chips label="Mood" options={MOODS} value={mood} onChange={setMood} /></Filter>
        <Filter label="Activity"><Chips label="Activity" options={ACTIVITIES} value={activity} onChange={setActivity} /></Filter>
        <Filter label="Genre"><Chips label="Genre" options={genres} value={genre} onChange={setGenre} /></Filter>
      </div>
      <p className="text-sm text-muted-foreground">{list.length} songs</p>
      {catalogLoading ? <GridSkeleton /> : list.length === 0 ? (
        <EmptyState title="Nothing matches those filters" body="Loosen a filter to see more music." />
      ) : (
        <div className="rounded-2xl border bg-card p-2">
          {list.map((t, i) => <TrackRow key={t.id} track={t} list={list} n={i + 1} />)}
        </div>
      )}
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <span className="w-20 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
