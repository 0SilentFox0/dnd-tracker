export const tokenBoxStyle = (
    box: { cx: number; cy: number; size: number },
    mapSize: { width: number; height: number }
) => ({
    left: `${((box.cx - box.size / 2) / mapSize.width) * 100}%`,
    top: `${((box.cy - box.size / 2) / mapSize.height) * 100}%`,
    width: `${(box.size / mapSize.width) * 100}%`,
    height: `${(box.size / mapSize.height) * 100}%`,
});

export const routeFrames = (
    route: readonly { cx: number; cy: number }[] | undefined,
    { box, mapSize }: MapPlacement
) =>
    route && route.length > 1
        ? route.map((c) => {
              const { left, top } = tokenBoxStyle({ ...box, ...c }, mapSize);

              return { left, top };
          })
        : null;

export interface MapPlacement {
    route?: { cx: number; cy: number }[];
    box: { cx: number; cy: number; size: number };
    mapSize: { width: number; height: number };
    pxPerUnit: number;
}
