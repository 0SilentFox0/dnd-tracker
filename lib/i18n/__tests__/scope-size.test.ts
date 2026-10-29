import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { LOCALES } from "../config";
import { loadMessages } from "../messages";
import { CAMPAIGN_NAMESPACES } from "../scopes";

const LIMIT_KB = 100;

describe("campaign scope message size", () => {
  it.each(LOCALES)("%s stays under the split threshold", async (locale) => {
    const json = JSON.stringify(await loadMessages(locale, CAMPAIGN_NAMESPACES));

    const gzipKb = gzipSync(json, { level: 9 }).length / 1024;

    console.info(`campaign scope ${locale}: ${(json.length / 1024).toFixed(1)} KB raw, ${gzipKb.toFixed(1)} KB gzip`);

    expect(gzipKb).toBeLessThan(LIMIT_KB);
  });
});
