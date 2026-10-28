import { describe, expect, it } from "vitest";

import { ArtifactRarity, ArtifactSlot } from "@/lib/constants/artifacts";
import { CHOICE_KINDS, FEAT_TYPES } from "@/lib/constants/choices";
import { CLASS_CASTERS } from "@/lib/constants/classes";
import { MAIN_SKILL_ROLES } from "@/lib/constants/main-skills";
import { DND_SKILLS } from "@/lib/constants/skills";
import { LOCALES, type Namespace } from "@/lib/i18n/config";
import { localSource } from "@/lib/i18n/local-source";

const REGISTRY: Array<[Namespace, string, readonly string[]]> = [
  ["feats", "types", FEAT_TYPES],
  ["skills", "mainSkills.roles", MAIN_SKILL_ROLES],
  ["classes", "casters", CLASS_CASTERS],
  ["artifacts", "rarity", Object.values(ArtifactRarity)],
  ["artifacts", "slots", Object.values(ArtifactSlot)],
  ["choices", "kinds", CHOICE_KINDS],
  ["common", "dndSkills", DND_SKILLS],
];

const lookup = (tree: Record<string, unknown>, path: string) => path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree);

describe("label registries have translations", () => {
  for (const locale of LOCALES) {
    for (const [ns, prefix, values] of REGISTRY) {
      it(`${locale}: ${ns}.${prefix}`, async () => {
        const tree = await localSource.load(locale, ns);

        for (const value of values) expect(typeof lookup(tree, `${prefix}.${value}`), `${ns}.${prefix}.${value}`).toBe("string");
      });
    }
  }
});
