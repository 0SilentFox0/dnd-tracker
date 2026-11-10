import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { isTraitEffectKind } from "@/lib/utils/abilities/schema/kinds";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";

type EffectOwner = { effects: readonly { kind: string }[] };

export const hasTraitEffect = (abilities: readonly EffectOwner[] | undefined): boolean => !!abilities?.some((a) => a.effects.some((e) => isTraitEffectKind(e.kind)));

export function assertTraitsSupported(system: Pick<RuleSystemDefinition, "traits"> | null, abilities: readonly EffectOwner[] | undefined): void {
  if (system?.traits || !hasTraitEffect(abilities)) return;

  throw new ContentError(API_ERRORS.SYSTEM_TRAITS_UNSUPPORTED, 400);
}
