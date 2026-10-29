import { describe, expect, it } from "vitest";

import { reachableSources, walkSources } from "../test/import-graph";

const BATTLE_SEGMENTS = /^app\/campaigns\/[^/]+\/(dm\/)?battles\//;

const SERVER_ONLY = /^(lib\/server|app\/api)\//;

const BATTLE_CODE = /^(components\/battle\/|lib\/hooks\/battles?\/|lib\/utils\/battle\/(view|flows)\/)/;

const BATTLE_KEY = /["'`](?:battleCommon|battleWizards|battleDm|battleSetup|battleLog|battleActions)(?:\.[^"'`]*)?["'`]|["'`]battle\.[\w.${}]+["'`]|(?:useTranslations|getTranslations|getTranslator|useTranslator)\(\s*["'`]battle["'`]/;

// reviewed: pages outside the battle segments reach only these battle files (dice roller, FX runtime and preview, query keys); the battle namespaces are not loaded there
const ALLOWED_BATTLE_CODE = ["components/battle/fx/dice/", "components/battle/fx/runtime/", "components/battle/fx/preview/", "components/battle/fx/animations/", "lib/hooks/battles/keys.ts"];

function outsideBattleGraph(): Map<string, string> {
  const roots = walkSources("app").filter((f) => !SERVER_ONLY.test(f) && !BATTLE_SEGMENTS.test(f) && !f.startsWith("app/dev/"));

  return reachableSources(roots, (file, text) => SERVER_ONLY.test(file) || text.includes('"server-only"') || BATTLE_SEGMENTS.test(file));
}

describe("battle namespaces stay inside the battle segments", () => {
  const graph = outsideBattleGraph();

  it("no file reachable from the other pages reads a battle namespace", () => {
    const bad = [...graph].filter(([file, text]) => !file.startsWith("lib/i18n/") && BATTLE_KEY.test(text)).map(([file]) => file);

    expect(bad).toEqual([]);
  });

  it("other pages reach only the reviewed battle code", () => {
    const reached = [...graph.keys()].filter((f) => BATTLE_CODE.test(f) && !ALLOWED_BATTLE_CODE.some((a) => f.startsWith(a)));

    expect(reached).toEqual([]);
  });
});
