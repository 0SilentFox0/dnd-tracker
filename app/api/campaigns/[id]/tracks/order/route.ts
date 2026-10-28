import { reorderTracks } from "../track-handlers";

import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const PUT = operationRoute(CONTENT_OPERATIONS["tracks.reorder"], reorderTracks);
