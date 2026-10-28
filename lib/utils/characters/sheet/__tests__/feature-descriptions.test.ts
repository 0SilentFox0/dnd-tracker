import { expect, it } from "vitest";

import { classFeatureDescriptions } from "../feature-descriptions";
it("includes acquired class and chosen subclass descriptions, excluding future levels", () => {
 const entry = { classId: "c", level: 2, class: { name: "Synthetic", features: [{ level: 1, description: "Read me", abilities: [] }, { level: 3, description: "Future", abilities: [] }] }, subclass: { name: "Chosen", features: [{ level: 2, description: "Manual requirement", abilities: [] }] } };

 expect(classFeatureDescriptions([entry as never])).toEqual([{ source: "Synthetic", level: 1, description: "Read me" }, { source: "Chosen", level: 2, description: "Manual requirement" }]);
});
