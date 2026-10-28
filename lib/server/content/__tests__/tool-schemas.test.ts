import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AI_LIMITS } from "@/lib/constants/ai";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { contentSchema, EFFECT_KINDS } from "@/lib/server/content/tool-schemas";

const fits = (v: unknown) => expect(JSON.stringify(v).length).toBeLessThanOrEqual(AI_LIMITS.toolResultChars);

const refsResolve = (v: Record<string, unknown>) => {
  const defs = (v.$defs ?? {}) as Record<string, unknown>;

  for (const [, id] of JSON.stringify(v).matchAll(/"\$ref":"#\/\$defs\/([^"]+)"/g)) expect(defs, id).toHaveProperty([id]);
};

describe("contentSchema", () => {
  it.each(Object.keys(CONTENT_RESOURCES))("%s create/update — вміщається, $ref валідні, здібність — заглушка", (kind) => {
    for (const op of ["create", "update"] as const) {
      const s = contentSchema({ kind: kind as never, op });

      fits(s);
      refsResolve(s);
    }
  });

  it("юніт: Ability — заглушка з підказкою", () => {
    const s = contentSchema({ kind: "units" }) as { $defs: Record<string, { description?: string }> };

    expect(s.$defs.Ability.description).toContain('content_schema(kind: "abilities")');
  });

  it("спел: SpellEffect — заглушка з підказкою", () => {
    const s = contentSchema({ kind: "spells" }) as { $defs: Record<string, { description?: string }> };

    expect(s.$defs.SpellEffect.description).toContain('content_schema(kind: "abilities", effectKind');
  });

  it("abilities — вміщається, ефекти перелічені, а не вбудовані", () => {
    const s = contentSchema({ kind: "abilities" });

    fits(s);
    refsResolve(s);
    expect(JSON.stringify(s)).toContain("modifyStat");
    expect(JSON.stringify(s)).not.toContain('"Effect.modifyStat":{"type"');
  });

  it.each(EFFECT_KINDS)("ефект %s — вміщається", (effectKind) => {
    const s = contentSchema({ kind: "abilities", effectKind });

    fits(s);
    refsResolve(s);
  });

  it("rules і skill-tree", () => {
    for (const kind of ["rules", "skill-tree"] as const) {
      fits(contentSchema({ kind }));
      refsResolve(contentSchema({ kind }));
    }
  });

  it("невідомий effectKind → помилка з переліком", () => {
    expect(() => contentSchema({ kind: "abilities", effectKind: "nope" })).toThrow(/modifyStat/);
  });

  it("listFields оголошені для кожного ресурсу", () => {
    for (const r of Object.values(CONTENT_RESOURCES)) expect(Array.isArray(r.listFields)).toBe(true);
  });
});
