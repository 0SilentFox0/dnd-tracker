import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

const READER_RE = /\.(equipped|stash)\b/;

// opaque ref movers and false positives — they never read an artifact behind a ref
const RAW_OK: Record<string, string> = {
  "lib/utils/artifacts/ownership.ts": "ref-aware primitives (refArtifactIds)",
  "lib/utils/inventory/stash-actions.ts": "moves refs between equipped/stash as opaque strings",
  "lib/hooks/characters/useStash.ts": "characterKeys.stash query key",
  "lib/hooks/characters/useCharacterEditor.ts": "seeds the DM editor state with raw refs",
  "components/character-profile/ProfileEditor.tsx": "roster equipped is already resolved by read-roster",
};

function sources(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);

    if (e.isDirectory()) return e.name === "__tests__" || e.name === "node_modules" ? [] : sources(rel);

    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [rel] : [];
  });
}

describe("тест-сторож: читачі equipped/stash", () => {
  it("кожен читач поза lib/utils/items іде через lib/utils/items (resolveItemRows/heldRefs/…)", () => {
    const files = ["app", "lib", "components"].flatMap(sources).filter((f) => !f.startsWith("lib/utils/items/"));

    const readers = files.filter((f) => READER_RE.test(fs.readFileSync(path.join(ROOT, f), "utf8")));

    const bypass = readers.filter((f) => !RAW_OK[f] && !fs.readFileSync(path.join(ROOT, f), "utf8").includes('from "@/lib/utils/items/'));

    expect(readers.length).toBeGreaterThan(10);
    expect(bypass).toEqual([]);
  });
});
