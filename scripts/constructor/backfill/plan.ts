import { isAlwaysFirstName, withAlwaysFirst } from "./always-first";
import { appendAbility,type AppendResult } from "./append-ability";
import { isElfRaceName, withElfEye } from "./elf-eye";
import { mainSkillRoleByName } from "./main-skill-role-by-name";
import { raceImmunityAbility } from "./race-immunities-from-text";
import { SPELL_FX_BY_NAME } from "./spell-fx-by-name";
import { SPELL_GROUP_LOOK_BY_NAME } from "./spell-group-look-by-name";

import type { MainSkillRole } from "@/lib/constants/main-skills";
import type { SpellFx } from "@/lib/utils/battle/fx/spells";

export type CampaignRows = {
  spells: { id: string; name: string; fx: unknown }[];
  spellGroups: { id: string; name: string; color: string | null; icon: string | null }[];
  mainSkills: { id: string; name: string; role: string | null }[];
  races: { id: string; name: string; abilities: unknown; passiveAbility: unknown }[];
  units: { id: string; name: string; abilities: unknown }[];
  personalSkills: { id: string; characterName: string; abilities: unknown }[];
  charactersWithoutPersonalSkill?: string[];
};

export type Change =
  | { table: "spell"; id: string; data: { fx: SpellFx } }
  | { table: "spellGroup"; id: string; data: { color?: string; icon?: string } }
  | { table: "mainSkill"; id: string; data: { role: MainSkillRole } }
  | { table: "race" | "unit" | "skill"; id: string; data: { abilities: unknown[] }; reason: string };

function planRace(race: CampaignRows["races"][number], warnings: string[]): Change | null {
  const immunity = raceImmunityAbility(race);

  let abilities: unknown = race.abilities;

  let touched = false;

  const reasons: string[] = [];

  const apply = (result: AppendResult, reason: string) => {
    if (result.warning) warnings.push(`Раса ${race.name}: ${result.warning}`);

    if (!result.changed) return;

    abilities = result.abilities;
    touched = true;
    reasons.push(reason);
  };

  if (isElfRaceName(race.name)) apply(withElfEye(abilities), "elf-eye");

  if (immunity) apply(appendAbility(abilities, immunity), "immunities");

  if (race.name.toLowerCase() === "фајдаен") apply(withAlwaysFirst(abilities), "always-first");

  return touched ? { table: "race", id: race.id, data: { abilities: abilities as unknown[] }, reason: reasons.join("+") } : null;
}

export function planBackfill(rows: CampaignRows): { changes: Change[]; warnings: string[] } {
  const changes: Change[] = [];

  const warnings: string[] = [];

  for (const s of rows.spells) {
    const fx = SPELL_FX_BY_NAME[s.name];

    if (s.fx == null && fx) changes.push({ table: "spell", id: s.id, data: { fx } });
  }

  for (const g of rows.spellGroups) {
    const look = SPELL_GROUP_LOOK_BY_NAME[g.name];

    const data: { color?: string; icon?: string } = {};

    if (g.color == null && look?.color) data.color = look.color;

    if (g.icon == null && look?.icon) data.icon = look.icon;

    if (Object.keys(data).length > 0) changes.push({ table: "spellGroup", id: g.id, data });
  }

  for (const m of rows.mainSkills) {
    const role = mainSkillRoleByName(m.name);

    if (m.role == null && role) changes.push({ table: "mainSkill", id: m.id, data: { role } });
  }

  for (const race of rows.races) {
    const change = planRace(race, warnings);

    if (change) changes.push(change);
  }

  for (const u of rows.units) {
    const first = isAlwaysFirstName(u.name) ? withAlwaysFirst(u.abilities) : null;

    if (first?.warning) warnings.push(`Юніт ${u.name}: ${first.warning}`);

    if (first?.changed) changes.push({ table: "unit", id: u.id, data: { abilities: first.abilities as unknown[] }, reason: "always-first" });
  }

  for (const p of rows.personalSkills) {
    const first = isAlwaysFirstName(p.characterName) ? withAlwaysFirst(p.abilities) : null;

    if (first?.warning) warnings.push(`Персональний скіл ${p.characterName}: ${first.warning}`);

    if (first?.changed) changes.push({ table: "skill", id: p.id, data: { abilities: first.abilities as unknown[] }, reason: "always-first" });
  }

  for (const name of rows.charactersWithoutPersonalSkill ?? []) {
    if (isAlwaysFirstName(name)) warnings.push(`Герой ${name}: немає персонального скіла — додайте здібність вручну`);
  }

  return { changes, warnings };
}
