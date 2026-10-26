import { DEMO_TRACKS } from "./demo-catalog";
import type { MusicProvider, Track } from "./types";
import { getTracksServerFn } from "./tracks-fns";

export const demoProvider: MusicProvider = {
  name: "VYBE demo catalogue (CC BY 4.0)",
  async listTracks(): Promise<Track[]> {
    return DEMO_TRACKS;
  },
};

export const r2MusicProvider: MusicProvider = {
  name: "Cloudflare R2 Music Catalogue",
  async listTracks(): Promise<Track[]> {
    try {
      const tracks = await getTracksServerFn();
      if (Array.isArray(tracks) && tracks.length > 0) {
        return tracks;
      }
      return DEMO_TRACKS;
    } catch (err) {
      console.warn("Failed to fetch tracks from R2 provider, using fallback catalogue:", err);
      return DEMO_TRACKS;
    }
  },
};

/** The active provider connecting the player to Cloudflare R2 */
export const musicProvider: MusicProvider = r2MusicProvider;
