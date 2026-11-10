import { Prisma } from "@prisma/client";

export type Model = string;

export interface Relation {
  key: string;
  target: Model;
  kind: "one" | "many";
  /** `one`: column on this model; `many`: column on the target pointing back here. */
  fk: string;
}

export interface LayerConfig {
  model: Model;
  base: string;
  local: string;
  hideTable: string;
  baseFields: Set<string>;
  /** Scalar columns of the local model that make up a row's content hash (same set as the template bundle). */
  hashColumns: string[];
  relations: Record<string, Relation>;
}

/** Fields that only exist on `<Model>Base` (version window); they never leak into the local shape. */
export const BASE_ONLY = new Set(["sourceCampaignId", "validFrom", "validTo"]);

const NOT_HASHED = new Set(["campaignId", "createdAt", "updatedAt", "sourceId", "sourceHash", "slug"]);

const lower = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);

let cached: Record<Model, LayerConfig> | undefined;

/** Layered models = every model that has a `<Model>Base` twin in the schema. */
export function layeredModels(): Record<Model, LayerConfig> {
  if (cached) return cached;

  const models = Prisma.dmmf.datamodel.models;

  const byName = new Map(models.map((m) => [m.name, m]));

  const names = models.filter((m) => byName.has(`${m.name}Base`)).map((m) => m.name);

  const layered = new Set(names);

  cached = Object.fromEntries(
    names.map((name) => {
      const model = byName.get(name)!;

      const relations: Record<string, Relation> = {};

      for (const field of model.fields) {
        if (field.kind !== "object" || !layered.has(field.type)) continue;

        if (!field.isList) {
          if (field.relationFromFields?.length === 1) relations[field.name] = { key: field.name, target: field.type, kind: "one", fk: field.relationFromFields[0] };

          continue;
        }

        const inverse = byName.get(field.type)?.fields.find((f) => f.relationName === field.relationName && f.type === name && f.relationFromFields?.length === 1);

        if (inverse) relations[field.name] = { key: field.name, target: field.type, kind: "many", fk: inverse.relationFromFields![0] };
      }

      const baseModel = byName.get(`${name}Base`)!;

      return [name, { model: name, base: `${lower(name)}Base`, local: lower(name), hideTable: model.dbName ?? name, baseFields: new Set(baseModel.fields.map((f) => f.name)), hashColumns: model.fields.filter((f) => f.kind !== "object" && !NOT_HASHED.has(f.name)).map((f) => f.name), relations }];
    }),
  );

  return cached;
}

export const isLayered = (model: string): boolean => model in layeredModels();

/** Relations from `Campaign` to layered models: `campaign.spells`, `campaign.races`, ... */
export function campaignRelations(): Record<string, LayerConfig> {
  const layered = layeredModels();

  const campaign = Prisma.dmmf.datamodel.models.find((m) => m.name === "Campaign");

  return Object.fromEntries((campaign?.fields ?? []).filter((f) => f.kind === "object" && f.isList && f.type in layered).map((f) => [f.name, layered[f.type]]));
}

/** Relation fields of a model that are not layered (campaign, characterSkills, ...). */
export function otherRelationKeys(model: Model): Set<string> {
  const config = layeredModels()[model];

  return new Set(Prisma.dmmf.datamodel.models.find((m) => m.name === model)?.fields.filter((f) => f.kind === "object" && !config.relations[f.name]).map((f) => f.name));
}
