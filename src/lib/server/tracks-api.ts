import {
  getR2Catalog,
  saveR2Catalog,
  uploadToR2,
  deleteFromR2,
  createPresignedUploadUrl,
} from "./r2";
import type { Activity, Mood, Track } from "../music/types";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function generateId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${slug || "track"}-${rand}`;
}

export async function handleTracksApi(
  request: Request,
  env?: Record<string, unknown>,
): Promise<Response> {
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // 1. GET /api/tracks -> List all tracks
    if (request.method === "GET") {
      const tracks = await getR2Catalog(env);
      return jsonResponse({ tracks, count: tracks.length });
    }

    // 2. POST /api/tracks -> Create track (or presign URL)
    if (request.method === "POST") {
      const contentType = request.headers.get("content-type") || "";

      // Check for presign request
      if (
        url.searchParams.get("action") === "presign" ||
        contentType.includes("application/json")
      ) {
        const body = await request.json().catch(() => ({}));
        if (body.action === "presign" || url.searchParams.get("action") === "presign") {
          const { filename, fileType, category = "audio" } = body;
          if (!filename || !fileType) {
            return jsonResponse({ error: "Missing filename or fileType" }, 400);
          }
          const ext = filename.split(".").pop() || (category === "audio" ? "mp3" : "jpg");
          const rand = Math.random().toString(36).substring(2, 9);
          const key = `uploads/${category}-${Date.now()}-${rand}.${ext}`;
          const presigned = await createPresignedUploadUrl(key, fileType, env);
          return jsonResponse({ ...presigned, key });
        }

        // Direct JSON track creation (when URLs are already known or uploaded via presigned URL)
        const {
          title,
          artist,
          genre = "Unknown",
          audioUrl,
          artworkUrl = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
          moods = [],
          activities = [],
          durationHint,
          licenseName = "All Rights Reserved",
          licenseUrl = "",
          attribution,
        } = body;

        if (!title || !artist || !audioUrl) {
          return jsonResponse({ error: "title, artist, and audioUrl are required." }, 400);
        }

        const id = generateId(title);
        const newTrack: Track = {
          id,
          title,
          artist,
          genre,
          durationHint: durationHint ? Number(durationHint) : undefined,
          audioUrl,
          artworkUrl,
          moods: moods as Mood[],
          activities: activities as Activity[],
          license: {
            name: licenseName,
            url: licenseUrl,
            attribution: attribution || artist,
          },
        };

        const currentTracks = await getR2Catalog(env);
        const updatedTracks = [newTrack, ...currentTracks];
        await saveR2Catalog(updatedTracks, env);

        return jsonResponse({ success: true, track: newTrack }, 201);
      }

      // Handle multipart/form-data upload
      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const audioFile = formData.get("audio") as File | null;
        const artworkFile = formData.get("artwork") as File | null;
        const title = (formData.get("title") as string) || "";
        const artist = (formData.get("artist") as string) || "";
        const genre = (formData.get("genre") as string) || "General";
        const durationHint = formData.get("durationHint")
          ? Number(formData.get("durationHint"))
          : undefined;
        const licenseName = (formData.get("licenseName") as string) || "Personal Library";
        const attribution = (formData.get("attribution") as string) || artist;
        const licenseUrl = (formData.get("licenseUrl") as string) || "";

        let moods: Mood[] = [];
        try {
          const moodsRaw = formData.get("moods");
          if (typeof moodsRaw === "string") moods = JSON.parse(moodsRaw);
        } catch {
          moods = [];
        }

        let activities: Activity[] = [];
        try {
          const actsRaw = formData.get("activities");
          if (typeof actsRaw === "string") activities = JSON.parse(actsRaw);
        } catch {
          activities = [];
        }

        if (!title || !artist) {
          return jsonResponse({ error: "Track title and artist are required." }, 400);
        }

        const trackId = generateId(title);

        // Upload audio
        let audioUrl = (formData.get("audioUrl") as string) || "";
        if (audioFile && typeof audioFile.arrayBuffer === "function") {
          const audioExt = audioFile.name.split(".").pop() || "mp3";
          const audioKey = `tracks/${trackId}/audio.${audioExt}`;
          const audioBuffer = new Uint8Array(await audioFile.arrayBuffer());
          audioUrl = await uploadToR2(audioKey, audioBuffer, audioFile.type || "audio/mpeg", env);
        }

        if (!audioUrl) {
          return jsonResponse({ error: "Audio file or audioUrl is required." }, 400);
        }

        // Upload artwork if provided
        let artworkUrl =
          (formData.get("artworkUrl") as string) ||
          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80";
        if (artworkFile && typeof artworkFile.arrayBuffer === "function") {
          const artExt = artworkFile.name.split(".").pop() || "jpg";
          const artKey = `tracks/${trackId}/artwork.${artExt}`;
          const artBuffer = new Uint8Array(await artworkFile.arrayBuffer());
          artworkUrl = await uploadToR2(artKey, artBuffer, artworkFile.type || "image/jpeg", env);
        }

        const newTrack: Track = {
          id: trackId,
          title,
          artist,
          genre,
          durationHint,
          audioUrl,
          artworkUrl,
          moods,
          activities,
          license: {
            name: licenseName,
            url: licenseUrl,
            attribution,
          },
        };

        const currentTracks = await getR2Catalog(env);
        const updated = [newTrack, ...currentTracks];
        await saveR2Catalog(updated, env);

        return jsonResponse({ success: true, track: newTrack }, 201);
      }

      return jsonResponse({ error: "Unsupported Content-Type" }, 400);
    }

    // 3. DELETE /api/tracks/:id or /api/tracks?id=... -> Delete track
    if (request.method === "DELETE") {
      let id = url.searchParams.get("id");
      if (!id) {
        const parts = url.pathname.split("/").filter(Boolean);
        id = parts[parts.length - 1] !== "tracks" ? parts[parts.length - 1] : null;
      }

      if (!id) {
        return jsonResponse({ error: "Track ID is required for deletion." }, 400);
      }

      const currentTracks = await getR2Catalog(env);
      const trackToDelete = currentTracks.find((t) => t.id === id);

      if (!trackToDelete) {
        return jsonResponse({ error: "Track not found." }, 404);
      }

      // Try deleting R2 files if they belong to this track's prefix
      try {
        await deleteFromR2(`tracks/${id}/audio.mp3`, env);
        await deleteFromR2(`tracks/${id}/artwork.jpg`, env);
      } catch (err) {
        console.warn("Error deleting files from R2:", err);
      }

      const remainingTracks = currentTracks.filter((t) => t.id !== id);
      await saveR2Catalog(remainingTracks, env);

      return jsonResponse({ success: true, deletedId: id });
    }

    return jsonResponse({ error: `Method ${request.method} Not Allowed` }, 405);
  } catch (error: unknown) {
    console.error("API error in /api/tracks:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return jsonResponse({ error: message }, 500);
  }
}
