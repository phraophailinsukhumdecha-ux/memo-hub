import { readFile } from 'node:fs/promises';
import crypto from 'node:crypto';

/**
 * Minimal Google Drive client for the attachment feature.
 *
 * Uses a service account (JWT -> OAuth2 access token) and the Drive REST API.
 * No external SDK is required, which keeps the App Hosting bundle small.
 *
 * Credentials are resolved in this order:
 *   1. GOOGLE_SERVICE_ACCOUNT_JSON  (full JSON string — production secret)
 *   2. GOOGLE_APPLICATION_CREDENTIALS (path to a key file — local development)
 *   3. GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *   4. FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (fallback)
 *
 * Files must live in a Shared Drive: service accounts have no storage quota,
 * so uploading into a personal My Drive folder fails with 403.
 */

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export class DriveConfigError extends Error {}

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

let cachedCreds: ServiceAccountCredentials | null = null;
let cachedToken: { token: string; expiresAt: number } | null = null;
const folderCache = new Map<string, string>();

function normalizePrivateKey(key: string): string {
  return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key;
}

export async function loadCredentials(): Promise<ServiceAccountCredentials> {
  if (cachedCreds) return cachedCreds;

  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    cachedCreds = JSON.parse(jsonEnv) as ServiceAccountCredentials;
    return cachedCreds;
  }

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    const raw = await readFile(keyPath, 'utf8');
    cachedCreds = JSON.parse(raw) as ServiceAccountCredentials;
    return cachedCreds;
  }

  const clientEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL ||
    '';
  const privateKey = normalizePrivateKey(
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
      process.env.FIREBASE_PRIVATE_KEY ||
      ''
  );
  if (clientEmail && privateKey) {
    cachedCreds = { client_email: clientEmail, private_key: privateKey };
    return cachedCreds;
  }

  throw new DriveConfigError(
    'ยังไม่ได้ตั้งค่า Google Service Account (GOOGLE_SERVICE_ACCOUNT_JSON หรือ GOOGLE_APPLICATION_CREDENTIALS)'
  );
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const creds = await loadCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(
    JSON.stringify({
      iss: creds.client_email,
      scope: DRIVE_SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  );
  const unsigned = `${header}.${claim}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer
    .sign(creds.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      `Drive auth failed: ${data.error || res.status} ${data.error_description || ''}`.trim()
    );
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return cachedToken.token;
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers, cache: 'no-store' });
}

export function getRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID || process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
  if (!id) {
    throw new DriveConfigError('ยังไม่ได้ตั้งค่า GOOGLE_DRIVE_FOLDER_ID');
  }
  return id;
}

export function getSharedDriveId(): string | undefined {
  return process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || undefined;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
  parents?: string[];
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export async function getFileInfo(fileId: string): Promise<DriveFileInfo | null> {
  const res = await driveFetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,webViewLink,parents&supportsAllDrives=true`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Drive get file failed: ${res.status}`);
  return (await res.json()) as DriveFileInfo;
}

export async function listFolders(parentId: string): Promise<DriveFileInfo[]> {
  const q = encodeURIComponent(
    `'${escapeQueryValue(parentId)}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const res = await driveFetch(
    `${DRIVE_API}/files?q=${q}&fields=files(id,name,mimeType,webViewLink)&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`
  );
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = (await res.json()) as { files?: DriveFileInfo[] };
  return data.files || [];
}

export async function createFolder(name: string, parentId: string): Promise<DriveFileInfo> {
  const res = await driveFetch(`${DRIVE_API}/files?supportsAllDrives=true&fields=id,name,mimeType,webViewLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Drive create folder failed: ${res.status} ${body.error?.message || ''}`.trim());
  }
  return (await res.json()) as DriveFileInfo;
}

/** Find a direct child folder by name, creating it when missing. */
export async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
  const cacheKey = `${parentId}:${name}`;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;

  const children = await listFolders(parentId);
  const existing = children.find((c) => c.name === name);
  if (existing) {
    folderCache.set(cacheKey, existing.id);
    return existing.id;
  }

  const created = await createFolder(name, parentId);
  folderCache.set(cacheKey, created.id);
  return created.id;
}

export interface UploadResult {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  folderId: string;
  webViewLink?: string;
}

export async function uploadFile(
  buffer: Buffer,
  name: string,
  mimeType: string,
  parentId: string
): Promise<UploadResult> {
  const boundary = `memohub${Date.now().toString(36)}`;
  const metadata = JSON.stringify({ name, mimeType, parents: [parentId] });
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      'utf8'
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--`, 'utf8'),
  ]);

  const res = await driveFetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,size,webViewLink`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: new Uint8Array(body),
    }
  );

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Drive upload failed: ${res.status} ${errorBody.error?.message || ''}`.trim());
  }

  const data = (await res.json()) as DriveFileInfo;
  return {
    fileId: data.id,
    name: data.name,
    mimeType: data.mimeType,
    size: Number(data.size || buffer.length),
    folderId: parentId,
    webViewLink: data.webViewLink,
  };
}

export async function copyFile(fileId: string, name: string, parentId: string): Promise<UploadResult> {
  const res = await driveFetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}/copy?supportsAllDrives=true&fields=id,name,mimeType,size,webViewLink`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parents: [parentId] }),
    }
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Drive copy failed: ${res.status} ${body.error?.message || ''}`.trim());
  }
  const data = (await res.json()) as DriveFileInfo;
  return {
    fileId: data.id,
    name: data.name,
    mimeType: data.mimeType,
    size: Number(data.size || 0),
    folderId: parentId,
    webViewLink: data.webViewLink,
  };
}

/** Move a file to the Drive trash (recoverable for 30 days). */
export async function trashFile(fileId: string): Promise<boolean> {
  const res = await driveFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,trashed`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  });
  return res.ok;
}

export async function downloadFile(fileId: string): Promise<Response> {
  const res = await driveFetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`
  );
  if (!res.ok) {
    throw new Error(`Drive download failed: ${res.status}`);
  }
  return res;
}

export interface DriveStatus {
  ok: boolean;
  rootFolderId?: string;
  rootFolderName?: string;
  sharedDriveId?: string;
  clientEmail?: string;
  projectId?: string;
  folderCount?: number;
  error?: string;
}

/** Shared drives are not addressable as regular files, so fetch their name explicitly. */
async function getSharedDriveName(driveId: string): Promise<string | undefined> {
  const res = await driveFetch(`${DRIVE_API}/drives/${encodeURIComponent(driveId)}?fields=id,name`);
  if (!res.ok) return undefined;
  const data = (await res.json()) as { name?: string };
  return data.name;
}

export async function getDriveStatus(): Promise<DriveStatus> {
  try {
    const rootId = getRootFolderId();
    const creds = await loadCredentials();
    const info = await getFileInfo(rootId);
    if (!info) {
      return {
        ok: false,
        rootFolderId: rootId,
        clientEmail: creds.client_email,
        projectId: creds.project_id,
        error: 'ไม่พบโฟลเดอร์กลาง หรือ Service Account ไม่มีสิทธิ์เข้าถึง',
      };
    }
    const folders = await listFolders(rootId);
    const sharedDriveId = getSharedDriveId();
    const driveName = sharedDriveId && sharedDriveId === rootId
      ? await getSharedDriveName(sharedDriveId)
      : undefined;
    return {
      ok: true,
      rootFolderId: rootId,
      rootFolderName: driveName || info.name,
      sharedDriveId,
      clientEmail: creds.client_email,
      projectId: creds.project_id,
      folderCount: folders.length,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'เชื่อมต่อ Google Drive ไม่สำเร็จ',
    };
  }
}
