import { featsResource } from "@/lib/server/content/resources/feats";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST } = collectionRoutes(featsResource);
