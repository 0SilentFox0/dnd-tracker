import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

describe("show labels have translations", () => {
  expectLabelKeys("show", "slideDialog.cuts", ["classic", "organic", "straight"]);
  expectLabelKeys("show", "validation", ["httpUrl", "puzzleParams", "duplicateSlideId"]);
});
