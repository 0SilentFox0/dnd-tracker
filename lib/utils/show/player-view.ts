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

const sees = (slide: Slide, heroIds: readonly string[]) => !slide.audience || slide.audience.some((id) => heroIds.includes(id));

const lastEntry = (show: ShowState) => show.trail?.[show.trail.length - 1];

/** Поточний слайд обмежений: стан для гравців читається окремо, а не розсилається. */
export const isRestricted = (show: ShowState | null): boolean => !!show && !!lastEntry(show)?.slide.audience && lastEntry(show)?.slide.id === show.slide?.id;

/** Те, що клієнт ніколи не бачить: серверна стежка. */
export function toClientShow(show: ShowState): ShowState {
  const { trail: _trail, ...client } = show;

  return client;
}

const publicSlide = ({ audience: _audience, ...slide }: Slide): Slide => slide;

/** Гравець бачить поточний слайд, а якщо той не для його героїв — останній доступний зі стежки (або нічого). */
export function playerShowView(show: ShowState, heroIds: readonly string[]): ShowState {
  const client = toClientShow(show);

  const current = show.slide;

  if (!current || sees(current, heroIds)) return current ? { ...client, slide: publicSlide(current) } : client;

  const trail = show.trail ?? [];

  const fallbackAt = trail.findLastIndex((e) => sees(e.slide, heroIds));

  const skipped = [current, ...trail.slice(fallbackAt + 1).map((e) => e.slide)];

  const hiddenTrack = show.audio?.trackId && skipped.some((s) => s.trackId === show.audio?.trackId);

  const { puzzle: _puzzle, ...rest } = client;

  return { ...rest, slide: fallbackAt === -1 ? null : publicSlide(trail[fallbackAt].slide), nextImageUrl: null, audio: hiddenTrack ? null : show.audio };
}
