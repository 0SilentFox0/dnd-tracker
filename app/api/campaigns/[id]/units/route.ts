import { collectionRoutes } from '@/lib/server/content/content-routes';
import { unitsResource } from '@/lib/server/content/resources/units';

export const { GET, POST, DELETE } = collectionRoutes(unitsResource);
