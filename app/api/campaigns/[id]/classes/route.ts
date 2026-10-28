import { classesResource } from "@/lib/server/content/resources/classes";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST } = collectionRoutes(classesResource);
