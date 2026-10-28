import type { z } from "zod";

import type { JsonValue } from "./types";

import "server-only";
import { receiptEffectsSchema } from "@/lib/schemas/assistant";

export type ReceiptEffects = z.infer<typeof receiptEffectsSchema>;
export type ExternalState = NonNullable<ReceiptEffects["external"]>;

export function externalRun(expected: JsonValue): string | undefined {
  return expected && typeof expected === "object" && !Array.isArray(expected) && typeof expected.assistantExternalRun === "string" ? expected.assistantExternalRun : undefined;
}

export function actionExpected(expected: JsonValue): JsonValue {
  if (externalRun(expected) && expected && typeof expected === "object" && !Array.isArray(expected)) return expected.action ?? null;

  return expected;
}

/** Legacy receipts have no external envelope; malformed rows cannot resume a charge. */
export function readExternalState(value: unknown): ExternalState | undefined {
  const parsed = receiptEffectsSchema.safeParse(value);

  return parsed.success ? parsed.data.external : undefined;
}

export function actionExternalResult(value: unknown): JsonValue | undefined {
  const state = readExternalState(value);

  return state?.phase === "result" ? state.result : undefined;
}
