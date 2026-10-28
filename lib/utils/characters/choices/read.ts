import { CHOICE_KINDS } from "@/lib/constants/choices";
import { isRecord } from "@/lib/utils/common/is-record";
import type { Ability } from "@/types/abilities";
import type { CharacterFeat, Choice, ChoiceOption, Picks } from "@/types/choices";

const KINDS = new Set<string>(CHOICE_KINDS);

const isPick = (v: unknown): v is Record<string, unknown> & { id: string } => isRecord(v) && typeof v.id === "string" && v.id !== "";

function picksAt(raw: unknown, depth: number): Picks {
  if (!isRecord(raw)) return {};

  return Object.fromEntries(
    Object.entries(raw).flatMap(([key, list]) =>
      Array.isArray(list) ? [[key, list.filter(isPick).map((p) => (depth > 0 && isRecord(p.picks) ? { id: p.id, picks: picksAt(p.picks, depth - 1) } : { id: p.id }))]] : [],
    ),
  );
}

export const readPicks = (raw: unknown): Picks => picksAt(raw, 1);

export const hasPicks = (picks: Picks | undefined): boolean => !!picks && Object.values(picks).some((list) => list.length > 0);

export function readCharacterFeats(raw: unknown): CharacterFeat[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((f) => {
    if (!isPick(f) || !isRecord(f) || (f.source !== "origin" && f.source !== "dm")) return [];

    return [{ id: f.id, source: f.source, ...(isRecord(f.picks) && { picks: picksAt(f.picks, 0) }) }];
  });
}

function readOption(raw: unknown): ChoiceOption[] {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.name !== "string") return [];

  return [{ ...(raw as unknown as ChoiceOption), abilities: Array.isArray(raw.abilities) ? (raw.abilities as Ability[]) : [] }];
}

export function readChoices(raw: unknown): Choice[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((c): Choice[] => {
    if (!isRecord(c) || typeof c.id !== "string" || typeof c.label !== "string" || typeof c.kind !== "string" || !KINDS.has(c.kind)) return [];

    const level = typeof c.level === "number" ? c.level : 1;

    const count = typeof c.count === "number" || (isRecord(c.count) && typeof c.count.scale === "string") ? c.count : 1;

    return [{ ...(c as unknown as Choice), level, count: count as Choice["count"], ...(Array.isArray(c.options) && { options: c.options.flatMap(readOption) }) }];
  });
}

export const readSpellLists = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string" && s.trim() !== "") : []);

export function choiceSpellIds(choices: readonly Choice[] | undefined): string[] | undefined {
  if (!choices) return undefined;

  return [...new Set(choices.flatMap((c) => (c.options ?? []).flatMap((o) => (o.spells ?? []).map((s) => s.spellId))))];
}

export const hasSpellChoice = (lists: readonly (readonly Choice[] | undefined)[]): boolean => lists.some((choices) => choices?.some((c) => c.kind === "spell"));
