import { spellGroupsResource } from "@/lib/server/content/resources/spell-groups";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST } = collectionRoutes(spellGroupsResource);
