import { NextResponse } from "next/server";

import { deleteCredential, listCredentials, saveCredential, setDefaultModel } from "@/lib/ai/credentials";
import { isAiConfigured } from "@/lib/ai/crypto";
import { verifyProviderKey } from "@/lib/ai/providers";
import { isKnownModel } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { aiProviderSchema, patchCredentialSchema, saveCredentialSchema } from "@/lib/schemas/ai";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

async function guardUser() {
  if (!isAiConfigured()) return errorResponse(API_ERRORS.AI_NOT_CONFIGURED, 503);

  return requireAuth();
}

async function guard(providerParam: string) {
  const auth = await guardUser();

  if (auth instanceof NextResponse) return auth;

  const provider = aiProviderSchema.safeParse(providerParam);

  return provider.success ? { userId: auth.userId, provider: provider.data } : errorResponse(API_ERRORS.NOT_FOUND, 404);
}

export async function listCredentialsHandler() {
  try {
    const g = await guardUser();

    return g instanceof NextResponse ? g : NextResponse.json(await listCredentials(g.userId));
  } catch (error) {
    return handleApiError(error, { action: "list ai credentials" });
  }
}

export async function saveCredentialHandler(req: Request, providerParam: string) {
  try {
    const g = await guard(providerParam);

    if (g instanceof NextResponse) return g;

    const body = await parseBody(saveCredentialSchema, req);

    if (body instanceof NextResponse) return body;

    const provider = g.provider;

    if (body.defaultModel && !isKnownModel(provider, body.defaultModel)) return errorResponse(API_ERRORS.AI_MODEL_UNKNOWN, 400);

    const verdict = await verifyProviderKey(provider, body.apiKey);

    if (verdict === "invalid") return errorResponse(API_ERRORS.AI_KEY_INVALID, 400);

    if (verdict === "unreachable") return errorResponse(API_ERRORS.AI_PROVIDER_DOWN, 502);

    return NextResponse.json(await saveCredential(g.userId, provider, body.apiKey, body.defaultModel ?? null));
  } catch (error) {
    return handleApiError(error, { action: "save ai credential" });
  }
}

export async function patchCredentialHandler(req: Request, providerParam: string) {
  try {
    const g = await guard(providerParam);

    if (g instanceof NextResponse) return g;

    const body = await parseBody(patchCredentialSchema, req);

    if (body instanceof NextResponse) return body;

    if (body.defaultModel && !isKnownModel(g.provider, body.defaultModel)) return errorResponse(API_ERRORS.AI_MODEL_UNKNOWN, 400);

    const row = await setDefaultModel(g.userId, g.provider, body.defaultModel);

    return row ? NextResponse.json(row) : errorResponse(API_ERRORS.NOT_FOUND, 404);
  } catch (error) {
    return handleApiError(error, { action: "patch ai credential" });
  }
}

export async function deleteCredentialHandler(providerParam: string) {
  try {
    const g = await guard(providerParam);

    if (g instanceof NextResponse) return g;

    await deleteCredential(g.userId, g.provider);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "delete ai credential" });
  }
}
