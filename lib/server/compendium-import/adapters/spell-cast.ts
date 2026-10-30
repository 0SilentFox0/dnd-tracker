import { parseMaterial } from "./spell-patterns/ingredients";
import { array, num, object, str } from "./shared";

import type { ComponentFlags, SpellIngredient } from "@/lib/schemas/spell-ingredients";
import type { SpellFacts } from "@/lib/utils/spells/derive/mechanics";

export interface SpellCast {
  castingKey: string;
  castingText: string;
  trigger: string | null;
  rangeText: string;
  components: string;
  componentFlags: ComponentFlags;
  ingredients: SpellIngredient[];
  durationText: string;
  concentration: boolean;
  ritual: boolean;
  facts: Pick<SpellFacts, "range_text" | "range" | "duration" | "shape_type" | "shape_size">;
}

const TIME_KEYS: Record<string, [string, string]> = { action: ["action", "Action"], bonus: ["bonus-action", "Bonus Action"], reaction: ["reaction", "Reaction"] };

const AREA_SHAPES: Record<string, string> = { radius: "sphere", sphere: "sphere", hemisphere: "sphere", cylinder: "sphere", cone: "cone", line: "line", cube: "cube", square: "cube" };

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

function casting(row: Record<string, unknown>): Pick<SpellCast, "castingKey" | "castingText" | "trigger"> {
  const time = object(array(row.time)[0]);

  const unit = str(time.unit);

  const n = num(time.number) ?? 1;

  const trigger = str(time.condition) || null;

  if (TIME_KEYS[unit]) return { castingKey: TIME_KEYS[unit][0], castingText: TIME_KEYS[unit][1], trigger };

  if (unit === "minute" || unit === "hour") return { castingKey: `${n}${unit}${n === 1 ? "" : "s"}`, castingText: plural(n, unit), trigger };

  return { castingKey: "action", castingText: unit ? plural(n, unit) : "Action", trigger };
}

function range(row: Record<string, unknown>): Pick<SpellCast, "rangeText"> & Pick<SpellCast["facts"], "range_text" | "range" | "shape_type" | "shape_size"> {
  const r = object(row.range);

  const distance = object(r.distance);

  const kind = str(distance.type);

  const amount = num(distance.amount);

  const area = AREA_SHAPES[str(r.type)];

  if (area && amount !== undefined) return { rangeText: `Self (${amount}-foot ${str(r.type)})`, range_text: "Self", range: null, shape_type: area, shape_size: amount };

  const none = { shape_type: null, shape_size: null };

  if (kind === "self") return { rangeText: "Self", range_text: "Self", range: null, ...none };

  if (kind === "touch") return { rangeText: "Touch", range_text: "Touch", range: null, ...none };

  if (kind === "feet" && amount !== undefined) return { rangeText: `${amount} feet`, range_text: `${amount} feet`, range: amount, ...none };

  if (kind === "miles" && amount !== undefined) return { rangeText: plural(amount, "mile"), range_text: plural(amount, "mile"), range: null, ...none };

  const text = kind === "sight" ? "Sight" : kind === "unlimited" ? "Unlimited" : "Special";

  return { rangeText: text, range_text: text, range: null, ...none };
}

function components(raw: unknown): string {
  const c = object(raw);

  const material = typeof c.m === "string" ? c.m : str(object(c.m).text);

  return [c.v && "V", c.s && "S", c.m && `M${material ? ` (${material})` : ""}`].filter(Boolean).join(", ");
}

function ingredients(raw: unknown): { componentFlags: ComponentFlags; ingredients: SpellIngredient[] } {
  const c = object(raw);

  const componentFlags = { v: Boolean(c.v), s: Boolean(c.s), m: Boolean(c.m) };

  const m = typeof c.m === "string" ? c.m : c.m && typeof c.m === "object" ? { text: str(object(c.m).text) || undefined, cost: num(object(c.m).cost), consume: object(c.m).consume as boolean | "optional" | undefined } : null;

  return { componentFlags, ingredients: (m && parseMaterial(m)) || [] };
}

function duration(row: Record<string, unknown>): Pick<SpellCast, "durationText" | "concentration"> & { facts: string } {
  const list = array(row.duration).map(object);

  const d = list[0] ?? {};

  const concentration = list.some((x) => x.concentration === true);

  const timed = object(d.duration);

  const amount = num(timed.amount) ?? 1;

  const unit = str(timed.type);

  if (str(d.type) === "instant") return { durationText: "Instantaneous", concentration, facts: "instantaneous" };

  if (str(d.type) === "timed") return { durationText: `${timed.upTo === true && !concentration ? "Up to " : ""}${plural(amount, unit)}`, concentration, facts: unit === "round" ? plural(amount, "round") : unit === "minute" && amount === 1 ? "1 minute" : plural(amount, unit) };

  if (str(d.type) === "permanent") return { durationText: "Until dispelled", concentration, facts: "until dispelled" };

  return { durationText: "Special", concentration, facts: "special" };
}

export function spellCast(row: Record<string, unknown>): SpellCast {
  const r = range(row);

  const d = duration(row);

  const meta = object(row.meta);

  return {
    ...casting(row),
    rangeText: r.rangeText,
    components: components(row.components),
    ...ingredients(row.components),
    durationText: d.durationText,
    concentration: d.concentration,
    ritual: meta.ritual === true,
    facts: { range_text: r.range_text, range: r.range, duration: d.facts, shape_type: r.shape_type, shape_size: r.shape_size },
  };
}
