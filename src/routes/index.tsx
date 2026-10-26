import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shuffle } from "lucide-react";
import { ACTIVITIES, MOODS } from "@/lib/music/types";
import { recommend } from "@/lib/music/recommend";
import { usePlayer } from "@/player/PlayerProvider";
import { Chips, EmptyState, GridSkeleton, TrackCard } from "@/components/vybe/bits";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VYBE — Music for your mood" },
      { name: "description", content: "Pick a mood and activity, then hit Surprise Me for the perfect track." },
      { property: "og:title", content: "VYBE — Music for your mood" },
      { property: "og:description", content: "Pick a mood and activity, then hit Surprise Me for the perfect track." },
    ],
  }),
  component: Home,
});

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Home() {
  const p = usePlayer();
  const [hello, setHello] = useState("Hello");
  useEffect(() => setHello(greeting()), []);
  const recs = recommend(p.tracks, p.mood, p.activity).slice(0, 10);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border bg-card p-6 md:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-gradient-primary opacity-25 blur-3xl" />
        <p className="text-sm font-medium text-muted-foreground">{hello}</p>
        <h1 className="mt-1 max-w-xl text-4xl font-extrabold md:text-6xl">What's your vybe right now?</h1>
        <button
          onClick={p.surpriseMe}
          disabled={p.catalogLoading || !p.tracks.length}
          className="mt-6 inline-flex items-center gap-3 rounded-full bg-gradient-primary px-7 py-4 text-lg font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
        >
          <Shuffle className="size-5" /> Surprise Me
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          {p.mood || p.activity ? `Tuned for ${[p.mood, p.activity].filter(Boolean).join(" · ")}` : "Pick a mood or activity to tune it"}
        </p>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-bold">Mood</h2>
          <Chips label="Mood" options={MOODS} value={p.mood} onChange={p.setMood} />
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold">Activity</h2>
          <Chips label="Activity" options={ACTIVITIES} value={p.activity} onChange={p.setActivity} />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Recommended for you</h2>
          <Link to="/discover" className="text-sm text-muted-foreground hover:text-foreground">Browse all</Link>
        </div>
        {p.catalogLoading ? <GridSkeleton /> : p.catalogError ? <EmptyState title="Catalogue unavailable" body={p.catalogError} /> : recs.length === 0 ? (
          <EmptyState title="No matches" body="Try a different mood or activity." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {recs.map((t) => <TrackCard key={t.id} track={t} list={recs} />)}
          </div>
        )}
      </section>

      {/* <p className="text-xs text-muted-foreground">
        Demo music by Kevin MacLeod (incompetech.com), licensed under{" "}
        <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
      </p> */}
    </div>
  );
}
