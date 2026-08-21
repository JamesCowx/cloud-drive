import { promises as fs } from "node:fs";
import path from "node:path";

function uploadRoot(): string {
  return process.env.UPLOAD_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "storage");
}

export function userDir(userId: string): string {
  return path.join(uploadRoot(), userId);
}

export function resolveStorageKey(userId: string, storageKey: string): string {
  const base = path.resolve(userDir(userId));
  const resolved = path.resolve(/*turbopackIgnore: true*/ base, storageKey);
  if (!resolved.startsWith(base + path.sep)) {
    throw new Error("invalid storage key");
  }
  return resolved;
}

export async function ensureUserDir(userId: string): Promise<string> {
  const dir = userDir(userId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function writeUpload(userId: string, fileName: string) {
  const dir = await ensureUserDir(userId);
  return path.join(/*turbopackIgnore: true*/ dir, fileName);
}

export async function deleteUpload(userId: string, storageKey: string) {
  const filePath = resolveStorageKey(userId, storageKey);
  await fs.rm(filePath, { force: true });
}
