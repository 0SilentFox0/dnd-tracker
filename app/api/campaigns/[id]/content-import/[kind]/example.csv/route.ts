import { csvResponse } from "@/lib/server/content/import/csv-response";
import { exampleCsv } from "@/lib/server/content/import/example";
import { importKindOf } from "@/lib/server/content/import/kind";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const GET = operationRoute(CONTENT_OPERATIONS["content.import-example"], async ({ actor, params }) => {
  const kind = importKindOf(params.kind);

  return csvResponse(`${kind}-example.csv`, await exampleCsv(actor, kind));
});
