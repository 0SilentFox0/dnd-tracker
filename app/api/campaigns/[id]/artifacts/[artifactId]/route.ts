import { itemRoutes } from '@/lib/server/content/content-routes';
import { artifactsResource } from '@/lib/server/content/resources/artifacts';

export const { GET, PATCH, DELETE } = itemRoutes(artifactsResource);
