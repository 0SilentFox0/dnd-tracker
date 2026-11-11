import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterAll, describe, expect, it } from "vitest";

import { importOrder } from "../lib/import-order";
import { renderManifestsModule } from "../lib/index-gen";
import { listPackKeys, readPack } from "../lib/pack";
import { validatePack } from "../lib/validate";

import { TEMPLATE_REGISTRY } from "@/lib/utils/templates/registry";

const root = path.join(__dirname, "..", "..", "..");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fourth-pack-"));

afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.name === "node_modules" || entry.name === ".next" ? [] : entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));

const sources = (folders: string[]) => folders.flatMap((folder) => walk(path.join(root, folder))).filter((file) => /\.(ts|tsx)$/.test(file));

describe("a fourth pack needs no change outside its folder", () => {
  it("validates, orders and indexes from a temporary templates dir", () => {
    fs.cpSync(path.join(__dirname, "fixtures", "fixture-pack"), path.join(tmp, "fixture-pack"), { recursive: true });

    const pack = readPack("fixture-pack", tmp);

    expect(validatePack(pack, { dir: tmp }).filter((issue) => issue.level === "error")).toEqual([]);
    expect(importOrder(pack.manifest.kinds)).toEqual(["spell-groups", "spells", "feats"]);
    expect(renderManifestsModule(listPackKeys(tmp))).toContain('"fixture-pack": manifest0');
    expect(Object.keys(TEMPLATE_REGISTRY)).not.toContain("fixture-pack");
    expect(fs.existsSync(path.join(root, "data", "templates", "fixture-pack"))).toBe(false);
  });
});

describe("no template-name constant leaks into core", () => {
  it("the old name constants are gone", () => {
    const constant = ["_TEMPLATE", "NAME"].join("_");

    const offenders = sources(["lib", "app", "components", "types", "scripts", "prisma"]).filter((file) => fs.readFileSync(file, "utf8").includes(constant));

    expect(offenders.map((file) => path.relative(root, file))).toEqual([]);
  });
});
