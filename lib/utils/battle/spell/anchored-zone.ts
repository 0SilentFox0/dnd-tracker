import { type FireSource, fireTrigger, type ZoneCtx } from "./zone-fire";

import { CELL_FEET } from "@/lib/constants/battle";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { removeEffects } from "@/lib/utils/battle/conditions/query";
import { footprint, footprintDistance } from "@/lib/utils/battle/grid/geometry";
import { isOnMap, sizeOf } from "@/lib/utils/battle/grid/occupancy";
import type { ActiveEffect, AnchoredZoneState, BattleParticipant, GridPoint } from "@/types/battle";

interface Anchor {
  bearerId: string;
  effect: ActiveEffect;
  state: AnchoredZoneState;
}

const anchorsOf = (ps: BattleParticipant[]): Anchor[] =>
  ps.flatMap((p) => (isActive(p) ? p.battleData.activeEffects.flatMap((effect) => (effect.anchoredZone ? [{ bearerId: p.basicInfo.id, effect, state: effect.anchoredZone }] : [])) : []));

export const hasAnchors = (ps: BattleParticipant[]) => ps.some((p) => p.battleData.activeEffects.some((e) => e.anchoredZone));

const sourceOf = ({ bearerId, effect, state }: Anchor): FireSource => ({
  casterId: state.casterId,
  spellId: state.spellId,
  spellName: state.spellName,
  dc: state.dc,
  side: state.side,
  concentrationOf: effect.concentrationOf,
  hitKey: `anchor:${effect.id}`,
  anchorId: effect.id,
  ...(state.excludeBearer && { excludeId: bearerId }),
});

function inRadius(a: BattleParticipant, aAt: GridPoint, b: BattleParticipant, bAt: GridPoint, feet: number): boolean {
  return footprintDistance(footprint(aAt, sizeOf(a)), footprint(bAt, sizeOf(b))) * CELL_FEET <= feet;
}

interface AnchorResult {
  participants: BattleParticipant[];
  messages: string[];
}

/** Тригер входу в ауру: рухається істота в радіусі носія або сам носій наближається до інших. */
export function anchorMove({ participants, moved, from, path, ctx }: { participants: BattleParticipant[]; moved: BattleParticipant; from: GridPoint; path: GridPoint[]; ctx: ZoneCtx }): AnchorResult {
  let ps = participants;

  const messages: string[] = [];

  const movedId = moved.basicInfo.id;

  for (const anchor of anchorsOf(participants)) {
    const bearer = findParticipant(ps, anchor.bearerId);

    if (!bearer || !anchor.state.onEnter) continue;

    const mover = bearer.basicInfo.id === movedId;

    const others = mover ? ps.filter((p) => p.basicInfo.id !== movedId && isActive(p) && isOnMap(p)) : [moved];

    for (const other of others) {
      const otherAt = other.battleData.position;

      const bearerAt = bearer.battleData.position;

      const reach = (step: GridPoint) => {
        if (mover) return !!otherAt && inRadius(moved, step, other, otherAt, anchor.state.radiusFeet);

        return !!bearerAt && inRadius(bearer, bearerAt, other, step, anchor.state.radiusFeet);
      };

      let inside = reach(from);

      for (const step of path) {
        const now = reach(step);

        if (now && !inside) {
          const fired = fireTrigger(ps, sourceOf(anchor), anchor.state.onEnter, "onEnter", other.basicInfo.id, ctx);

          ps = fired.participants;
          messages.push(...fired.messages);
        }

        inside = now;
      }
    }
  }

  return { participants: ps, messages };
}

/** Початок ходу: поза аурою ефекти знімаються (endsWhenStartOutside), у ній спрацьовує onTurnStart. */
export function anchorTurnStart(participants: BattleParticipant[], targetId: string, ctx: ZoneCtx): AnchorResult {
  let ps = participants;

  const messages: string[] = [];

  for (const anchor of anchorsOf(participants)) {
    const target = findParticipant(ps, targetId);

    const bearer = findParticipant(ps, anchor.bearerId);

    const at = target?.battleData.position;

    const bearerAt = bearer?.battleData.position;

    if (!target || !bearer || !at || !bearerAt || !isOnMap(target)) continue;

    const inside = inRadius(bearer, bearerAt, target, at, anchor.state.radiusFeet);

    if (!inside && anchor.state.endsWhenStartOutside) {
      const out = removeEffects(target, (e) => e.anchorOf === anchor.effect.id);

      if (out.removed.length > 0) {
        ps = replaceParticipant(ps, out.participant);
        messages.push(`✨ ${target.basicInfo.name}: «${anchor.state.spellName}» закінчується (початок ходу поза аурою)`);
      }

      continue;
    }

    if (inside) {
      const fired = fireTrigger(ps, sourceOf(anchor), anchor.state.onTurnStart, "onTurnStart", targetId, ctx);

      ps = fired.participants;
      messages.push(...fired.messages);
    }
  }

  return { participants: ps, messages };
}

/** Ефекти, накладені аурою, що зникла, знімаються; той самий масив — нічого не змінилось. */
export function sweepOrphanedAnchored(ps: BattleParticipant[]): BattleParticipant[] {
  const live = new Set(anchorsOf(ps).map((a) => a.effect.id));

  const orphaned = (e: ActiveEffect) => !!e.anchorOf && !live.has(e.anchorOf);

  if (!ps.some((p) => p.battleData.activeEffects.some(orphaned))) return ps;

  return ps.map((p) => (p.battleData.activeEffects.some(orphaned) ? removeEffects(p, orphaned).participant : p));
}
