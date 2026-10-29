import { renderEntries } from "../entries";
import { array, object, str } from "./shared";

import { CONDITION_5E_KEYS, type CONDITION_KEYS, CUSTOM_CONDITION_KEY_RE } from "@/lib/utils/abilities/schema/kinds";

type Marker = (typeof CONDITION_KEYS)[number];

export interface CustomConditionRule { key: string; name: string; description: string; markers: Marker[] }

export interface CustomConditionDerivation { rule: CustomConditionRule | null; name: string; index: number; recognized: boolean }

const NEGATION = /\b(?:can'?t|cannot|can not|unable to)\b/i;

const NEGATED_PHRASES: Array<[RegExp, Marker[]]> = [
  [/\battack\b/i, ["disable_melee_attacks", "disable_ranged_attacks"]],
  [/\bcast a spell that (?:affects|targets) an enemy\b/i, ["no_hostile_spells"]],
  [/\bdeal damage\b/i, ["no_damage_dealt"]],
  [/\bmove\b/i, ["immobilized"]],
  [/\btake actions?\b/i, ["skip_action"]],
];

const ZERO_SPEED = /\bspeed (?:is|becomes) 0\b/i;

export const customConditionKey = (name: string): string | null => {
  const key = `custom:${name.normalize("NFC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "")}`;

  return CUSTOM_CONDITION_KEY_RE.test(key) ? key : null;
};

export function conditionMarkers(text: string): { markers: Marker[]; recognized: boolean } {
  const markers = new Set<Marker>();

  let unmatched = false;

  for (const sentence of text.replace(/[’‘]/g, "'").split(/(?<=[.!?])\s+/)) {
    if (ZERO_SPEED.test(sentence)) markers.add("immobilized");

    const negation = NEGATION.exec(sentence);

    if (!negation) continue;

    const tail = sentence.slice(negation.index);

    const found = NEGATED_PHRASES.filter(([re]) => re.test(tail));

    for (const [, list] of found) for (const m of list) markers.add(m);

    if (found.length === 0) unmatched = true;
  }

  return { markers: [...markers], recognized: markers.size > 0 && !unmatched };
}

export function deriveCustomConditions(root: Record<string, unknown>): CustomConditionDerivation[] {
  return array(root.condition).map((value, index) => {
    const row = object(value);

    const name = str(row.name).trim();

    const key = customConditionKey(name);

    if (!name || (CONDITION_5E_KEYS as readonly string[]).includes(name.toLowerCase())) return { rule: null, name, index, recognized: true };

    if (!key) return { rule: null, name, index, recognized: false };

    const text = renderEntries(row.entries).text;

    const { markers, recognized } = conditionMarkers(text);

    return { rule: { key, name: name.slice(0, 60), description: text.slice(0, 2000), markers }, name, index, recognized };
  });
}

const keyCache = new WeakMap<object, ReadonlyMap<string, string>>();

export function customConditionKeys(root: Record<string, unknown>): ReadonlyMap<string, string> {
  const cached = keyCache.get(root);

  if (cached) return cached;

  const keys = new Map(deriveCustomConditions(root).flatMap((d) => (d.rule ? [[d.name.toLowerCase(), d.rule.key] as const] : [])));

  keyCache.set(root, keys);

  return keys;
}
