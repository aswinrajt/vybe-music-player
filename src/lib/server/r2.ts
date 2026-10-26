import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DEMO_TRACKS } from "../music/demo-catalog";
import type { Track } from "../music/types";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain: string;
}

export function getR2Config(env?: Record<string, unknown>): R2Config {
  const getVal = (key: string): string => {
    if (env && typeof env[key] === "string") return env[key] as string;
    if (typeof process !== "undefined" && process.env?.[key]) return process.env[key] as string;
    return "";
  };

  return {
    accountId: getVal("R2_ACCOUNT_ID"),
    accessKeyId: getVal("R2_ACCESS_KEY_ID"),
    secretAccessKey: getVal("R2_SECRET_ACCESS_KEY"),
    bucketName: getVal("R2_BUCKET_NAME") || "vybe-music-tracks",
    publicDomain: getVal("R2_PUBLIC_DOMAIN").replace(/\/$/, ""),
  };
}

export function getR2Client(env?: Record<string, unknown>): { client: S3Client; config: R2Config } {
  const config = getR2Config(env);
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error("Missing Cloudflare R2 credentials in environment variables.");
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return { client, config };
}

const CATALOG_KEY = "catalog.json";

/**
 * Fetch tracks from catalog.json in R2.
 * If catalog.json doesn't exist yet, bootstraps it with DEMO_TRACKS.
 */
export async function getR2Catalog(env?: Record<string, unknown>): Promise<Track[]> {
  const { client, config } = getR2Client(env);

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.bucketName,
        Key: CATALOG_KEY,
      }),
    );

    if (!response.Body) {
      return DEMO_TRACKS;
    }

    const text = await response.Body.transformToString();
    const parsed = JSON.parse(text) as Track[];
    return Array.isArray(parsed) ? parsed : DEMO_TRACKS;
  } catch (err: unknown) {
    const errorName = (err as { name?: string })?.name;
    // If not found yet, initialize R2 catalog with DEMO_TRACKS
    if (errorName === "NoSuchKey" || errorName === "NotFound") {
      try {
        await saveR2Catalog(DEMO_TRACKS, env);
      } catch (saveErr) {
        console.warn("Failed to bootstrap catalog.json in R2:", saveErr);
      }
      return DEMO_TRACKS;
    }
    console.error("Error reading catalog from R2:", err);
    throw err;
  }
}

/**
 * Save tracks to catalog.json in R2
 */
export async function saveR2Catalog(tracks: Track[], env?: Record<string, unknown>): Promise<void> {
  const { client, config } = getR2Client(env);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: CATALOG_KEY,
      Body: JSON.stringify(tracks, null, 2),
      ContentType: "application/json",
    }),
  );
}

/**
 * Upload a binary file (buffer/Uint8Array) directly to R2
 */
export async function uploadToR2(
  key: string,
  data: Uint8Array | Buffer,
  contentType: string,
  env?: Record<string, unknown>,
): Promise<string> {
  const { client, config } = getR2Client(env);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: data,
      ContentType: contentType,
    }),
  );

  return `${config.publicDomain}/${key}`;
}

/**
 * Delete an object from R2 by key
 */
export async function deleteFromR2(key: string, env?: Record<string, unknown>): Promise<void> {
  const { client, config } = getR2Client(env);

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }),
    );
  } catch (err) {
    console.warn(`Failed to delete object "${key}" from R2:`, err);
  }
}

/**
 * Generate a pre-signed PUT URL for uploading large files directly from browser to R2
 */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  env?: Record<string, unknown>,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const { client, config } = getR2Client(env);

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  const publicUrl = `${config.publicDomain}/${key}`;

  return { uploadUrl, publicUrl };
}
