import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { TemplateManifestSchema } from "@/lib/schemas/template-manifest";

const real = (key: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/templates", key, "manifest.json"), "utf8"));

describe("TemplateManifestSchema", () => {
  it.each(["srd-5.2", "grim-d100", "srd-5.2-empty", "grim-d100-empty"])("accepts the real %s manifest", (key) => {
    expect(TemplateManifestSchema.safeParse(real(key)).success).toBe(true);
  });

  it.each([
    ["uppercase key", { key: "Srd" }],
    ["locales without en first", { locales: ["uk", "en"] }],
    ["duplicate locales", { locales: ["en", "en"] }],
    ["unknown kind", { kinds: ["monsters"] }],
    ["names missing a locale", { names: { en: "Grim" } }],
    ["unknown field", { extra: 1 }],
    ["unknown icon bucket", { icons: { bucketByKind: { units: "nope-icons" } } }],
  ])("rejects %s", (_label, patch) => {
    expect(TemplateManifestSchema.safeParse({ ...real("grim-d100"), ...patch }).success).toBe(false);
  });
});
