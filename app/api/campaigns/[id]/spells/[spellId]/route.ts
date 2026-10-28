import { spellsResource } from "@/lib/server/content/resources/spells";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(spellsResource);
