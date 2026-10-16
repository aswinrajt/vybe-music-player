export const MOODS = ["Happy", "Calm", "Melancholy", "Energetic", "Focused", "Sleepy"] as const;
export const ACTIVITIES = ["Coding", "Studying", "Workout", "Travel", "Relax"] as const;

export type Mood = (typeof MOODS)[number];
export type Activity = (typeof ACTIVITIES)[number];

export interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  durationHint?: number;
  audioUrl: string;
  artworkUrl: string;
  moods: Mood[];
  activities: Activity[];
  license: { name: string; url: string; attribution: string };
}

/** Replaceable music source. Swap the demo provider for a real API later. */
export interface MusicProvider {
  name: string;
  listTracks(): Promise<Track[]>;
}
