import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { CONTENT_MODELS } from "@/scripts/db/gen-base-models";

const LOCAL_ONLY = ["campaignId", "sourceId", "sourceHash"];

const VERSIONED = ["sourceCampaignId", "validFrom", "validTo"];

const models = new Map(Prisma.dmmf.datamodel.models.map((model) => [model.name, model]));

function modelOf(name: string) {
  const model = models.get(name);

  if (!model) throw new Error(`model ${name} missing`);

  return model;
}

function scalarFields(name: string) {
  return new Map(modelOf(name).fields.filter((f) => f.kind !== "object").map((f) => [f.name, f]));
}

describe("base models parity", () => {
  it.each(CONTENT_MODELS)("%sBase mirrors %s", (name) => {
    const source = scalarFields(name);

    const base = scalarFields(`${name}Base`);

    const expected = [...source.keys()].filter((k) => !LOCAL_ONLY.includes(k));

    expect([...base.keys()].filter((k) => !VERSIONED.includes(k)).sort()).toEqual(expected.sort());
    expect(VERSIONED.every((k) => base.has(k))).toBe(true);

    for (const key of expected) {
      const a = source.get(key);

      const b = base.get(key);

      expect({ type: b?.type, list: b?.isList, required: b?.isRequired }).toEqual({
        type: a?.type,
        list: a?.isList,
        required: a?.isRequired,
      });
    }
  });

  it("base models carry no relations", () => {
    for (const name of CONTENT_MODELS) {
      expect(modelOf(`${name}Base`).fields.filter((f) => f.kind === "object")).toEqual([]);
    }
  });
});
