import { tracksResource } from "@/lib/server/content/resources/tracks";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST } = collectionRoutes(tracksResource);
