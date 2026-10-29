import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { ABILITY_KEYS, STAT_SCORES } from "@/lib/constants/abilities";
import { ARMOR_CATEGORIES, ArtifactRarity, ArtifactSlot, ITEM_KINDS, ITEM_REST_VALUES } from "@/lib/constants/artifacts";
import { DM_SECTIONS } from "@/lib/constants/campaigns";
import { CHOICE_KINDS, FEAT_TYPES } from "@/lib/constants/choices";
import { CLASS_CASTERS } from "@/lib/constants/classes";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import { MAIN_SKILL_ROLES } from "@/lib/constants/main-skills";
import { MONSTER_SENSE_LABELS, MONSTER_SIZE_LABELS } from "@/lib/constants/monster";
import { DND_SKILLS } from "@/lib/constants/skills";
import { UNGROUPED_LABELS } from "@/lib/constants/ungrouped";
import { WEAPON_TRAITS } from "@/lib/constants/weapon-traits";
import type { Namespace } from "@/lib/i18n/config";

const dmPaths = DM_SECTIONS.map((s) => s.path);

const REGISTRY: Array<[Namespace, string, readonly string[]]> = [
  ["feats", "types", FEAT_TYPES],
  ["skills", "mainSkills.roles", MAIN_SKILL_ROLES],
  ["classes", "casters", CLASS_CASTERS],
  ["artifacts", "rarity", Object.values(ArtifactRarity)],
  ["artifacts", "slots", Object.values(ArtifactSlot)],
  ["artifacts", "armor.categories", ARMOR_CATEGORIES],
  ["artifacts", "item.rest", ITEM_REST_VALUES],
  ["artifacts", "item.kinds", ITEM_KINDS],
  ["choices", "kinds", CHOICE_KINDS],
  ["common", "dndSkills", DND_SKILLS],
  ["common", "abilities", ABILITY_KEYS.flatMap((k) => [`${k}.label`, `${k}.short`])],
  ["common", "stats", STAT_SCORES.map((s) => s.key)],
  ["common", "spellLevels", Array.from({ length: 10 }, (_, i) => String(i))],
  ["common", "ungrouped", Object.keys(UNGROUPED_LABELS)],
  ["common", "damageTypes", DAMAGE_ELEMENT_OPTIONS.map((o) => o.value)],
  ["common", "monster.senses", Object.keys(MONSTER_SENSE_LABELS)],
  ["common", "monster.sizes", Object.keys(MONSTER_SIZE_LABELS)],
  ["common", "weaponTraits.traits", WEAPON_TRAITS],
  ["common", "dmSections", dmPaths],
  ["common", "dmMenu", dmPaths],
  ["dashboard", "sections", DM_SECTIONS.filter((s) => s.tile !== "none").flatMap((s) => [`${s.path}.title`, `${s.path}.subtitle`])],
];

describe("label registries have translations", () => {
  for (const [ns, prefix, values] of REGISTRY) expectLabelKeys(ns, prefix, values);
});
