import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import { createUnitSchema } from "@/lib/schemas";
import { SHARED_SCHEMAS, toJsonSchemas } from "@/lib/server/content/json-schema";

const json = (v: unknown) => JSON.stringify(v);

describe("toJsonSchemas", () => {
  const schemas = toJsonSchemas([[createUnitSchema, "UnitsCreate"]]);

  it("спільні схеми — окремі компоненти, юніт посилається на Ability через $ref", () => {
    for (const [, id] of SHARED_SCHEMAS) expect(schemas[id]).toBeDefined();
    expect(json(schemas.UnitsCreate)).toContain('"$ref":"#/components/schemas/Ability"');
    expect(json(schemas.UnitsCreate).length).toBeLessThan(6000);
  });

  it("кожен вид ефекту — свій компонент; Effect і randomOf посилаються на них", () => {
    expect(schemas["Effect.modifyStat"]).toBeDefined();
    expect(schemas["Effect.summon"]).toBeDefined();
    expect(json(schemas.Effect)).toContain('"$ref":"#/components/schemas/Effect.modifyStat"');
    expect(json(schemas.Effect)).toContain('"$ref":"#/components/schemas/NonRandomEffect"');
  });

  it("рекурсивна Condition посилається сама на себе", () => {
    expect(json(schemas.Condition)).toContain('"$ref":"#/components/schemas/Condition"');
  });

  it("без $schema/$id у компонентах", () => {
    for (const s of Object.values(schemas)) {
      expect(s).not.toHaveProperty("$schema");
      expect(s).not.toHaveProperty("$id");
    }
  });

  it("одна схема під двома id — лише перший", () => {
    const shared = z.object({ name: z.string() });

    const out = toJsonSchemas([[shared, "A"], [shared, "B"]]);

    expect(out.A).toBeDefined();
    expect(out.B).toBeUndefined();
  });

  it("опис ключових полів доходить до документа", () => {
    const props = (schemas.UnitsCreate as { properties: Record<string, { description?: string }> }).properties;

    expect(props.knownSpells.description).toBeDefined();
  });
});
