import { csvResponse } from "@/lib/server/content/import/csv-response";
import { exportCsv } from "@/lib/server/content/import/export";
import { importKindOf } from "@/lib/server/content/import/kind";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const GET = operationRoute(CONTENT_OPERATIONS["content.export"], async ({ actor, params }) => {
  const kind = importKindOf(params.kind);

  return csvResponse(`${kind}.csv`, await exportCsv(actor, kind));
});
