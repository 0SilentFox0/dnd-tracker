import { expect, it } from "vitest";

import { AbilitySchema } from "../ability";

const base = { id: "rage-1", name: "Rage", trigger: { event: "passive" }, effects: [{ kind: "note", text: "Rage" }] };

it("keeps a valid icon link", () => {
  expect(AbilitySchema.parse({ ...base, icon: "https://x/a.webp" }).icon).toBe("https://x/a.webp");
});

it("rejects data: URLs", () => {
  expect(AbilitySchema.safeParse({ ...base, icon: "data:image/png;base64,AAAA" }).success).toBe(false);
});

it("without icon the parsed ability is unchanged", () => {
  expect(AbilitySchema.parse(base)).toEqual(AbilitySchema.parse({ ...base, icon: undefined }));
});
