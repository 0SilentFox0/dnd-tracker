export function fitWithin(w: number, h: number, maxSide: number): { width: number; height: number } {
  const k = Math.min(1, maxSide / Math.max(w, h));

  return { width: Math.round(w * k), height: Math.round(h * k) };
}

export async function resizeImageToDataUrl(file: File, maxSide: number, quality = 0.85): Promise<string> {
  const bitmap = await createImageBitmap(file);

  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webp = canvas.toDataURL("image/webp", quality);

  // Safari silently returns PNG for webp, which can blow past the request body limit
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality);
}
