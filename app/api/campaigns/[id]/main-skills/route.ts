import { mainSkillsResource } from "@/lib/server/content/resources/main-skills";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST } = collectionRoutes(mainSkillsResource);
