#!/usr/bin/env tsx
// pnpm constructor:srd-template [--locale en] [--owner <userId>] [--allow-remote]
import { parseSrdSeedArgs } from "./lib/load-template";

async function main() {
  const options = parseSrdSeedArgs(process.argv.slice(2));

  const { loadSrdTemplate } = await import("./lib/run-load-template");

  await loadSrdTemplate(options);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
