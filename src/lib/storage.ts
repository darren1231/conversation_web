import type { SupabaseClient } from "@supabase/supabase-js";
import imageCompression from "browser-image-compression";

export const ATTACHMENTS_BUCKET = "attachments";

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    return await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.82,
    });
  } catch {
    return file;
  }
}

function extensionFromFile(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType || "jpg";
}

export async function uploadPrivateImage(
  supabase: SupabaseClient,
  userId: string,
  folder: string,
  file: File,
): Promise<{ path: string } | { error: string }> {
  const compressed = await compressImage(file);
  const ext = extensionFromFile(compressed);
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, compressed, {
      contentType: compressed.type || file.type,
      upsert: false,
    });

  if (error) return { error: error.message };
  return { path };
}

export async function getSignedUrl(
  supabase: SupabaseClient,
  path: string,
  expiresInSeconds = 3600,
) {
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function getSignedUrls(
  supabase: SupabaseClient,
  paths: string[],
  expiresInSeconds = 3600,
) {
  if (paths.length === 0) return {} as Record<string, string>;
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrls(paths, expiresInSeconds);
  if (error || !data) return {} as Record<string, string>;
  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

export async function removeStorageObjects(
  supabase: SupabaseClient,
  paths: string[],
) {
  if (paths.length === 0) return { error: null };
  const { error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .remove(paths);
  return { error: error?.message ?? null };
}
