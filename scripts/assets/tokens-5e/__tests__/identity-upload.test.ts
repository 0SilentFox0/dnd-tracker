import { expect, it } from "vitest";

import type { IdentityTarget } from "../identity-catalog";
import { planUploads } from "../identity-plan";

const roots = { features: "/d/output-features/icons", identity: "/d/output-identity/icons" };

const feature: IdentityTarget = { kind: "features", key: "srd-2024_barbarian/rage-1", recordId: "feature:barbarian/rage-1" };

const race: IdentityTarget = { kind: "races", key: "srd-2024_human", recordId: "race:human" };

const ghost: IdentityTarget = { kind: "classes", key: "srd-2024_ghost", recordId: "class:ghost" };

it("resolves feature and identity files under their roots and flags targets missing from the CSV", () => {
  const featuresCsv = new Map([["feature:barbarian/rage-1", { folder: "feature/barbarian", file: "barbarian-rage-1.png" }]]);

  const identityCsv = new Map([["race:human", { folder: "identity/race", file: "race-human.png" }]]);

  expect(planUploads([feature, race, ghost], featuresCsv, identityCsv, roots)).toEqual([
    { target: feature, file: "/d/output-features/icons/feature/barbarian/barbarian-rage-1.png", missing: false },
    { target: race, file: "/d/output-identity/icons/identity/race/race-human.png", missing: false },
    { target: ghost, file: "", missing: true },
  ]);
});
