import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { initializeAndSeed } from "@/lib/store";
import { uploads } from "@/src/db/schema";

// Images are stored in the database (table "uploads"), not on disk: they survive redeploys and
// restarts on hosts with a throw-away disk, and several app instances see the same files. A menu
// photo or receipt is shrunk by the browser before upload (about 100 to 400 KB), so a free
// database holds thousands. The function names are kept so callers did not change.
const maxBytes = 5 * 1024 * 1024;
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const mimeByExt = Object.fromEntries(Object.entries(extensions).map(([mime, ext]) => [ext, mime]));
const keyPattern = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

// Folders: "receipts" (private, payment proof) and "media" (public menu photos).
type Folder = "receipts" | "media";

function hasImageSignature(bytes: Buffer, mime: string) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  return false;
}

export async function saveReceipt(file: File, folder: Folder = "receipts") {
  const ext = extensions[file.type];
  if (!ext || file.size > maxBytes) throw new Error("Invalid receipt image");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasImageSignature(bytes, file.type)) throw new Error("Invalid receipt image");

  await initializeAndSeed();
  const storageKey = `${randomUUID()}.${ext}`;
  await getDb().insert(uploads).values({ storageKey, folder, mimeType: file.type, size: bytes.length, bytes });
  return {
    storageKey,
    originalName: file.name.slice(0, 120),
    mimeType: file.type,
    size: bytes.length,
    checksum: createHash("sha256").update(bytes).digest("hex")
  };
}

export async function readReceipt(storageKey: string, folder: Folder = "receipts") {
  if (!keyPattern.test(storageKey)) return null;
  await initializeAndSeed();
  const [row] = await getDb()
    .select({ bytes: uploads.bytes })
    .from(uploads)
    .where(and(eq(uploads.storageKey, storageKey), eq(uploads.folder, folder)))
    .limit(1);
  return row ? { bytes: Buffer.from(row.bytes), mimeType: mimeByExt[storageKey.split(".")[1]] } : null;
}

export async function deleteReceipt(storageKey: string, folder: Folder = "receipts") {
  if (!keyPattern.test(storageKey)) return;
  await getDb()
    .delete(uploads)
    .where(and(eq(uploads.storageKey, storageKey), eq(uploads.folder, folder)))
    .catch(() => undefined);
}
