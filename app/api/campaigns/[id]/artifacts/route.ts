import { artifactsResource } from "@/lib/server/content/resources/artifacts";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST, DELETE } = collectionRoutes(artifactsResource);
