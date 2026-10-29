import { expect, it } from "vitest";

import { LOCALES, type Namespace } from "@/lib/i18n/config";
import { localSource } from "@/lib/i18n/local-source";

const lookup = (tree: Record<string, unknown>, path: string) => path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree);

export function expectLabelKeys(ns: Namespace, prefix: string, values: readonly string[]): void {
  for (const locale of LOCALES) {
    it(`${locale}: ${ns}.${prefix}`, async () => {
      const tree = await localSource.load(locale, ns);

      for (const value of values) expect(typeof lookup(tree, `${prefix}.${value}`), `${ns}.${prefix}.${value}`).toBe("string");
    });
  }
}
