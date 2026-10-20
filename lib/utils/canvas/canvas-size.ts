// Past 2× the extra pixels are invisible in soft glows yet cost 2.25× the fill rate on 3× phones.
const MAX_DPR = 2;

function canvasDpr() {
  return Math.min(MAX_DPR, window.devicePixelRatio || 1);
}

/** Sizes the backing store to `w × h` CSS px; touches it only on a change, because assigning `width` wipes the canvas. */
export function fitCanvas(canvas: HTMLCanvasElement, w: number, h: number, dpr = canvasDpr()) {
  const width = Math.round(w * dpr);

  const height = Math.round(h * dpr);

  if (canvas.width !== width) canvas.width = width;

  if (canvas.height !== height) canvas.height = height;

  return dpr;
}
