#!/usr/bin/env tsx
// pnpm template <index|backfill-keys> [...args]
import { writeIndex } from "./lib/index-gen";

type Command = (args: string[]) => Promise<void> | void;

const COMMANDS: Record<string, Command> = {
  index: () => {
    writeIndex();
    console.info("data/templates/manifests.ts and dictionaries.server.ts are up to date");
  },
};

async function main() {
  const [name, ...args] = process.argv.slice(2);

  const command = name ? COMMANDS[name] : undefined;

  if (!command) throw new Error(`Usage: pnpm template <${Object.keys(COMMANDS).join("|")}> [...args]`);

  await command(args);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
