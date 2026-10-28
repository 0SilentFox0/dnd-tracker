import { getCampaignApiUrl } from "@/lib/api/api-helpers";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly body?: unknown,
    public readonly errorKey?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const issuePath = (issue: { path?: unknown; pathLabel?: unknown }): string =>
  typeof issue.pathLabel === "string" ? issue.pathLabel : Array.isArray(issue.path) ? issue.path.join(" › ") : "";

const issueMessage = (issue: unknown): string => {
  if (!issue || typeof issue !== "object" || typeof (issue as { message?: unknown }).message !== "string") {
    return JSON.stringify(issue);
  }

  const { message } = issue as { message: string };

  const where = issuePath(issue as { path?: unknown; pathLabel?: unknown });

  return where ? `${where}: ${message}` : message;
};

export function bodyErrorMessage(body: unknown, fallback: string): string {
  const { error, issues } = (body ?? {}) as { error?: unknown; issues?: unknown };

  const details = Array.isArray(issues) ? issues.map(issueMessage).join("; ") : "";

  if (typeof error === "string") return details ? `${error}: ${details}` : error;

  if (Array.isArray(error)) return error.map(issueMessage).join("; ");

  if (error != null && typeof error === "object") return JSON.stringify(error);

  return fallback;
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

export function setGlobalApiErrorHandler(handler: GlobalErrorHandler): void {
  globalErrorHandler = handler;
}

type RequestOptions = RequestInit & {
  parseResponse?: "json" | "text" | "none";
  /** сира відповідь до розбору тіла — для заголовків (Date) */
  onResponse?: (response: Response) => void;
};

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { parseResponse = "json", onResponse, ...fetchOptions } = options;

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  onResponse?.(response);

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
    let message = bodyErrorMessage(body, response.statusText);

    if (!message.trim()) {
      message = `HTTP ${response.status}`;
    }

    const payload: ApiErrorPayload = {
      status: response.status,
      message,
      url,
      body,
    };

    globalErrorHandler(payload);

    const errorKey = (body as { errorKey?: unknown } | null)?.errorKey;

    throw new ApiError(message, response.status, url, body, typeof errorKey === "string" ? errorKey : undefined);
  }

  if (parseResponse === "none") return undefined as T;

  if (parseResponse === "text") return text as T;

  return (body ?? null) as T;
}

type CampaignRequestOptions = Omit<RequestOptions, "body"> & { body?: unknown };

// for rare cases: another method, a DELETE body, special options
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

export async function campaignGet<T>(
  campaignId: string,
  path: string,
  options: Omit<CampaignRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return campaignRequest<T>(campaignId, path, { ...options, method: "GET" });
}

export async function campaignPost<T>(
  campaignId: string,
  path: string,
  body: unknown,
  options: Omit<CampaignRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return campaignRequest<T>(campaignId, path, { ...options, method: "POST", body });
}

export async function campaignPatch<T>(
  campaignId: string,
  path: string,
  body: unknown,
  options: Omit<CampaignRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return campaignRequest<T>(campaignId, path, { ...options, method: "PATCH", body });
}

export async function campaignPut<T>(
  campaignId: string,
  path: string,
  body: unknown,
  options: Omit<CampaignRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return campaignRequest<T>(campaignId, path, { ...options, method: "PUT", body });
}

export async function campaignDelete<T>(
  campaignId: string,
  path: string,
  options: Omit<CampaignRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return campaignRequest<T>(campaignId, path, { ...options, method: "DELETE" });
}

// CRUD for a campaign resource under one basePath; the 4th generic is the DELETE result
interface CampaignCrudApi<
  TEntity,
  TCreate,
  TUpdate = Partial<TCreate>,
  TDeleteResult = TEntity | void,
> {
  list(campaignId: string, options?: CampaignRequestOptions): Promise<TEntity[]>;
  get(campaignId: string, id: string, options?: CampaignRequestOptions): Promise<TEntity>;
  create(campaignId: string, data: TCreate): Promise<TEntity>;
  update(campaignId: string, id: string, data: TUpdate): Promise<TEntity>;
  remove(campaignId: string, id: string): Promise<TDeleteResult>;
}

export function createCampaignCrudApi<
  TEntity,
  TCreate,
  TUpdate = Partial<TCreate>,
  TDeleteResult = TEntity | void,
>(
  basePath: string,
  defaults: {
    listCache?: RequestCache;
    getCache?: RequestCache;
  } = {},
): CampaignCrudApi<TEntity, TCreate, TUpdate, TDeleteResult> {
  return {
    list(campaignId, options = {}) {
      const cache = options.cache ?? defaults.listCache;

      return campaignGet<TEntity[]>(
        campaignId,
        basePath,
        cache ? { ...options, cache } : options,
      );
    },
    get(campaignId, id, options = {}) {
      const cache = options.cache ?? defaults.getCache;

      return campaignGet<TEntity>(
        campaignId,
        `${basePath}/${id}`,
        cache ? { ...options, cache } : options,
      );
    },
    create(campaignId, data) {
      return campaignPost<TEntity>(campaignId, basePath, data);
    },
    update(campaignId, id, data) {
      return campaignPatch<TEntity>(campaignId, `${basePath}/${id}`, data);
    },
    remove(campaignId, id) {
      return campaignDelete<TDeleteResult>(campaignId, `${basePath}/${id}`);
    },
  };
}
