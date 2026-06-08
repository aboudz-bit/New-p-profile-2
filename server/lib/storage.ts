/**
 * Pluggable document storage. The local-disk adapter is the only implementation
 * today; swap it for S3/GCS later by implementing the same interface — the
 * `documents` table stores an opaque `storageKey`, so no schema change is needed.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { UPLOAD_DIR } from "./env";

export interface StoredFile {
  storageKey: string;
  url: string;
  sizeBytes: number;
}

export interface StorageAdapter {
  save(ownerKey: string, fileName: string, data: Buffer): Promise<StoredFile>;
}

class LocalDiskStorage implements StorageAdapter {
  async save(ownerKey: string, fileName: string, data: Buffer): Promise<StoredFile> {
    const safeName = fileName.replace(/[^\w.\-]+/g, "_");
    const key = `${ownerKey}/${randomUUID()}-${safeName}`;
    const fullPath = resolve(join(UPLOAD_DIR, key));
    await mkdir(resolve(join(UPLOAD_DIR, ownerKey)), { recursive: true });
    await writeFile(fullPath, data);
    return { storageKey: key, url: `/uploads/${key}`, sizeBytes: data.length };
  }
}

export const storage: StorageAdapter = new LocalDiskStorage();
