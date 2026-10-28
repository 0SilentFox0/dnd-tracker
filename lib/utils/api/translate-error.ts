import { NextResponse } from "next/server";

import type { ApiErrorBody } from "./api-response";

import "server-only";
import { API_ERROR_PARAMS, type ApiErrorKey, type ErrorParams } from "@/lib/constants/api-errors";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { translateIssue } from "@/lib/i18n/translate-issue";
import { getTranslator, type Translator } from "@/lib/i18n/translator";

export type ApiErrorInput = { error: string; issues?: unknown; params?: ErrorParams } & Record<string, unknown>;

export type TranslatedIssue = Record<string, unknown> & { message: string; pathLabel?: string };

const isIssue = (value: unknown): value is Record<string, unknown> & { message: string } =>
  !!value && typeof value === "object" && typeof (value as { message?: unknown }).message === "string";

function pathLabel(t: Translator, path: unknown): string | undefined {
  if (!Array.isArray(path) || !path.length) return undefined;

  return path
    .map((segment) => {
      if (typeof segment === "number") return `#${segment + 1}`;

      const key = `errors.fields.${String(segment)}`;

      return t.has(key) ? t(key) : String(segment);
    })
    .join(" › ");
}

function translateIssues(t: Translator, issues: unknown): unknown {
  if (!Array.isArray(issues)) return issues;

  return issues.map((issue) => {
    if (!isIssue(issue)) return issue;

    const label = pathLabel(t, issue.path);

    const translated: TranslatedIssue = {
      ...issue,
      message: translateIssue(t, issue as Parameters<typeof translateIssue>[1]),
    };

    if (label) translated.pathLabel = label;

    return translated;
  });
}

export function translateErrorBody(t: Translator, body: { error: string; issues?: unknown; params?: ErrorParams }): ApiErrorBody {
  const issues = body.issues === undefined ? {} : { issues: translateIssues(t, body.issues) };

  if (!t.has(body.error)) return { error: body.error, ...issues };

  const params = { ...API_ERROR_PARAMS[body.error as ApiErrorKey], ...body.params };

  return { error: t(body.error, params), errorKey: body.error, ...issues };
}

export async function requestTranslator(): Promise<Translator> {
  return getTranslator(await getRequestLocale().catch(() => DEFAULT_LOCALE));
}

async function translateInRequest(body: { error: string; issues?: unknown; params?: ErrorParams }): Promise<ApiErrorBody> {
  try {
    return translateErrorBody(await requestTranslator(), body);
  } catch {
    return { error: body.error, ...(body.issues !== undefined && { issues: body.issues }) };
  }
}

export function apiErrorJson({ error, issues, params, ...rest }: ApiErrorInput, init: ResponseInit = {}): NextResponse {
  const headers = new Headers(init.headers);

  headers.set("Content-Type", "application/json");

  const stream = new ReadableStream<Uint8Array>({
    // start runs synchronously inside the constructor, so the request's async context (cookies/headers) is still active
    async start(controller) {
      const body = await translateInRequest({ error, issues, params });

      controller.enqueue(new TextEncoder().encode(JSON.stringify({ ...rest, ...body })));
      controller.close();
    },
  });

  return new NextResponse(stream, { ...init, headers });
}
