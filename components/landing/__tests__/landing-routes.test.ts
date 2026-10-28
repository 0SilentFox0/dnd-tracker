import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { BRAND, LANDING_PATH, SITE_URL } from "@/lib/constants/site";

describe("landing routes", () => {
  it("sitemap lists both landing URLs with hreflang alternates", () => {
    const entries = sitemap();

    const en = entries.find((e) => e.url === SITE_URL);

    const uk = entries.find((e) => e.url === `${SITE_URL}${LANDING_PATH.uk}`);

    expect(en).toBeDefined();
    expect(uk).toBeDefined();
    expect(uk?.alternates?.languages).toEqual({ en: SITE_URL, uk: `${SITE_URL}/uk`, "x-default": SITE_URL });
    expect(en?.alternates).toEqual(uk?.alternates);
  });

  it("the product name is not hard-coded outside the copy dictionaries", () => {
    const root = join(__dirname, "..");

    const files = [
      ...readdirSync(root, { recursive: true, withFileTypes: true })
        .filter((d) => d.isFile() && /\.tsx?$/.test(d.name))
        .map((d) => join(d.parentPath, d.name))
        .filter((f) => !f.includes("__tests__") && !f.includes(`${join(root, "copy")}/`)),
      join(root, "../../app/page.tsx"),
      join(root, "../../app/uk/page.tsx"),
    ];

    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toContain(BRAND.name);
  });
});
