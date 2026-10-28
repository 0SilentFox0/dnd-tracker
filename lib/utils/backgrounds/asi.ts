import { readChoices } from "@/lib/utils/characters/choices/read";

export const backgroundAsiRules = (raw: unknown) => readChoices(raw).filter((c) => c.kind === "abilityScore" || c.kind === "feat").map(({ id, kind, level, count, points, abilities, max, maxPerAbility, featTypes }) => ({ id, kind, level, count, points, abilities, max, maxPerAbility, featTypes }));
