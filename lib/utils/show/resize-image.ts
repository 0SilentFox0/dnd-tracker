import { SLIDE_MAX_EDGE_PX } from "@/lib/constants/show";
import { fitWithin } from "@/lib/utils/show/fit-image";

const toBlob = (canvas: HTMLCanvasElement, type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));

/** ≤ 2560 px за довшою стороною, WebP (або JPEG, якщо браузер не кодує WebP). */
export async function resizeSlideImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const { width, height } = fitWithin({ width: bitmap.width, height: bitmap.height }, SLIDE_MAX_EDGE_PX);

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Браузер не вміє обробляти картинки");

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webp = await toBlob(canvas, "image/webp");

  // Safari старших версій мовчки віддає PNG замість WebP
  if (webp?.type === "image/webp") return webp;

  const jpeg = await toBlob(canvas, "image/jpeg");

  if (!jpeg) throw new Error("Не вдалося стиснути картинку");

  return jpeg;
}
