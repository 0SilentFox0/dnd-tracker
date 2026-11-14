import { itemRoutes } from '@/lib/server/content/content-routes';
import { tracksResource } from '@/lib/server/content/resources/tracks';

export const { GET, PATCH, DELETE } = itemRoutes(tracksResource);
