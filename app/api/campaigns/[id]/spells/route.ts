import { collectionRoutes } from '@/lib/server/content/content-routes';
import { spellsResource } from '@/lib/server/content/resources/spells';

export const { GET, POST, DELETE } = collectionRoutes(spellsResource);
