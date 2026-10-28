import { artifactSetsResource } from "@/lib/server/content/resources/artifact-sets";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(artifactSetsResource);
