import { renderEntries } from "../../entries";
import type { SpellRecognizer } from "./index";

import { durationRounds, spellRange } from "@/lib/utils/spells/derive/mechanics";
import { numberWord } from "@/lib/utils/spells/derive/text";
import type { SpellDefinition, SpellEffect } from "@/lib/utils/spells/model/schema";

const CHOOSE_ONE = /\b(?:choose|gaining|gain|have) one of the following\b/i;

const HEAL = /\bregains? (?:a number of )?(\d+d(?:4|6|8|10|12|20))\b(?:\s*\+\s*(?:\d+|your [a-z ]+ modifier))?[^.]*?\bhit points\b|\bregains? hit points equal to (\d+d(?:4|6|8|10|12|20))\b/i;

const SPEED = /\bspeed increases by (\d+) feet/i;

const IGNORES_RESISTANCE = /\b(?:ignores?|bypass(?:es)?|loses?) (?:its |any )?resistance to (\w+) damage/i;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function optionTexts(entries: unknown): string[] | null {
  const list = Array.isArray(entries) ? entries : [];

  const at = list.findIndex((e) => typeof e === "string" && CHOOSE_ONE.test(e));

  if (at < 0) return null;

  const after = list.slice(at + 1);

  const items = after.find((e) => isRecord(e) && e.type === "list");

  const plain = after.filter((e): e is string => typeof e === "string");

  const texts = isRecord(items) && Array.isArray(items.items) ? items.items.map((i) => renderEntries(i).text.trim()).filter(Boolean) : plain.map((e) => renderEntries(e).text.trim()).filter(Boolean);

  return texts.length >= 2 && texts.length <= 7 ? texts : null;
}

type Option = { effect: SpellEffect; known: boolean };

function optionOf(text: string, rounds: number): Option {
  const heal = HEAL.exec(text);

  if (heal) return { effect: { kind: "heal", amount: heal[1] ?? heal[2] }, known: true };

  const speed = SPEED.exec(text);

  if (speed) return { effect: { kind: "modifyStat", stat: "speed", flat: Number(speed[1]), duration: { rounds } }, known: true };

  const ignored = IGNORES_RESISTANCE.exec(text);

  if (ignored) return { effect: { kind: "flag", flag: "resistance", damageType: ignored[1].toLowerCase(), percent: -100, duration: { rounds } }, known: true };

  return { effect: { kind: "note", text: text.slice(0, 300) }, known: false };
}

export const chooseOneSpell: SpellRecognizer = ({ t, row, cast, ability, damageTypes }) => {
  const texts = optionTexts(row.entries);

  if (!texts || ability || damageTypes.length > 0) return null;

  const options = texts.map((t) => optionOf(t, durationRounds(cast.facts.duration)));

  if (!options.some((o) => o.known)) return null;

  const range = spellRange(cast.facts);

  const targeting: SpellDefinition["targeting"] = range === "self" ? { kind: "self" } : { kind: "ally", range };

  return {
    native: {
      narrative: false,
      riders: options.flatMap((o, i) => (o.known ? [] : [t("derived.spell.rider.variant", { n: i + 1 })])),
      fields: {
        targeting,
        resolution: { kind: "auto" },
        dice: 0,
        spellEffects: [{ kind: "chooseOne", options: options.map((o) => o.effect) }],
      },
    },
  };
};

const HELP = /\bHelp action\b|\badvantage on the next attack roll\b/i;

export const helpAlly: SpellRecognizer = ({ text, cast, ability, damageTypes }) => {
  const range = spellRange(cast.facts);

  if (!HELP.test(text) || ability || damageTypes.length > 0 || range === "self") return null;

  return {
    native: {
      narrative: false,
      riders: [],
      fields: { targeting: { kind: "ally", range }, resolution: { kind: "auto" }, dice: 0, spellEffects: [{ kind: "help" }] },
    },
  };
};

const REDUCE_DAMAGE = /\broll a d(4|6|8|10|12|20)\b[^.]*\bsubtract the number rolled from\b[^.]*\bdamage\b|\broll a d(4|6|8|10|12|20)\b[^.]*\bdamage\b[^.]*\bis reduced by the number (?:you )?rolled\b/i;

const UP_TO_WEAPONS = /\bup to (\w+) weapons\b/i;

const EXTRA_WEAPONS = /\b(?:target|affect) (\w+) additional weapons? for each (?:spell )?slot level above/i;

export const reduceDamageRoll: SpellRecognizer = ({ text, higher, cast, ability, damageTypes }) => {
  const m = REDUCE_DAMAGE.exec(text);

  if (!m || damageTypes.length > 0) return null;

  const range = spellRange(cast.facts);

  const weapons = numberWord(UP_TO_WEAPONS.exec(text)?.[1] ?? "");

  const extra = numberWord(EXTRA_WEAPONS.exec(higher)?.[1] ?? "");

  return {
    native: {
      narrative: false,
      riders: [],
      fields: {
        targeting: weapons && weapons > 1 && weapons <= 20 ? { kind: "area", side: "enemy", maxTargets: weapons, ...(range !== "self" && { range }) } : { kind: "enemy", ...(range !== "self" && { range }) },
        resolution: ability ? { kind: "save", ability, onSuccess: "none" } : { kind: "auto" },
        dice: 1,
        dieSides: Number(m[1] ?? m[2]),
        ...(extra && weapons && extra <= 10 && { upcastTargets: extra }),
        spellEffects: [{ kind: "damageBonus", filter: { kind: "physical" }, flat: { spellRoll: -100 }, duration: { rounds: durationRounds(cast.facts.duration) } }],
      },
    },
  };
};
