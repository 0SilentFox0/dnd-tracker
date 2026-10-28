import { accessSync, constants, statSync } from "node:fs";
import path from "node:path";

export const browserSources = {
  server: path.join(__dirname, "browser-server.mjs"),
  check: path.join(__dirname, "browser-check.mjs"),
};

export function assistantCheckPreflight(args: string[]) {
  const flags = new Map<string, string>();

  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];

    const value = args[index + 1];

    if (!["--output-dir", "--chrome-path"].includes(flag) || flags.has(flag) || !value || value.startsWith("--") || value.includes("\0")) throw new Error("ASSISTANT_INVALID_OPTIONS");

    flags.set(flag, value);
  }

  const outputRoot = path.resolve(flags.get("--output-dir") ?? ".superpowers/assistant-check");

  const chromePath = path.resolve(flags.get("--chrome-path") ?? process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");

  const sourceRelative = path.relative(__dirname, outputRoot);

  if (!sourceRelative || (!sourceRelative.startsWith(`..${path.sep}`) && !path.isAbsolute(sourceRelative))) throw new Error("ASSISTANT_OUTPUT_OVERLAPS_SOURCES");

  try {
    accessSync(chromePath, constants.X_OK);

    if (!statSync(chromePath).isFile()) throw new Error();
  } catch { throw new Error("ASSISTANT_CHROME_UNAVAILABLE"); }

  return { outputRoot, chromePath };
}
