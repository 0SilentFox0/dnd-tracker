import { classesResource } from "@/lib/server/content/resources/classes";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(classesResource);
