/**
 * Після створення всіх учасників — роздає черги scoped-бонусів (команда / вороги).
 */

import { applyParsedSetBonusToParticipantDirect } from "./merge-set-bonus";

import {
  ARTIFACT_EFFECT_ALL_ALLIES,
  ARTIFACT_EFFECT_ALL_ENEMIES,
} from "@/lib/constants/artifact-effect-scope";
import type { BattleParticipant, PendingScopedArtifactBonus } from "@/types/battle";

export function distributePendingScopedArtifactBonuses(
  allParticipants: BattleParticipant[],
): void {
  const items: PendingScopedArtifactBonus[] = [];

  for (const p of allParticipants) {
    const pend = p.battleData.pendingScopedArtifactBonuses;

    if (!pend?.length) continue;

    items.push(...pend);
    p.battleData.pendingScopedArtifactBonuses = [];
  }

  for (const item of items) {
    const recipients = allParticipants.filter((p) => {
      if (item.audience === ARTIFACT_EFFECT_ALL_ALLIES) {
        return p.basicInfo.side === item.sourceSide;
      }

      if (item.audience === ARTIFACT_EFFECT_ALL_ENEMIES) {
        return p.basicInfo.side !== item.sourceSide;
      }

      return false;
    });

    const bundleForApply = {
      ...item.bundle,
      effectAudience: undefined,
    };

    for (const r of recipients) {
      applyParsedSetBonusToParticipantDirect(
        r,
        bundleForApply,
        item.displayName,
        item.hud,
      );
    }
  }
}
