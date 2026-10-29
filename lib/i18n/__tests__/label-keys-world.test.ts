import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { WORLD_MARKER_ICON_KEYS } from "@/lib/constants/world";
import { TRAVEL_KINDS } from "@/types/world";

describe("world labels have translations", () => {
  expectLabelKeys("world", "markerKinds", WORLD_MARKER_ICON_KEYS);
  expectLabelKeys("world", "shape", ["point", "zone"]);
  expectLabelKeys("world", "mapKind", ["root", "nested"]);
  expectLabelKeys("world", "travel.kinds", TRAVEL_KINDS);
  expectLabelKeys("world", "travel.rest", ["none", "short", "long"]);
  expectLabelKeys("world", "travel.logRest", ["short", "long"]);
  expectLabelKeys("world", "hint", ["point", "entry", "move", "zone"]);
  expectLabelKeys("world", "eyes", ["label", "dm", "player"]);
});
