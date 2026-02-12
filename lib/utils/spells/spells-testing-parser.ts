/**
 * Parser for docs/SPELLS_TESTING.md — extracts spell test cases by id.
 * Source of truth: ST (saving throw), HT (hit check), and assertions (D{x}/B{x}, damage, etc.).
 */

const ABILITY_ALIAS: Record<string, string> = {
  WIZ: "wisdom",
  WIS: "wisdom",
  INT: "intelligence",
  DEX: "dexterity",
  STR: "strength",
  CON: "constitution",
  CHA: "charisma",
};

export interface SpellTestCase {
  spellId: string;
  name: string;
  /** Raw assertion lines (e.g. "D3 speed of TE -50%") for later mapping */
  assertions: string[];
  savingThrow: { ability: string; dc: number } | "no";
  hitCheck: { ability: string; dc: number } | "no";
}

/** Match "N. id - Name" or "id - Name". Id is CUID-like (lowercase alphanumeric). */
const SPELL_HEADER = /^(?:\d+\.\s*)?([a-z0-9]{20,})\s*-\s*(.+)$/;

/** ST WIZ >= 14 or ST - no */
const ST_LINE = /^\-?\s*ST\s+(?:(\w+)\s*>=\s*(\d+)|-\s*no)\s*$/i;

/** HT INT >= 14 or HT NO */
const HT_LINE = /^\-?\s*HT\s+(?:(\w+)\s*>=\s*(\d+)|NO)\s*$/i;

/** Assertion line: starts with "-" (optionally "- ") and not ST/HT */
const ASSERTION_LINE = /^\s*-\s*(.+)$/;

function normalizeAbility(alias: string): string {
  const key = alias.toUpperCase();

  return ABILITY_ALIAS[key] ?? alias.toLowerCase();
}

/**
 * Parses SPELLS_TESTING.md content and returns an array of spell test cases.
 * Multiple entries can share the same spellId (e.g. duplicate id in doc).
 */
export function parseSpellsTestingMd(content: string): SpellTestCase[] {
  const lines = content.split(/\r?\n/);

  const cases: SpellTestCase[] = [];

  let current: Partial<SpellTestCase> | null = null;

  let assertions: string[] = [];

  function flush() {
    if (current?.spellId != null && current?.name != null) {
      cases.push({
        spellId: current.spellId,
        name: current.name.trim(),
        assertions: [...assertions],
        savingThrow: current.savingThrow ?? "no",
        hitCheck: current.hitCheck ?? "no",
      });
    }

    current = null;
    assertions = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const trimmed = line.trim();

    // Skip empty, section headers, and intro
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("*") || trimmed.startsWith("\\*") || trimmed === "Chaotic Magic") continue;

    if (/^скорочення|^TE -|^ST |^HT |^якщо|^debuff|^buff|^if spell/i.test(trimmed) && !SPELL_HEADER.test(trimmed)) continue;

    const headerMatch = trimmed.match(SPELL_HEADER);

    if (headerMatch) {
      flush();

      const spellId = headerMatch[1].trim();

      const name = headerMatch[2].trim();

      current = {
        spellId,
        name,
        savingThrow: "no",
        hitCheck: "no",
      };
      assertions = [];
      continue;
    }

    const stMatch = trimmed.match(ST_LINE);

    if (stMatch && current) {
      if (stMatch[1] != null && stMatch[2] != null) {
        current.savingThrow = {
          ability: normalizeAbility(stMatch[1]),
          dc: parseInt(stMatch[2], 10),
        };
      } else {
        current.savingThrow = "no";
      }

      continue;
    }

    const htMatch = trimmed.match(HT_LINE);

    if (htMatch && current) {
      if (htMatch[1] != null && htMatch[2] != null) {
        current.hitCheck = {
          ability: normalizeAbility(htMatch[1]),
          dc: parseInt(htMatch[2], 10),
        };
      } else {
        current.hitCheck = "no";
      }

      continue;
    }

    const assertionMatch = trimmed.match(ASSERTION_LINE);

    if (assertionMatch && current) {
      const text = assertionMatch[1].trim();

      if (text && !/^ST\s+/i.test(text) && !/^HT\s+/i.test(text)) {
        assertions.push(text);
      }

      continue;
    }

    // Multi-line assertion (e.g. "give 6d6 + level..." spanning lines)
    if (current && trimmed.length > 0 && !trimmed.startsWith("-")) {
      const prev = assertions[assertions.length - 1];

      if (prev && assertions.length > 0) {
        assertions[assertions.length - 1] = prev + " " + trimmed;
      } else {
        assertions.push(trimmed);
      }
    }
  }

  flush();

  return cases;
}

/** Структурований ефект для activeEffect.effects[] */
export interface ParsedSpellEffect {
  type: string;
  value: number;
  isPercentage?: boolean;
}

/** Результат парсингу assertions: тривалість і масив ефектів */
export interface ParsedEffectDetails {
  duration: number;
  effects: ParsedSpellEffect[];
}

/**
 * Парсить assertion рядки в структуровані ефекти.
 * D3/B3 → duration. speed -50% → speed. initiative -2 → initiative_bonus. -4 AC → ac_bonus. тощо.
 */
export function parseAssertionsToEffectDetails(
  assertions: string[],
): ParsedEffectDetails {
  let duration = 0;

  const effects: ParsedSpellEffect[] = [];

  for (const a of assertions) {
    const s = a.toLowerCase();

    // D3, B3, D1, D2, D10
    const durMatch = s.match(/\b[db](\d+)\b/i);

    if (durMatch && duration === 0) {
      duration = parseInt(durMatch[1], 10);
    }

    // speed -50%, speed +50%
    const speedMatch = s.match(/speed\s*(?:of\s*te)?\s*([+-]?\d+)%?/i);

    if (speedMatch) {
      effects.push({
        type: "speed",
        value: parseInt(speedMatch[1], 10),
        isPercentage: true,
      });
    }

    // initiative -2, initiative of TE -2, + 2 Initiative
    const initMatch = s.match(/initiative\s*(?:of\s*te)?\s*([+-]?\d+)|([+-])\s*(\d+)\s*initiative/i);

    if (initMatch) {
      const v = initMatch[1] != null ? parseInt(initMatch[1], 10) : (initMatch[2] === "+" ? 1 : -1) * parseInt(initMatch[3] ?? "0", 10);

      effects.push({ type: "initiative_bonus", value: v });
    }

    // -4 AC, +3AC, -50% AC
    const acMatch = s.match(/([+-]?\d+)%?\s*ac/i);

    if (acMatch) {
      effects.push({ type: "ac_bonus", value: parseInt(acMatch[1], 10) });
    }

    // morale -2
    const moraleMatch = s.match(/morale\s*(?:of\s*te)?\s*([+-]?\d+)/i);

    if (moraleMatch) {
      effects.push({ type: "morale", value: parseInt(moraleMatch[1], 10) });
    }

    // saving throw -2
    const stMatch = s.match(/saving\s*throw\s*(?:of\s*te)?\s*([+-]?\d+)/i);

    if (stMatch) {
      effects.push({ type: "saving_throw_bonus", value: parseInt(stMatch[1], 10) });
    }

    // melee/range attack damage -40%, melee and range -40%
    const dmgMatch = s.match(/(?:melee\/?range|melee\s*and\s*range|melee|ranged?)\s*(?:attack\s*)?damage\s*(?:of\s*te)?\s*([+-]?\d+)%?/i);

    if (dmgMatch) {
      const val = parseInt(dmgMatch[1], 10);

      if (s.includes("melee") && s.includes("range")) {
        effects.push({ type: "melee_damage", value: val, isPercentage: true });
        effects.push({ type: "ranged_damage", value: val, isPercentage: true });
      } else if (s.includes("melee")) {
        effects.push({ type: "melee_damage", value: val, isPercentage: true });
      } else {
        effects.push({ type: "ranged_damage", value: val, isPercentage: true });
      }
    }

    // all melee and range damage +40%, +40% for all melee and range damage
    const allDmgMatch = s.match(/all\s*(?:melee\s*and\s*range|melee|range)\s*damage\s*([+-]?\d+)%?|([+-]?\d+)%?\s*for\s*all\s*(?:melee\s*and\s*range|melee|range)\s*damage/i);

    if (allDmgMatch && !dmgMatch) {
      const val = parseInt(allDmgMatch[1] ?? allDmgMatch[2] ?? "0", 10);

      effects.push({ type: "melee_damage", value: val, isPercentage: true });
      effects.push({ type: "ranged_damage", value: val, isPercentage: true });
    }

    // income range damage -50%
    const rangeDmgMatch = s.match(/(?:income|incoming?)\s*range\s*damage\s*([+-]?\d+)%?/i);

    if (rangeDmgMatch) {
      effects.push({ type: "ranged_damage_reduction", value: parseInt(rangeDmgMatch[1], 10), isPercentage: true });
    }

    // Heal itself for 50% melee/range attack damage (вампіризм)
    const vampMatch = s.match(/heal\s*(?:itself|yourself)?\s*(?:for|by)\s*(\d+)%\s*(?:melee\/?range|melee\s*(?:and|&)\s*range|melee|range)\s*attack\s*damage/i);

    if (vampMatch) {
      effects.push({ type: "vampirism", value: parseInt(vampMatch[1], 10), isPercentage: true });
    }
  }

  return { duration: duration || 0, effects };
}

/** Returns unique spell ids from parsed test cases (order preserved). */
export function getUniqueSpellIds(cases: SpellTestCase[]): string[] {
  const seen = new Set<string>();

  const order: string[] = [];

  for (const c of cases) {
    if (!seen.has(c.spellId)) {
      seen.add(c.spellId);
      order.push(c.spellId);
    }
  }

  return order;
}
