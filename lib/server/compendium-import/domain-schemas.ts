import type { ZodType } from "zod";

import type { TargetKind } from "./types";

import { createArtifactSchema } from "@/lib/schemas/artifacts";
import { createBackgroundSchema } from "@/lib/schemas/backgrounds";
import { createClassSchema } from "@/lib/schemas/classes";
import { createFeatSchema } from "@/lib/schemas/feats";
import { createRaceSchema } from "@/lib/schemas/races";
import { createScenarioPageSchema, scenarioContentSchema } from "@/lib/schemas/scenario";
import { createSpellGroupSchema, createSpellSchema } from "@/lib/schemas/spells";
import { createUnitSchema } from "@/lib/schemas/units";

export const domainSchemas: Partial<Record<TargetKind, ZodType>> = { spells: createSpellSchema, "spell-groups": createSpellGroupSchema, units: createUnitSchema, artifacts: createArtifactSchema, races: createRaceSchema, classes: createClassSchema, feats: createFeatSchema, backgrounds: createBackgroundSchema, scenarioPages: createScenarioPageSchema.extend({ content: scenarioContentSchema }) };
