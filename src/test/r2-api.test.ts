import { describe, it, expect, vi } from "vitest";
import { handleTracksApi } from "@/lib/server/tracks-api";

const { mockCatalog } = vi.hoisted(() => {
  return {
    mockCatalog: [
      {
        id: "demo-track-1",
        title: "Sunset Chords",
        artist: "Audio Chill",
        genre: "Lo-Fi",
        audioUrl: "https://example.com/demo.mp3",
        artworkUrl: "https://example.com/demo.jpg",
        moods: ["Calm"],
        activities: ["Relax"],
        license: { name: "CC BY 4.0", url: "", attribution: "Audio Chill" },
      },
    ],
  };
});

vi.mock("@/lib/server/r2", () => {
  let inMemoryCatalog = [...mockCatalog];

  return {
    getR2Catalog: vi.fn(async () => inMemoryCatalog),
    saveR2Catalog: vi.fn(async (tracks) => {
      inMemoryCatalog = tracks;
    }),
    uploadToR2: vi.fn(async (key) => `https://pub-test.r2.dev/${key}`),
    deleteFromR2: vi.fn(async () => {}),
    createPresignedUploadUrl: vi.fn(async (key) => ({
      uploadUrl: `https://mock-upload.r2.cloudflarestorage.com/${key}?signature=mock`,
      publicUrl: `https://pub-test.r2.dev/${key}`,
    })),
  };
});

describe("Cloudflare R2 Music APIs", () => {
  it("GET /api/tracks returns track catalogue", async () => {
    const request = new Request("http://localhost:3000/api/tracks", {
      method: "GET",
    });

    const response = await handleTracksApi(request);
    expect(response.status).toBe(200);

    const body = (await response.json()) as { tracks: unknown[]; count: number };
    expect(Array.isArray(body.tracks)).toBe(true);
    expect(body.count).toBe(body.tracks.length);
  });

  it("POST /api/tracks with JSON creates a new track", async () => {
    const newTrackPayload = {
      title: "Neon Echoes",
      artist: "SynthWave Pro",
      genre: "Synthwave",
      audioUrl: "https://pub-test.r2.dev/tracks/neon-echoes/audio.mp3",
      artworkUrl: "https://pub-test.r2.dev/tracks/neon-echoes/cover.jpg",
      moods: ["Energetic"],
      activities: ["Coding"],
    };

    const request = new Request("http://localhost:3000/api/tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTrackPayload),
    });

    const response = await handleTracksApi(request);
    expect(response.status).toBe(201);

    const body = (await response.json()) as {
      success: boolean;
      track: { title: string; artist: string };
    };
    expect(body.success).toBe(true);
    expect(body.track.title).toBe("Neon Echoes");
    expect(body.track.artist).toBe("SynthWave Pro");
  });

  it("POST /api/tracks?action=presign generates upload url", async () => {
    const request = new Request("http://localhost:3000/api/tracks?action=presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "presign",
        filename: "test-track.mp3",
        fileType: "audio/mpeg",
        category: "audio",
      }),
    });

    const response = await handleTracksApi(request);
    expect(response.status).toBe(200);

    const body = (await response.json()) as { uploadUrl: string; publicUrl: string };
    expect(body.uploadUrl).toContain("mock-upload.r2.cloudflarestorage.com");
    expect(body.publicUrl).toContain("pub-test.r2.dev");
  });

  it("DELETE /api/tracks?id=... deletes a track", async () => {
    const request = new Request(`http://localhost:3000/api/tracks?id=demo-track-1`, {
      method: "DELETE",
    });

    const response = await handleTracksApi(request);
    expect(response.status).toBe(200);

    const body = (await response.json()) as { success: boolean; deletedId: string };
    expect(body.success).toBe(true);
    expect(body.deletedId).toBe("demo-track-1");
  });
});
