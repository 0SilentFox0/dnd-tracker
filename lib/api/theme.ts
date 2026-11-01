import { request } from "./client";

import type { PaletteId, PaletteSettings } from "@/types/theme";

export const themeApi = {
  get: () => request<PaletteSettings>("/api/theme", { cache: "no-store" }),
  set: (palette: PaletteId) => request<PaletteSettings>("/api/theme", { method: "PUT", body: JSON.stringify({ palette }) }),
};
