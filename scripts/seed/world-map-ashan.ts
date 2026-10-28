import { closePolygon } from "@/lib/utils/world/geometry";
import type { Polygon } from "@/types/world";

export const ASHAN_IMAGE_URL = "https://static.wikia.nocookie.net/mightandmagic/images/2/2a/MapAshan.jpg/revision/latest?cb=20150228111245&path-prefix=en";
export const ASHAN_SIZE = { width: 1600, height: 1066 };

export interface CropBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface KingdomSeed {
  name: string;
  color: string;
  polygon: Polygon;
  crop: CropBox;
  cities: { name: string; x: number; y: number; icon: string }[];
}

type Pt = [number, number];
type GlobalCity = { name: string; x: number; y: number; icon: string };

const CROP_PADDING = 0.03;

const round4 = (v: number) => Math.round(v * 1e4) / 1e4;

function cropAround(points: Pt[]): CropBox {
  const xs = points.map((p) => p[0]);

  const ys = points.map((p) => p[1]);

  const left = Math.max(0, Math.min(...xs) - CROP_PADDING);

  const top = Math.max(0, Math.min(...ys) - CROP_PADDING);

  const right = Math.min(1, Math.max(...xs) + CROP_PADDING);

  const bottom = Math.min(1, Math.max(...ys) + CROP_PADDING);

  return { left: round4(left), top: round4(top), width: round4(right - left), height: round4(bottom - top) };
}

/** Координати ASHAN_* — 0..1 від Ашана; у вкладеній карті вони перераховуються відносно фрагмента. */
function kingdom(name: string, color: string, ring: Pt[], cities: GlobalCity[]): KingdomSeed {
  const polygon = closePolygon(ring.map(([x, y]) => ({ x, y })));

  if (!polygon) throw new Error(`Invalid polygon for ${name}`);

  const crop = cropAround(ring);

  return {
    name,
    color,
    polygon,
    crop,
    cities: cities.map((c) => ({ ...c, x: round4((c.x - crop.left) / crop.width), y: round4((c.y - crop.top) / crop.height) })),
  };
}

export const ASHAN_KINGDOMS: KingdomSeed[] = [
  kingdom(
    "Holy Griffin Empire",
    "#e8d27a",
    [[0.44, 0.31], [0.52, 0.28], [0.6, 0.31], [0.66, 0.36], [0.7, 0.43], [0.68, 0.5], [0.6, 0.55], [0.5, 0.57], [0.4, 0.53], [0.32, 0.49], [0.34, 0.45], [0.42, 0.45], [0.44, 0.38]],
    [
      { name: "Talonguard", x: 0.47, y: 0.37, icon: "castle" },
      { name: "Stonehelm", x: 0.63, y: 0.45, icon: "castle" },
      { name: "Eridan's Crossing", x: 0.52, y: 0.48, icon: "village" },
    ],
  ),
  kingdom(
    "Irollan",
    "#4caf6a",
    [[0.24, 0.2], [0.33, 0.15], [0.4, 0.2], [0.4, 0.3], [0.36, 0.34], [0.27, 0.34], [0.24, 0.28]],
    [
      { name: "Syrris Thalla", x: 0.32, y: 0.24, icon: "castle" },
      { name: "Stormcliff", x: 0.28, y: 0.3, icon: "village" },
    ],
  ),
  kingdom(
    "Grimheim",
    "#8a8f9c",
    [[0.4, 0.1], [0.47, 0.08], [0.55, 0.12], [0.56, 0.22], [0.54, 0.28], [0.46, 0.27], [0.41, 0.24], [0.39, 0.16]],
    [
      { name: "Tor Myrdal", x: 0.48, y: 0.2, icon: "castle" },
      { name: "Northern Peaks", x: 0.43, y: 0.14, icon: "landmark" },
    ],
  ),
  kingdom(
    "Silver Cities",
    "#c9a227",
    [[0.27, 0.5], [0.36, 0.49], [0.45, 0.52], [0.5, 0.57], [0.5, 0.66], [0.54, 0.72], [0.57, 0.8], [0.6, 0.88], [0.52, 0.9], [0.45, 0.84], [0.35, 0.8], [0.27, 0.78], [0.22, 0.7], [0.25, 0.62]],
    [
      { name: "Al Safir", x: 0.39, y: 0.535, icon: "castle" },
      { name: "Karthal", x: 0.29, y: 0.52, icon: "city" },
      { name: "Listmoor", x: 0.35, y: 0.7, icon: "city" },
    ],
  ),
  kingdom(
    "Heresh",
    "#7a5ea8",
    [[0.55, 0.57], [0.62, 0.56], [0.66, 0.62], [0.68, 0.68], [0.68, 0.74], [0.63, 0.78], [0.58, 0.76], [0.56, 0.68], [0.55, 0.62]],
    [
      { name: "Nar-Ankar", x: 0.625, y: 0.7, icon: "castle" },
      { name: "Heresh Pass", x: 0.58, y: 0.64, icon: "landmark" },
    ],
  ),
  kingdom(
    "Ranaar",
    "#c0562e",
    [[0.62, 0.22], [0.72, 0.19], [0.85, 0.2], [0.92, 0.27], [0.9, 0.35], [0.8, 0.38], [0.72, 0.4], [0.7, 0.43], [0.66, 0.36], [0.6, 0.31]],
    [
      { name: "Steppe Camp", x: 0.78, y: 0.28, icon: "camp" },
      { name: "Eastern Plains", x: 0.84, y: 0.24, icon: "landmark" },
    ],
  ),
  kingdom(
    "Ygg-Chall",
    "#2f7f7a",
    [[0.31, 0.35], [0.37, 0.33], [0.42, 0.3], [0.43, 0.38], [0.41, 0.44], [0.33, 0.44], [0.3, 0.4]],
    [{ name: "Ygg-Chall Grove", x: 0.37, y: 0.39, icon: "landmark" }],
  ),
  kingdom(
    "Twilight Archipelago",
    "#4f7fb8",
    [[0.1, 0.3], [0.2, 0.28], [0.22, 0.38], [0.21, 0.44], [0.12, 0.45], [0.09, 0.38]],
    [{ name: "Twilight Isles", x: 0.15, y: 0.37, icon: "landmark" }],
  ),
];

export const ASHAN_CITIES: { name: string; kingdom: string; x: number; y: number; icon: string; alwaysVisible: boolean }[] = [
  { name: "Talonguard", kingdom: "Holy Griffin Empire", x: 0.47, y: 0.37, icon: "castle", alwaysVisible: true },
  { name: "Stonehelm", kingdom: "Holy Griffin Empire", x: 0.63, y: 0.45, icon: "castle", alwaysVisible: true },
  { name: "Karthal", kingdom: "Silver Cities", x: 0.29, y: 0.52, icon: "city", alwaysVisible: true },
  { name: "Al Safir", kingdom: "Silver Cities", x: 0.39, y: 0.535, icon: "castle", alwaysVisible: true },
  { name: "Tor Myrdal", kingdom: "Grimheim", x: 0.48, y: 0.2, icon: "castle", alwaysVisible: true },
  { name: "Syrris Thalla", kingdom: "Irollan", x: 0.32, y: 0.24, icon: "castle", alwaysVisible: true },
  { name: "Nar-Ankar", kingdom: "Heresh", x: 0.625, y: 0.7, icon: "castle", alwaysVisible: true },
];

const MAX_EDGE_PX = 6000;

const UPSCALE = 4;

export function cropPixels(crop: CropBox, size = ASHAN_SIZE) {
  const left = Math.floor(crop.left * size.width);

  const top = Math.floor(crop.top * size.height);

  return {
    left,
    top,
    width: Math.min(size.width - left, Math.round(crop.width * size.width)),
    height: Math.min(size.height - top, Math.round(crop.height * size.height)),
  };
}

export function targetSize(px: { width: number; height: number }) {
  const scale = Math.min(UPSCALE, MAX_EDGE_PX / Math.max(px.width, px.height));

  return { width: Math.round(px.width * scale), height: Math.round(px.height * scale) };
}
