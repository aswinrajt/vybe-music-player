import { describe, expect, it } from "vitest";
import { DEMO_TRACKS } from "./demo-catalog";
import { surprise } from "./recommend";

describe("surprise", () => {
  it("returns a track matching the selected mood", () => {
    for (let i = 0; i < 20; i++) {
      expect(surprise(DEMO_TRACKS, { mood: "Sleepy" })!.moods).toContain("Sleepy");
    }
  });
  it("avoids recently played tracks when possible", () => {
    const sleepy = DEMO_TRACKS.filter((t) => t.moods.includes("Sleepy")).map((t) => t.id);
    const recent = sleepy.slice(0, -1);
    expect(surprise(DEMO_TRACKS, { mood: "Sleepy", recent })!.id).toBe(sleepy[sleepy.length - 1]);
  });
  it("never returns an unplayable track", () => {
    const unplayable = DEMO_TRACKS.slice(1).map((t) => t.id);
    expect(surprise(DEMO_TRACKS, { unplayable })!.id).toBe(DEMO_TRACKS[0].id);
    expect(surprise(DEMO_TRACKS, { unplayable: DEMO_TRACKS.map((t) => t.id) })).toBeNull();
  });
});
