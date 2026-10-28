import { coreAbility, noteAbility } from "../lib/abilities";
import { type Fixture, type O5SpeciesTrait, type Open5eData, slugTail } from "../lib/open5e";
import { bySlug } from "../lib/text";
import type { RaceRow } from "../lib/types";
import { RACE_OVERRIDES } from "../overrides/races";

import type { Ability } from "@/lib/utils/abilities/schema";
import { groupBy } from "@/lib/utils/common/collections";

const BASICS = new Set(["SIZE", "SPEED"]);

function traitAbility(t: Fixture<O5SpeciesTrait>): Ability {
  const id = slugTail(t.pk);

  const desc = t.fields.desc.trim();

  const core = RACE_OVERRIDES[t.pk];

  return core ? coreAbility(id, t.fields.name, desc, core) : noteAbility(id, t.fields.name, desc);
}

export function convertRaces(data: Open5eData): RaceRow[] {
  const traits = groupBy(data.speciesTraits, (t) => t.fields.parent);

  return data.species
    .map((s) => {
      const own = [...(traits.get(s.pk) ?? [])].sort((a, b) => a.fields.order - b.fields.order);

      const basics = own.filter((t) => BASICS.has(t.fields.type ?? ""));

      const rest = own.filter((t) => !BASICS.has(t.fields.type ?? ""));

      return {
        slug: s.pk,
        name: s.fields.name,
        passiveAbility: { name: "Size and Speed", description: basics.map((t) => `${t.fields.name}: ${t.fields.desc.trim()}`).join("\n") },
        abilities: [...basics.filter((t) => RACE_OVERRIDES[t.pk]), ...rest].map(traitAbility),
      };
    })
    .sort(bySlug);
}
