import { racesResource } from "@/lib/server/content/resources/races";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(racesResource);
