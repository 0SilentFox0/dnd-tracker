import { featsResource } from "@/lib/server/content/resources/feats";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(featsResource);
