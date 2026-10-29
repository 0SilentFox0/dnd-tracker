import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { MECHANIC_REGISTRY } from "@/lib/utils/rules";

const MECHANICS = Object.keys(MECHANIC_REGISTRY);

describe("rules label registries have translations", () => {
  expectLabelKeys("rules", "mechanics", MECHANICS.flatMap((key) => [`${key}.label`, `${key}.description`]));
});
