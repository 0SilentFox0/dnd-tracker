/** Рамка жетона у відсотках карти — жетон і його HUD тримаються однієї клітинки за будь-якого масштабу. */
export const tokenBoxStyle = (box: { cx: number; cy: number; size: number }, mapSize: { width: number; height: number }) => ({
  left: `${((box.cx - box.size / 2) / mapSize.width) * 100}%`,
  top: `${((box.cy - box.size / 2) / mapSize.height) * 100}%`,
  width: `${(box.size / mapSize.width) * 100}%`,
  height: `${(box.size / mapSize.height) * 100}%`,
});

export interface MapPlacement {
  box: { cx: number; cy: number; size: number };
  mapSize: { width: number; height: number };
  pxPerUnit: number;
}
