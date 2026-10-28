import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/config";
import { localSource } from "@/lib/i18n/local-source";
import { HELP_ARTICLES } from "@/lib/onboarding/help";

type Tree = Record<string, unknown>;

describe.each(LOCALES)("help skeleton ↔ %s", (locale) => {
  it("ключі JSON збігаються зі скелетом", async () => {
    const json = (await localSource.load(locale, "help")) as Tree;

    expect(Object.keys(json).sort()).toEqual(HELP_ARTICLES.map((a) => a.slug).sort());

    for (const a of HELP_ARTICLES) {
      const node = json[a.slug] as Tree;

      expect(Object.keys(node).sort(), a.slug).toEqual(["sections", "summary", "title"]);
      expect(typeof node.title, a.slug).toBe("string");
      expect(typeof node.summary, a.slug).toBe("string");

      const sections = node.sections as Tree;

      expect(Object.keys(sections), a.slug).toEqual(a.sections.map((_, i) => `s${i}`));

      a.sections.forEach((s, i) => {
        const sec = sections[`s${i}`] as Tree;

        const where = `${a.slug}/s${i}`;

        expect(Object.keys(sec), where).toEqual(["heading", ...s.blocks.map((_, j) => `b${j}`)]);
        expect(typeof sec.heading, where).toBe("string");

        s.blocks.forEach((b, j) => {
          const v = sec[`b${j}`];

          if (b.kind === "list") {
            expect(Object.keys(v as Tree), `${where}/b${j}`).toEqual(Array.from({ length: b.count }, (_, k) => `i${k}`));
            for (const item of Object.values(v as Tree)) expect(typeof item).toBe("string");
          } else {
            expect(typeof v, `${where}/b${j}`).toBe("string");
          }
        });
      });
    }
  });
});
