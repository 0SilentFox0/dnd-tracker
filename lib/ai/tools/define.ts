import type { z } from "zod";

import "server-only";
import { AI_LIMITS } from "@/lib/constants/ai";

export type AiToolContext = { campaignId: string; userId: string; threadId: string | null };

export class AiToolError extends Error {}

export type AiToolDef = {
  name: string;
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

export async function runTool(def: AiToolDef, ctx: AiToolContext, rawInput: unknown): Promise<string> {
  try {
    return clip(await def.handler(ctx, def.input.parse(rawInput)));
  } catch (error) {
    if (error instanceof AiToolError) return `Помилка: ${error.message}`;

    throw error;
  }
}
