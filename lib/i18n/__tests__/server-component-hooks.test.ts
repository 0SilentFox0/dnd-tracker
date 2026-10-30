import { describe, expect, it } from "vitest";

import { ROOT_NAMESPACES } from "../scopes";
import { reachableSources, walkSources } from "../test/import-graph";

const USE_CLIENT = /^\s*(?:\/\/[^\n]*\n\s*)*["']use client["']/;

// the request config of server components loads only these namespaces (see lib/i18n/request.ts)
const REQUEST_NAMESPACES = ["common", "validation"];

const SYNC_HOOK = /\buseTranslations\(\s*["'`]([A-Za-z]+)/g;

describe("server components", () => {
  it("call the sync useTranslations only for namespaces of the request config", () => {
    const roots = walkSources("app").filter((f) => /\/(page|layout|template|default)\.tsx$/.test(f) && !USE_CLIENT.test(f));

    const graph = reachableSources(roots, (_file, text) => USE_CLIENT.test(text));

    const bad: string[] = [];

    for (const [file, text] of graph) {
      for (const [, ns] of text.matchAll(SYNC_HOOK)) if (!REQUEST_NAMESPACES.includes(ns)) bad.push(`${file}: ${ns}`);
    }

    expect(bad).toEqual([]);
  });
});

describe("app header", () => {
  it("reads only namespaces delivered by the root layout (it renders outside every scope)", () => {
    const graph = reachableSources(["components/layout/HeaderGate.tsx"], () => false);

    const hook = /\b(?:useTranslations|useTranslator)\(\s*["'`]([A-Za-z]+)/g;

    const bad: string[] = [];

    for (const [file, text] of graph) {
      for (const [, ns] of text.matchAll(hook)) if (!(ROOT_NAMESPACES as readonly string[]).includes(ns)) bad.push(`${file}: ${ns}`);
    }

    expect(bad).toEqual([]);
  });
});
