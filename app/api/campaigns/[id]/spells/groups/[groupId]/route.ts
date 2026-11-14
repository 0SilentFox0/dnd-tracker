import { itemRoutes } from '@/lib/server/content/content-routes';
import { spellGroupsResource } from '@/lib/server/content/resources/spell-groups';

export const { GET, PATCH, DELETE } = itemRoutes(spellGroupsResource);
