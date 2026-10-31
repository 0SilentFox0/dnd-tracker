import { describe, expect, it } from "vitest";

import { ASSET_BUCKET } from "../../assets/attach-lib";
import { readIcons } from "../../assets/tokens-5e/icons-file";
import { expectedTargets, IDENTITY_BUCKET } from "../../assets/tokens-5e/identity-catalog";
import { readSrdData } from "../lib/data-files";

const data = readSrdData();

const icons = readIcons();

it.each(["spells", "units", "artifacts"] as const)("%s: every icon slug exists in the template and URL is a webp from the right bucket", (kind) => {
  const slugs = new Set((data[kind] as Array<{ slug: string }>).map((r) => r.slug));

  const bucket = ASSET_BUCKET[kind];

  for (const [slug, url] of Object.entries(icons[kind])) {
    expect(slugs.has(slug), slug).toBe(true);
    expect(url, slug).toMatch(new RegExp(`/${bucket}/.+\\.webp$`));
  }
});

const IDENTITY_KINDS = ["features", "races", "classes", "subclasses", "backgrounds"] as const;

const targets = expectedTargets(data);

describe.each(IDENTITY_KINDS)("identity icons: %s", (kind) => {
  const expected = new Set(targets.filter((t) => t.kind === kind).map((t) => t.key));

  it("every key is an expected target and URL is a webp from the right bucket", () => {
    for (const [key, url] of Object.entries(icons[kind])) {
      expect(expected.has(key), key).toBe(true);
      expect(url, key).toMatch(new RegExp(`/${IDENTITY_BUCKET[kind]}/.+\\.webp$`));
    }
  });

  it("covers every expected target once seeded", () => {
    const keys = Object.keys(icons[kind]);

    if (keys.length === 0) return;

    expect(new Set(keys)).toEqual(expected);
  });
});
