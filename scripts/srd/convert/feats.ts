import { coreAbility,noteAbility } from "../lib/abilities";
import { type Fixture, type O5Feat, type O5FeatBenefit, type Open5eData, slugTail } from "../lib/open5e";
import { bySlug } from "../lib/text";
import type { FeatRow } from "../lib/types";
import { FEAT_MECHANICS } from "../overrides/feats";

import { type AbilityKey, isAbilityKey } from "@/lib/constants/abilities";
import { groupBy } from "@/lib/utils/common/collections";
import type { FeatPrerequisite, FeatType } from "@/types/choices";

const FEAT_TYPE: Record<string, FeatType> = { Origin: "origin", General: "general", "Fighting Style": "fightingStyle", "Epic Boon": "epicBoon" };

const LEVEL = /^Level (\d+)\+$/;

const SCORES = /^(\w+) or (\w+) (\d+)\+$/;

export function parsePrerequisite(text: string): FeatPrerequisite {
  const out: FeatPrerequisite = {};

  const rest: string[] = [];

  for (const part of text.split(",").map((s) => s.trim()).filter(Boolean)) {
    const level = LEVEL.exec(part);

    const scores = SCORES.exec(part);

    const abilities = scores ? [scores[1].toLowerCase(), scores[2].toLowerCase()].filter(isAbilityKey) : [];

    if (level) out.level = Number(level[1]);
    else if (scores && abilities.length === 2) out.scores = { abilities: abilities as AbilityKey[], min: Number(scores[3]) };
    else rest.push(part);
  }

  if (rest.length > 0) out.text = rest.join(", ");

  return out;
}

function featText(feat: Fixture<O5Feat>, benefits: Fixture<O5FeatBenefit>[]): string {
  const parts = benefits.filter((b) => b.fields.name !== "Repeatable").map((b) => (b.fields.name ? `**${b.fields.name}.** ${b.fields.desc.trim()}` : b.fields.desc.trim()));

  return [feat.fields.desc?.trim(), ...parts].filter(Boolean).join("\n\n");
}

export function convertFeats(data: Open5eData): FeatRow[] {
  const benefits = groupBy(data.featBenefits, (b) => b.fields.parent);

  return data.feats
    .map((f): FeatRow => {
      const type = FEAT_TYPE[f.fields.type];

      if (!type) throw new Error(`${f.pk}: unknown feat type «${f.fields.type}»`);

      const own = benefits.get(f.pk) ?? [];

      const description = featText(f, own);

      const mech = FEAT_MECHANICS[f.pk] ?? {};

      const abilities = (mech.abilities ?? ["note"]).map((a) => (a === "note" ? noteAbility(slugTail(f.pk), f.fields.name, description) : coreAbility(a.id, a.name, description, a.core)));

      return { slug: f.pk, name: f.fields.name, type, prerequisite: parsePrerequisite(f.fields.prerequisite ?? ""), repeatable: own.some((b) => b.fields.name === "Repeatable"), description, abilities, choices: mech.choices ?? [] };
    })
    .sort(bySlug);
}
