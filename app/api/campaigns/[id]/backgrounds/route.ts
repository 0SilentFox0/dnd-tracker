import { backgroundsResource } from "@/lib/server/content/resources/backgrounds";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST } = collectionRoutes(backgroundsResource);
