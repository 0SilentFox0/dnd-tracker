import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { HERO_ARCHETYPE_KEYS } from "@/lib/constants/hero-archetypes";

describe("characters label registries have translations", () => {
  expectLabelKeys("characters", "archetypes", [...HERO_ARCHETYPE_KEYS, "universal"].map((k) => `${k}.name`));
});
