import type { SpellCast } from "./spell-cast";

export type NarrativeReason = "noCombatNumbers" | "objectOnly" | "outOfCombat" | "createdObject";

const REST_OR_TRAVEL = /\b(?:short|long) rest\b|\btravel/i;

const OBJECT_SUBJECT = /\b(?:objects?|blocks?|cubes?)\b/i;

const CREATURE_SUBJECT = /\b(?:creatures?|targets?|willing)\b/i;

const CREATED = /\bmaterializ|\byou (?:create|conjure|summon)\b/i;

const STAT_BLOCK = /\{@creature\b|\bstat block\b/i;

const HAS_SPEED = /\bspeed of \d+/i;

const LONG_CASTING = /^(\d+)(minutes?|hours?)$/;

const sentences = (s: string): string[] => s.match(/[^.]+\.?/g) ?? [];

function objectOnlyCondition(sentence: string): boolean {
  const at = sentence.indexOf("{@condition");

  if (at < 0) return false;

  const subject = sentence.slice(0, at);

  return OBJECT_SUBJECT.test(subject) && !CREATURE_SUBJECT.test(subject);
}

export function withoutRestOrTravel(text: string): string {
  return sentences(text).filter((s) => !REST_OR_TRAVEL.test(s)).join("");
}

export function withoutObjectConditions(raw: string): string {
  return sentences(raw).filter((s) => !objectOnlyCondition(s)).join("");
}

function longCasting(key: string): boolean {
  const m = LONG_CASTING.exec(key);

  return !!m && (m[2].startsWith("hour") || Number(m[1]) >= 10);
}

function longEffect(cast: SpellCast, text: string): boolean {
  const hours = [...`${cast.facts.duration} ${text}`.matchAll(/\b(\d+) hours?\b/g)].map((m) => Number(m[1]));

  return hours.some((h) => h >= 8);
}

export const isOutOfCombatBuff = (cast: SpellCast, text: string): boolean => longCasting(cast.castingKey) && longEffect(cast, text);

export const createsPlainObject = (misc: string[], text: string, raw: string): boolean => (misc.includes("SMN") || CREATED.test(text)) && !STAT_BLOCK.test(raw) && !HAS_SPEED.test(text);
