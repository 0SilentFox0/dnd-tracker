import { skillsResource } from "@/lib/server/content/resources/skills";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(skillsResource);
