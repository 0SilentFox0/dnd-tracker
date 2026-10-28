import { skillsResource } from "@/lib/server/content/resources/skills";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST, DELETE } = collectionRoutes(skillsResource);
