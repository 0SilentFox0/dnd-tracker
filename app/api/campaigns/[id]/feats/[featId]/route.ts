import { itemRoutes } from '@/lib/server/content/content-routes';
import { featsResource } from '@/lib/server/content/resources/feats';

export const { GET, PATCH, DELETE } = itemRoutes(featsResource);
