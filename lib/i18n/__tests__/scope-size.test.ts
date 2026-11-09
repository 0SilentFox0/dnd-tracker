import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { LOCALES } from "../config";
import { loadMessages, loadStaticMessages } from "../messages";
import { BATTLE_NAMESPACES, CAMPAIGN_NAMESPACES, ROOT_NAMESPACES, WFRP_BATTLE_NAMESPACES, WFRP_CAMPAIGN_EXTRA, WFRP_DM_EXTRA, WFRP_MEMBER_EXTRA } from "../scopes";

const LIMIT_KB = 105;

// every wfrp member / the DM load more wfrp namespaces on top of the 105 KB base; measured uk gzip 106.2 / 110.1 KB (incl. 5h-1 trait and psychology texts, 5h-2 tables editor), limits keep ~0.5 KB headroom
const WFRP_MEMBER_LIMIT_KB = 107;

const WFRP_DM_LIMIT_KB = 111;

// loaded per page via ExtendLocaleScope (character pages, DM characters, DM rules), not in the layout scope; measured uk gzip 1.7 KB
const WFRP_DOWNTIME_PAGE_LIMIT_KB = 2;

const ROOT_LIMIT_KB = 20;

const SCOPES = [
  { name: "campaign", namespaces: CAMPAIGN_NAMESPACES },
  { name: "campaign + battle", namespaces: [...CAMPAIGN_NAMESPACES, ...BATTLE_NAMESPACES] },
  { name: "campaign + battle + battleWfrp", namespaces: [...CAMPAIGN_NAMESPACES, ...WFRP_BATTLE_NAMESPACES] },
  { name: "wfrp member (campaign + battle + every member extra)", namespaces: [...CAMPAIGN_NAMESPACES, ...WFRP_BATTLE_NAMESPACES, ...WFRP_CAMPAIGN_EXTRA, ...WFRP_MEMBER_EXTRA], limit: WFRP_MEMBER_LIMIT_KB },
  { name: "wfrp DM (member + DM extra)", namespaces: [...CAMPAIGN_NAMESPACES, ...WFRP_BATTLE_NAMESPACES, ...WFRP_CAMPAIGN_EXTRA, ...WFRP_MEMBER_EXTRA, ...WFRP_DM_EXTRA], limit: WFRP_DM_LIMIT_KB },
  { name: "wfrpDowntime page extra", namespaces: ["wfrpDowntime"], limit: WFRP_DOWNTIME_PAGE_LIMIT_KB },
] as const;

describe("message scope size", () => {
  it.each(SCOPES.flatMap((scope) => LOCALES.map((locale) => ({ ...scope, locale }))))("$name $locale stays under the split threshold", async ({ name, namespaces, locale, ...scope }) => {
    const json = JSON.stringify(await loadMessages(locale, namespaces));

    const gzipKb = gzipSync(json, { level: 9 }).length / 1024;

    console.info(`${name} scope ${locale}: ${(json.length / 1024).toFixed(1)} KB raw, ${gzipKb.toFixed(1)} KB gzip`);

    expect(gzipKb).toBeLessThan("limit" in scope ? scope.limit : LIMIT_KB);
  });

  it("root chunk (root namespaces, both locales) stays under the budget", async () => {
    const json = JSON.stringify(await loadStaticMessages(ROOT_NAMESPACES));

    const gzipKb = gzipSync(json, { level: 9 }).length / 1024;

    console.info(`root scope: ${(json.length / 1024).toFixed(1)} KB raw, ${gzipKb.toFixed(1)} KB gzip`);

    expect(gzipKb).toBeLessThan(ROOT_LIMIT_KB);
  });
});
