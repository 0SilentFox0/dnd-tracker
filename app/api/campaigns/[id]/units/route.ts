import { unitsResource } from "@/lib/server/content/resources/units";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST, DELETE } = collectionRoutes(unitsResource);
