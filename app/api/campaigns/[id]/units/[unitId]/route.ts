import { itemRoutes } from '@/lib/server/content/content-routes';
import { unitsResource } from '@/lib/server/content/resources/units';

export const { GET, PATCH, DELETE } = itemRoutes(unitsResource);
