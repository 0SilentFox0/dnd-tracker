import { collectionRoutes } from '@/lib/server/content/content-routes';
import { artifactsResource } from '@/lib/server/content/resources/artifacts';

export const { GET, POST, DELETE } = collectionRoutes(artifactsResource);
