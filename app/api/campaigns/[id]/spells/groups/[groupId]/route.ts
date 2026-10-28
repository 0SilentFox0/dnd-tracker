import { spellGroupsResource } from "@/lib/server/content/resources/spell-groups";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(spellGroupsResource);
