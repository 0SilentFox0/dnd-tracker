#!/usr/bin/env tsx
// Alias of `pnpm template i18n <command> <key> <locale>`: pnpm srd:i18n <command> <locale> [--template srd|grim] [...args]
import { i18nCommand } from "../../templates/lib/i18n-command";

const KEYS = { srd: "srd-5.2", grim: "grim-d100" } as const;

const args = process.argv.slice(2);

const at = args.indexOf("--template");

const name = at === -1 ? "srd" : args[at + 1];

if (name !== "srd" && name !== "grim") throw new Error(`--template must be srd or grim, got: ${name}`);

const [command, locale, ...rest] = args.filter((_, i) => i !== at && i !== at + 1);

i18nCommand([command, KEYS[name], locale, ...rest]);
