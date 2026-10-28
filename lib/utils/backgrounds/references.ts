import { isRecord } from "@/lib/utils/common/is-record";

/** References inside choices, including option abilities and spell grants. */
export function backgroundSpellIds(value: unknown): string[] {
  const ids = new Set<string>();

  const walk = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (isRecord(node)) for (const [key, child] of Object.entries(node)) {
      if (key === "spellId" && typeof child === "string") ids.add(child);
      else if (key === "spellIds" && Array.isArray(child)) child.forEach((id) => { if (typeof id === "string") ids.add(id); });
      else walk(child);
    }
  };

  walk(value);

  return [...ids];
}
