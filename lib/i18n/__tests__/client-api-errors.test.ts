import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";

const ROOT = process.cwd();

const CLIENT_ROOTS = ["components", "app", "lib/hooks", "lib/providers"];

const SERVER_ONLY = /^(lib\/server|app\/api)\//;

const IMPORT_RE = /(?:from|import)\s*\(?\s*["']@\/([^"']+)["']/g;

const EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function walk(dir: string, out: string[] = []): string[] {
  const abs = join(ROOT, dir);

  if (!existsSync(abs)) return out;

  for (const name of readdirSync(abs)) {
    const rel = `${dir}/${name}`;

    if (name === "__tests__" || name === "node_modules") continue;

    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (/\.tsx?$/.test(name)) out.push(rel);
  }

  return out;
}

const resolve = (spec: string) => EXTS.map((ext) => `${spec}${ext}`).concat(spec).find((p) => /\.tsx?$/.test(p) && existsSync(join(ROOT, p)));

function clientGraph(): Map<string, string> {
  const seen = new Map<string, string>();

  const queue = CLIENT_ROOTS.flatMap((r) => walk(r)).filter((f) => !SERVER_ONLY.test(f) && /^["']use client["']/.test(readFileSync(join(ROOT, f), "utf8").trimStart()));

  while (queue.length) {
    const file = queue.pop() as string;

    if (seen.has(file) || SERVER_ONLY.test(file)) continue;

    const text = readFileSync(join(ROOT, file), "utf8");

    if (text.includes('"server-only"')) continue;

    seen.set(file, text);

    for (const [, spec] of text.matchAll(IMPORT_RE)) {
      const next = resolve(spec);

      if (next) queue.push(next);
    }
  }

  return seen;
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
  it("keys used from a client graph live in the client namespaces (the errors namespace is server-only)", () => {
    const bad: string[] = [];

    for (const [file, text] of clientGraph()) {
      if (SERVER_ONLY_TEXT.has(file)) continue;

      for (const [, name] of text.matchAll(/API_ERRORS\.([A-Z0-9_]+)/g)) {
        const value = (API_ERRORS as Record<string, string>)[name];

        if (value?.startsWith("errors.")) bad.push(`${file}: ${name}`);
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
