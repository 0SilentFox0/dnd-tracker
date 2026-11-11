import { careersResource } from "@/lib/server/content/resources/careers";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(careersResource);
