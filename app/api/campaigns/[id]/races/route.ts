import { racesResource } from "@/lib/server/content/resources/races";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST } = collectionRoutes(racesResource);
