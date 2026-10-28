import { tracksResource } from "@/lib/server/content/resources/tracks";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(tracksResource);
