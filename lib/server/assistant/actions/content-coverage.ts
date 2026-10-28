import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";

/** Implemented adapters; model activation is separately gated by T14. */
export const CONTENT_ACTION_COVERAGE = [
  ...Object.values(CONTENT_RESOURCES).flatMap((resource) => {
    const route = `campaigns/[id]${resource.path}`;

    const testId = "content-actions";

    const rows = [
      { route, method: "GET", actionId: `content.${resource.kind}.list`, testId },
      { route, method: "POST", actionId: `content.${resource.kind}.create`, testId },
      { route: `${route}/[${resource.idParam}]`, method: "GET", actionId: `content.${resource.kind}.get`, testId },
      { route: `${route}/[${resource.idParam}]`, method: "PATCH", actionId: `content.${resource.kind}.update`, testId },
      { route: `${route}/[${resource.idParam}]`, method: "DELETE", actionId: `content.${resource.kind}.delete`, testId },
    ];

    if (resource.removeAll) rows.push({ route, method: "DELETE", actionId: `content.${resource.kind}.delete-all`, testId });

    if (resource.kind === "spells" || resource.kind === "units") rows.push({ route: `${route}/delete-all`, method: "DELETE", actionId: `content.${resource.kind}.delete-all`, testId });

    return rows;
  }),
  ...Object.values(CONTENT_OPERATIONS).map((operation) => ({ route: `campaigns/[id]${operation.path.replace(/\{([^}]+)\}/g, "[$1]")}`, method: operation.method, actionId: operation.id, testId: "content-operations" })),
];
