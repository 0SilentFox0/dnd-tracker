import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { ROOT_SPECS, syncSystemsIndex, systemIdsIn } from "@/scripts/shared/systems-index";

const REAL_ROOT = path.resolve(__dirname, "../..");

const OPEN = "// <systems:generated>";

const CLOSE = "// </systems:generated>";

const tmpDirs: string[] = [];

const write = (root: string, rel: string, text: string) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
};

const fixture = (ids: string[]) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "systems-index-"));

  tmpDirs.push(root);

  for (const spec of ROOT_SPECS) write(root, spec.file, spec.blocks.map(() => `${OPEN}\n${CLOSE}\n`).join("\n"));

  for (const id of ids) write(root, `systems/${id}/meta.ts`, "export {};\n");

  return root;
};

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("systems index", () => {
  it("the real tree is up to date (--check exits 0)", () => expect(syncSystemsIndex(REAL_ROOT, "check").stale).toEqual([]));

  it("emits entries in alphabetical id order, only for existing layers", () => {
    const root = fixture(["zeta", "alpha"]);

    write(root, "systems/alpha/index.ts", "export {};\n");

    syncSystemsIndex(root);

    const meta = fs.readFileSync(path.join(root, "lib/utils/rules/systems/meta.ts"), "utf8");

    expect(meta.indexOf("ALPHA_META")).toBeLessThan(meta.indexOf("ZETA_META"));

    const registry = fs.readFileSync(path.join(root, "lib/utils/rules/systems/registry.ts"), "utf8");

    expect(registry).toContain('import { ALPHA_SYSTEM } from "@/systems/alpha";');
    expect(registry).toContain("alpha: ALPHA_SYSTEM,");
    expect(registry).not.toContain("ZETA_SYSTEM");
  });

  it("is idempotent", () => {
    const root = fixture(["alpha"]);

    syncSystemsIndex(root);

    expect(syncSystemsIndex(root, "check").stale).toEqual([]);
  });

  it("check names the root whose generated block was edited by hand", () => {
    const root = fixture(["alpha"]);

    syncSystemsIndex(root);

    const file = path.join(root, "lib/utils/rules/systems/meta.ts");

    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("ALPHA_META", "HAND_EDITED"));

    expect(syncSystemsIndex(root, "check").stale).toEqual(["lib/utils/rules/systems/meta.ts"]);
  });

  it("rejects a system folder without meta.ts", () => {
    const root = fixture(["alpha"]);

    fs.mkdirSync(path.join(root, "systems/broken"));

    expect(() => systemIdsIn(root)).toThrow("systems/broken: missing meta.ts");
  });

  it("rejects a root with the wrong number of generated blocks", () => {
    const root = fixture(["alpha"]);

    write(root, "lib/utils/rules/systems/meta.ts", `${OPEN}\n${CLOSE}\n`);

    expect(() => syncSystemsIndex(root)).toThrow("lib/utils/rules/systems/meta.ts");
  });
});
