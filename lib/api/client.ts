/**
 * Клієнт для запитів до API.
 * Усі виклики fetch проходять через request() і обробляються глобальним обробником помилок.
 */

import { getCampaignApiUrl } from "@/lib/utils/api/api-helpers";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiErrorPayload {
  status: number;
  message: string;
  url: string;
  body?: unknown;
}

type GlobalErrorHandler = (payload: ApiErrorPayload) => void;

let globalErrorHandler: GlobalErrorHandler = (payload) => {
  if (typeof window !== "undefined") {
    console.error("[API]", payload.status, payload.url, payload.message, payload.body);
  }
};

/**
 * Встановити глобальний обробник помилок API (наприклад, тост або редірект на логін).
 * Викликати при ініціалізації додатку (наприклад, у layout або _app).
 */
export function setGlobalApiErrorHandler(handler: GlobalErrorHandler): void {
  globalErrorHandler = handler;
}

/**
 * Виконати запит до API з єдиною обробкою помилок.
 * При !response.ok викликається globalErrorHandler і кидається ApiError.
 */
export async function request<T>(
  url: string,
  options: RequestInit & { parseResponse?: "json" | "text" | "none" } = {},
): Promise<T> {
  const { parseResponse = "json", ...fetchOptions } = options;

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  const text = await response.text();

  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const errField = (body as { error?: unknown })?.error;

    let message: string;

    if (typeof errField === "string") {
      message = errField;
    } else if (Array.isArray(errField)) {
      message = errField
        .map((issue: unknown) =>
          issue &&
          typeof issue === "object" &&
          "message" in issue &&
          typeof (issue as { message: unknown }).message === "string"
            ? (issue as { message: string }).message
            : JSON.stringify(issue),
        )
        .join("; ");
    } else if (errField != null && typeof errField === "object") {
      message = JSON.stringify(errField);
    } else {
      message = response.statusText;
    }

    if (!message.trim()) {
      message = `Помилка ${response.status}`;
    }

    const payload: ApiErrorPayload = {
      status: response.status,
      message,
      url,
      body,
    };

    globalErrorHandler(payload);

    throw new ApiError(message, response.status, url, body);
  }

  if (parseResponse === "none") return undefined as T;

  if (parseResponse === "text") return text as T;

  return (body ?? null) as T;
}

export type CampaignRequestOptions = Omit<
  RequestInit & { parseResponse?: "json" | "text" | "none" },
  "body"
> & { body?: unknown };

/**
 * Запит до campaign-scoped API: будує URL через getCampaignApiUrl і викликає request().
 * path — шлях після campaignId, наприклад "/races" або "/battles/123".
 * Залишати для рідкісних кейсів (інший method, body для DELETE, спеціальні опції).
 */
export async function campaignRequest<T>(
  campaignId: string,
  path: string,
  options: CampaignRequestOptions = {},
): Promise<T> {
  const url = getCampaignApiUrl(path.startsWith("/") ? path : `/${path}`, campaignId);

  const { body, ...rest } = options;

  return request<T>(url, {
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

/**
 * GET до campaign API (без body).
 */
export async function campaignGet<T>(
  campaignId: string,
  path: string,
  options: Omit<CampaignRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return campaignRequest<T>(campaignId, path, { ...options, method: "GET" });
}

/**
 * POST до campaign API; тіло — третій аргумент.
 */
export async function campaignPost<T>(
  campaignId: string,
  path: string,
  body: unknown,
  options: Omit<CampaignRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return campaignRequest<T>(campaignId, path, { ...options, method: "POST", body });
}

/**
 * PATCH до campaign API; тіло — третій аргумент.
 */
export async function campaignPatch<T>(
  campaignId: string,
  path: string,
  body: unknown,
  options: Omit<CampaignRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return campaignRequest<T>(campaignId, path, { ...options, method: "PATCH", body });
}

/**
 * DELETE до campaign API (без body).
 * Якщо потрібен body (наприклад delete-by-level), використовуй campaignRequest.
 */
export async function campaignDelete<T>(
  campaignId: string,
  path: string,
  options: Omit<CampaignRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return campaignRequest<T>(campaignId, path, { ...options, method: "DELETE" });
}
