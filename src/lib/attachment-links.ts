import type { MemoAttachment } from '@/types';

/**
 * Canonical Google Drive URL for a memo attachment.
 *
 * Prefers the `webViewLink` captured on upload and falls back to the standard
 * `/file/d/<id>/view` URL for older records that were saved before the link
 * was stored.
 */
export function getAttachmentDriveUrl(
  file: Pick<MemoAttachment, 'fileId' | 'webViewLink'>
): string {
  if (file.webViewLink) return file.webViewLink;
  return `https://drive.google.com/file/d/${encodeURIComponent(file.fileId)}/view`;
}
