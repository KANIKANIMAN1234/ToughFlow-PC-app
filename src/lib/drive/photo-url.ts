const DRIVE_PREFIX = "drive:";

export function isDrivePhotoRef(url: string): boolean {
  return url.startsWith(DRIVE_PREFIX);
}

export function driveFileIdFromRef(url: string): string | null {
  if (!isDrivePhotoRef(url)) return null;
  return url.slice(DRIVE_PREFIX.length) || null;
}

export function resolvePhotoDisplayUrl(url: string): string {
  const fileId = driveFileIdFromRef(url);
  if (fileId) return `/api/drive/files/${fileId}`;
  return url;
}
