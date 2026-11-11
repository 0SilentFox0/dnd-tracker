import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { LOCALES, type Namespace } from "../config";
import { loadMessages, loadStaticMessages } from "../messages";
import { BATTLE_NAMESPACES, CAMPAIGN_NAMESPACES, ROOT_NAMESPACES } from "../scopes";
import { systemScope } from "../system-scope";

import { SYSTEM_META } from "@/lib/utils/rules/systems/meta";

const LIMIT_KB = 105;

// per-system budgets live in the system meta (i18n.budgetKb); limits keep ~0.5 KB headroom over the measured uk gzip
const ROOT_LIMIT_KB = 20;

const BASE = [...CAMPAIGN_NAMESPACES, ...BATTLE_NAMESPACES];

const systemScopes = SYSTEM_META.flatMap((meta) => {
  const [key] = meta.keys;

  const { budgetKb } = meta.i18n as { budgetKb?: { member?: number; dm?: number; pages?: Record<string, number> } };

  const battle = systemScope(key, "battle");

  const member = [...BASE, ...battle, ...systemScope(key, "campaign"), ...systemScope(key, "member")];

  return [
    { name: `${key} battle`, namespaces: [...CAMPAIGN_NAMESPACES, ...BATTLE_NAMESPACES, ...battle] },
    ...(budgetKb?.member ? [{ name: `${key} member`, namespaces: member, limit: budgetKb.member }] : []),
    ...(budgetKb?.dm ? [{ name: `${key} DM`, namespaces: [...member, ...systemScope(key, "dm")], limit: budgetKb.dm }] : []),
    ...Object.entries(budgetKb?.pages ?? {}).map(([page, limit]) => ({ name: `${key} ${page} page extra`, namespaces: systemScope(key, page as Parameters<typeof systemScope>[1]), limit })),
  ];
});

const SCOPES = [{ name: "campaign", namespaces: CAMPAIGN_NAMESPACES }, { name: "campaign + battle", namespaces: BASE }, ...systemScopes] as readonly { name: string; namespaces: readonly Namespace[]; limit?: number }[];

describe("message scope size", () => {
  it.each(SCOPES.flatMap((scope) => LOCALES.map((locale) => ({ ...scope, locale }))))("$name $locale stays under the split threshold", async ({ name, namespaces, locale, limit }) => {
    const json = JSON.stringify(await loadMessages(locale, namespaces));

    const gzipKb = gzipSync(json, { level: 9 }).length / 1024;

    console.info(`${name} scope ${locale}: ${(json.length / 1024).toFixed(1)} KB raw, ${gzipKb.toFixed(1)} KB gzip`);

    expect(gzipKb).toBeLessThan(limit ?? LIMIT_KB);
  });

  it("root chunk (root namespaces, both locales) stays under the budget", async () => {
    const json = JSON.stringify(await loadStaticMessages(ROOT_NAMESPACES));

    const gzipKb = gzipSync(json, { level: 9 }).length / 1024;

    console.info(`root scope: ${(json.length / 1024).toFixed(1)} KB raw, ${gzipKb.toFixed(1)} KB gzip`);

    expect(gzipKb).toBeLessThan(ROOT_LIMIT_KB);
  });

  it("a d20 campaign gets no system namespace", () => {
    for (const slot of ["battle", "campaign", "member", "dm", "character", "dmCharacters", "dmCharacter", "dmRules"] as const) {
      expect(systemScope("homm", slot)).toEqual([]);
      expect(systemScope("dnd5e", slot)).toEqual([]);
      expect(systemScope(null, slot)).toEqual([]);
    }
  });
});
