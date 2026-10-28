import { spellsResource } from "@/lib/server/content/resources/spells";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST, DELETE } = collectionRoutes(spellsResource);
