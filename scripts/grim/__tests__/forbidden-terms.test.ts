import { describe, expect, it } from "vitest";

import { findForbiddenTerms } from "../forbidden-terms";

describe("findForbiddenTerms", () => {
  it.each(["That is a moot point.", "A MOOT COURT ruling", "gore and grit", "A Copper Hound and a Grave Touch", "Many-Mouthed Thing"])("allows %s", (text) => expect(findForbiddenTerms(text)).toEqual([]));

  it.each([["the Moot hills", "Moot"], ["two Gors charge", "Gor"], ["Flesh Hounds bay", "Flesh Hound"], ["a Clanrat pack", "Clanrat"], ["Strigoi lord", "Strigoi"]])("flags %s", (text, term) => expect(findForbiddenTerms(text)).toContain(term));
});
