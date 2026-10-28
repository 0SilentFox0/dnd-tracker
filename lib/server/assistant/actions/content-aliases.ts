import type { ActionRequest, AssistantCaller, DispatchResult } from "../types";
import { contentMediaHandoff } from "./content-media";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";

/** Trusted transport supplies caller and stable requestId; never model fields. */
export async function dispatchContentAlias(
  dispatch: (caller: AssistantCaller, request: ActionRequest) => Promise<DispatchResult>,
  caller: AssistantCaller,
  alias: string,
  input: Record<string, unknown>,
  requestId: string,
): Promise<DispatchResult> {
  const kind = String(input.kind);

  let actionId: string;

  let payload: unknown;

  const mediaBody = alias === "content_create" ? input.data : alias === "content_update" ? input.patch : undefined;

  if (mediaBody && typeof mediaBody === "object" && contentMediaHandoff(kind, mediaBody as Record<string, unknown>)) return dispatch(caller, { actionId: "content.media", input: { kind }, requestId });

  if (alias === "content_import" && input.dryRun !== true && Array.isArray(input.rows) && input.rows.some((row) => row && typeof row === "object" && contentMediaHandoff(kind, row))) return dispatch(caller, { actionId: "content.media", input: { kind }, requestId });

  switch (alias) {
    case "content_kinds": actionId = "content.kinds"; payload = {}; break;
    case "content_schema": actionId = "content.schema"; payload = input; break;
    case "content_list": actionId = `content.${kind}.list`; payload = input; break;
    case "content_get": actionId = `content.${kind}.get`; payload = { id: input.id }; break;
    case "get_rules": actionId = "rules.get"; payload = {}; break;
    case "get_skill_tree": actionId = "skill-trees.get"; payload = { race: input.race }; break;
    case "source_diff": actionId = "source.diff"; payload = { query: { scope: input.scope }, offset: input.offset, limit: input.limit }; break;
    case "content_create": actionId = `content.${kind}.create`; payload = { data: input.data }; break;
    case "content_update": actionId = `content.${kind}.update`; payload = { id: input.id, patch: input.patch }; break;
    case "content_delete": actionId = `content.${kind}.delete`; payload = { id: input.id }; break;
    case "content_import": actionId = input.dryRun === true ? "content.import-preview" : "content.import"; payload = { kind, body: { rows: input.rows, mode: input.mode ?? "create", dryRun: input.dryRun ?? false } }; break;
    case "update_rules": actionId = "rules.update"; payload = { body: input.patch }; break;
    case "save_skill_tree": actionId = "skill-trees.save"; payload = { treeId: input.treeId, body: { race: input.race, skills: input.skills } }; break;
    case "source_apply": actionId = "source.apply"; payload = { body: input }; break;
    default: throw new ContentError(API_ERRORS.ASSISTANT_UNKNOWN_CONTENT_ALIAS, 404);
  }

  return dispatch(caller, { actionId, input: payload, requestId });
}
