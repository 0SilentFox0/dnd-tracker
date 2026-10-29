import { z } from "zod";

import { formatIssues } from "./issues";
import { project, publicToolData } from "./projection";

import "server-only";
import { AI_LIMITS, type ApiTokenScope } from "@/lib/constants/ai";
import { API_ERRORS, type ErrorParams } from "@/lib/constants/api-errors";
import type { Locale } from "@/lib/i18n/config";
import { translateIssue } from "@/lib/i18n/translate-issue";
import { authorizeLegacyAssistantRead } from "@/lib/server/assistant/authorize";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { ContentError } from "@/lib/server/content/errors";
import { requestTranslator, translateErrorBody } from "@/lib/utils/api/translate-error";

export type AiToolContext = { caller?: AssistantCaller; toolCallId?: string; campaignId: string; userId: string; scopes: readonly ApiTokenScope[]; threadId: string | null; locale: Locale; abortSignal?: AbortSignal; usage?: { images: number } };

export class AiToolError extends Error {
  constructor(
    message: string,
    readonly params?: ErrorParams,
  ) {
    super(message);
  }
}

export type AiToolDef = {
  name: string;
  scopes: readonly ApiTokenScope[];
  title: string;
  description: string;
  input: z.ZodType;
  handler: (ctx: AiToolContext, input: unknown) => Promise<unknown>;
};

export function defineTool<S extends z.ZodType>(
  def: Omit<AiToolDef, "input" | "handler"> & { input: S; handler: (ctx: AiToolContext, input: z.infer<S>) => Promise<unknown> },
): AiToolDef {
  return def as AiToolDef;
}

export type ToolResult = { version: 2; kind: "result"; data: unknown } | { version: 2; kind: "error"; error: { code: string; status: number; message: string; issues?: unknown } };

export function clip(value: unknown): string {
  if (typeof value === "string") return value.length > AI_LIMITS.toolResultChars ? `${value.slice(0, AI_LIMITS.toolResultChars - 20)}…[обрізано]` : value;

  const text = JSON.stringify(value);

  return text.length <= AI_LIMITS.toolResultChars ? text : JSON.stringify(project(value));
}

function boundedOutput(value: unknown): unknown {
  if (JSON.stringify(value ?? null).length < 22000) return value;

  if (value && typeof value === "object" && "kind" in value) {
    if (value.kind === "pending" && "intent" in value) {
      const intent = value.intent as Record<string, unknown>;

      return { ...value, intent: { ...intent, targets: project(intent.targets, { budget: 12000 }) } };
    }

    if (value.kind === "result" && "result" in value) {
      const result = value.result as Record<string, unknown>;

      return { ...value, result: { ...result, data: project(result.data, { force: true, limit: 8, budget: 12000 }), affected: project(result.affected, { force: true, limit: 1, budget: 3000 }), warnings: project(result.warnings, { force: true, limit: 1, budget: 3000 }) } };
    }
  }

  return project(value);
}

async function translatedIssues(issues: ReadonlyArray<{ path: PropertyKey[]; code: string; message: string; minimum?: unknown; maximum?: unknown; params?: ErrorParams }>) {
  const t = await requestTranslator();

  return issues.map((issue) => ({ path: issue.path, code: issue.code, message: translateIssue(t, issue) }));
}

export async function runToolResult(def: AiToolDef, ctx: AiToolContext, rawInput: unknown): Promise<ToolResult> {
  try {
    ctx.abortSignal?.throwIfAborted();

    if (ctx.caller && def.scopes.includes("ai")) {
      if (ctx.caller.actor.campaignId !== ctx.campaignId || ctx.caller.actor.userId !== ctx.userId) throw new ContentError(API_ERRORS.ASSISTANT_ACTION_FORBIDDEN, 403);

      await authorizeLegacyAssistantRead(ctx.caller);
    }

    return { version: 2, kind: "result", data: boundedOutput(publicToolData(await def.handler(ctx, def.input.parse(rawInput)))) };
  } catch (error) {
    if (error instanceof z.ZodError) return { version: 2, kind: "error", error: { code: "INVALID_INPUT", status: 400, message: "Некоректні параметри", issues: formatIssues(await translatedIssues(error.issues)).slice(0, 20).map(s => s.slice(0, 200)) } };

    if (error instanceof ContentError || error instanceof AiToolError) {
      const t = await requestTranslator();

      return { version: 2, kind: "error", error: { code: "ASSISTANT_UNAVAILABLE", status: error instanceof ContentError ? error.status : 422, message: translateErrorBody(t, { error: error.message, params: error.params }).error.slice(0, 500), ...(error instanceof ContentError && Array.isArray(error.issues) ? { issues: formatIssues(await translatedIssues(error.issues)).slice(0, 20).map(s => s.slice(0, 200)) } : {}) } };
    }

    console.error(`tool ${def.name} failed`);

    return { version: 2, kind: "error", error: { code: "ASSISTANT_FAILED", status: 500, message: "Внутрішня помилка сервера. Спробуй ще раз пізніше." } };
  }
}

export async function runTool(def: AiToolDef, ctx: AiToolContext, rawInput: unknown): Promise<string> {
  return JSON.stringify(await runToolResult(def, ctx, rawInput));
}
