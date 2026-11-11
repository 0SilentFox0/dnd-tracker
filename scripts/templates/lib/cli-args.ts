import { listPackKeys, TEMPLATES_DIR } from "./pack";

export interface CommandArgs {
  key: string;
  flags: Set<string>;
  options: Record<string, string>;
  rest: string[];
}

const VALUE_FLAGS = new Set(["--owner", "--dir", "--kinds", "--source", "--from", "--system", "--name", "--slugs", "--locale"]);

/** `<key> [--flag] [--option value] ...rest`; the key must be a pack folder unless `allowNewKey`. */
export function parseCommandArgs(args: string[], dir = TEMPLATES_DIR, allowNewKey = false): CommandArgs {
  const [key, ...tail] = args;

  const known = listPackKeys(dir);

  if (!key || key.startsWith("--") || (!allowNewKey && !known.includes(key))) throw new Error(`Unknown pack ${key ? `"${key}"` : "(missing)"}; known packs: ${known.join(", ")}`);

  const flags = new Set<string>();

  const options: Record<string, string> = {};

  const rest: string[] = [];

  for (let i = 0; i < tail.length; i++) {
    const arg = tail[i];

    if (VALUE_FLAGS.has(arg)) {
      const value = tail[i + 1];

      if (!value || value.startsWith("--")) throw new Error(`${arg} needs a value`);

      options[arg] = value;
      i += 1;
    } else if (arg.startsWith("--")) flags.add(arg);
    else rest.push(arg);
  }

  return { key, flags, options, rest };
}
