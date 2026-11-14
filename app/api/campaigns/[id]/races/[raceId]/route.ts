import { itemRoutes } from '@/lib/server/content/content-routes';
import { racesResource } from '@/lib/server/content/resources/races';

export const { GET, PATCH, DELETE } = itemRoutes(racesResource);
