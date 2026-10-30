#!/usr/bin/env tsx
// pnpm constructor:empty-5e-template [--owner <userId>] [--allow-remote]
import { assertSeedTarget } from "../seed/seed-library-lib";
import { ensureSrdTemplate } from "./lib/load-template";
import { SRD_RULES } from "./lib/rules-preset";
import { makeTemplateStore } from "./lib/template-store";

import { EMPTY_5E_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";

const DESCRIPTION = "Правила D&D 5e без контенту: класи, раси, заклинання й монстрів ДМ додає сам";

async function main() {
  const args = process.argv.slice(2);

  const owner = args.includes("--owner") ? args[args.indexOf("--owner") + 1] : undefined;

  assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  const template = await ensureSrdTemplate(makeTemplateStore(EMPTY_5E_TEMPLATE_NAME), { owner, rules: SRD_RULES, credits: "", description: DESCRIPTION });

  console.info(`${EMPTY_5E_TEMPLATE_NAME}: ${template.id}${template.created ? " (створено)" : " (оновлено)"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
