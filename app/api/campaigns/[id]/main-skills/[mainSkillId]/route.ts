import { mainSkillsResource } from "@/lib/server/content/resources/main-skills";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(mainSkillsResource);
