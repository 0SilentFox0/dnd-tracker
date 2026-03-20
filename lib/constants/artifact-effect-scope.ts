/**
 * На кого діють бонуси повного сету / артефакта з нестандартною «аурою».
 */

export const ARTIFACT_EFFECT_SELF = "self" as const;
export const ARTIFACT_EFFECT_ALL_ALLIES = "all_allies" as const;
export const ARTIFACT_EFFECT_ALL_ENEMIES = "all_enemies" as const;

export type ArtifactEffectAudience =
  | typeof ARTIFACT_EFFECT_SELF
  | typeof ARTIFACT_EFFECT_ALL_ALLIES
  | typeof ARTIFACT_EFFECT_ALL_ENEMIES;

export const ARTIFACT_EFFECT_AUDIENCE_OPTIONS: ReadonlyArray<{
  value: ArtifactEffectAudience;
  label: string;
  description: string;
}> = [
  {
    value: ARTIFACT_EFFECT_SELF,
    label: "Лише носій",
    description: "Бонуси застосовуються тільки до персонажа з екіпіровкою.",
  },
  {
    value: ARTIFACT_EFFECT_ALL_ALLIES,
    label: "Уся команда (союзники)",
    description:
      "Усі учасники на тій самій стороні, що й носій, отримують ті самі бонуси (сума з кількох джерел).",
  },
  {
    value: ARTIFACT_EFFECT_ALL_ENEMIES,
    label: "Усі вороги",
    description:
      "Бонуси з JSON застосовуються до кожного ворога (зазвичай від’ємні значення = штраф).",
  },
];

export function isArtifactEffectAudience(
  v: string | undefined | null,
): v is ArtifactEffectAudience {
  return (
    v === ARTIFACT_EFFECT_SELF ||
    v === ARTIFACT_EFFECT_ALL_ALLIES ||
    v === ARTIFACT_EFFECT_ALL_ENEMIES
  );
}

export function parseImmuneSpellIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const out: string[] = [];

  for (const x of raw) {
    if (typeof x === "string" && x.trim()) out.push(x.trim());
  }

  return [...new Set(out)];
}

/** Розбити рядок з ID через кому / перенос. */
export function parseImmuneSpellIdsFromText(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

/** Об'єкт `effectScope` у JSON сету або в `passiveAbility` артефакта. */
export function parseEffectScopeObject(
  scope: unknown,
): {
  effectAudience?: ArtifactEffectAudience;
  immuneSpellIds?: string[];
} {
  if (!scope || typeof scope !== "object" || Array.isArray(scope)) {
    return {};
  }

  const s = scope as Record<string, unknown>;

  const aud = s.audience;

  const immuneSpellIds = parseImmuneSpellIds(s.immuneSpellIds);

  const immuneOnly =
    immuneSpellIds.length > 0 ? { immuneSpellIds } : {};

  if (typeof aud !== "string" || !isArtifactEffectAudience(aud)) {
    return immuneOnly;
  }

  return {
    effectAudience: aud,
    ...immuneOnly,
  };
}
