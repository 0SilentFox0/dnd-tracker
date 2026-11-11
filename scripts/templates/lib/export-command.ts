import * as fs from "fs";
import * as path from "path";

import { assertSeedTarget } from "../../seed/seed-library-lib";
import { bundleToPack, leakedIds, type SlugMap } from "./export";
import { writeIcons } from "./icons-file";
import { listPackKeys, packPath, readManifest, TEMPLATES_DIR } from "./pack";

import { prisma } from "@/lib/db";
import { tableKey } from "@/lib/server/templates/bundle";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import type { PackKind, TemplateManifest } from "@/lib/utils/templates/manifest";

const KIND_ORDER: readonly PackKind[] = ["spell-groups", "spells", "races", "classes", "feats", "backgrounds", "careers", "units", "main-skills", "skills", "artifact-sets", "artifacts", "skillTrees", "tracks"];

const OPTIONS = new Set(["--from", "--system", "--name", "--slugs"]);

const write = (file: string, value: unknown) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

export async function exportCommand(args: string[]): Promise<void> {
  const [key, ...tail] = args;

  const options: Record<string, string> = {};

  for (let i = 0; i < tail.length; i += 2) {
    if (!OPTIONS.has(tail[i]) || !tail[i + 1]) throw new Error(`Bad option ${tail[i]}; pnpm template export <key> --from <campaignId> [--system <system>] [--name <name>] [--slugs <file>]`);

    options[tail[i]] = tail[i + 1];
  }

  if (!key || !options["--from"]) throw new Error("pnpm template export <key> --from <campaignId> [--system <system>] [--name <name>] [--slugs <file>]");

  assertSeedTarget(process.env.DATABASE_URL, false);

  try {
    const bundle = await exportCampaign(prisma as never, options["--from"]);

    const slugs = JSON.parse(fs.readFileSync(options["--slugs"] ?? path.join(__dirname, "..", key, "slugs.json"), "utf8")) as SlugMap;

    const base: TemplateManifest = listPackKeys().includes(key)
      ? readManifest(key)
      : {
          key,
          system: options["--system"] ?? "",
          names: { en: options["--name"] ?? key, uk: options["--name"] ?? key },
          locales: ["en"],
          rules: { file: "rules.json" },
          kinds: [],
          icons: {},
          ...(bundle.credits ? { credits: bundle.credits } : {}),
          counts: {},
        };

    if (!base.system) throw new Error("--system is required for a new pack");

    const kinds = base.kinds.length > 0 ? base.kinds : KIND_ORDER.filter((kind) => ((bundle as unknown as Record<string, unknown[]>)[tableKey(kind)]?.length ?? 0) > 0);

    const pack = bundleToPack(bundle, { ...base, kinds }, slugs);

    const dir = path.join(TEMPLATES_DIR, key);

    fs.mkdirSync(dir, { recursive: true });
    write(packPath(key, "manifest.json"), pack.manifest);
    write(packPath(key, "rules.json"), pack.rules);
    for (const kind of kinds) write(packPath(key, `${kind}.json`), pack.rows[kind]);
    writeIcons(key, pack.icons);

    console.info(`${key}: ${JSON.stringify(pack.manifest.counts)}`);

    const leaks = leakedIds(pack);

    if (Object.keys(leaks).length > 0) console.warn(`ids left inside rows (not resolvable by name): ${JSON.stringify(leaks)}`);
  } finally {
    await prisma.$disconnect();
  }
}
