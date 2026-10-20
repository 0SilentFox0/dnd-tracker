export function fitWithin(w: number, h: number, maxSide: number): { width: number; height: number } {
  const k = Math.min(1, maxSide / Math.max(w, h));

  return { width: Math.round(w * k), height: Math.round(h * k) };
}

async function drawResized(file: File, maxSide: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);

  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas;
}

export async function resizeImageToDataUrl(file: File, maxSide: number, quality = 0.85): Promise<string> {
  const canvas = await drawResized(file, maxSide);

  const webp = canvas.toDataURL("image/webp", quality);

  // Safari silently returns PNG for webp, which can blow past the request body limit
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality);
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function resizeImageToBlob(file: File, maxSide: number, quality = 0.85): Promise<Blob> {
  const canvas = await drawResized(file, maxSide);

  const webp = await toBlob(canvas, "image/webp", quality);

  // Safari silently returns PNG for webp
  if (webp?.type === "image/webp") return webp;

  const jpeg = await toBlob(canvas, "image/jpeg", quality);

  if (!jpeg) throw new Error("Не вдалося стиснути картинку");

  return jpeg;
}
