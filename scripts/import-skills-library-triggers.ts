/**
 * Парсинг trigger-рядків з SKILLS.md для import-skills-library
 */

import type {
  ComplexTrigger,
  ParsedTrigger,
  SimpleTrigger,
  SkillTriggerModifiers,
} from "./import-skills-library-types";

const ALL_SIMPLE_TRIGGERS = [
  "startRound", "endRound",
  "beforeOwnerAttack", "beforeEnemyAttack",
  "afterOwnerAttack", "afterEnemyAttack",
  "beforeOwnerSpellCast", "afterOwnerSpellCast",
  "beforeEnemySpellCast", "afterEnemySpellCast",
  "bonusAction",
  "passive", "onBattleStart",
  "onHit", "onAttack", "onKill", "onAllyDeath",
  "onLethalDamage", "onCast",
  "onFirstHitTakenPerRound", "onFirstRangedAttack",
  "onMoraleSuccess", "allyMoraleCheck",
] as const;

const TRIGGER_ALIASES: Record<string, string> = {
  "onbattlestart": "onBattleStart",
  "passive": "passive",
  "onhit": "onHit",
  "onattack": "onAttack",
  "onkill": "onKill",
  "onallydeath": "onAllyDeath",
  "onlethaldamage": "onLethalDamage",
  "oncast": "onCast",
  "onfirsthittakenperround": "onFirstHitTakenPerRound",
  "onfirstrangedattack": "onFirstRangedAttack",
  "onmoralesuccess": "onMoraleSuccess",
  "allymoralecheck": "allyMoraleCheck",
  "bonusaction": "bonusAction",
  "startround": "startRound",
  "endround": "endRound",
  "beforeownerattack": "beforeOwnerAttack",
  "beforeenemyattack": "beforeEnemyAttack",
  "afterownerattack": "afterOwnerAttack",
  "afterenemyattack": "afterEnemyAttack",
  "beforeownerspellcast": "beforeOwnerSpellCast",
  "afterownerspellcast": "afterOwnerSpellCast",
  "beforeenemyspellcast": "beforeEnemySpellCast",
  "afterenemyspellcast": "afterEnemySpellCast",
};

function resolveSimpleTrigger(token: string): string | null {
  const lower = token.toLowerCase().trim();

  if (TRIGGER_ALIASES[lower]) return TRIGGER_ALIASES[lower];

  const found = ALL_SIMPLE_TRIGGERS.find((t) => t.toLowerCase() === lower);

  return found ?? null;
}

function parseModifiers(tokens: string[]): SkillTriggerModifiers | undefined {
  const mods: SkillTriggerModifiers = {};

  let hasAny = false;

  for (const token of tokens) {
    const t = token.trim().toLowerCase();

    const randMatch = token.match(/rand\(\)\s*<\s*([\d.]+)/i);

    if (randMatch) {
      mods.probability = parseFloat(randMatch[1]);
      hasAny = true;
      continue;
    }

    if (t === "onceperbattle") {
      mods.oncePerBattle = true;
      hasAny = true;
      continue;
    }

    if (t === "twiceperbattle") {
      mods.twicePerBattle = true;
      hasAny = true;
      continue;
    }

    if (t === "stackable") {
      mods.stackable = true;
      hasAny = true;
      continue;
    }

    if (t === "onconsumedead" || t.includes("allyhp") || t.includes("moralenegative")) {
      mods.condition = token.trim();
      hasAny = true;
      continue;
    }
  }

  return hasAny ? mods : undefined;
}

function tryParseComplexCondition(token: string): ComplexTrigger | null {
  const match = token.match(
    /^(ally|enemy)(HP|Morale|AC|Speed|Attack|Level)\s*(<=|>=|<|>|=)\s*([\d.]+)\s*(\*\s*\w+)?$/i,
  );

  if (!match) return null;

  const targetStr = match[1].toLowerCase();

  const stat = match[2];

  const operator = match[3];

  const value = parseFloat(match[4]);

  const hasMultiplier = !!match[5];

  return {
    type: "complex",
    target: targetStr === "ally" ? "ally" : "enemy",
    operator,
    value: hasMultiplier ? value * 100 : value,
    valueType: hasMultiplier || value < 1 ? "percent" : "number",
    stat: stat === "HP" ? "HP" : stat === "Morale" ? "Morale" : (stat as "HP"),
  };
}

export function triggerStringToSkillTriggers(
  triggerStr: string,
): ParsedTrigger[] {
  const normalized = triggerStr.trim();

  if (!normalized) return [];

  if (normalized.includes("||")) {
    const parts = normalized.split(/\s*\|\|\s*/);

    const results: ParsedTrigger[] = [];

    for (const part of parts) {
      results.push(...triggerStringToSkillTriggers(part.trim()));
    }

    return results;
  }

  const tokens = normalized
    .split(/\s*&&\s*/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) return [];

  let mainTrigger: string | null = null;

  const modifierTokens: string[] = [];

  let complexTrigger: ComplexTrigger | null = null;

  for (const token of tokens) {
    const simple = resolveSimpleTrigger(token);

    if (simple && !mainTrigger) {
      mainTrigger = simple;
      continue;
    }

    if (token.toLowerCase() === "action" && !mainTrigger) {
      mainTrigger = "bonusAction";
      continue;
    }

    const complex = tryParseComplexCondition(token);

    if (complex) {
      complexTrigger = complex;
      continue;
    }

    modifierTokens.push(token);
  }

  const modifiers = parseModifiers(modifierTokens);

  if (complexTrigger) {
    if (mainTrigger === "passive") {
      complexTrigger.modifiers = modifiers;

      return [complexTrigger];
    }

    complexTrigger.modifiers = modifiers;

    return [complexTrigger];
  }

  if (!mainTrigger) {
    if (modifierTokens.some((t) => t.toLowerCase() === "onceperbattle")) {
      mainTrigger = "bonusAction";
    } else {
      return [
        {
          type: "simple",
          trigger: "passive",
          modifiers: { condition: normalized },
        },
      ];
    }
  }

  const result: SimpleTrigger = {
    type: "simple",
    trigger: mainTrigger,
  };

  if (modifiers) result.modifiers = modifiers;

  return [result];
}
