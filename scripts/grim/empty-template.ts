#!/usr/bin/env tsx
// pnpm constructor:empty-grim-template [--owner <userId>] [--allow-remote]
import { assertSeedTarget } from "../seed/seed-library-lib";
import { ensureSrdTemplate } from "../srd/lib/load-template";
import { makeTemplateStore } from "../srd/lib/template-store";

import { EMPTY_GRIM_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const DESCRIPTION = "Grim d100 rules without content: careers, talents and bestiary are added by the DM";

async function main() {
  const args = process.argv.slice(2);

  const owner = args.includes("--owner") ? args[args.indexOf("--owner") + 1] : undefined;

  assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  const template = await ensureSrdTemplate(makeTemplateStore(EMPTY_GRIM_TEMPLATE_NAME), { owner, rules: WFRP_RULES, credits: "", description: DESCRIPTION });

  console.info(`${EMPTY_GRIM_TEMPLATE_NAME}: ${template.id}${template.created ? " (created)" : " (updated)"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
