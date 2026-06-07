import { getDriveClient, isDriveConfigured } from "./client";

export async function downloadDriveFile(
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!isDriveConfigured()) return null;

  const drive = await getDriveClient();
  if (!drive) return null;

  const meta = await drive.files.get({
    fileId,
    fields: "mimeType",
    supportsAllDrives: true,
  });

  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );

  const buffer = Buffer.from(res.data as ArrayBuffer);
  const mimeType = meta.data.mimeType ?? "application/octet-stream";
  return { buffer, mimeType };
}
