import { NextResponse } from "next/server";

import { deleteCredential, listCredentials, saveCredential, setDefaultModel } from "@/lib/ai/credentials";
import { isAiConfigured } from "@/lib/ai/crypto";
import { guarded } from "@/lib/ai/guarded";
import { verifyProviderKey } from "@/lib/ai/providers";
import { isKnownModel } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { aiProviderSchema, patchCredentialSchema, saveCredentialSchema } from "@/lib/schemas/ai";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
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

export const listCredentialsHandler = () =>
  guarded("list ai credentials", guardUser, async (auth) => NextResponse.json(await listCredentials(auth.userId)));

export const saveCredentialHandler = (req: Request, providerParam: string) =>
  guarded("save ai credential", () => guard(providerParam), async (g) => {
    const body = await parseBody(saveCredentialSchema, req);

    if (body instanceof NextResponse) return body;

    if (body.defaultModel && !isKnownModel(g.provider, body.defaultModel)) return errorResponse(API_ERRORS.AI_MODEL_UNKNOWN, 400);

    const verdict = await verifyProviderKey(g.provider, body.apiKey);

    if (verdict === "invalid") return errorResponse(API_ERRORS.AI_KEY_INVALID, 400);

    if (verdict === "unreachable") return errorResponse(API_ERRORS.AI_PROVIDER_DOWN, 502);

    return NextResponse.json(await saveCredential(g.userId, g.provider, body.apiKey, body.defaultModel ?? null));
  });

export const patchCredentialHandler = (req: Request, providerParam: string) =>
  guarded("patch ai credential", () => guard(providerParam), async (g) => {
    const body = await parseBody(patchCredentialSchema, req);

    if (body instanceof NextResponse) return body;

    if (body.defaultModel && !isKnownModel(g.provider, body.defaultModel)) return errorResponse(API_ERRORS.AI_MODEL_UNKNOWN, 400);

    const row = await setDefaultModel(g.userId, g.provider, body.defaultModel);

    return row ? NextResponse.json(row) : errorResponse(API_ERRORS.NOT_FOUND, 404);
  });

export const deleteCredentialHandler = (providerParam: string) =>
  guarded("delete ai credential", () => guard(providerParam), async (g) => {
    await deleteCredential(g.userId, g.provider);

    return NextResponse.json({ ok: true });
  });
