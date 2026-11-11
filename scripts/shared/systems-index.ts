import fs from "node:fs";
import path from "node:path";

const OPEN = "// <systems:generated>";

const CLOSE = "// </systems:generated>";

const upper = (id: string) => id.toUpperCase().replace(/[^A-Z0-9]/g, "_");

interface BlockSpec {
  packs?: boolean;
  /** The layer file must export this name for the id to get a line */
  name?: (id: string) => string;
  layer: (id: string) => string;
  line: (id: string) => string;
}

export interface RootSpec {
  file: string;
  blocks: BlockSpec[];
}

const metaLayer = (id: string) => `systems/${id}/meta.ts`;

const imp = (name: (id: string) => string, from: (id: string) => string) => (id: string) => `import { ${name(id)} } from "${from(id)}";`;

const exportsName = (root: string, file: string, name: string): boolean => new RegExp(`export (?:const|function) ${name}\\b`).test(fs.readFileSync(path.join(root, file), "utf8"));

const scriptsLayer = (id: string) => `scripts/templates/systems/${id}/index.ts`;

const packLayer = (id: string) => `scripts/templates/${id}/index.ts`;

export const ROOT_SPECS: readonly RootSpec[] = [
  {
    file: "lib/utils/rules/systems/meta.ts",
    blocks: [
      { layer: metaLayer, line: imp((id) => `${upper(id)}_META`, (id) => `@/systems/${id}/meta`) },
      { layer: metaLayer, line: (id) => `${upper(id)}_META,` },
    ],
  },
  {
    file: "lib/utils/rules/systems/registry.ts",
    blocks: [
      { layer: (id) => `systems/${id}/index.ts`, name: (id) => `${upper(id)}_MODULE`, line: imp((id) => `${upper(id)}_MODULE`, (id) => `@/systems/${id}`) },
      { layer: (id) => `systems/${id}/index.ts`, name: (id) => `${upper(id)}_MODULE`, line: (id) => `${id}: ${upper(id)}_MODULE,` },
    ],
  },
  {
    file: "components/systems/registry.ts",
    blocks: [
      { layer: (id) => `systems/${id}/ui/index.ts`, line: imp((id) => `${upper(id)}_MODULE_UI`, (id) => `@/systems/${id}/ui`) },
      { layer: (id) => `systems/${id}/ui/index.ts`, line: (id) => `${id}: ${upper(id)}_MODULE_UI,` },
    ],
  },
  {
    file: "lib/server/systems/registry.ts",
    blocks: [
      { layer: (id) => `systems/${id}/server/index.ts`, line: imp((id) => `${upper(id)}_MODULE_SERVER`, (id) => `@/systems/${id}/server`) },
      { layer: (id) => `systems/${id}/server/index.ts`, line: (id) => `${id}: ${upper(id)}_MODULE_SERVER,` },
    ],
  },
  {
    file: "lib/utils/abilities/schema/system-effects.ts",
    blocks: [
      { layer: (id) => `systems/${id}/rules/ability-effects.ts`, line: imp((id) => `${upper(id)}_EFFECT_SCHEMAS`, (id) => `@/systems/${id}/rules/ability-effects`) },
      { layer: (id) => `systems/${id}/rules/ability-effects.ts`, line: (id) => `${upper(id)}_EFFECT_SCHEMAS,` },
    ],
  },
  {
    file: "lib/utils/abilities/registry/effects/system-rows.ts",
    blocks: [
      { layer: (id) => `systems/${id}/rules/ability-effect-rows.ts`, line: imp((id) => `${upper(id)}_EFFECT_ROWS`, (id) => `@/systems/${id}/rules/ability-effect-rows`) },
      { layer: (id) => `systems/${id}/rules/ability-effect-rows.ts`, line: (id) => `${upper(id)}_EFFECT_ROWS,` },
    ],
  },
  {
    file: "scripts/templates/systems/index.ts",
    blocks: [
      { layer: scriptsLayer, line: imp((id) => `${upper(id)}_MODULE_HOOKS`, (id) => `@/scripts/templates/systems/${id}`) },
      { layer: scriptsLayer, line: (id) => `${id}: ${upper(id)}_MODULE_HOOKS,` },
    ],
  },
  {
    file: "scripts/templates/systems/adapters.ts",
    blocks: [
      { layer: packLayer, packs: true, line: imp((id) => `${upper(id)}_ADAPTER`, (id) => `@/scripts/templates/${id}`) },
      { layer: packLayer, packs: true, line: (id) => `"${id}": ${upper(id)}_ADAPTER,` },
    ],
  },
];

export const systemIdsIn = (root: string): string[] => {
  const dir = path.join(root, "systems");

  if (!fs.existsSync(dir)) return [];

  const ids = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();

  for (const id of ids) if (!fs.existsSync(path.join(root, metaLayer(id)))) throw new Error(`systems/${id}: missing meta.ts`);

  return ids;
};

const BLOCK_RE = new RegExp(`^([ \\t]*)${OPEN}\\n[\\s\\S]*?^[ \\t]*${CLOSE}`, "gm");

export const packKeysIn = (root: string): string[] => {
  const dir = path.join(root, "scripts/templates");

  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "systems" && fs.existsSync(path.join(dir, d.name, "index.ts"))).map((d) => d.name).sort();
};

const render = (spec: RootSpec, text: string, ids: string[], packs: string[], root: string): string => {
  const found = [...text.matchAll(BLOCK_RE)].length;

  if (found !== spec.blocks.length) throw new Error(`${spec.file}: expected ${spec.blocks.length} generated blocks, found ${found}`);

  let i = 0;

  return text.replace(BLOCK_RE, (_all, indent: string) => {
    const block = spec.blocks[i++];

    const lines = (block.packs ? packs : ids).filter((id) => fs.existsSync(path.join(root, block.layer(id))) && (!block.name || exportsName(root, block.layer(id), block.name(id)))).map((id) => `${indent}${block.line(id)}\n`);

    return `${indent}${OPEN}\n${lines.join("")}${indent}${CLOSE}`;
  });
};

export interface IndexResult {
  stale: string[];
  written: string[];
}

export const syncSystemsIndex = (root: string, mode: "check" | "write" = "write"): IndexResult => {
  const ids = systemIdsIn(root);

  const packs = packKeysIn(root);

  const result: IndexResult = { stale: [], written: [] };

  for (const spec of ROOT_SPECS) {
    const file = path.join(root, spec.file);

    if (!fs.existsSync(file)) continue;

    const before = fs.readFileSync(file, "utf8");

    const after = render(spec, before, ids, packs, root);

    if (before === after) continue;

    result.stale.push(spec.file);

    if (mode === "write") {
      fs.writeFileSync(file, after);
      result.written.push(spec.file);
    }
  }

  return result;
};

if (require.main === module) {
  const check = process.argv.includes("--check");

  const { stale } = syncSystemsIndex(path.resolve(__dirname, "../.."), check ? "check" : "write");

  if (check && stale.length) {
    console.error(`systems index is stale: ${stale.join(", ")} (run pnpm systems:index)`);
    process.exit(1);
  }

  console.info(stale.length ? `updated: ${stale.join(", ")}` : "systems index is up to date");
}
