import { APICallError } from "ai";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";

const statusOf = (error: unknown) => (APICallError.isInstance(error) ? error.statusCode : undefined);

// never echo provider error text: it may quote the request, including the key
export function aiErrorMessage(error: unknown): string {
  const status = statusOf(error);

  if (status === 401 || status === 403) return API_ERRORS.AI_KEY_INVALID;

  if (status === 429) return API_ERRORS.AI_RATE_LIMIT;

  return API_ERRORS.AI_PROVIDER_DOWN;
}

export function aiErrorStatus(error: unknown): number {
  const status = statusOf(error);

  return status === 401 || status === 403 ? 400 : status === 429 ? 429 : 502;
}
