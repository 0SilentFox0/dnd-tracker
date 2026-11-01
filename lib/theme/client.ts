import { DEFAULT_PALETTE, isPalettePath, LIGHT_PALETTES, PALETTE_IDS, paletteFor } from "@/lib/theme/palettes";
import type { PaletteId, PaletteSettings } from "@/types/theme";

export const ACTIVE_PALETTE_KEY = "dnd-palette-active";
export const paletteStorageKey = (userId: string) => `dnd-palette:${userId}`;

export function readCachedPalette(userId: string): PaletteId {
  try { return paletteFor(localStorage.getItem(paletteStorageKey(userId))); } catch { return DEFAULT_PALETTE; }
}

export function cachePalette(settings: PaletteSettings): void {
  try {
    localStorage.setItem(paletteStorageKey(settings.userId), settings.palette);
    localStorage.setItem(ACTIVE_PALETTE_KEY, JSON.stringify(settings));
  } catch { /* Browsers with disabled storage still support the account setting. */ }
}

export function clearActivePalette(): void {
  try { localStorage.removeItem(ACTIVE_PALETTE_KEY); } catch { /* Storage is optional. */ }
}

export function applyPalette(palette: PaletteId | null): void {
  const root = document.documentElement;

  if (palette === null) {
    root.removeAttribute("data-palette");
    root.classList.add("dark");

    return;
  }

  root.dataset.palette = palette;
  root.classList.toggle("dark", !LIGHT_PALETTES.includes(palette));
}

// Runs before paint; only validated identifiers enter the DOM. The root stays static.
export const PALETTE_BOOTSTRAP = `(()=>{try{if(!(${isPalettePath.toString()})(location.pathname))return;const s=JSON.parse(localStorage.getItem(${JSON.stringify(ACTIVE_PALETTE_KEY)})||'null');if(!s||typeof s.userId!=='string'||!${JSON.stringify(PALETTE_IDS)}.includes(s.palette))return;const r=document.documentElement;r.dataset.palette=s.palette;r.classList.toggle('dark',!${JSON.stringify(LIGHT_PALETTES)}.includes(s.palette));}catch{}})();`;
