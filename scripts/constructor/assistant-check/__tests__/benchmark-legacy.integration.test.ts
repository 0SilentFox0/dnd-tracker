import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, it, vi } from "vitest";

import { createSyntheticCampaign, deleteSyntheticCampaign } from "@/fixtures/campaign.synthetic";
import { CONTENT_ACTIONS } from "@/lib/server/assistant/actions/content";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/server/assistant/runtime-effects", () => ({ ASSISTANT_EFFECT_HANDLERS: {} }));

for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) process.env[key] = singleConnectionDatabaseUrl(key);

type LegacyEvidence = { fixture: Awaited<ReturnType<typeof createSyntheticCampaign>>; intentId: string; expected: unknown; spellId: string };

it.skipIf(!isLocalDevDatabaseEnv())("confirms a persisted pre-extraction content intent without a replacement preview", async () => {
  const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } }, log: [] });

  const phase = process.env.S3_LEGACY_PHASE ?? "roundtrip";

  const manifest = path.resolve(".superpowers/sdd/2026-10-26-constructor-refactor-s3/legacy-pending.json");

  let evidence: LegacyEvidence | undefined;

  let retained = false;

  try {
    if (phase !== "confirm") {
      const fixture = await createSyntheticCampaign(db, "s3-legacy-json");

      evidence = { fixture, intentId: "", expected: null, spellId: "" };

      const spell = await db.spell.create({ data: { campaignId: fixture.campaignId, name: "Старий pending", type: "damage", damageType: "fire" } });

      evidence.spellId = spell.id;

      const caller: AssistantCaller = { actor: { campaignId: fixture.campaignId, userId: fixture.userId, isDM: true, via: "session", scopes: null }, channel: "chat", tokenId: null, threadId: fixture.threadId, locale: "uk" as const };

      const executor = createAssistantExecutor({ db, catalog: createActionCatalog(CONTENT_ACTIONS), effects: {} });

      const result = await executor.dispatchAction(caller, { actionId: "content.spells.update", requestId: randomUUID(), input: { id: spell.id, patch: { description: "Після extraction" } } });

      if (result.kind !== "pending") throw new Error("EXPECTED_PENDING");

      evidence.intentId = result.intent.id;
      evidence.expected = (await db.assistantIntent.findUniqueOrThrow({ where: { id: result.intent.id } })).expected;
      expect(evidence.expected).toMatchObject({ snapshot: expect.stringMatching(/^[a-f0-9]{64}$/) });

      if (phase === "prepare") {
        writeFileSync(manifest, JSON.stringify(evidence, null, 2));
        retained = true;

        return;
      }
    } else {
      evidence = JSON.parse(readFileSync(manifest, "utf8")) as LegacyEvidence;
      expect(evidence.fixture.marker.startsWith("assistant-s3-legacy-json-")).toBe(true);
    }

    if (!evidence) throw new Error("EXPECTED_LEGACY_EVIDENCE");

    const { fixture, intentId, expected, spellId } = evidence;

    const row = await db.assistantIntent.findUniqueOrThrow({ where: { id: intentId } });

    expect(row).toMatchObject({ campaignId: fixture.campaignId, userId: fixture.userId, status: "pending", expected });

    const executor = createAssistantExecutor({ db, catalog: createActionCatalog(CONTENT_ACTIONS), effects: {} });

    const actor = { campaignId: fixture.campaignId, userId: fixture.userId, isDM: true, via: "session", scopes: null } as const;

    const receipt = await executor.confirmIntent(actor, intentId);

    expect(receipt.status).toBe("applied");
    expect(await executor.confirmIntent(actor, intentId)).toEqual(receipt);
    expect(await db.assistantIntent.findUniqueOrThrow({ where: { id: intentId } })).toMatchObject({ expected });
    expect(await db.spell.findUniqueOrThrow({ where: { id: spellId } })).toMatchObject({ description: "Після extraction" });
    expect(await db.assistantReceipt.count({ where: { intentId } })).toBe(1);
  } finally {
    if (evidence && !retained) {
      await deleteSyntheticCampaign(db, evidence.fixture);
      expect(await db.campaign.count({ where: { id: evidence.fixture.campaignId } })).toBe(0);
      expect(await db.user.count({ where: { id: evidence.fixture.userId } })).toBe(0);
    }

    await db.$disconnect();
  }
});
