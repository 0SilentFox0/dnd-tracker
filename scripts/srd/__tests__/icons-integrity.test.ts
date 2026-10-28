import { expect, it } from "vitest";

import { readIcons } from "../../assets/tokens-5e/icons-file";
import { readSrdData } from "../lib/data-files";

const data = readSrdData();

const icons = readIcons();

it.each(["spells", "units", "artifacts"] as const)("%s: every icon slug exists in the template and URL is a webp from the right bucket", (kind) => {
  const slugs = new Set((data[kind] as Array<{ slug: string }>).map((r) => r.slug));

  const bucket = { spells: "spell-icons", units: "unit-icons", artifacts: "artifact-icons" }[kind];

  for (const [slug, url] of Object.entries(icons[kind])) {
    expect(slugs.has(slug), slug).toBe(true);
    expect(url, slug).toMatch(new RegExp(`/${bucket}/.+\\.webp$`));
  }
});
