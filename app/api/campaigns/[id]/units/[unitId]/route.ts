import { unitsResource } from "@/lib/server/content/resources/units";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(unitsResource);
