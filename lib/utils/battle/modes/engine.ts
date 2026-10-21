import { activeModeWithConfig } from "./registry";
import type { ModeMoveZone, ModeView } from "./types";

import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

type MapArg = BattleMapConfig | null | undefined;

export function modeSees(map: MapArg, viewer: BattleParticipant, target: BattleParticipant): boolean {
  const active = activeModeWithConfig(map);

  return active?.mode.engine.sees?.({ config: active.config, map: active.map, viewer, target }) ?? true;
}

export function modeAimHiddenText(map: MapArg, caster: BattleParticipant, cell: GridPoint): string | null {
  const active = activeModeWithConfig(map);

  return active?.mode.engine.aimHiddenText?.({ config: active.config, map: active.map, caster, cell }) ?? null;
}

export function modeTargetHiddenText(map: MapArg, caster: BattleParticipant, targets: BattleParticipant[]): string | null {
  const active = activeModeWithConfig(map);

  return active?.mode.engine.targetHiddenText?.({ config: active.config, map: active.map, caster, targets }) ?? null;
}

export function modeMeleeBlockedText(map: MapArg, attacker: BattleParticipant, target: BattleParticipant): string | null {
  const active = activeModeWithConfig(map);

  return active?.mode.engine.meleeBlockedText?.({ config: active.config, map: active.map, attacker, target }) ?? null;
}

export function modeEngages(map: MapArg, attacker: BattleParticipant, neighbour: BattleParticipant): boolean {
  const active = activeModeWithConfig(map);

  return active?.mode.engine.engages?.({ config: active.config, map: active.map, attacker, neighbour }) ?? isActive(neighbour);
}

export function modeLineBlocked(map: MapArg, line: GridPoint[]): boolean {
  const active = activeModeWithConfig(map);

  return active?.mode.engine.lineBlocked?.({ config: active.config, map: active.map, line }) ?? false;
}

/** Масові цілі: ворогів, яких каст не бачить, відсіює режим; союзники й невідомі id лишаються. */
export function modeSightedTargets(map: MapArg, ps: BattleParticipant[], caster: BattleParticipant, ids: string[]): string[] {
  if (!activeModeWithConfig(map)) return ids;

  const byId = new Map(ps.map((p) => [p.basicInfo.id, p]));

  return ids.filter((id) => {
    const p = byId.get(id);

    return !p || p.basicInfo.side === caster.basicInfo.side || modeSees(map, caster, p);
  });
}

export function modeMoveZone(map: MapArg, input: { seen: BattleParticipant[]; mover: BattleParticipant; view: ModeView | null | undefined }): ModeMoveZone | null {
  const active = activeModeWithConfig(map);

  return active?.mode.engine.moveZone?.({ config: active.config, map: active.map, seen: input.seen, mover: input.mover, view: input.view ?? null }) ?? null;
}
