const MAX_EDGE = 160;
const JPEG_QUALITY = 0.72;
/** Keep payload small for WebSocket room broadcasts. */
export const MAX_SELFIE_DATA_URL_LEN = 80_000;

export async function compressSelfie(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("not-image");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-canvas");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    if (!dataUrl.startsWith("data:image/jpeg")) throw new Error("encode-failed");
    if (dataUrl.length > MAX_SELFIE_DATA_URL_LEN) throw new Error("too-large");
    return dataUrl;
  } finally {
    bitmap.close();
  }
}
