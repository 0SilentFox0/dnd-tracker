import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import { COINS, InventoryLogKind } from "@/lib/constants/inventory";

const LOG_KINDS = Object.values(InventoryLogKind);

describe("inventory label registries have translations", () => {
  expectLabelKeys("inventory", "coins", COINS);
  expectLabelKeys("inventory", "grid.slots", ARTIFACT_GRID_9.map((c) => c.key));
  expectLabelKeys("inventory", "log.item", LOG_KINDS.filter((k) => k.startsWith("item_")));
  expectLabelKeys("inventory", "log.artifact", LOG_KINDS.filter((k) => k.startsWith("artifact_")));
});
