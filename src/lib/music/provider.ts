import { DEMO_TRACKS } from "./demo-catalog";
import type { MusicProvider } from "./types";

export const demoProvider: MusicProvider = {
  name: "VYBE demo catalogue (CC BY 4.0)",
  async listTracks() {
    return DEMO_TRACKS;
  },
};

/** The active provider. Replace with a real API-backed provider later. */
export const musicProvider: MusicProvider = demoProvider;
