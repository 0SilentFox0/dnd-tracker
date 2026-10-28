import { z } from "zod";

import { formatIssues } from "./issues";

import "server-only";
import { AI_LIMITS, type ApiTokenScope } from "@/lib/constants/ai";
import { ContentError } from "@/lib/server/content/errors";

export type AiToolContext = { campaignId: string; userId: string; scopes: readonly ApiTokenScope[]; threadId: string | null; abortSignal?: AbortSignal; usage?: { images: number } };

export class AiToolError extends Error {}

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

export function clip(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);

  return text.length > AI_LIMITS.toolResultChars ? `${text.slice(0, AI_LIMITS.toolResultChars)}…[обрізано]` : text;
}

const INTERNAL_ERROR = "Внутрішня помилка сервера. Спробуй ще раз пізніше.";

function errorText(tool: string, error: unknown): string {
  if (error instanceof z.ZodError) return ["Помилка: некоректні параметри", ...formatIssues(error.issues)].join("\n");

  if (error instanceof AiToolError) return `Помилка: ${error.message}`;

  if (error instanceof ContentError) {
    const issues = Array.isArray(error.issues) ? error.issues : [];

    return [`Помилка: ${error.message}`, ...formatIssues(issues)].join("\n");
  }

  console.error(`tool ${tool} failed`, error);

  return `Помилка: ${INTERNAL_ERROR}`;
}

export async function runTool(def: AiToolDef, ctx: AiToolContext, rawInput: unknown): Promise<string> {
  try {
    return clip(await def.handler(ctx, def.input.parse(rawInput)));
  } catch (error) {
    return errorText(def.name, error);
  }
}
