import happy from "@/assets/art-happy.jpg";
import calm from "@/assets/art-calm.jpg";
import melancholy from "@/assets/art-melancholy.jpg";
import energetic from "@/assets/art-energetic.jpg";
import focused from "@/assets/art-focused.jpg";
import sleepy from "@/assets/art-sleepy.jpg";
import type { Activity, Mood, Track } from "./types";

// All tracks: Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0.
// Every URL below was verified to respond with audio before inclusion.
// Audio files are redistributed (as permitted by CC BY 4.0) from Lovable's CDN for fast, reliable playback.
const AUDIO = import.meta.glob<{ url: string }>("@/assets/audio/*.mp3.asset.json", { eager: true, import: "default" });
const audioFor = (id: string) => {
  const hit = Object.entries(AUDIO).find(([k]) => k.endsWith(`/${id}.mp3.asset.json`));
  if (!hit) throw new Error(`Missing audio for ${id}`);
  return hit[1].url;
};
const ART: Record<Mood, string> = { Happy: happy, Calm: calm, Melancholy: melancholy, Energetic: energetic, Focused: focused, Sleepy: sleepy };

function t(file: string, genre: string, moods: Mood[], activities: Activity[]): Track {
  const id = file.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id,
    title: file.replace(/ - faster$/, ""),
    artist: "Kevin MacLeod",
    genre,
    audioUrl: audioFor(id),
    artworkUrl: ART[moods[0]],
    moods,
    activities,
    license: {
      name: "CC BY 4.0",
      url: "https://creativecommons.org/licenses/by/4.0/",
      attribution: `"${file}" Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0`,
    },
  };
}

export const DEMO_TRACKS: Track[] = [
  t("Carefree", "Acoustic", ["Happy"], ["Relax", "Travel"]),
  t("Sneaky Snitch", "Quirky", ["Happy"], ["Coding"]),
  t("Fluffing a Duck", "Quirky", ["Happy"], ["Relax"]),
  t("Monkeys Spinning Monkeys", "Quirky", ["Happy", "Energetic"], ["Travel"]),
  t("Pixel Peeker Polka - faster", "Chiptune", ["Happy", "Energetic"], ["Coding", "Workout"]),
  t("Easy Lemon", "Lounge", ["Calm", "Happy"], ["Studying", "Relax"]),
  t("Local Forecast - Elevator", "Lounge", ["Calm"], ["Coding", "Studying"]),
  t("Airport Lounge", "Jazz", ["Calm"], ["Travel", "Relax"]),
  t("Somewhere Sunny", "Ambient", ["Calm", "Happy"], ["Travel"]),
  t("Wallpaper", "Electronic", ["Focused", "Calm"], ["Coding", "Studying"]),
  t("Thinking Music", "Electronic", ["Focused"], ["Studying", "Coding"]),
  t("Inspired", "Cinematic", ["Focused", "Happy"], ["Studying", "Travel"]),
  t("Hyperfun", "Electronic", ["Energetic", "Happy"], ["Workout"]),
  t("Volatile Reaction", "Rock", ["Energetic"], ["Workout"]),
  t("Rising Game", "Electronic", ["Energetic", "Focused"], ["Workout", "Coding"]),
  t("Sovereign", "Cinematic", ["Melancholy", "Focused"], ["Studying"]),
  t("Lightless Dawn", "Cinematic", ["Melancholy"], ["Relax"]),
  t("Dreamy Flashback", "Ambient", ["Melancholy", "Sleepy"], ["Relax", "Travel"]),
  t("Night Vigil", "Ambient", ["Sleepy", "Melancholy"], ["Relax"]),
  t("Meditation Impromptu 01", "Ambient", ["Sleepy", "Calm"], ["Relax", "Studying"]),
];
