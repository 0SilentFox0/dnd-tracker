import "server-only";
import type { AnyContentResource, ContentKind } from "@/lib/server/content/define-resource";
import { artifactSetsResource } from "@/lib/server/content/resources/artifact-sets";
import { artifactsResource } from "@/lib/server/content/resources/artifacts";
import { classesResource } from "@/lib/server/content/resources/classes";
import { mainSkillsResource } from "@/lib/server/content/resources/main-skills";
import { racesResource } from "@/lib/server/content/resources/races";
import { skillsResource } from "@/lib/server/content/resources/skills";
import { spellGroupsResource } from "@/lib/server/content/resources/spell-groups";
import { spellsResource } from "@/lib/server/content/resources/spells";
import { tracksResource } from "@/lib/server/content/resources/tracks";
import { unitsResource } from "@/lib/server/content/resources/units";

export const CONTENT_RESOURCES = {
  units: unitsResource,
  races: racesResource,
  classes: classesResource,
  spells: spellsResource,
  "spell-groups": spellGroupsResource,
  "main-skills": mainSkillsResource,
  skills: skillsResource,
  artifacts: artifactsResource,
  "artifact-sets": artifactSetsResource,
  tracks: tracksResource,
} satisfies Record<ContentKind, AnyContentResource>;
