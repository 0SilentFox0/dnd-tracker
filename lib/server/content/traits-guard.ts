import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { isSystemEffectKind } from "@/lib/utils/abilities/registry/effects/system-rows";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";

type EffectOwner = { effects: readonly { kind: string }[] };

export const hasTraitEffect = (abilities: readonly EffectOwner[] | undefined): boolean => !!abilities?.some((a) => a.effects.some((e) => isSystemEffectKind(e.kind)));

export function assertTraitsSupported(system: Pick<RuleSystemDefinition, "traits"> | null, abilities: readonly EffectOwner[] | undefined): void {
  if (system?.traits || !hasTraitEffect(abilities)) return;

  throw new ContentError(API_ERRORS.SYSTEM_TRAITS_UNSUPPORTED, 400);
}
