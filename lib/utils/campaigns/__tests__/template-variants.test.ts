import { describe, expect, it } from "vitest";

import { groupTemplates, pickVariant } from "@/lib/utils/campaigns/template-variants";
import type { TemplateCard } from "@/types/campaigns";

const card = (id: string, name: string, locale?: string, templateKey?: string): TemplateCard => ({ id, name, description: null, visibility: "official", counts: {}, locale, templateKey });

describe("groupTemplates", () => {
  it("зводить варіанти одного templateKey в одну групу, рядок без locale = en", () => {
    const groups = groupTemplates([card("a", "SRD"), card("b", "SRD", "uk", "srd")]);

    expect(groups).toHaveLength(2);

    const grouped = groupTemplates([card("a", "SRD", undefined, "srd"), card("b", "SRD", "uk", "srd")]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].locales.sort()).toEqual(["en", "uk"]);
  });

  it("без templateKey групує за name", () => {
    expect(groupTemplates([card("a", "Mine"), card("b", "HoMM")]).map((g) => g.key)).toEqual(["Mine", "HoMM"]);
  });

  it("легасі-назва офіційного шаблону групується за ключем пакета", () => {
    expect(groupTemplates([card("a", "Heroes"), card("b", "5e SRD 5.2")]).map((g) => g.key)).toEqual(["heroes-homm", "srd-5.2"]);
  });
});

describe("pickVariant", () => {
  const group = groupTemplates([card("a", "SRD", "en", "srd"), card("b", "SRD", "uk", "srd")])[0];

  it("обирає мову інтерфейсу, інакше en, інакше перший", () => {
    expect(pickVariant(group, "uk").id).toBe("b");
    expect(pickVariant(group, "de").id).toBe("a");
    expect(pickVariant(groupTemplates([card("z", "X", "uk", "x")])[0], "en").id).toBe("z");
  });
});
