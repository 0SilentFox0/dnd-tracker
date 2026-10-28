import { artifactsResource } from "@/lib/server/content/resources/artifacts";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(artifactsResource);
