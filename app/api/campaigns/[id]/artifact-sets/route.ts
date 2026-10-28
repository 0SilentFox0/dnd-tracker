import { artifactSetsResource } from "@/lib/server/content/resources/artifact-sets";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST } = collectionRoutes(artifactSetsResource);
