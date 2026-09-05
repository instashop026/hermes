import { readFileSync } from "node:fs";
import path from "node:path";

const API_KEY = process.env.ZEROSTORAGE_API_KEY || "";
const BASE = process.env.ZEROSTORAGE_BASE_URL || "https://test.zerostorage.net/api";
const ZERO_BASE = "https://test.zerostorage.net";

const authHeaders = () => ({ "x-api-key": API_KEY });

export type ZsFile = {
  id: string;
  title: string;
  filename: string;
  fileSize: number;
  fileType: string;
  folderId: string;
  imageUrl: string;
  downloadUrl: string;
  thumbnailUrl: string;
};

export type ZsFolder = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  _count?: { files: number; children: number };
};

/** Build a directly-embeddable image URL from a ZeroStorage file id. */
export function zsImageUrl(fileId: string): string {
  return `${ZERO_BASE}/api/files/download/${fileId}`;
}

export async function listFolders(parentId?: string): Promise<ZsFolder[]> {
  const out: ZsFolder[] = [];
  for (let page = 1; page <= 50; page++) {
    const url = parentId
      ? `${BASE}/folders?parentId=${encodeURIComponent(parentId)}&limit=200&page=${page}`
      : `${BASE}/folders?limit=200&page=${page}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`ZeroStorage listFolders failed: ${res.status}`);
    const data = await res.json() as any;
    const pageFolders: ZsFolder[] = data.folders || [];
    out.push(...(pageFolders as ZsFolder[]));
    if (pageFolders.length < 200) break;
  }
  return out;
}

export async function listFiles(folderId: string): Promise<ZsFile[]> {
  const out: ZsFile[] = [];
  // ZeroStorage paginates (default page size ~12). Walk pages until exhausted.
  for (let page = 1; page <= 50; page++) {
    const res = await fetch(`${BASE}/files?folderId=${encodeURIComponent(folderId)}&limit=200&page=${page}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`ZeroStorage listFiles failed: ${res.status}`);
    const data = await res.json() as any;
    const pageFiles: any[] = data.files || [];
    for (const f of pageFiles) {
      out.push({
        id: f.id,
        title: f.title,
        filename: f.filename,
        fileSize: f.file_size,
        fileType: f.file_type,
        folderId: f.folder_id,
        imageUrl: f.imageUrl ? `${ZERO_BASE}${f.imageUrl}` : zsImageUrl(f.id),
        downloadUrl: f.downloadUrl ? `${ZERO_BASE}${f.downloadUrl}` : zsImageUrl(f.id),
        thumbnailUrl: f.thumbnailUrl ? `${ZERO_BASE}${f.thumbnailUrl}` : zsImageUrl(f.id),
      });
    }
    if (pageFiles.length < 200) break;
  }
  return out;
}

export async function createFolder(name: string, parentId?: string): Promise<ZsFolder> {
  const res = await fetch(`${BASE}/folders`, {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ name, parent_id: parentId ?? null }),
  });
  if (!res.ok) throw new Error(`ZeroStorage createFolder failed: ${res.status}`);
  return (await res.json()) as ZsFolder;
}

export async function uploadFile(filePath: string, folderId: string, filename?: string): Promise<{ fileId: string; filename: string }> {
  const buf = readFileSync(filePath);
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)]), filename || path.basename(filePath));
  form.append("folderId", folderId);
  const res = await fetch(`${BASE}/upload`, { method: "POST", headers: authHeaders(), body: form });
  if (!res.ok) throw new Error(`ZeroStorage upload failed: ${res.status}`);
  const data = await res.json() as any;
  return { fileId: data.fileId, filename: data.filename };
}

export async function uploadBuffer(buffer: Buffer, filename: string, folderId: string): Promise<{ fileId: string; filename: string }> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), filename);
  form.append("folderId", folderId);
  const res = await fetch(`${BASE}/upload`, { method: "POST", headers: authHeaders(), body: form });
  if (!res.ok) throw new Error(`ZeroStorage upload failed: ${res.status}`);
  const data = await res.json() as any;
  return { fileId: data.fileId, filename: data.filename };
}

export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(`${BASE}/files/${fileId}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error(`ZeroStorage deleteFile failed: ${res.status}`);
}

export async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch source image failed: ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export const ZEROSTORAGE_ROOT_FOLDER = "0RMCOIN";
