import {
  isArtifactEffectAudience,
  parseEffectScopeObject,
} from "@/lib/constants/artifact-effect-scope";
import {
  ARTIFACT_COMBAT_BONUS_OPTIONS,
  ARTIFACT_MODIFIER_EDITOR_OPTIONS,
  ARTIFACT_SLOT_BONUS_LEVELS,
  artifactSlotBonusKey,
} from "@/lib/constants/artifacts";
import type { SkillEffect } from "@/types/battle";

export interface ArtifactModifierDraft {
  type: string;
  value: string;
  isPercentage: boolean;
  element: string;
}

export function emptyArtifactBonusesRecord(): Record<string, number> {
  const o: Record<string, number> = {};

  for (const { key } of ARTIFACT_COMBAT_BONUS_OPTIONS) {
    o[key] = 0;
  }

  for (const lvl of ARTIFACT_SLOT_BONUS_LEVELS) {
    o[artifactSlotBonusKey(lvl)] = 0;
  }

  return o;
}

export function artifactBonusesFromDb(
  raw: unknown,
): Record<string, number> {
  const base = emptyArtifactBonusesRecord();

  if (!raw || typeof raw !== "object") return base;

  const src = raw as Record<string, number>;

  for (const k of Object.keys(base)) {
    const v = src[k];

    if (typeof v === "number" && Number.isFinite(v)) base[k] = v;
  }

  return base;
}

export function buildArtifactBonusesPayload(
  bonuses: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};

  for (const [k, v] of Object.entries(bonuses)) {
    if (typeof v === "number" && v !== 0 && Number.isFinite(v)) {
      out[k] = v;
    }
  }

  return out;
}

export function modifierDraftFromApi(row: {
  type: string;
  value: unknown;
  isPercentage?: boolean;
  element?: string;
}): ArtifactModifierDraft {
  return {
    type: row.type,
    value:
      typeof row.value === "number"
        ? String(row.value)
        : String(row.value ?? ""),
    isPercentage: Boolean(row.isPercentage),
    element: typeof row.element === "string" ? row.element : "",
  };
}

export function modifierDraftToApi(
  d: ArtifactModifierDraft,
): {
  type: string;
  value: number | string;
  isPercentage: boolean;
  element?: string;
} {
  const opt = ARTIFACT_MODIFIER_EDITOR_OPTIONS.find((o) => o.value === d.type);

  const kind = opt?.valueKind ?? "number";

  if (kind === "string") {
    const out: {
      type: string;
      value: string;
      isPercentage: boolean;
      element?: string;
    } = {
      type: d.type,
      value: d.value.trim() || "",
      isPercentage: false,
    };

    if (d.element.trim()) out.element = d.element.trim();

    return out;
  }

  const n = parseFloat(d.value);

  const v = Number.isFinite(n) ? n : 0;

  const out: {
    type: string;
    value: number;
    isPercentage: boolean;
    element?: string;
  } = {
    type: d.type,
    value: v,
    isPercentage: d.isPercentage,
  };

  if (d.element.trim()) out.element = d.element.trim();

  return out;
}

export function normalizePassiveSkillEffects(
  effects: SkillEffect[],
): SkillEffect[] {
  return effects.map((e) => ({
    ...e,
    isPercentage: e.isPercentage ?? e.type === "percent",
  }));
}

export interface ArtifactEffectScopeDraft {
  audience: string;
  immuneSpellIds: string[];
}

function uniqueImmuneSpellIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export function serializeArtifactEffectScope(
  draft: ArtifactEffectScopeDraft,
): Record<string, unknown> | undefined {
  const aud = draft.audience.trim();

  const immuneSpellIds = uniqueImmuneSpellIds(draft.immuneSpellIds ?? []);

  const out: Record<string, unknown> = {};

  if (aud && isArtifactEffectAudience(aud)) {
    out.audience = aud;
  }

  if (immuneSpellIds.length > 0) {
    out.immuneSpellIds = immuneSpellIds;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

export function artifactEffectScopeDraftFromDb(
  passiveAbility: unknown,
): ArtifactEffectScopeDraft {
  if (!passiveAbility || typeof passiveAbility !== "object") {
    return { audience: "", immuneSpellIds: [] };
  }

  const scope = (passiveAbility as { effectScope?: unknown }).effectScope;

  const parsed = parseEffectScopeObject(scope);

  return {
    audience: parsed.effectAudience ?? "",
    immuneSpellIds: uniqueImmuneSpellIds(parsed.immuneSpellIds ?? []),
  };
}

export function buildArtifactPassiveAbilityPayload(
  name: string,
  description: string,
  effects: SkillEffect[],
  existing: Record<string, unknown> | null | undefined,
  effectScopeDraft?: ArtifactEffectScopeDraft,
): Record<string, unknown> | null {
  const effectScope = effectScopeDraft
    ? serializeArtifactEffectScope(effectScopeDraft)
    : undefined;

  const hasEffectScope = Boolean(effectScope && Object.keys(effectScope).length > 0);

  const has =
    name.trim() ||
    description.trim() ||
    effects.length > 0 ||
    hasEffectScope;

  if (!has) return null;

  const rest =
    existing && typeof existing === "object" ? { ...existing } : {};

  delete rest.name;
  delete rest.description;
  delete rest.effects;
  delete rest.effectScope;

  return {
    ...rest,
    name: name.trim() || "Пасив артефакту",
    description: description.trim(),
    ...(effects.length > 0
      ? { effects: normalizePassiveSkillEffects(effects) }
      : {}),
    ...(hasEffectScope ? { effectScope } : {}),
  };
}

export function defaultArtifactModifierDraft(): ArtifactModifierDraft {
  return {
    type: "melee_damage",
    value: "0",
    isPercentage: false,
    element: "",
  };
}

export function passiveSkillEffectsFromDb(
  passiveAbility: unknown,
): SkillEffect[] {
  if (!passiveAbility || typeof passiveAbility !== "object") return [];

  const fx = (passiveAbility as { effects?: unknown }).effects;

  if (!Array.isArray(fx)) return [];

  return normalizePassiveSkillEffects(fx as SkillEffect[]);
}

export function artifactModifierDraftsFromDb(
  raw: unknown,
): ArtifactModifierDraft[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (r): r is { type: string; value: unknown } =>
        r != null &&
        typeof r === "object" &&
        typeof (r as { type?: unknown }).type === "string",
    )
    .map((r) =>
      modifierDraftFromApi(
        r as {
          type: string;
          value: unknown;
          isPercentage?: boolean;
          element?: string;
        },
      ),
    );
}
