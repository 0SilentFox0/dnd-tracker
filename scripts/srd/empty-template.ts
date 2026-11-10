#!/usr/bin/env tsx
// pnpm constructor:empty-5e-template [--owner <userId>] [--allow-remote]
import { assertSeedTarget } from "../seed/seed-library-lib";
import { readManifest } from "../templates/lib/pack";
import { ensureTemplate, makeTemplateStore } from "../templates/lib/store";
import { SRD_RULES } from "./lib/rules-preset";

import { prisma } from "@/lib/db";

const DESCRIPTION = "Правила D&D 5e без контенту: класи, раси, заклинання й монстрів ДМ додає сам";

async function main() {
  const args = process.argv.slice(2);

  const owner = args.includes("--owner") ? args[args.indexOf("--owner") + 1] : undefined;

  assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  const manifest = readManifest("srd-5.2-empty");

  const template = await ensureTemplate(makeTemplateStore(manifest), { owner, rules: SRD_RULES, credits: "", description: DESCRIPTION });

  console.info(`${manifest.names.en}: ${template.id}${template.created ? " (створено)" : " (оновлено)"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
