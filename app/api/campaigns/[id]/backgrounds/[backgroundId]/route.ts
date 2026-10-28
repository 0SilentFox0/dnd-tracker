import { backgroundsResource } from "@/lib/server/content/resources/backgrounds";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(backgroundsResource);
