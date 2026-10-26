import { createServerFn } from "@tanstack/react-start";
import type { Track } from "./types";

export const getTracksServerFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getR2Catalog } = await import("../server/r2");
  return await getR2Catalog();
});

export const createTrackServerFn = createServerFn({ method: "POST" })
  .validator((track: Track) => track)
  .handler(async ({ data }) => {
    const { getR2Catalog, saveR2Catalog } = await import("../server/r2");
    const tracks = await getR2Catalog();
    const updated = [data, ...tracks];
    await saveR2Catalog(updated);
    return { success: true, track: data };
  });

export const deleteTrackServerFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { getR2Catalog, saveR2Catalog, deleteFromR2 } = await import("../server/r2");
    const tracks = await getR2Catalog();
    try {
      await deleteFromR2(`tracks/${data.id}/audio.mp3`);
      await deleteFromR2(`tracks/${data.id}/artwork.jpg`);
    } catch (err) {
      console.warn("Delete files warning:", err);
    }
    const remaining = tracks.filter((t) => t.id !== data.id);
    await saveR2Catalog(remaining);
    return { success: true, id: data.id };
  });

export const getUploadUrlServerFn = createServerFn({ method: "POST" })
  .validator((data: { filename: string; contentType: string; category?: string }) => data)
  .handler(async ({ data }) => {
    const { createPresignedUploadUrl } = await import("../server/r2");
    const category = data.category || "audio";
    const ext = data.filename.split(".").pop() || (category === "audio" ? "mp3" : "jpg");
    const rand = Math.random().toString(36).substring(2, 9);
    const key = `uploads/${category}-${Date.now()}-${rand}.${ext}`;
    const presigned = await createPresignedUploadUrl(key, data.contentType);
    return { ...presigned, key };
  });

export const uploadFileServerFn = createServerFn({ method: "POST" })
  .validator((data: { name: string; type: string; base64: string; category?: string }) => data)
  .handler(async ({ data }) => {
    const { uploadToR2 } = await import("../server/r2");
    const category = data.category || "audio";
    const ext = data.name.split(".").pop() || (category === "audio" ? "mp3" : "jpg");
    const rand = Math.random().toString(36).substring(2, 9);
    const key = `uploads/${category}-${Date.now()}-${rand}.${ext}`;
    const buffer = Buffer.from(data.base64, "base64");
    const publicUrl = await uploadToR2(key, buffer, data.type);
    return { publicUrl, key };
  });
