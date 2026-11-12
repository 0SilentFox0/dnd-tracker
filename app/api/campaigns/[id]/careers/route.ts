import { careersResource } from '@/lib/server/content/resources/careers';
import { collectionRoutes } from '@/lib/utils/api/content-routes';

export const { GET, POST } = collectionRoutes(careersResource);
