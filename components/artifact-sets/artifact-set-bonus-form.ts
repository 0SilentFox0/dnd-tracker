import { isArtifactEffectAudience } from "@/lib/constants/artifact-effect-scope";
import {
  ARTIFACT_SET_FLAT_BONUS_KEYS,
  ARTIFACT_SET_PASSIVE_FLAG_STATS,
  SPELL_SLOT_LEVEL_KEYS,
} from "@/lib/constants/artifact-sets";
import {
  isFlagValueType,
  isTextValueType,
} from "@/lib/constants/skill-effects";
import type { ArtifactSetPassiveEffect } from "@/lib/types/artifact-set-bonus";
import { parseArtifactSetBonus } from "@/lib/types/artifact-set-bonus";

export interface ArtifactSetModifierFormRow {
  type: string;
  value: number;
  isPercentage: boolean;
  element: string;
}

export interface ArtifactSetPassiveFormRow {
  stat: string;
  type: string;
  value: string;
}

export interface ArtifactSetExtraBonusRow {
  key: string;
  value: number;
}

export interface ArtifactSetBonusFormState {
  bonusName: string;
  bonusDescription: string;
  bonuses: Record<string, number>;
  /** Ключі з JSON, яких немає в сітці плоских бонусів */
  extraBonuses: ArtifactSetExtraBonusRow[];
  modifiers: ArtifactSetModifierFormRow[];
  spellSlotBonus: Record<string, number>;
  passiveEffects: ArtifactSetPassiveFormRow[];
  /** Порожньо = лише носій (як у артефакта). */
  effectAudience: string;
  immuneSpellIds: string[];
}

function emptyBonuses(): Record<string, number> {
  return Object.fromEntries(ARTIFACT_SET_FLAT_BONUS_KEYS.map((k) => [k, 0]));
}

export function createEmptyArtifactSetBonusForm(): ArtifactSetBonusFormState {
  return {
    bonusName: "",
    bonusDescription: "",
    bonuses: emptyBonuses(),
    extraBonuses: [],
    modifiers: [],
    spellSlotBonus: Object.fromEntries(
      SPELL_SLOT_LEVEL_KEYS.map((k) => [k, 0]),
    ),
    passiveEffects: [],
    effectAudience: "",
    immuneSpellIds: [],
  };
}

export function artifactSetBonusFormFromUnknown(
  raw: unknown,
): ArtifactSetBonusFormState {
  const base = createEmptyArtifactSetBonusForm();

  const p = parseArtifactSetBonus(raw);

  const bonuses = { ...base.bonuses };

  const extraBonuses: ArtifactSetExtraBonusRow[] = [];

  const flatSet = new Set(ARTIFACT_SET_FLAT_BONUS_KEYS);

  for (const [k, v] of Object.entries(p.bonuses)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;

    if (flatSet.has(k)) bonuses[k] = v;
    else extraBonuses.push({ key: k, value: v });
  }

  const spellSlotBonus = { ...base.spellSlotBonus };

  const src = p.spellSlotBonus ?? {};

  for (const lvl of Object.keys(spellSlotBonus)) {
    const v = src[lvl];

    if (typeof v === "number" && Number.isFinite(v)) spellSlotBonus[lvl] = v;
  }

  const modifiers: ArtifactSetModifierFormRow[] = (p.modifiers ?? []).map(
    (m) => ({
      type: m.type,
      value: m.value,
      isPercentage: Boolean(m.isPercentage),
      element: m.element ?? "",
    }),
  );

  const passiveEffects: ArtifactSetPassiveFormRow[] = (
    p.passiveEffects ?? []
  ).map((e) => {
    if (ARTIFACT_SET_PASSIVE_FLAG_STATS.has(e.stat)) {
      return { stat: e.stat, type: "flag", value: "" };
    }

    const t = e.type ?? "flat";

    const val = e.value;

    if (val === undefined || val === null) {
      return { stat: e.stat, type: t, value: "" };
    }

    return {
      stat: e.stat,
      type: t,
      value: typeof val === "number" ? String(val) : String(val),
    };
  });

  return {
    bonusName: p.name ?? "",
    bonusDescription: p.description ?? "",
    bonuses,
    extraBonuses,
    modifiers,
    spellSlotBonus,
    passiveEffects,
    effectAudience: p.effectAudience ?? "",
    immuneSpellIds: [...new Set((p.immuneSpellIds ?? []).map((x) => String(x).trim()).filter(Boolean))],
  };
}

function serializePassiveRow(
  row: ArtifactSetPassiveFormRow,
): ArtifactSetPassiveEffect | null {
  if (!row.stat.trim()) return null;

  const stat = row.stat.trim();

  if (ARTIFACT_SET_PASSIVE_FLAG_STATS.has(stat)) {
    return { stat };
  }

  const out: ArtifactSetPassiveEffect = { stat };

  const type = row.type.trim();

  if (type) out.type = type;

  if (isFlagValueType(type)) {
    return out;
  }

  const raw = row.value.trim();

  if (!raw) return out;

  if (isTextValueType(type) || Number.isNaN(Number(raw))) {
    out.value = raw;
  } else {
    const n = Number(raw);

    out.value = Number.isFinite(n) ? n : raw;
  }

  return out;
}

export function buildArtifactSetBonusPayload(
  form: ArtifactSetBonusFormState,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (form.bonusName.trim()) out.name = form.bonusName.trim();

  if (form.bonusDescription.trim()) {
    out.description = form.bonusDescription.trim();
  }

  const bonuses: Record<string, number> = {};

  for (const [k, v] of Object.entries(form.bonuses)) {
    if (typeof v === "number" && v !== 0 && Number.isFinite(v)) bonuses[k] = v;
  }

  for (const row of form.extraBonuses) {
    const k = row.key.trim();

    if (!k) continue;

    if (
      typeof row.value === "number" &&
      row.value !== 0 &&
      Number.isFinite(row.value)
    ) {
      bonuses[k] = row.value;
    }
  }

  if (Object.keys(bonuses).length > 0) out.bonuses = bonuses;

  const modifiers = form.modifiers
    .filter(
      (m) =>
        m.type.trim() && Number.isFinite(m.value) && m.value !== 0,
    )
    .map((m) => {
      const row: Record<string, unknown> = {
        type: m.type.trim(),
        value: m.value,
      };

      if (m.isPercentage) row.isPercentage = true;

      if (m.element.trim()) row.element = m.element.trim();

      return row;
    });

  if (modifiers.length > 0) out.modifiers = modifiers;

  const spellSlotBonus: Record<string, number> = {};

  for (const [lvl, add] of Object.entries(form.spellSlotBonus)) {
    if (typeof add === "number" && add !== 0 && Number.isFinite(add)) {
      spellSlotBonus[lvl] = add;
    }
  }

  if (Object.keys(spellSlotBonus).length > 0) {
    out.spellSlotBonus = spellSlotBonus;
  }

  const passiveEffects = form.passiveEffects
    .map(serializePassiveRow)
    .filter((x): x is ArtifactSetPassiveEffect => x != null);

  if (passiveEffects.length > 0) out.passiveEffects = passiveEffects;

  const scope: Record<string, unknown> = {};

  const aud = form.effectAudience.trim();

  if (aud && isArtifactEffectAudience(aud)) {
    scope.audience = aud;
  }

  const immuneSpellIds = [
    ...new Set(
      (form.immuneSpellIds ?? [])
        .map((id) => String(id).trim())
        .filter(Boolean),
    ),
  ];

  if (immuneSpellIds.length > 0) {
    scope.immuneSpellIds = immuneSpellIds;
  }

  if (Object.keys(scope).length > 0) {
    out.effectScope = scope;
  }

  return out;
}
