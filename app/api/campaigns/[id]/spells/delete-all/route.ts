import { collectionRoutes } from '@/lib/server/content/content-routes';
import { spellsResource } from '@/lib/server/content/resources/spells';

export const { DELETE } = collectionRoutes(spellsResource);
