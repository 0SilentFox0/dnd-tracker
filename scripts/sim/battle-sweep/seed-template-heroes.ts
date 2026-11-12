import type { SweepProfile } from "./profiles";

export interface HeroSpec { name: string; race: string; className: string; classId: string | null; morale?: number }

export function heroSpecsFor(races: ReadonlyArray<{ name: string }>, classes: ReadonlyArray<{ id: string; name: string }>, count: number, morale?: number): HeroSpec[] {
  if (races.length === 0) throw new Error("template has no races to seed test heroes from");

  return Array.from({ length: count }, (_, i) => {
    const race = races[i % races.length];

    const cls = classes.length ? classes[i % classes.length] : null;

    return { name: `TEST sweep hero ${i + 1} ${race.name}`, race: race.name, className: cls?.name ?? "Adventurer", classId: cls?.id ?? null, ...(morale !== undefined && { morale: i % 2 === 0 ? morale : -morale }) };
  });
}

const BASE_CHARACTERISTICS = { ws: 40, bs: 40, s: 35, t: 35, i: 35, ag: 35, dex: 35, int: 35, wp: 35, fel: 35 };

export function heroRowData(spec: HeroSpec, profile: SweepProfile, ctx: { campaignId: string; controlledBy: string; spellIds: string[] }) {
  return {
    campaignId: ctx.campaignId,
    type: "npc_hero",
    controlledBy: ctx.controlledBy,
    name: spec.name,
    race: spec.race,
    class: spec.className,
    level: profile.heroLevel,
    strength: 14,
    dexterity: 14,
    constitution: 14,
    intelligence: 12,
    wisdom: 12,
    charisma: 12,
    armorClass: 14,
    ...(spec.morale !== undefined && { morale: spec.morale }),
    knownSpells: ctx.spellIds,
    classes: spec.classId ? [{ classId: spec.classId, level: profile.heroLevel }] : [],
    characteristics: profile.judge === "server" ? { base: BASE_CHARACTERISTICS, move: 4 } : {},
  };
}
