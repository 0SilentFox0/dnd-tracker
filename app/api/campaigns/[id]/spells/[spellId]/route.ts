import { itemRoutes } from '@/lib/server/content/content-routes';
import { spellsResource } from '@/lib/server/content/resources/spells';

export const { GET, PATCH, DELETE } = itemRoutes(spellsResource);
