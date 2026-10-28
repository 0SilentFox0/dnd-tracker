import type { ShowState, Slide } from "@/types/show";

/** Під заглушкою або без слайда гравці бачать заглушку (або стандартний екран). */
export type StageMode = "cover" | "world" | "puzzle" | "slide" | "waiting";

export const showsCover = (show: ShowState | null) => !show?.slide || !!show.curtain;

export const visibleSlide = (show: ShowState | null): Slide | null => (showsCover(show) ? (show?.cover?.slide ?? null) : (show?.slide ?? null));

export function stageMode(show: ShowState | null): StageMode {
  if (show?.curtain) return "cover";

  if (show?.world) return "world";

  if (show?.slide?.kind === "puzzle") return "puzzle";

  return show?.slide ? "slide" : "waiting";
}
