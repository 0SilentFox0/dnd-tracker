import { BattleStatus } from "@/lib/constants/battle";
import type { BattleBrief } from "@/types/battle";
import type { ScenarioContent, ScenarioRow } from "@/types/scenario";
import type { ShowState, Slide } from "@/types/show";

export type RowSlideState = { kind: "none" } | { kind: "loading" } | { kind: "missing" } | { kind: "ready"; slide: Slide; active: boolean };

export type RowBattleState = { kind: "none" } | { kind: "loading" } | { kind: "missing" } | { kind: "ready"; battle: BattleBrief; called: boolean };

export interface PlayLookup {
  /** відсутній ключ — ще вантажиться; null — набору немає */
  decks: ReadonlyMap<string, Slide[] | null>;
  /** null — список боїв ще не завантажено */
  battles: ReadonlyMap<string, BattleBrief> | null;
  show: ShowState | null;
}

export type BattleAction = "start" | "call" | "none";

export const boundDeckIds = (content: ScenarioContent): string[] => [...new Set(content.sections.flatMap((s) => s.rows.flatMap((r) => (r.slide ? [r.slide.deckId] : []))))];

export const hasBattleBindings = (content: ScenarioContent) => content.sections.some((s) => s.rows.some((r) => r.battleId));

export const hasPlayBindings = (content: ScenarioContent) => content.sections.some((s) => s.rows.some((r) => r.slide || r.battleId));

export function rowSlideState(row: ScenarioRow, lookup: PlayLookup): RowSlideState {
  if (!row.slide) return { kind: "none" };

  const { deckId, slideId } = row.slide;

  if (!lookup.decks.has(deckId)) return { kind: "loading" };

  const slide = lookup.decks.get(deckId)?.find((s) => s.id === slideId);

  if (!slide) return { kind: "missing" };

  return { kind: "ready", slide, active: lookup.show?.deckId === deckId && lookup.show.slide?.id === slideId };
}

export function rowBattleState(row: ScenarioRow, lookup: PlayLookup): RowBattleState {
  if (!row.battleId) return { kind: "none" };

  if (!lookup.battles) return { kind: "loading" };

  const battle = lookup.battles.get(row.battleId);

  if (!battle) return { kind: "missing" };

  return { kind: "ready", battle, called: lookup.show?.battle?.id === battle.id };
}

export function battleAction(state: RowBattleState): BattleAction {
  if (state.kind !== "ready") return "none";

  if (state.battle.status === BattleStatus.PREPARED) return "start";

  return state.battle.status === BattleStatus.ACTIVE ? "call" : "none";
}
