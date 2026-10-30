import type { Open5eData } from "../lib/open5e";
import { bySlug } from "../lib/text";
import type { BackgroundRow, FeatRow } from "../lib/types";
import { EXTRA_MAGIC_INITIATE_LISTS } from "../overrides/feats";

import { isAbilityKey } from "@/lib/constants/abilities";
import { DND_SKILLS, type DndSkill } from "@/lib/constants/skills";

const skillByName = new Map(DND_SKILLS.map((key) => [key.toLowerCase(), key]));

const normalized = (s: string) => s.replace(/\s/g, "").toLowerCase();

export function convertBackgrounds(data: Open5eData): BackgroundRow[] {
  return data.backgrounds.map((background): BackgroundRow => {
    const benefits = data.backgroundBenefits.filter((b) => b.fields.parent === background.pk);

    const get = (type: string) => {
      const matches = benefits.filter((b) => b.fields.type === type);

      if (matches.length !== 1) throw new Error(`${background.pk}: expected one ${type} benefit`);

      return matches[0].fields.desc.trim();
    };

    const abilities = get("ability_score").split(",").map((s) => s.trim().toLowerCase());

    if (abilities.length !== 3 || !abilities.every(isAbilityKey)) throw new Error(`${background.pk}: invalid abilities`);

    const skills = get("skill_proficiency").split(" and ").map((s) => skillByName.get(normalized(s)));

    if (skills.length !== 2 || skills.some((s) => !s)) throw new Error(`${background.pk}: invalid skills`);

    const tool = get("tool_proficiency");

    const unresolvedTool = /^Choose /i.test(tool);

    return {
      slug: background.pk, name: background.fields.name, description: [background.fields.desc, unresolvedTool ? `Tool Proficiency: ${tool}` : ""].filter(Boolean).join("\n\n"),
      choices: [{ id: "ability-scores", label: "Характеристики передісторії", level: 1, kind: "abilityScore", count: 3, points: 3, abilities, maxPerAbility: 2, max: 20 }],
      skillProficiencies: skills as DndSkill[], toolProficiencies: unresolvedTool ? [] : [tool], originFeatId: get("feat"), equipmentText: get("equipment"),
    };
  }).sort(bySlug);
}

/** SRD fixes the list for these backgrounds (plus the Druid variant, which no background uses); the ordinary feat remains selectable. */
export function backgroundFeatVariants(data: Open5eData, feats: readonly FeatRow[]): FeatRow[] {
  const names = [...new Set(data.backgroundBenefits.filter((b) => b.fields.type === "feat").map((b) => b.fields.desc))];

  const variants = [...new Set([...names.filter((name) => /^Magic Initiate \((Cleric|Wizard)\)$/.test(name)), ...EXTRA_MAGIC_INITIATE_LISTS.map((list) => `Magic Initiate (${list})`)])];

  return variants.sort().map((name) => {
    const base = feats.find((f) => f.name === "Magic Initiate");

    if (!base) throw new Error(`${name}: missing Magic Initiate`);

    const list = name.match(/\((.*)\)/)![1];

    return { ...base, slug: `${base.slug}-${list.toLowerCase()}`, name, choices: base.choices.map((c) => c.spells ? { ...c, spells: { ...c.spells, lists: [list] } } : c) };
  });
}
