import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { MISCAST_TABLE } from "@/lib/utils/rules/systems/wfrp/magic/miscast-table";

describe("wfrp magic labels have translations", () => {
  expectLabelKeys("wfrpMagic", "log", ["miscast"]);

  for (const [kind, rows] of Object.entries(MISCAST_TABLE)) expectLabelKeys("wfrpMagic", `miscast.${kind}`, rows.map((_, i) => `${i + 1}`));
});
