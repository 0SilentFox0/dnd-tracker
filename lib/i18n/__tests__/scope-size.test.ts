import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { LOCALES } from "../config";
import { loadMessages, loadStaticMessages } from "../messages";
import { BATTLE_NAMESPACES, CAMPAIGN_NAMESPACES, ROOT_NAMESPACES } from "../scopes";

const LIMIT_KB = 100;

const ROOT_LIMIT_KB = 20;

const SCOPES = [
  { name: "campaign", namespaces: CAMPAIGN_NAMESPACES },
  { name: "campaign + battle", namespaces: [...CAMPAIGN_NAMESPACES, ...BATTLE_NAMESPACES] },
] as const;

describe("message scope size", () => {
  it.each(SCOPES.flatMap((scope) => LOCALES.map((locale) => ({ ...scope, locale }))))("$name $locale stays under the split threshold", async ({ name, namespaces, locale }) => {
    const json = JSON.stringify(await loadMessages(locale, namespaces));

    const gzipKb = gzipSync(json, { level: 9 }).length / 1024;

    console.info(`${name} scope ${locale}: ${(json.length / 1024).toFixed(1)} KB raw, ${gzipKb.toFixed(1)} KB gzip`);

    expect(gzipKb).toBeLessThan(LIMIT_KB);
  });

  it("root chunk (root namespaces, both locales) stays under the budget", async () => {
    const json = JSON.stringify(await loadStaticMessages(ROOT_NAMESPACES));

    const gzipKb = gzipSync(json, { level: 9 }).length / 1024;

    console.info(`root scope: ${(json.length / 1024).toFixed(1)} KB raw, ${gzipKb.toFixed(1)} KB gzip`);

    expect(gzipKb).toBeLessThan(ROOT_LIMIT_KB);
  });
});
