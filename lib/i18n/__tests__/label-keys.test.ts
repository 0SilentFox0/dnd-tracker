import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { ARMOR_CATEGORIES, ArtifactRarity, ArtifactSlot, ITEM_KINDS, ITEM_REST_VALUES } from "@/lib/constants/artifacts";
import { DM_SECTIONS } from "@/lib/constants/campaigns";
import { CHOICE_KINDS, FEAT_TYPES } from "@/lib/constants/choices";
import { CLASS_CASTERS } from "@/lib/constants/classes";
import { MAIN_SKILL_ROLES } from "@/lib/constants/main-skills";
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
  ["common", "dmSections", dmPaths],
  ["common", "dmMenu", dmPaths],
  ["dashboard", "sections", DM_SECTIONS.filter((s) => s.tile !== "none").flatMap((s) => [`${s.path}.title`, `${s.path}.subtitle`])],
];

describe("label registries have translations", () => {
  for (const [ns, prefix, values] of REGISTRY) expectLabelKeys(ns, prefix, values);
});
