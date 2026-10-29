import { describe, expect, it } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { SERVER_NAMESPACES } from "@/lib/i18n/config";
import { reachableSources, readSource, walkSources } from "@/lib/i18n/test/import-graph";

const CLIENT_ROOTS = ["components", "app", "lib/hooks", "lib/providers"];

const SERVER_ONLY = /^(lib\/server|app\/api)\//;

function clientGraph(): Map<string, string> {
  const roots = CLIENT_ROOTS.flatMap((r) => walkSources(r)).filter((f) => !SERVER_ONLY.test(f) && /^["']use client["']/.test(readSource(f).trimStart()));

  return reachableSources(roots, (file, text) => SERVER_ONLY.test(file) || text.includes('"server-only"'));
}

// reviewed: reached from client code only via pure helpers whose error text is produced and translated on the server
// (or resolved through errorKey, e.g. join-error); the raw key never renders in the browser
const SERVER_ONLY_TEXT = new Set([
  "lib/constants/api-errors.ts",
  "lib/utils/items/item-stats.ts",
  "lib/utils/battle/spell/spell-targeting.ts",
  "lib/utils/battle/validation/ability-targets.ts",
  "lib/utils/battle/store/errors.ts",
  "lib/utils/campaigns/join-error.ts",
]);

describe("API_ERRORS in client bundles", () => {
  it("keys used from a client graph live in the client namespaces (the server namespaces are server-only)", () => {
    const bad: string[] = [];

    for (const [file, text] of clientGraph()) {
      if (SERVER_ONLY_TEXT.has(file)) continue;

      for (const [, name] of text.matchAll(/API_ERRORS\.([A-Z0-9_]+)/g)) {
        const value = (API_ERRORS as Record<string, string>)[name];

        if (value && SERVER_NAMESPACES.some((ns) => value.startsWith(`${ns}.`))) bad.push(`${file}: ${name}`);
      }
    }

    expect(bad).toEqual([]);
  });

  it("lair and track editor keys are client-resolvable", () => {
    for (const name of ["LAIR_NOT_ACTIVE", "LAIR_USED", "LAIR_REPEAT", "TRACK_TITLE_TOO_LONG", "TRACK_DURATION_INVALID", "TRACK_FILE_INVALID", "YOUTUBE_URL_INVALID"] as const) {
      expect(API_ERRORS[name], name).toMatch(/^(validation|common)\./);
    }
  });
});
