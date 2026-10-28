# AI-асистент ДМ — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ДМ підключає власний ключ Claude / OpenAI / Gemini і отримує на сторінці сценарію AI-панель: співавтор, що пропонує правки (застосовуються лише після підтвердження), і швидкий живий чат із контекстом сцени; той самий реєстр інструментів відкрито як MCP-сервер `/api/mcp` за токеном кампанії.

**Architecture:** Серверне ядро в `lib/ai/*` (`server-only`): шифрування ключів (AES-256-GCM), фабрика провайдерів AI SDK, реєстр інструментів (Zod) з двома адаптерами (AI SDK `tool()` і MCP `registerTool`), збирач контексту, чат-пайплайн на `streamText` → UI message stream. Пропозиції правок — чиста логіка в `lib/utils/scenario/ai-ops.ts` + markdown-діалект без втрат (`lib/utils/scenario/markdown.ts`), стан у таблиці `ai_proposals`, застосування на сервері з перевіркою `before`. Клієнт: `lib/api/ai.ts` → хуки `lib/hooks/ai` → компоненти `components/ai`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Prisma 6 / Postgres, Zod 4, TanStack Query, `ai@7`, `@ai-sdk/react@4`, `@ai-sdk/anthropic|openai|google@4`, `mcp-handler@2` + `@modelcontextprotocol/server@2`, Vitest (+ happy-dom).

**Spec:** `docs/archive/superpowers/specs/2026-10-21-ai-assistant-design.md`

## Global Constraints

- Робота лише у worktree `/Users/silentfox/Work/dnd-tracker-ai` (гілка `feat/ai-assistant`); головну папку `/Users/silentfox/Work/dnd-tracker` не чіпати.
- Локальна БД `aiassistant`: один раз `./scripts/db/prodcopy-db.sh aiassistant` (з worktree), у `.env.local` worktree `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/aiassistant` і такий самий `DIRECT_URL`. Міграції — `pnpm exec prisma migrate dev --name <x>` лише проти неї, ніколи проти prod.
- Міграції expand-only; кожна `CREATE TABLE` має `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (тест `prisma/__tests__/migrations-rls.test.ts`).
- Тексти UI і помилок — українською (помилки API — `errorResponse` + `API_ERRORS`); ідентифікатори — англійською.
- API AI SDK 7 звіряти з `node_modules/ai/docs/` встановленої версії: у v7 `instructions` замість `system`, `isStepCount` (експортується й як `stepCountIs`), `toUIMessageStream({ stream: result.stream, … })` + `createUIMessageStreamResponse`, тести — `MockLanguageModelV4` з `ai/test`.
- `mcp-handler` 2.x: `createMcpHandler((server) => …)` повертає `(req: Request) => Promise<Response>`; `server.registerTool(name, { title, description, inputSchema: z.object(…) }, handler)`.
- Ключ провайдера ніколи не потрапляє у відповідь, лог, Pusher, текст помилки.
- Усі AI-маршрути кампанії — лише ДМ (`requireDM`); маршрути ключів — `requireAuth` (ключ належить користувачеві).
- Компоненти не імпортують `@/lib/api/*`; запити — `lib/api/ai.ts`, стан — хуки `lib/hooks/ai` (barrel `index.ts`), ключі запитів — фабрика `aiKeys` у `lib/hooks/ai/keys.ts` (без `"use client"`), нові ключі додати в `lib/hooks/__tests__/keys.test.ts`.
- `route.ts` тонкі: params → обробник у сусідньому `*-handlers.ts` або `lib/ai/*`.
- Діалоги — `ResponsiveDialog` (`hud`); підтвердження/повідомлення — `useConfirm`/`useNotify`; сторінки — `HudPage` + `HudPageHeader` + `HudCard`.
- Мінімум коментарів: лише неочевидне «чому», один рядок.
- ESLint: `simple-import-sort`, порожні рядки навколо `const`/`if`/`return` (`pnpm lint --fix`), без `console.log`, `react-hooks/exhaustive-deps` = error, `import/no-cycle`.
- Тести під час роботи — `pnpm test:related <files>` / `pnpm test:changed`; повний `pnpm test:run` лише в Task 19 (і після Task 1, бо змінюється `package.json`).
- Кожен коміт закінчується рядком `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Ключ провайдера з пробілами/переносом рядка при вставці** — очікується `trim()` перед перевіркою й шифруванням; `last4` з обрізаного ключа (Task 4, тест «ключ з пробілами»).
2. **Модель відповідає без виклику інструменту і вставляє «готовий текст» у чат** — не помилка: текст лишається повідомленням; пропозиція створюється тільки інструментом (Task 12, тест «лише текст → жодної пропозиції»).
3. **Пропозиція на сторінку, яку тим часом видалили** — `apply` → 404 зі зрозумілим текстом, статус лишається `pending`, не 500 (Task 9, тест «сторінки немає»).
4. **Тред, створений з провайдером, ключ якого потім видалили** — чат відповідає 400 «Додайте ключ …», а не 500 при розшифровці (Task 12, тест «ключ видалено»).
5. **Подвійний клік «Застосувати»** — друге застосування тієї ж пропозиції → 409 «вже застосовано», сторінка не змінюється вдруге (Task 9, тест «повторний apply»).

---

## File Structure

Нові файли:

```
lib/constants/ai.ts                         провайдери, режими, статуси, моделі, ліміти
types/ai.ts                                 типи домену
lib/schemas/ai.ts                           Zod-схеми тіл і ops
lib/ai/crypto.ts                            AES-256-GCM, ротація ключа
lib/ai/credentials.ts                       CRUD ключів, розшифровка для запиту
lib/ai/providers.ts                         createModel(provider, apiKey, modelId), verifyKey
lib/ai/errors.ts                            провайдерська помилка → український текст
lib/ai/tools/define.ts                      defineTool, AiToolContext, clip()
lib/ai/tools/scenario-read.ts               list_scenario_pages, read_scenario_page, search_scenario
lib/ai/tools/party.ts                       get_party, read_character
lib/ai/tools/show.ts                        get_show_state
lib/ai/tools/battle.ts                      get_battle_state
lib/ai/tools/reference.ts                   search_reference, read_reference
lib/ai/tools/propose.ts                     propose_scenario_edit
lib/ai/tools/index.ts                       AI_TOOLS, toAiSdkTools, registerMcpTools
lib/ai/proposals.ts                         створення/застосування/відхилення пропозицій
lib/ai/context/prompt.ts                    роль + режим + автоконтекст (бюджет)
lib/ai/threads.ts                           треди й повідомлення (БД)
lib/ai/chat/run-chat.ts                     пайплайн чату
lib/ai/api-tokens.ts                        генерація/перевірка/відкликання токенів
lib/utils/scenario/markdown.ts              markdown-діалект ↔ RichDoc
lib/utils/scenario/ai-ops.ts                resolveAiOps / applyAiOps
app/api/ai/credentials/route.ts             GET
app/api/ai/credentials/[provider]/route.ts  PUT PATCH DELETE
app/api/campaigns/[id]/ai/threads/route.ts                     GET POST
app/api/campaigns/[id]/ai/threads/[threadId]/route.ts          PATCH DELETE
app/api/campaigns/[id]/ai/threads/[threadId]/messages/route.ts GET
app/api/campaigns/[id]/ai/threads/[threadId]/chat/route.ts     POST (stream)
app/api/campaigns/[id]/ai/proposals/route.ts                   GET
app/api/campaigns/[id]/ai/proposals/[proposalId]/apply/route.ts POST
app/api/campaigns/[id]/ai/proposals/[proposalId]/reject/route.ts POST
app/api/campaigns/[id]/ai/ai-handlers.ts                        обробники маршрутів кампанії
app/api/campaigns/[id]/api-tokens/route.ts                     GET POST
app/api/campaigns/[id]/api-tokens/[tokenId]/route.ts           DELETE
app/api/mcp/route.ts                        MCP (GET POST DELETE)
lib/api/ai.ts                               клієнтські обгортки + createChatTransport
lib/hooks/ai/{keys,index,useAiCredentials,useAiThreads,useAiChat,useAiProposals,useApiTokens}.ts
app/settings/ai/{page.tsx,page-client.tsx}
app/campaigns/[id]/dm/ai/{page.tsx,page-client.tsx}
components/ai/{AiPanel,AiThreadHeader,AiMessageList,AiToolChip,AiComposer,AiProposalCard,AiProposalBadge,AiProviderCard,ApiTokenList,index}.tsx
```

Змінені: `package.json`, `prisma/schema.prisma`, `lib/constants/api-errors.ts`, `lib/supabase/middleware.ts`, `components/layout/Header.tsx`, `app/campaigns/[id]/dm/page.tsx` (посилання), `app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx`, `components/scenario/editor/ScenarioEditor.tsx`, `.env.example` (якщо є).

---

### Task 1: Залежності, константи, типи, схеми, тексти помилок

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `lib/constants/api-errors.ts`, `.env.example` (якщо файл існує)
- Create: `lib/constants/ai.ts`, `types/ai.ts`, `lib/schemas/ai.ts`
- Test: `lib/constants/__tests__/ai.test.ts`

**Interfaces:**
- Produces: `AI_PROVIDERS`, `AiProvider`, `AI_THREAD_MODES`, `AiThreadMode`, `AI_PROPOSAL_STATUSES`, `AI_MODELS`, `defaultModelFor(provider, mode)`, `isKnownModel(provider, id)`, `AI_LIMITS`; типи `AiCredentialSummary`, `AiThread`, `AiMessageMetadata`, `AiChatMessage`, `AiFocus`, `ScenarioAiOpInput`, `ScenarioAiOp`, `AiProposal`, `ApiTokenSummary`, `CreatedApiToken`; схеми `aiProviderSchema`, `saveCredentialSchema`, `patchCredentialSchema`, `createThreadSchema`, `patchThreadSchema`, `chatRequestSchema`, `scenarioAiOpInputSchema`, `createApiTokenSchema`.

- [ ] **Step 1: Встановити пакети**

```bash
cd /Users/silentfox/Work/dnd-tracker-ai
pnpm add ai@^7 @ai-sdk/react@^4 @ai-sdk/anthropic@^4 @ai-sdk/openai@^4 @ai-sdk/google@^4 mcp-handler@^2 @modelcontextprotocol/server@^2
```

Expected: lockfile оновлено, без peer-помилок (zod уже ^4.3.5, react 19.2.3).

- [ ] **Step 2: Підібрати ID моделей OpenAI і Gemini**

Відкрити `node_modules/@ai-sdk/openai/dist/index.d.ts` (тип `OpenAIResponsesModelId` / `OpenAIChatModelId`) і `node_modules/@ai-sdk/google/dist/index.d.ts` (`GoogleGenerativeAIModelId`). Для кожного провайдера взяти: `fast` — найновішу «mini/flash» модель зі списку; `smart` — найновішу флагманську (не preview, не audio/realtime/image). Вписати точні рядки в `AI_MODELS` у Step 4.

- [ ] **Step 3: Написати тест констант**

```ts
// lib/constants/__tests__/ai.test.ts
import { describe, expect, it } from "vitest";

import { AI_MODELS, AI_PROVIDERS, defaultModelFor, isKnownModel } from "@/lib/constants/ai";

describe("AI_MODELS", () => {
  it.each(AI_PROVIDERS)("%s: є fast і smart, id унікальні", (provider) => {
    const models = AI_MODELS[provider];

    expect(models.some((m) => m.tier === "fast")).toBe(true);
    expect(models.some((m) => m.tier === "smart")).toBe(true);
    expect(new Set(models.map((m) => m.id)).size).toBe(models.length);
  });

  it("live бере fast, scenario — smart", () => {
    expect(AI_MODELS.anthropic.find((m) => m.id === defaultModelFor("anthropic", "live"))?.tier).toBe("fast");
    expect(AI_MODELS.anthropic.find((m) => m.id === defaultModelFor("anthropic", "scenario"))?.tier).toBe("smart");
  });

  it("isKnownModel", () => {
    expect(isKnownModel("anthropic", "claude-sonnet-5-5")).toBe(true);
    expect(isKnownModel("anthropic", "gpt-x")).toBe(false);
  });
});
```

Run: `pnpm test:run lib/constants/__tests__/ai.test.ts` → FAIL (модуля немає).

- [ ] **Step 4: Константи**

```ts
// lib/constants/ai.ts
export const AI_PROVIDERS = ["anthropic", "openai", "google"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_THREAD_MODES = ["scenario", "live"] as const;
export type AiThreadMode = (typeof AI_THREAD_MODES)[number];

export const AI_PROPOSAL_STATUSES = ["pending", "applied", "rejected", "stale"] as const;

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = { anthropic: "Claude (Anthropic)", openai: "ChatGPT (OpenAI)", google: "Gemini (Google)" };

export const AI_MODE_LABELS: Record<AiThreadMode, string> = { scenario: "Співавтор", live: "Живий режим" };

export type AiModelOption = { id: string; label: string; tier: "fast" | "smart" };

// перший fast / перший smart у списку — дефолти; ID OpenAI/Gemini — з типів SDK (Task 1, Step 2)
export const AI_MODELS: Record<AiProvider, AiModelOption[]> = {
  anthropic: [
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", tier: "fast" },
    { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", tier: "smart" },
    { id: "claude-opus-5-5", label: "Claude Opus 5.5", tier: "smart" },
  ],
  openai: [
    { id: "<fast id зі Step 2>", label: "<назва>", tier: "fast" },
    { id: "<smart id зі Step 2>", label: "<назва>", tier: "smart" },
  ],
  google: [
    { id: "<fast id зі Step 2>", label: "<назва>", tier: "fast" },
    { id: "<smart id зі Step 2>", label: "<назва>", tier: "smart" },
  ],
};

export function defaultModelFor(provider: AiProvider, mode: AiThreadMode): string {
  const tier = mode === "live" ? "fast" : "smart";

  return AI_MODELS[provider].find((m) => m.tier === tier)!.id;
}

export const isKnownModel = (provider: AiProvider, id: string) => AI_MODELS[provider].some((m) => m.id === id);

export const AI_LIMITS = {
  messageChars: 8000,
  historyMessages: 30,
  fullToolResultsInLast: 6,
  toolResultChars: 24_000,
  contextChars: 40_000,
  maxSteps: 8,
  battleEvents: 10,
  searchHits: 20,
  threadTitleChars: 80,
} as const;

export const API_TOKEN_PREFIX = "dndt_";
export const API_TOKEN_SCOPES = ["ai"] as const;
```

Плейсхолдери `<…>` у `AI_MODELS` замінити реальними рядками зі Step 2 до коміту.

- [ ] **Step 5: Типи**

```ts
// types/ai.ts
import type { AiProvider, AiThreadMode } from "@/lib/constants/ai";
import type { RichDoc, ScenarioRow, ScenarioSection } from "@/types/scenario";

export type { AiProvider, AiThreadMode };

export type AiProposalStatus = "pending" | "applied" | "rejected" | "stale";

export interface AiCredentialSummary {
  provider: AiProvider;
  last4: string;
  defaultModel: string | null;
  updatedAt: string;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AiThread {
  id: string;
  mode: AiThreadMode;
  scenarioPageId: string | null;
  title: string;
  provider: AiProvider;
  model: string;
  updatedAt: string;
  usage: AiUsage;
}

export interface AiMessageMetadata {
  usage?: AiUsage;
  model?: string;
  error?: string;
}

/** Збережене повідомлення у форматі UIMessage AI SDK (parts як є). */
export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: unknown[];
  metadata?: AiMessageMetadata;
}

export interface AiFocus {
  pageId: string;
  sectionId?: string;
  rowIds?: string[];
}

export type ScenarioAiOpInput =
  | { op: "replaceRow"; sectionId: string; rowId: string; story?: string; notes?: string }
  | { op: "insertRow"; sectionId: string; afterRowId?: string; story: string; notes?: string }
  | { op: "addSection"; afterSectionId?: string; title: string; rows: { story: string; notes?: string }[] }
  | { op: "renameSection"; sectionId: string; title: string };

export type ScenarioAiOp =
  | { op: "replaceRow"; sectionId: string; rowId: string; story?: RichDoc; notes?: RichDoc; before: { story: RichDoc; notes: RichDoc } }
  | { op: "insertRow"; sectionId: string; afterRowId: string | null; row: ScenarioRow }
  | { op: "addSection"; afterSectionId: string | null; section: ScenarioSection }
  | { op: "renameSection"; sectionId: string; title: string; before: { title: string } };

export interface AiProposal {
  id: string;
  pageId: string;
  threadId: string | null;
  summary: string;
  ops: ScenarioAiOp[];
  status: AiProposalStatus;
  appliedVersion: number | null;
  createdAt: string;
}

export interface ApiTokenSummary {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreatedApiToken extends ApiTokenSummary {
  token: string;
}
```

- [ ] **Step 6: Схеми**

```ts
// lib/schemas/ai.ts
import { z } from "zod";

import { AI_LIMITS, AI_PROVIDERS, AI_THREAD_MODES } from "@/lib/constants/ai";

const id = z.string().min(1).max(40);

const markdown = z.string().max(20_000);

export const aiProviderSchema = z.enum(AI_PROVIDERS);

export const saveCredentialSchema = z.object({ apiKey: z.string().trim().min(10).max(500), defaultModel: z.string().max(100).nullish() });

export const patchCredentialSchema = z.object({ defaultModel: z.string().max(100).nullable() });

export const createThreadSchema = z.object({ mode: z.enum(AI_THREAD_MODES), scenarioPageId: id.nullish(), provider: aiProviderSchema, model: z.string().max(100).optional() });

export const patchThreadSchema = z
  .object({ title: z.string().trim().min(1).max(AI_LIMITS.threadTitleChars).optional(), provider: aiProviderSchema.optional(), model: z.string().max(100).optional() })
  .refine((b) => Object.keys(b).length > 0, { message: "Порожня зміна" });

export const aiFocusSchema = z.object({ pageId: id, sectionId: id.optional(), rowIds: z.array(id).max(20).optional() });

export const chatRequestSchema = z.object({ text: z.string().trim().min(1).max(AI_LIMITS.messageChars), focus: aiFocusSchema.optional() });

export const scenarioAiOpInputSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("replaceRow"), sectionId: id, rowId: id, story: markdown.optional(), notes: markdown.optional() }).refine((o) => o.story !== undefined || o.notes !== undefined, { message: "replaceRow: потрібне story або notes" }),
  z.object({ op: z.literal("insertRow"), sectionId: id, afterRowId: id.optional(), story: markdown, notes: markdown.optional() }),
  z.object({ op: z.literal("addSection"), afterSectionId: id.optional(), title: z.string().trim().min(1).max(200), rows: z.array(z.object({ story: markdown, notes: markdown.optional() })).min(1).max(30) }),
  z.object({ op: z.literal("renameSection"), sectionId: id, title: z.string().trim().min(1).max(200) }),
]);

export const proposeScenarioEditSchema = z.object({ pageId: id, summary: z.string().trim().min(1).max(300), ops: z.array(scenarioAiOpInputSchema).min(1).max(30) });

export const createApiTokenSchema = z.object({ name: z.string().trim().min(1).max(60) });
```

- [ ] **Step 7: Тексти помилок** — додати в `API_ERRORS` (`lib/constants/api-errors.ts`) після `SCENARIO_*`:

```ts
  AI_NOT_CONFIGURED: "AI-асистент не налаштований на сервері",
  AI_KEY_INVALID: "Ключ недійсний або відкликаний",
  AI_KEY_MISSING: "Додайте ключ цього провайдера в «Налаштування → AI»",
  AI_RATE_LIMIT: "Ліміт провайдера, спробуйте за хвилину",
  AI_PROVIDER_DOWN: "Провайдер недоступний, спробуйте пізніше",
  AI_MODEL_UNKNOWN: "Невідома модель для цього провайдера",
  AI_THREAD_NOT_FOUND: "Тред не знайдено",
  AI_PROPOSAL_NOT_FOUND: "Пропозицію не знайдено",
  AI_PROPOSAL_STALE: "Фрагмент змінився після пропозиції — попросіть AI переробити її",
  AI_PROPOSAL_DONE: "Пропозицію вже застосовано або відхилено",
  API_TOKEN_NOT_FOUND: "Токен не знайдено",
```

- [ ] **Step 8: env-приклад** — якщо є `.env.example`, додати рядки `AI_KEYS_SECRET=` (коментар: `openssl rand -base64 32`) і `AI_KEYS_SECRET_PREV=`. У `.env.local` worktree вписати згенерований `AI_KEYS_SECRET`.

- [ ] **Step 9: Тести** — `pnpm test:run lib/constants/__tests__/ai.test.ts` → PASS; потім повний `pnpm test:run` (змінились залежності) → PASS; `pnpm exec tsc --noEmit` → без помилок.

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml lib/constants/ai.ts lib/constants/__tests__/ai.test.ts types/ai.ts lib/schemas/ai.ts lib/constants/api-errors.ts .env.example 2>/dev/null
git commit -m "feat(ai): deps, constants, types and schemas for the AI assistant

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Prisma-схема і міграція

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_ai_assistant/migration.sql` (генерує Prisma)
- Test: `prisma/__tests__/migrations-rls.test.ts` (наявний)

**Interfaces:**
- Produces: Prisma-моделі `AiCredential`, `AiThread`, `AiMessage`, `AiProposal`, `ApiToken` (делегати `prisma.aiCredential`, `prisma.aiThread`, `prisma.aiMessage`, `prisma.aiProposal`, `prisma.apiToken`).

- [ ] **Step 1: Моделі** — додати в кінець `prisma/schema.prisma`:

```prisma
model AiCredential {
  id           String   @id @default(cuid())
  userId       String
  provider     String
  ciphertext   String
  iv           String
  authTag      String
  keyVersion   Int      @default(1)
  last4        String
  defaultModel String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
  @@map("ai_credentials")
}

model AiThread {
  id             String        @id @default(cuid())
  campaignId     String
  userId         String
  mode           String
  scenarioPageId String?
  title          String
  provider       String
  model          String
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  campaign       Campaign      @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  scenarioPage   ScenarioPage? @relation(fields: [scenarioPageId], references: [id], onDelete: SetNull)
  messages       AiMessage[]
  proposals      AiProposal[]

  @@index([campaignId, userId, updatedAt])
  @@map("ai_threads")
}

model AiMessage {
  id        String   @id @default(cuid())
  threadId  String
  seq       Int
  role      String
  parts     Json
  metadata  Json     @default("{}")
  createdAt DateTime @default(now())
  thread    AiThread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  @@unique([threadId, seq])
  @@map("ai_messages")
}

model AiProposal {
  id             String       @id @default(cuid())
  campaignId     String
  threadId       String?
  pageId         String
  summary        String
  ops            Json
  status         String       @default("pending")
  appliedVersion Int?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  campaign       Campaign     @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  thread         AiThread?    @relation(fields: [threadId], references: [id], onDelete: SetNull)
  page           ScenarioPage @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@index([pageId, status])
  @@map("ai_proposals")
}

model ApiToken {
  id         String    @id @default(cuid())
  campaignId String
  userId     String
  name       String
  tokenHash  String    @unique
  prefix     String
  scopes     String[]
  lastUsedAt DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())
  campaign   Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([campaignId])
  @@map("api_tokens")
}
```

Зворотні зв'язки: у `User` — `aiCredentials AiCredential[]`; у `Campaign` — `aiThreads AiThread[]`, `aiProposals AiProposal[]`, `apiTokens ApiToken[]`; у `ScenarioPage` — `aiThreads AiThread[]`, `aiProposals AiProposal[]`.

- [ ] **Step 2: Міграція**

```bash
pnpm exec prisma migrate dev --name ai_assistant
```

Відкрити згенерований `migration.sql` і після кожного `CREATE TABLE "<t>" (...)` додати `ALTER TABLE "<t>" ENABLE ROW LEVEL SECURITY;` для `ai_credentials`, `ai_threads`, `ai_messages`, `ai_proposals`, `api_tokens`. Застосувати повторно: `pnpm exec prisma migrate reset --skip-seed` НЕ запускати (знищить копію) — натомість виконати ці 5 `ALTER` вручну проти `aiassistant`: `psql postgresql://postgres:postgres@localhost:54322/aiassistant -c 'ALTER TABLE "ai_credentials" ENABLE ROW LEVEL SECURITY; …'` і перевірити `pnpm exec prisma migrate status` → «Database schema is up to date» (checksum зміниться — якщо Prisma скаржиться на змінену міграцію, створити міграцію з `--create-only`, дописати RLS, потім `pnpm exec prisma migrate dev`; надійніше одразу так: `pnpm exec prisma migrate dev --create-only --name ai_assistant` → редагувати → `pnpm exec prisma migrate dev`).

- [ ] **Step 3: Тест RLS** — `pnpm test:run prisma/__tests__/migrations-rls.test.ts` → PASS.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(ai): ai_credentials, ai_threads, ai_messages, ai_proposals, api_tokens tables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Шифрування ключів

**Files:**
- Create: `lib/ai/crypto.ts`
- Test: `lib/ai/__tests__/crypto.test.ts`

**Interfaces:**
- Produces: `isAiConfigured(): boolean`, `encryptSecret(plain: string): EncryptedSecret`, `decryptSecret(s: EncryptedSecret): string`, `type EncryptedSecret = { ciphertext: string; iv: string; authTag: string; keyVersion: number }`, `class AiNotConfiguredError`.

- [ ] **Step 1: Тест**

```ts
// lib/ai/__tests__/crypto.test.ts
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const key = () => randomBytes(32).toString("base64");

describe("ai crypto", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AI_KEYS_SECRET", key());
  });

  afterEach(() => vi.unstubAllEnvs());

  it("повний цикл", async () => {
    const { decryptSecret, encryptSecret } = await import("@/lib/ai/crypto");

    const enc = encryptSecret("sk-ant-secret-1234");

    expect(enc.ciphertext).not.toContain("secret");
    expect(enc.keyVersion).toBe(1);
    expect(decryptSecret(enc)).toBe("sk-ant-secret-1234");
  });

  it("різний iv для однакового тексту", async () => {
    const { encryptSecret } = await import("@/lib/ai/crypto");

    expect(encryptSecret("x").iv).not.toBe(encryptSecret("x").iv);
  });

  it("підроблений authTag → помилка", async () => {
    const { decryptSecret, encryptSecret } = await import("@/lib/ai/crypto");

    const enc = encryptSecret("abc");

    expect(() => decryptSecret({ ...enc, authTag: Buffer.alloc(16).toString("base64") })).toThrow();
  });

  it("keyVersion 0 розшифровується AI_KEYS_SECRET_PREV", async () => {
    const prev = key();

    vi.stubEnv("AI_KEYS_SECRET", prev);

    const old = (await import("@/lib/ai/crypto")).encryptSecret("old-key");

    vi.resetModules();
    vi.stubEnv("AI_KEYS_SECRET", key());
    vi.stubEnv("AI_KEYS_SECRET_PREV", prev);

    const { decryptSecret } = await import("@/lib/ai/crypto");

    expect(decryptSecret({ ...old, keyVersion: 0 })).toBe("old-key");
  });

  it("без AI_KEYS_SECRET — isAiConfigured false і encrypt кидає AiNotConfiguredError", async () => {
    vi.stubEnv("AI_KEYS_SECRET", "");

    const { AiNotConfiguredError, encryptSecret, isAiConfigured } = await import("@/lib/ai/crypto");

    expect(isAiConfigured()).toBe(false);
    expect(() => encryptSecret("x")).toThrow(AiNotConfiguredError);
  });
});
```

Run: `pnpm test:run lib/ai/__tests__/crypto.test.ts` → FAIL.

- [ ] **Step 2: Реалізація**

```ts
// lib/ai/crypto.ts
import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedSecret = { ciphertext: string; iv: string; authTag: string; keyVersion: number };

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI_KEYS_SECRET is not set");
    this.name = "AiNotConfiguredError";
  }
}

const CURRENT_VERSION = 1;

// version 0 = the previous master key during a rotation; rows are re-encrypted on the next save
function masterKey(version: number): Buffer {
  const raw = version === CURRENT_VERSION ? process.env.AI_KEYS_SECRET : process.env.AI_KEYS_SECRET_PREV;

  const buf = raw ? Buffer.from(raw, "base64") : null;

  if (!buf || buf.length !== 32) throw new AiNotConfiguredError();

  return buf;
}

export function isAiConfigured(): boolean {
  try {
    masterKey(CURRENT_VERSION);

    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plain: string): EncryptedSecret {
  const iv = randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", masterKey(CURRENT_VERSION), iv);

  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64"), keyVersion: CURRENT_VERSION };
}

export function decryptSecret(s: EncryptedSecret): string {
  const decipher = createDecipheriv("aes-256-gcm", masterKey(s.keyVersion), Buffer.from(s.iv, "base64"));

  decipher.setAuthTag(Buffer.from(s.authTag, "base64"));

  return Buffer.concat([decipher.update(Buffer.from(s.ciphertext, "base64")), decipher.final()]).toString("utf8");
}
```

Ротація: при ротації старий секрет переноситься в `AI_KEYS_SECRET_PREV`, а наявні рядки оновлюються одноразовим SQL `UPDATE ai_credentials SET "keyVersion" = 0` перед заміною `AI_KEYS_SECRET` (записати це одним рядком у `docs/DATABASE-SYNC.md`? — ні, у розділ «Розгортання» спеки вже є; тут нічого не дописувати).

- [ ] **Step 3: Тести** → PASS. **Step 4: Commit** `feat(ai): AES-256-GCM encryption for provider keys`.

---

### Task 4: Ключі провайдерів — сховище, перевірка, маршрути

**Files:**
- Create: `lib/ai/providers.ts`, `lib/ai/credentials.ts`, `lib/ai/errors.ts`, `app/api/ai/credentials/route.ts`, `app/api/ai/credentials/[provider]/route.ts`, `app/api/ai/credentials/credential-handlers.ts`
- Test: `lib/ai/__tests__/errors.test.ts`, `app/api/__tests__/ai-credentials-api.test.ts`

**Interfaces:**
- Consumes: `encryptSecret`, `decryptSecret`, `isAiConfigured`, `AiNotConfiguredError` (Task 3); схеми Task 1.
- Produces:
  - `createModel(provider: AiProvider, apiKey: string, modelId: string): LanguageModel` (тип з `ai`)
  - `verifyProviderKey(provider: AiProvider, apiKey: string): Promise<"ok" | "invalid" | "unreachable">`
  - `listCredentials(userId): Promise<AiCredentialSummary[]>`, `saveCredential(userId, provider, apiKey, defaultModel?)`, `setDefaultModel(userId, provider, model | null)`, `deleteCredential(userId, provider)`, `loadApiKey(userId, provider): Promise<string | null>`
  - `aiErrorMessage(error: unknown): string` і `aiErrorStatus(error: unknown): number`

- [ ] **Step 1: Тест мапінгу помилок**

```ts
// lib/ai/__tests__/errors.test.ts
import { APICallError } from "ai";
import { describe, expect, it } from "vitest";

import { aiErrorMessage } from "@/lib/ai/errors";
import { API_ERRORS } from "@/lib/constants/api-errors";

const callError = (statusCode: number, body = "") => new APICallError({ message: `boom sk-ant-SECRET ${body}`, url: "https://api", requestBodyValues: {}, statusCode, responseBody: body, isRetryable: false });

describe("aiErrorMessage", () => {
  it.each([
    [401, API_ERRORS.AI_KEY_INVALID],
    [403, API_ERRORS.AI_KEY_INVALID],
    [429, API_ERRORS.AI_RATE_LIMIT],
    [500, API_ERRORS.AI_PROVIDER_DOWN],
    [529, API_ERRORS.AI_PROVIDER_DOWN],
  ])("%i → текст", (code, text) => {
    expect(aiErrorMessage(callError(code))).toBe(text);
  });

  it("невідома помилка → провайдер недоступний, без тексту оригіналу", () => {
    const msg = aiErrorMessage(new Error("socket hang up sk-ant-SECRET"));

    expect(msg).toBe(API_ERRORS.AI_PROVIDER_DOWN);
    expect(msg).not.toContain("SECRET");
  });
});
```

- [ ] **Step 2: Реалізація `errors.ts`**

```ts
// lib/ai/errors.ts
import "server-only";

import { APICallError } from "ai";

import { API_ERRORS } from "@/lib/constants/api-errors";

// never echo provider error text: it may quote the request, including the key
export function aiErrorMessage(error: unknown): string {
  const status = APICallError.isInstance(error) ? error.statusCode : undefined;

  if (status === 401 || status === 403) return API_ERRORS.AI_KEY_INVALID;

  if (status === 429) return API_ERRORS.AI_RATE_LIMIT;

  return API_ERRORS.AI_PROVIDER_DOWN;
}

export function aiErrorStatus(error: unknown): number {
  const status = APICallError.isInstance(error) ? error.statusCode : undefined;

  return status === 401 || status === 403 ? 400 : status === 429 ? 429 : 502;
}
```

- [ ] **Step 3: `providers.ts`**

```ts
// lib/ai/providers.ts
import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import type { AiProvider } from "@/lib/constants/ai";

export function createModel(provider: AiProvider, apiKey: string, modelId: string): LanguageModel {
  if (provider === "anthropic") return createAnthropic({ apiKey })(modelId);

  if (provider === "openai") return createOpenAI({ apiKey })(modelId);

  return createGoogleGenerativeAI({ apiKey })(modelId);
}

// listing models is free on all three providers and fails fast on a bad key
const VERIFY: Record<AiProvider, (key: string) => Request> = {
  anthropic: (key) => new Request("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01" } }),
  openai: (key) => new Request("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${key}` } }),
  google: (key) => new Request("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { headers: { "x-goog-api-key": key } }),
};

export async function verifyProviderKey(provider: AiProvider, apiKey: string): Promise<"ok" | "invalid" | "unreachable"> {
  try {
    const res = await fetch(VERIFY[provider](apiKey), { signal: AbortSignal.timeout(10_000), cache: "no-store" });

    if (res.ok) return "ok";

    return res.status === 401 || res.status === 403 || res.status === 400 ? "invalid" : "unreachable";
  } catch {
    return "unreachable";
  }
}
```

Перевірити в `node_modules/@ai-sdk/google` точну назву фабрики (`createGoogleGenerativeAI`) і що виклик провайдера як функції повертає мовну модель у v4-пакетах (`node_modules/@ai-sdk/anthropic/docs` або README); якщо в v4 мовна модель береться через `.languageModel(id)`, використати її.

- [ ] **Step 4: `credentials.ts`**

```ts
// lib/ai/credentials.ts
import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/ai/crypto";
import type { AiProvider } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import type { AiCredentialSummary } from "@/types/ai";

const SUMMARY = { provider: true, last4: true, defaultModel: true, updatedAt: true } as const;

const toSummary = (r: { provider: string; last4: string; defaultModel: string | null; updatedAt: Date }): AiCredentialSummary => ({
  provider: r.provider as AiProvider,
  last4: r.last4,
  defaultModel: r.defaultModel,
  updatedAt: r.updatedAt.toISOString(),
});

export async function listCredentials(userId: string): Promise<AiCredentialSummary[]> {
  const rows = await prisma.aiCredential.findMany({ where: { userId }, select: SUMMARY, orderBy: { provider: "asc" } });

  return rows.map(toSummary);
}

export async function saveCredential(userId: string, provider: AiProvider, apiKey: string, defaultModel: string | null): Promise<AiCredentialSummary> {
  const enc = encryptSecret(apiKey);

  const data = { ...enc, last4: apiKey.slice(-4), defaultModel };

  const row = await prisma.aiCredential.upsert({ where: { userId_provider: { userId, provider } }, create: { userId, provider, ...data }, update: data, select: SUMMARY });

  return toSummary(row);
}

export async function setDefaultModel(userId: string, provider: AiProvider, defaultModel: string | null): Promise<AiCredentialSummary | null> {
  const { count } = await prisma.aiCredential.updateMany({ where: { userId, provider }, data: { defaultModel } });

  if (count === 0) return null;

  const row = await prisma.aiCredential.findUnique({ where: { userId_provider: { userId, provider } }, select: SUMMARY });

  return row && toSummary(row);
}

export async function deleteCredential(userId: string, provider: AiProvider): Promise<void> {
  await prisma.aiCredential.deleteMany({ where: { userId, provider } });
}

export async function loadApiKey(userId: string, provider: AiProvider): Promise<string | null> {
  const row = await prisma.aiCredential.findUnique({ where: { userId_provider: { userId, provider } }, select: { ciphertext: true, iv: true, authTag: true, keyVersion: true } });

  return row ? decryptSecret(row) : null;
}
```

- [ ] **Step 5: Обробники і маршрути**

```ts
// app/api/ai/credentials/credential-handlers.ts
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

async function guard(providerParam?: string) {
  if (!isAiConfigured()) return errorResponse(API_ERRORS.AI_NOT_CONFIGURED, 503);

  const auth = await requireAuth();

  if (auth instanceof NextResponse) return auth;

  if (providerParam === undefined) return { userId: auth.userId, provider: null };

  const provider = aiProviderSchema.safeParse(providerParam);

  return provider.success ? { userId: auth.userId, provider: provider.data } : errorResponse(API_ERRORS.NOT_FOUND, 404);
}

export async function listCredentialsHandler() {
  try {
    const g = await guard();

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

    const provider = g.provider!;

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

    if (body.defaultModel && !isKnownModel(g.provider!, body.defaultModel)) return errorResponse(API_ERRORS.AI_MODEL_UNKNOWN, 400);

    const row = await setDefaultModel(g.userId, g.provider!, body.defaultModel);

    return row ? NextResponse.json(row) : errorResponse(API_ERRORS.NOT_FOUND, 404);
  } catch (error) {
    return handleApiError(error, { action: "patch ai credential" });
  }
}

export async function deleteCredentialHandler(providerParam: string) {
  try {
    const g = await guard(providerParam);

    if (g instanceof NextResponse) return g;

    await deleteCredential(g.userId, g.provider!);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "delete ai credential" });
  }
}
```

```ts
// app/api/ai/credentials/route.ts
import { listCredentialsHandler } from "./credential-handlers";

export async function GET() {
  return listCredentialsHandler();
}
```

```ts
// app/api/ai/credentials/[provider]/route.ts
import { deleteCredentialHandler, patchCredentialHandler, saveCredentialHandler } from "../credential-handlers";

type Params = { params: Promise<{ provider: string }> };

export async function PUT(req: Request, { params }: Params) {
  return saveCredentialHandler(req, (await params).provider);
}

export async function PATCH(req: Request, { params }: Params) {
  return patchCredentialHandler(req, (await params).provider);
}

export async function DELETE(_req: Request, { params }: Params) {
  return deleteCredentialHandler((await params).provider);
}
```

- [ ] **Step 6: Тест API** (моки за зразком `app/api/__tests__/scenario-pages-api.test.ts`)

```ts
// app/api/__tests__/ai-credentials-api.test.ts
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/ai/providers", () => ({ verifyProviderKey: vi.fn(async () => "ok") }));
vi.mock("@/lib/db", () => ({
  prisma: { aiCredential: { findMany: vi.fn(), upsert: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() } },
}));

const req = (method: string, body?: unknown) => new Request("http://x", { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const params = (provider: string) => ({ params: Promise.resolve({ provider }) }) as never;

const route = () => import("@/app/api/ai/credentials/[provider]/route");

describe("AI credentials API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_KEYS_SECRET", randomBytes(32).toString("base64"));
    vi.mocked(apiAuth.requireAuth).mockResolvedValue({ userId: "u1" });
    vi.mocked(prisma.aiCredential.upsert).mockImplementation((async ({ create }: { create: Record<string, unknown> }) => ({ ...create, updatedAt: new Date() })) as never);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("без сесії — 401", async () => {
    vi.mocked(apiAuth.requireAuth).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 401 }));

    const { PUT } = await route();

    expect((await PUT(req("PUT", { apiKey: "sk-ant-1234567890" }), params("anthropic"))).status).toBe(401);
  });

  it("ключ з пробілами: trim, last4 з обрізаного, у відповіді немає ключа і шифротексту", async () => {
    const { PUT } = await route();

    const res = await PUT(req("PUT", { apiKey: "  sk-ant-abcdefgh9876 \n" }), params("anthropic"));

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.last4).toBe("9876");
    expect(JSON.stringify(body)).not.toContain("sk-ant");
    expect(body).not.toHaveProperty("ciphertext");

    const create = vi.mocked(prisma.aiCredential.upsert).mock.calls[0][0].create as Record<string, unknown>;

    expect(create.ciphertext).toBeTypeOf("string");
    expect(JSON.stringify(create)).not.toContain("abcdefgh");
  });

  it("невалідний ключ — 400, нічого не збережено", async () => {
    const { verifyProviderKey } = await import("@/lib/ai/providers");

    vi.mocked(verifyProviderKey).mockResolvedValueOnce("invalid");

    const { PUT } = await route();

    expect((await PUT(req("PUT", { apiKey: "sk-ant-1234567890" }), params("anthropic"))).status).toBe(400);
    expect(prisma.aiCredential.upsert).not.toHaveBeenCalled();
  });

  it("невідомий провайдер — 404", async () => {
    const { PUT } = await route();

    expect((await PUT(req("PUT", { apiKey: "sk-ant-1234567890" }), params("mistral"))).status).toBe(404);
  });

  it("невідома модель — 400", async () => {
    const { PUT } = await route();

    expect((await PUT(req("PUT", { apiKey: "sk-ant-1234567890", defaultModel: "gpt-x" }), params("anthropic"))).status).toBe(400);
  });

  it("без AI_KEYS_SECRET — 503", async () => {
    vi.stubEnv("AI_KEYS_SECRET", "");

    const { PUT } = await route();

    expect((await PUT(req("PUT", { apiKey: "sk-ant-1234567890" }), params("anthropic"))).status).toBe(503);
  });
});
```

- [ ] **Step 7: Run** `pnpm test:run lib/ai/__tests__/errors.test.ts app/api/__tests__/ai-credentials-api.test.ts` → PASS.
- [ ] **Step 8: Commit** `feat(ai): provider key storage, verification and credential routes`.

---

### Task 5: Markdown-діалект сценарію ↔ RichDoc

**Files:**
- Create: `lib/utils/scenario/markdown.ts`
- Test: `lib/utils/scenario/__tests__/markdown.test.ts`

**Interfaces:**
- Produces: `docToMarkdown(doc: RichDoc): string`, `markdownToDoc(md: string): RichDoc`, `isLosslessDoc(doc: RichDoc): boolean`, `canonicalJson(value: unknown): string`.

Діалект (повністю):
- Блоки розділені порожнім рядком. `### текст` — `heading` (level 3, єдиний рівень редактора).
- Абзац — рядки тексту; `hardBreak` — `\` у кінці рядка.
- `- пункт` — `bulletList`, `1. пункт` — `orderedList`; пункт = один абзац (вкладені списки й кілька абзаців у пункті — не підтримуються → `isLosslessDoc` = false).
- `:::read` … `:::` — `readAloud` (абзаци всередині). `:::say` … `:::` — `say` (один рядок інлайну). `:::callout kind="event" tag="Подія"` … `:::` — `callout` з вкладеними блоками; фенси вкладаються.
- GFM-таблиця: перший рядок — `tableHeader`, далі `tableCell`; клітинка = один абзац інлайну без `hardBreak`.
- Інлайн: `**жирний**`, `_курсив_` (парсер приймає й `*курсив*`), `||секрет||`; марки відкриваються/закриваються стеком, тож суміжні вузли з різними марками серіалізуються без неоднозначності. `[@Ім'я](character:id)` — `mention` (`type` з `MENTION_TYPES`). `{{token:red}}` / `{{token:green}}` — `token`. Спецсимволи `\ * _ | [ ] { }` у тексті екрануються `\`.
- Порожні абзаци відкидаються (нормалізація з обох боків).

- [ ] **Step 1: Тест**

```ts
// lib/utils/scenario/__tests__/markdown.test.ts
import { describe, expect, it } from "vitest";

import { canonicalJson, docToMarkdown, isLosslessDoc, markdownToDoc } from "@/lib/utils/scenario/markdown";
import type { RichDoc, RichNode } from "@/types/scenario";

const t = (text: string, ...marks: string[]): RichNode => ({ type: "text", text, ...(marks.length && { marks: marks.map((type) => ({ type: type as "bold" })) }) });

const p = (...content: RichNode[]): RichNode => ({ type: "paragraph", content });

const doc = (...content: RichNode[]): RichDoc => ({ type: "doc", content });

const roundTrip = (d: RichDoc) => expect(canonicalJson(markdownToDoc(docToMarkdown(d)))).toBe(canonicalJson(d));

describe("scenario markdown", () => {
  it("абзаци, жирний, курсив, секрет", () => {
    const d = doc(p(t("Дзвони "), t("б'ють", "bold"), t(" і "), t("тиша", "italic", "secret")), p(t("Другий")));

    expect(docToMarkdown(d)).toBe("Дзвони **б'ють** і ||_тиша_||\n\nДругий");
    roundTrip(d);
  });

  it("суміжні вузли з різними марками", () => {
    roundTrip(doc(p(t("a", "bold"), t("b", "bold", "italic"), t("c", "italic"))));
  });

  it("hardBreak, заголовок, списки", () => {
    roundTrip(doc({ type: "heading", attrs: { level: 3 }, content: [t("Собор")] }, p(t("рядок1"), { type: "hardBreak" }, t("рядок2"))));
    roundTrip(doc({ type: "bulletList", content: [{ type: "listItem", content: [p(t("один"))] }, { type: "listItem", content: [p(t("два", "bold"))] }] }));
    roundTrip(doc({ type: "orderedList", attrs: { start: 1 }, content: [{ type: "listItem", content: [p(t("перший"))] }] }));
  });

  it("readAloud, say, callout з вкладеннями", () => {
    roundTrip(doc({ type: "readAloud", content: [p(t("Вітер виє."))] }, { type: "say", content: [t("— Стійте!")] }));
    roundTrip(doc({ type: "callout", attrs: { kind: "check", tag: "Перевірка" }, content: [p(t("DC 14")), { type: "readAloud", content: [p(t("Ви чуєте кроки"))] }] }));
  });

  it("згадка і жетон, марки на атомах", () => {
    const mention: RichNode = { type: "mention", attrs: { id: "c1", label: "Годрик", type: "character" } };

    roundTrip(doc(p(t("Це "), mention, t(" і "), { type: "token", attrs: { color: "red" } })));
    roundTrip(doc(p({ ...mention, marks: [{ type: "secret" }] })));
    expect(docToMarkdown(doc(p(mention)))).toBe("[@Годрик](character:c1)");
  });

  it("таблиця", () => {
    const cell = (type: "tableHeader" | "tableCell", text: string): RichNode => ({ type, attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [p(t(text))] });

    const d = doc({ type: "table", content: [{ type: "tableRow", content: [cell("tableHeader", "Кидок"), cell("tableHeader", "Наслідок")] }, { type: "tableRow", content: [cell("tableCell", "1|2"), cell("tableCell", "провал")] }] });

    roundTrip(d);
    expect(isLosslessDoc(d)).toBe(true);
  });

  it("екранування спецсимволів", () => {
    roundTrip(doc(p(t("a*b_c|d[e]{f}\\g"))));
  });

  it("парсер приймає *курсив* від моделі", () => {
    expect(canonicalJson(markdownToDoc("*тихо*"))).toBe(canonicalJson(doc(p(t("тихо", "italic")))));
  });

  it("порожній документ і порожні абзаци", () => {
    expect(docToMarkdown(doc())).toBe("");
    expect(canonicalJson(markdownToDoc(""))).toBe(canonicalJson(doc()));
    expect(isLosslessDoc(doc(p(), p(t("x"))))).toBe(true);
  });

  it("вкладений список і кілька абзаців у пункті — не lossless", () => {
    expect(isLosslessDoc(doc({ type: "bulletList", content: [{ type: "listItem", content: [p(t("a")), p(t("b"))] }] }))).toBe(false);
    expect(isLosslessDoc(doc({ type: "bulletList", content: [{ type: "listItem", content: [p(t("a")), { type: "bulletList", content: [{ type: "listItem", content: [p(t("b"))] }] }] }] }))).toBe(false);
  });

  it("невідомий синтаксис від моделі лишається текстом", () => {
    expect(canonicalJson(markdownToDoc("# Великий"))).toBe(canonicalJson(doc(p(t("# Великий")))));
  });
});
```

Run → FAIL.

- [ ] **Step 2: Реалізація**

```ts
// lib/utils/scenario/markdown.ts
import { CALLOUT_KINDS, MENTION_TYPES } from "@/lib/constants/scenario";
import type { RichDoc, RichMark, RichMarkType, RichNode } from "@/types/scenario";

// a fixed opening order keeps the serialization of a mark set deterministic
const MARK_ORDER: RichMarkType[] = ["secret", "bold", "italic"];

const MARK_TOKEN: Record<RichMarkType, string> = { secret: "||", bold: "**", italic: "_" };

const ESCAPE = /[\\*_|[\]{}]/g;

const escapeText = (s: string) => s.replace(ESCAPE, (c) => `\\${c}`);

const markSet = (n: RichNode) => new Set((n.marks ?? []).map((m) => m.type));

function inlineToMd(nodes: RichNode[]): string {
  const open: RichMarkType[] = [];

  let out = "";

  const closeTo = (keep: Set<RichMarkType>) => {
    while (open.length && !open.every((m) => keep.has(m))) out += MARK_TOKEN[open.pop()!];
  };

  for (const n of nodes) {
    const want = markSet(n);

    closeTo(want);

    for (const m of MARK_ORDER) {
      if (want.has(m) && !open.includes(m)) {
        open.push(m);
        out += MARK_TOKEN[m];
      }
    }

    if (n.type === "text") out += escapeText(n.text ?? "");
    else if (n.type === "hardBreak") out += "\\\n";
    else if (n.type === "mention") out += `[@${escapeText(String(n.attrs?.label ?? ""))}](${String(n.attrs?.type ?? "character")}:${String(n.attrs?.id ?? "")})`;
    else if (n.type === "token") out += `{{token:${n.attrs?.color === "red" ? "red" : "green"}}}`;
  }

  closeTo(new Set());

  return out;
}

const isEmptyParagraph = (n: RichNode) => n.type === "paragraph" && !(n.content ?? []).length;

function blocksToMd(nodes: RichNode[]): string {
  return nodes.filter((n) => !isEmptyParagraph(n)).map(blockToMd).join("\n\n");
}

const cellText = (cell: RichNode) => inlineToMd(cell.content?.[0]?.content ?? []).replace(/\|/g, "\\|");

function blockToMd(n: RichNode): string {
  const inner = n.content ?? [];

  switch (n.type) {
    case "paragraph":
      return inlineToMd(inner);
    case "heading":
      return `### ${inlineToMd(inner)}`;
    case "bulletList":
      return inner.map((li) => `- ${inlineToMd(li.content?.[0]?.content ?? [])}`).join("\n");
    case "orderedList":
      return inner.map((li, i) => `${i + 1}. ${inlineToMd(li.content?.[0]?.content ?? [])}`).join("\n");
    case "readAloud":
      return `:::read\n${blocksToMd(inner)}\n:::`;
    case "say":
      return `:::say\n${inlineToMd(inner)}\n:::`;
    case "callout":
      return `:::callout kind="${String(n.attrs?.kind ?? "event")}" tag="${String(n.attrs?.tag ?? "").replace(/"/g, "'")}"\n${blocksToMd(inner)}\n:::`;
    case "table": {
      const rows = inner.map((r) => `| ${(r.content ?? []).map(cellText).join(" | ")} |`);

      const cols = inner[0]?.content?.length ?? 0;

      return [rows[0], `|${" --- |".repeat(cols)}`, ...rows.slice(1)].join("\n");
    }
    default:
      return "";
  }
}

export function docToMarkdown(doc: RichDoc): string {
  return blocksToMd(doc.content);
}

// ---------- parsing ----------

const INLINE_TOKEN = /\\([\\*_|[\]{}])|\\\n|\*\*|\|\||_|\*|\[@((?:\\.|[^\]\\])*)\]\(([a-z]+):([^)\s]+)\)|\{\{token:(red|green)\}\}/g;

function parseInline(src: string): RichNode[] {
  const out: RichNode[] = [];

  const active = new Set<RichMarkType>();

  const marks = (): RichMark[] | undefined => (active.size ? MARK_ORDER.filter((m) => active.has(m)).map((type) => ({ type })) : undefined);

  const pushText = (text: string) => {
    if (!text) return;

    const m = marks();

    const last = out[out.length - 1];

    if (last?.type === "text" && JSON.stringify(last.marks) === JSON.stringify(m)) last.text += text;
    else out.push({ type: "text", text, ...(m && { marks: m }) });
  };

  const toggle = (m: RichMarkType) => (active.has(m) ? active.delete(m) : active.add(m));

  let at = 0;

  for (const match of src.matchAll(INLINE_TOKEN)) {
    pushText(src.slice(at, match.index));
    at = match.index! + match[0].length;

    const [tok, escaped, label, mType, mId, color] = match;

    if (escaped) pushText(escaped);
    else if (tok === "\\\n") out.push({ type: "hardBreak", ...(marks() && { marks: marks() }) });
    else if (tok === "**") toggle("bold");
    else if (tok === "||") toggle("secret");
    else if (tok === "_" || tok === "*") toggle("italic");
    else if (label !== undefined && (MENTION_TYPES as readonly string[]).includes(mType)) out.push({ type: "mention", attrs: { id: mId, label: label.replace(/\\(.)/g, "$1"), type: mType }, ...(marks() && { marks: marks() }) });
    else if (label !== undefined) pushText(tok);
    else if (color) out.push({ type: "token", attrs: { color }, ...(marks() && { marks: marks() }) });
  }

  pushText(src.slice(at));

  return out;
}

const FENCE_OPEN = /^:::(read|say|callout)(.*)$/;

const ATTR = /(\w+)="([^"]*)"/g;

function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];

  let cur: string[] = [];

  let depth = 0;

  for (const line of lines) {
    if (depth === 0 && line.trim() === "") {
      if (cur.length) blocks.push(cur);

      cur = [];
      continue;
    }

    if (FENCE_OPEN.test(line.trim())) depth++;
    else if (line.trim() === ":::" && depth > 0) depth--;

    cur.push(line);
  }

  if (cur.length) blocks.push(cur);

  return blocks;
}

const paragraph = (src: string): RichNode => ({ type: "paragraph", content: parseInline(src) });

const splitRow = (line: string) => line.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));

const TABLE_SEP = /^\|?(\s*:?-{3,}:?\s*\|)+\s*$/;

function parseBlock(lines: string[]): RichNode[] {
  const first = lines[0].trim();

  const fence = first.match(FENCE_OPEN);

  if (fence && lines[lines.length - 1].trim() === ":::") {
    const body = lines.slice(1, -1);

    if (fence[1] === "say") return [{ type: "say", content: parseInline(body.join("\n")) }];

    const content = parseBlocks(body);

    if (fence[1] === "read") return [{ type: "readAloud", content: content.filter((n) => n.type === "paragraph") }];

    const attrs = Object.fromEntries([...fence[2].matchAll(ATTR)].map(([, k, v]) => [k, v]));

    const kind = (CALLOUT_KINDS as readonly string[]).includes(attrs.kind) ? attrs.kind : "event";

    return [{ type: "callout", attrs: { kind, tag: attrs.tag ?? "" }, content }];
  }

  if (first.startsWith("### ")) return [{ type: "heading", attrs: { level: 3 }, content: parseInline(first.slice(4)) }];

  if (lines.every((l) => /^- /.test(l))) return [{ type: "bulletList", content: lines.map((l) => ({ type: "listItem", content: [paragraph(l.slice(2))] })) }];

  if (lines.every((l) => /^\d+\. /.test(l))) return [{ type: "orderedList", attrs: { start: 1 }, content: lines.map((l) => ({ type: "listItem", content: [paragraph(l.replace(/^\d+\. /, ""))] })) }];

  if (lines.length >= 2 && first.startsWith("|") && TABLE_SEP.test(lines[1].trim())) {
    const row = (line: string, type: "tableHeader" | "tableCell"): RichNode => ({
      type: "tableRow",
      content: splitRow(line).map((c) => ({ type, attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [paragraph(c)] })),
    });

    return [{ type: "table", content: [row(lines[0], "tableHeader"), ...lines.slice(2).map((l) => row(l, "tableCell"))] }];
  }

  return [paragraph(lines.join("\n"))];
}

function parseBlocks(lines: string[]): RichNode[] {
  return splitBlocks(lines).flatMap(parseBlock).filter((n) => !isEmptyParagraph(n));
}

export function markdownToDoc(md: string): RichDoc {
  return { type: "doc", content: parseBlocks(md.replace(/\r\n?/g, "\n").split("\n")) };
}

// ---------- comparison ----------

const DEFAULT_ATTRS: Record<string, Record<string, unknown>> = {
  tableCell: { colspan: 1, rowspan: 1, colwidth: null },
  tableHeader: { colspan: 1, rowspan: 1, colwidth: null },
  orderedList: { start: 1, type: null },
  heading: { level: 3 },
};

// Tiptap writes default and editor-only attrs (mentionSuggestionChar, textAlign…); they carry no content
const IGNORED_ATTRS = new Set(["mentionSuggestionChar", "textAlign"]);

function normalizeNode(n: RichNode): RichNode | null {
  if (isEmptyParagraph(n)) return null;

  const defaults = DEFAULT_ATTRS[n.type] ?? {};

  const attrs = Object.fromEntries(Object.entries(n.attrs ?? {}).filter(([k, v]) => !IGNORED_ATTRS.has(k) && v !== undefined && defaults[k] !== v && !(v === null && !(k in defaults))));

  const content = n.content?.map(normalizeNode).filter((c): c is RichNode => c !== null);

  const marks = n.marks?.length ? [...n.marks].sort((a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type)).map((m) => ({ type: m.type })) : undefined;

  return { type: n.type, ...(Object.keys(attrs).length && { attrs }), ...(content?.length && { content }), ...(marks && { marks }), ...(n.text !== undefined && { text: n.text }) };
}

function mergeTexts(nodes: RichNode[]): RichNode[] {
  return nodes.reduce<RichNode[]>((acc, n) => {
    const last = acc[acc.length - 1];

    if (n.type === "text" && last?.type === "text" && JSON.stringify(last.marks) === JSON.stringify(n.marks)) acc[acc.length - 1] = { ...last, text: `${last.text}${n.text}` };
    else acc.push(n.content ? { ...n, content: mergeTexts(n.content) } : n);

    return acc;
  }, []);
}

const normalizeDoc = (d: RichDoc): RichDoc => ({ type: "doc", content: mergeTexts(d.content.map(normalizeNode).filter((n): n is RichNode => n !== null)) });

export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
}

export function isLosslessDoc(doc: RichDoc): boolean {
  return canonicalJson(normalizeDoc(markdownToDoc(docToMarkdown(doc)))) === canonicalJson(normalizeDoc(doc));
}
```

Тест `roundTrip` у Step 1 порівнює без нормалізації: якщо через порожні `attrs`/нормалізацію тест падає на дефолтних атрибутах таблиці чи списку, змінити хелпер тесту на `isLosslessDoc(d)` + `canonicalJson(normalize…)` не можна (normalizeDoc приватний) — замість цього в тесті очікувати `isLosslessDoc(d) === true` і окремо перевіряти `docToMarkdown` рядком. Мета тесту — повний цикл без втрат.

- [ ] **Step 3: Перевірка на реальних сторінках** — тимчасовий скрипт у scratchpad (не комітити):

```bash
cat > /tmp/ai-md-check.ts <<'EOF'
import { prisma } from "@/lib/db";
import { isLosslessDoc } from "@/lib/utils/scenario/markdown";

const pages = await prisma.scenarioPage.findMany({ select: { title: true, content: true } });
let total = 0, lossy = 0;
for (const p of pages) for (const s of (p.content as any).sections) for (const r of s.rows) for (const d of [r.story, r.notes]) { total++; if (!isLosslessDoc(d)) { lossy++; console.log("LOSSY", p.title, s.title, r.id); } }
console.log({ total, lossy });
await prisma.$disconnect();
EOF
pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json /tmp/ai-md-check.ts
```

Expected: `lossy` = 0 або лише рядки з вкладеними списками/багатоабзацними пунктами/таблицями з `hardBreak`. Для кожного іншого LOSSY — знайти відмінність (`console.log(JSON.stringify(...))`) і виправити серіалізатор, додавши кейс у тест. Записати фінальні `{ total, lossy }` у повідомлення коміту.

- [ ] **Step 4: Run** `pnpm test:run lib/utils/scenario/__tests__/markdown.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(scenario): lossless markdown dialect for AI edits (prodcopy: N/M rows lossless)`.

---

### Task 6: Операції пропозицій (чиста логіка)

**Files:**
- Create: `lib/utils/scenario/ai-ops.ts`
- Test: `lib/utils/scenario/__tests__/ai-ops.test.ts`

**Interfaces:**
- Consumes: `markdownToDoc`, `isLosslessDoc`, `canonicalJson` (Task 5); `newId`, `EMPTY_DOC` (наявні).
- Produces:
  - `resolveAiOps(content: ScenarioContent, inputs: ScenarioAiOpInput[]): { ok: true; ops: ScenarioAiOp[] } | { ok: false; error: string }` — помилка українською для моделі.
  - `applyAiOps(content: ScenarioContent, ops: ScenarioAiOp[]): { ok: true; content: ScenarioContent } | { ok: false }` — `ok: false` = stale.

- [ ] **Step 1: Тест**

```ts
// lib/utils/scenario/__tests__/ai-ops.test.ts
import { describe, expect, it } from "vitest";

import { applyAiOps, resolveAiOps } from "@/lib/utils/scenario/ai-ops";
import type { RichDoc, ScenarioContent } from "@/types/scenario";

const doc = (text: string): RichDoc => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const content = (): ScenarioContent => ({
  legend: [],
  sections: [
    { id: "s1", title: "Собор", played: false, rows: [{ id: "r1", story: doc("Дзвони"), notes: doc("DC 12") }, { id: "r2", story: doc("Тиша"), notes: { type: "doc", content: [] } }] },
    { id: "s2", title: "Крипта", played: false, rows: [] },
  ],
});

const ok = <T extends { ok: boolean }>(r: T) => {
  if (!r.ok) throw new Error(JSON.stringify(r));

  return r as Extract<T, { ok: true }>;
};

describe("resolveAiOps", () => {
  it("replaceRow: markdown → RichDoc, before з поточного рядка", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "Дзвони **гудуть**" }]));

    expect(ops[0]).toMatchObject({ op: "replaceRow", before: { story: doc("Дзвони"), notes: doc("DC 12") } });
    expect(ops[0].op === "replaceRow" && ops[0].notes).toBeUndefined();
  });

  it("неіснуючий рядок або розділ — помилка для моделі", () => {
    expect(resolveAiOps(content(), [{ op: "replaceRow", sectionId: "s1", rowId: "nope", story: "x" }])).toMatchObject({ ok: false });
    expect(resolveAiOps(content(), [{ op: "insertRow", sectionId: "nope", story: "x" }])).toMatchObject({ ok: false });
    expect(resolveAiOps(content(), [{ op: "addSection", afterSectionId: "nope", title: "x", rows: [{ story: "y" }] }])).toMatchObject({ ok: false });
  });

  it("рядок із розміткою, що не переживає цикл, — відмова", () => {
    const c = content();

    c.sections[0].rows[0].story = { type: "doc", content: [{ type: "bulletList", content: [{ type: "listItem", content: [doc("a").content[0], doc("b").content[0]] }] }] };

    const r = resolveAiOps(c, [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "нове" }]);

    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.error).toContain("вручну");
  });

  it("insertRow і addSection генерують нові унікальні id", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "insertRow", sectionId: "s1", afterRowId: "r1", story: "Новий" }, { op: "addSection", afterSectionId: "s1", title: "Двір", rows: [{ story: "Сніг" }] }]));

    const ids = [ops[0].op === "insertRow" && ops[0].row.id, ops[1].op === "addSection" && ops[1].section.id, ops[1].op === "addSection" && ops[1].section.rows[0].id];

    expect(new Set(ids).size).toBe(3);
    expect(ids).not.toContain("r1");
  });
});

describe("applyAiOps", () => {
  it("застосовує всі чотири операції в правильні місця", () => {
    const { ops } = ok(resolveAiOps(content(), [
      { op: "replaceRow", sectionId: "s1", rowId: "r2", notes: "тихо" },
      { op: "insertRow", sectionId: "s1", afterRowId: "r1", story: "Між" },
      { op: "addSection", afterSectionId: "s1", title: "Двір", rows: [{ story: "Сніг" }] },
      { op: "renameSection", sectionId: "s2", title: "Глибока крипта" },
    ]));

    const next = ok(applyAiOps(content(), ops)).content;

    expect(next.sections.map((s) => s.title)).toEqual(["Собор", "Двір", "Глибока крипта"]);
    expect(next.sections[0].rows.map((r) => r.id)[0]).toBe("r1");
    expect(next.sections[0].rows).toHaveLength(3);
    expect(next.sections[0].rows[2].notes).toEqual(doc("тихо"));
    expect(next.sections[0].rows[2].story).toEqual(doc("Тиша"));
  });

  it("insertRow без afterRowId — на початок розділу", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "insertRow", sectionId: "s1", story: "Перший" }]));

    expect(ok(applyAiOps(content(), ops)).content.sections[0].rows[0].story).toEqual(doc("Перший"));
  });

  it("змінений рядок після пропозиції — stale", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "x" }]));

    const edited = content();

    edited.sections[0].rows[0].story = doc("Дзвони!");

    expect(applyAiOps(edited, ops)).toEqual({ ok: false });
  });

  it("зміни в інших рядках не роблять пропозицію stale", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "x" }]));

    const edited = content();

    edited.sections[0].rows[1].story = doc("Інше");

    expect(applyAiOps(edited, ops).ok).toBe(true);
  });

  it("зниклий рядок, сусід чи розділ — stale", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "insertRow", sectionId: "s1", afterRowId: "r2", story: "x" }]));

    const edited = content();

    edited.sections[0].rows.pop();

    expect(applyAiOps(edited, ops)).toEqual({ ok: false });
  });

  it("порядок ключів JSONB не впливає на перевірку before", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "x" }]));

    const reordered = JSON.parse(JSON.stringify(content(), (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v)));

    expect(applyAiOps(reordered, ops).ok).toBe(true);
  });
});
```

Run → FAIL.

- [ ] **Step 2: Реалізація**

```ts
// lib/utils/scenario/ai-ops.ts
import { EMPTY_DOC } from "./doc";
import { canonicalJson, isLosslessDoc, markdownToDoc } from "./markdown";
import { newId } from "./structure";

import type { ScenarioAiOp, ScenarioAiOpInput } from "@/types/ai";
import type { ScenarioContent, ScenarioRow, ScenarioSection } from "@/types/scenario";

type Resolved = { ok: true; ops: ScenarioAiOp[] } | { ok: false; error: string };

const md = (text: string | undefined) => (text === undefined ? EMPTY_DOC : markdownToDoc(text));

const findSection = (c: ScenarioContent, id: string) => c.sections.find((s) => s.id === id);

export function resolveAiOps(content: ScenarioContent, inputs: ScenarioAiOpInput[]): Resolved {
  const ops: ScenarioAiOp[] = [];

  for (const input of inputs) {
    if (input.op === "addSection") {
      if (input.afterSectionId && !findSection(content, input.afterSectionId)) return { ok: false, error: `Розділу ${input.afterSectionId} немає на сторінці` };

      const section: ScenarioSection = { id: newId(), title: input.title, played: false, rows: input.rows.map((r) => ({ id: newId(), story: md(r.story), notes: md(r.notes) })) };

      ops.push({ op: "addSection", afterSectionId: input.afterSectionId ?? null, section });
      continue;
    }

    const section = findSection(content, input.sectionId);

    if (!section) return { ok: false, error: `Розділу ${input.sectionId} немає на сторінці` };

    if (input.op === "renameSection") {
      ops.push({ op: "renameSection", sectionId: section.id, title: input.title, before: { title: section.title } });
      continue;
    }

    if (input.op === "insertRow") {
      if (input.afterRowId && !section.rows.some((r) => r.id === input.afterRowId)) return { ok: false, error: `Рядка ${input.afterRowId} немає в розділі «${section.title}»` };

      const row: ScenarioRow = { id: newId(), story: md(input.story), notes: md(input.notes) };

      ops.push({ op: "insertRow", sectionId: section.id, afterRowId: input.afterRowId ?? null, row });
      continue;
    }

    const row = section.rows.find((r) => r.id === input.rowId);

    if (!row) return { ok: false, error: `Рядка ${input.rowId} немає в розділі «${section.title}»` };

    const touched = [input.story !== undefined && row.story, input.notes !== undefined && row.notes].filter((d) => d !== false);

    if (touched.some((d) => !isLosslessDoc(d))) return { ok: false, error: `Рядок ${row.id} містить розмітку, яку AI не може відтворити без втрат (вкладені списки чи складні таблиці) — редагуйте його вручну` };

    ops.push({
      op: "replaceRow",
      sectionId: section.id,
      rowId: row.id,
      ...(input.story !== undefined && { story: md(input.story) }),
      ...(input.notes !== undefined && { notes: md(input.notes) }),
      before: { story: row.story, notes: row.notes },
    });
  }

  return { ok: true, ops };
}

const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);

const insertAfter = <T extends { id: string }>(list: T[], afterId: string | null, item: T): T[] | null => {
  if (afterId === null) return [item, ...list];

  const at = list.findIndex((x) => x.id === afterId);

  return at < 0 ? null : [...list.slice(0, at + 1), item, ...list.slice(at + 1)];
};

function applyOne(c: ScenarioContent, op: ScenarioAiOp): ScenarioContent | null {
  if (op.op === "addSection") {
    const sections = insertAfter(c.sections, op.afterSectionId, op.section);

    return sections && { ...c, sections };
  }

  const section = findSection(c, op.sectionId);

  if (!section) return null;

  const withSection = (next: ScenarioSection) => ({ ...c, sections: c.sections.map((s) => (s.id === section.id ? next : s)) });

  if (op.op === "renameSection") return section.title === op.before.title ? withSection({ ...section, title: op.title }) : null;

  if (op.op === "insertRow") {
    const rows = insertAfter(section.rows, op.afterRowId, op.row);

    return rows && withSection({ ...section, rows });
  }

  const row = section.rows.find((r) => r.id === op.rowId);

  if (!row || !same(row.story, op.before.story) || !same(row.notes, op.before.notes)) return null;

  const next = { ...row, ...(op.story && { story: op.story }), ...(op.notes && { notes: op.notes }) };

  return withSection({ ...section, rows: section.rows.map((r) => (r.id === row.id ? next : r)) });
}

export function applyAiOps(content: ScenarioContent, ops: ScenarioAiOp[]): { ok: true; content: ScenarioContent } | { ok: false } {
  let c = content;

  for (const op of ops) {
    const next = applyOne(c, op);

    if (!next) return { ok: false };

    c = next;
  }

  return { ok: true, content: c };
}
```

Примітка для `insertRow` з `afterRowId: null` («на початок»): відсутність сусіда не перевіряється — розділ має існувати, і цього досить.

- [ ] **Step 3: Run** `pnpm test:run lib/utils/scenario/__tests__/ai-ops.test.ts` → PASS.
- [ ] **Step 4: Commit** `feat(scenario): AI edit ops with before-checks`.

---

### Task 7: Ядро реєстру інструментів + інструменти читання сценарію

**Files:**
- Create: `lib/ai/tools/define.ts`, `lib/ai/tools/scenario-read.ts`, `lib/ai/tools/index.ts` (поки з трьома інструментами)
- Test: `lib/ai/tools/__tests__/scenario-read.test.ts`, `lib/ai/tools/__tests__/registry.test.ts`

**Interfaces:**
- Consumes: `docToMarkdown` (Task 5); `listPages`, `readContent` з `lib/server/scenario/page-store.ts`; пошук сценарію — переглянути `app/api/campaigns/[id]/scenario/search/route.ts` і винести SQL-пошук у викликану функцію, якщо його ще немає в `lib/server/scenario` (назва `searchScenarioPages(campaignId, q): Promise<ScenarioSearchHit[]>`; маршрут перевести на неї).
- Produces:
  - `type AiToolContext = { campaignId: string; userId: string; threadId: string | null }`
  - `defineTool<S extends z.ZodType>(def: { name: string; title: string; description: string; input: S; kind: "read" | "propose"; handler: (ctx: AiToolContext, input: z.infer<S>) => Promise<unknown> }): AiToolDef`
  - `clip(value: unknown): string` — JSON/рядок, обрізаний до `AI_LIMITS.toolResultChars` з позначкою `…[обрізано]`
  - `class AiToolError extends Error` — помилка, текст якої повертається моделі
  - `rowsToMarkdown(section: ScenarioSection): string` — для контексту (Task 10)
  - `AI_TOOLS: AiToolDef[]`, `toAiSdkTools(ctx): ToolSet`, `registerMcpTools(server: McpServer, ctx): void`

- [ ] **Step 1: `define.ts`**

```ts
// lib/ai/tools/define.ts
import "server-only";

import type { z } from "zod";

import { AI_LIMITS } from "@/lib/constants/ai";

export type AiToolContext = { campaignId: string; userId: string; threadId: string | null };

export class AiToolError extends Error {}

export type AiToolDef = {
  name: string;
  title: string;
  description: string;
  input: z.ZodType;
  kind: "read" | "propose";
  handler: (ctx: AiToolContext, input: unknown) => Promise<unknown>;
};

export function defineTool<S extends z.ZodType>(def: Omit<AiToolDef, "input" | "handler"> & { input: S; handler: (ctx: AiToolContext, input: z.infer<S>) => Promise<unknown> }): AiToolDef {
  return def as AiToolDef;
}

export function clip(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);

  return text.length > AI_LIMITS.toolResultChars ? `${text.slice(0, AI_LIMITS.toolResultChars)}…[обрізано]` : text;
}

/** Виконати інструмент: результат — рядок для моделі; AiToolError → текст помилки замість винятку. */
export async function runTool(def: AiToolDef, ctx: AiToolContext, rawInput: unknown): Promise<string> {
  try {
    return clip(await def.handler(ctx, def.input.parse(rawInput)));
  } catch (error) {
    if (error instanceof AiToolError) return `Помилка: ${error.message}`;

    throw error;
  }
}
```

- [ ] **Step 2: Тест інструментів читання**

```ts
// lib/ai/tools/__tests__/scenario-read.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({ prisma: { scenarioPage: { findMany: vi.fn(), findFirst: vi.fn() } } }));
vi.mock("@/lib/server/scenario/search", () => ({ searchScenarioPages: vi.fn(async () => [{ pageId: "p1", title: "Монастир", sectionId: "s1", snippet: "…дзвони…" }]) }));

const ctx = { campaignId: "camp1", userId: "dm", threadId: null };

const content = { legend: [{ kind: "read", label: "Читати" }], sections: [{ id: "s1", title: "Собор", played: true, rows: [{ id: "r1", story: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Дзвони" }, { type: "text", text: " таємниця", marks: [{ type: "secret" }] }] }] }, notes: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "DC 12" }] }] } }] }] };

describe("scenario read tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1", title: "Монастир", kind: "scene", content } as never);
  });

  it("read_scenario_page віддає markdown з id, нотатками і секретами", async () => {
    const { readScenarioPageTool } = await import("@/lib/ai/tools/scenario-read");

    const out = String(await readScenarioPageTool.handler(ctx, { pageId: "p1" }));

    expect(out).toContain("## Собор [s1] (зіграно)");
    expect(out).toContain("### Рядок r1");
    expect(out).toContain("Дзвони|| таємниця||");
    expect(out).toContain("DC 12");
    expect(vi.mocked(prisma.scenarioPage.findFirst).mock.calls[0][0]).toMatchObject({ where: { id: "p1", campaignId: "camp1" } });
  });

  it("сторінка іншої кампанії — AiToolError", async () => {
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue(null);

    const { readScenarioPageTool } = await import("@/lib/ai/tools/scenario-read");
    const { AiToolError } = await import("@/lib/ai/tools/define");

    await expect(readScenarioPageTool.handler(ctx, { pageId: "x" })).rejects.toBeInstanceOf(AiToolError);
  });

  it("sectionId обмежує вивід одним розділом", async () => {
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1", title: "М", kind: "scene", content: { ...content, sections: [...content.sections, { id: "s2", title: "Крипта", played: false, rows: [] }] } } as never);

    const { readScenarioPageTool } = await import("@/lib/ai/tools/scenario-read");

    const out = String(await readScenarioPageTool.handler(ctx, { pageId: "p1", sectionId: "s2" }));

    expect(out).toContain("Крипта");
    expect(out).not.toContain("Собор [s1]");
  });

  it("search_scenario", async () => {
    const { searchScenarioTool } = await import("@/lib/ai/tools/scenario-read");

    expect(await searchScenarioTool.handler(ctx, { query: "дзвони" })).toEqual([{ pageId: "p1", title: "Монастир", sectionId: "s1", snippet: "…дзвони…" }]);
  });
});
```

(Якщо форма `ScenarioSearchHit` інша — підлаштувати мок під наявний тип з `types/scenario.ts`.)

- [ ] **Step 3: `scenario-read.ts`**

```ts
// lib/ai/tools/scenario-read.ts
import "server-only";

import { z } from "zod";

import { AiToolError, defineTool } from "./define";

import { AI_LIMITS } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import { listPages, readContent } from "@/lib/server/scenario/page-store";
import { searchScenarioPages } from "@/lib/server/scenario/search";
import { docToMarkdown } from "@/lib/utils/scenario/markdown";
import type { ScenarioContent, ScenarioSection } from "@/types/scenario";

export function sectionToMarkdown(s: ScenarioSection): string {
  const rows = s.rows.map((r) => `### Рядок ${r.id}\n**Історія:**\n${docToMarkdown(r.story) || "—"}\n\n**Нотатки ДМ:**\n${docToMarkdown(r.notes) || "—"}`);

  return [`## ${s.title} [${s.id}]${s.played ? " (зіграно)" : ""}`, ...rows].join("\n\n");
}

export function contentToMarkdown(title: string, content: ScenarioContent, sectionId?: string): string {
  const sections = sectionId ? content.sections.filter((s) => s.id === sectionId) : content.sections;

  const legend = content.legend.length ? `Легенда: ${content.legend.map((l) => l.label).join(", ")}` : "";

  return [`# ${title}`, legend, ...sections.map(sectionToMarkdown)].filter(Boolean).join("\n\n");
}

export async function loadPageForAi(campaignId: string, pageId: string) {
  const page = await prisma.scenarioPage.findFirst({ where: { id: pageId, campaignId }, select: { id: true, title: true, kind: true, content: true } });

  if (!page) throw new AiToolError(`Сторінки ${pageId} немає в цій кампанії`);

  return { ...page, content: readContent(page.content) };
}

export const listScenarioPagesTool = defineTool({
  name: "list_scenario_pages",
  title: "Сторінки сценарію",
  description: "List all scenario pages of the campaign: id, kind (scene|hero), arc, title, status.",
  input: z.object({}),
  kind: "read",
  handler: async (ctx) => (await listPages(ctx.campaignId)).map(({ id, kind, arc, title, status }) => ({ id, kind, arc, title, status })),
});

export const readScenarioPageTool = defineTool({
  name: "read_scenario_page",
  title: "Прочитати сторінку сценарію",
  description:
    "Read a scenario page as the scenario markdown dialect: sections with [sectionId], rows with ids, story and DM notes. ||text|| is a DM-only secret. Pass sectionId to read one section.",
  input: z.object({ pageId: z.string().min(1), sectionId: z.string().min(1).optional() }),
  kind: "read",
  handler: async (ctx, { pageId, sectionId }) => {
    const page = await loadPageForAi(ctx.campaignId, pageId);

    return contentToMarkdown(page.title, page.content, sectionId);
  },
});

export const searchScenarioTool = defineTool({
  name: "search_scenario",
  title: "Пошук у сценарії",
  description: "Full-text search across all scenario pages (titles, stories, notes). Returns page, section and a snippet.",
  input: z.object({ query: z.string().trim().min(2).max(100) }),
  kind: "read",
  handler: async (ctx, { query }) => (await searchScenarioPages(ctx.campaignId, query)).slice(0, AI_LIMITS.searchHits),
});
```

`lib/server/scenario/search.ts` — перенести логіку з `app/api/campaigns/[id]/scenario/search/route.ts` (або його handler-файлу) у `searchScenarioPages(campaignId, q)`; маршрут викликає її; наявні тести `app/api/__tests__/scenario-aux-api.test.ts` мають лишитися зеленими.

- [ ] **Step 4: Реєстр і адаптери** (тут же, з трьома інструментами; Task 8 і 9 допишуть свої в масив)

```ts
// lib/ai/tools/index.ts
import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { tool, type ToolSet } from "ai";

import { type AiToolContext, type AiToolDef, runTool } from "./define";
import { listScenarioPagesTool, readScenarioPageTool, searchScenarioTool } from "./scenario-read";

export const AI_TOOLS: AiToolDef[] = [listScenarioPagesTool, readScenarioPageTool, searchScenarioTool];

export function toAiSdkTools(ctx: AiToolContext): ToolSet {
  return Object.fromEntries(AI_TOOLS.map((def) => [def.name, tool({ description: def.description, inputSchema: def.input, execute: (input: unknown) => runTool(def, ctx, input) })]));
}

export function registerMcpTools(server: McpServer, ctx: AiToolContext): void {
  for (const def of AI_TOOLS) {
    server.registerTool(def.name, { title: def.title, description: def.description, inputSchema: def.input as never }, async (input: unknown) => ({ content: [{ type: "text" as const, text: await runTool(def, ctx, input) }] }));
  }
}
```

Перевірити в `node_modules/@modelcontextprotocol/server` точний експорт класу (`McpServer`) і сигнатуру `registerTool` (тип `inputSchema` — Standard Schema; приведення `as never` прибрати, якщо типи сходяться).

- [ ] **Step 5: Тест реєстру**

```ts
// lib/ai/tools/__tests__/registry.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

describe("AI tool registry", () => {
  it("імена унікальні, snake_case, є опис", async () => {
    const { AI_TOOLS } = await import("@/lib/ai/tools");

    const names = AI_TOOLS.map((t) => t.name);

    expect(new Set(names).size).toBe(names.length);
    names.forEach((n) => expect(n).toMatch(/^[a-z][a-z_]+$/));
    AI_TOOLS.forEach((t) => expect(t.description.length).toBeGreaterThan(20));
  });

  it("toAiSdkTools і registerMcpTools покривають усі інструменти", async () => {
    const { AI_TOOLS, registerMcpTools, toAiSdkTools } = await import("@/lib/ai/tools");

    const ctx = { campaignId: "c", userId: "u", threadId: null };

    expect(Object.keys(toAiSdkTools(ctx)).sort()).toEqual(AI_TOOLS.map((t) => t.name).sort());

    const registerTool = vi.fn();

    registerMcpTools({ registerTool } as never, ctx);
    expect(registerTool.mock.calls.map((c) => c[0]).sort()).toEqual(AI_TOOLS.map((t) => t.name).sort());
  });

  it("runTool: AiToolError → текст, обрізання довгих результатів", async () => {
    const { AiToolError, clip, defineTool, runTool } = await import("@/lib/ai/tools/define");
    const { z } = await import("zod");

    const failing = defineTool({ name: "x", title: "x", description: "x", input: z.object({}), kind: "read", handler: async () => { throw new AiToolError("нема"); } });

    expect(await runTool(failing, { campaignId: "c", userId: "u", threadId: null }, {})).toBe("Помилка: нема");
    expect(clip("a".repeat(30_000))).toMatch(/…\[обрізано\]$/);
  });
});
```

- [ ] **Step 6: Run** `pnpm test:related lib/ai/tools/*.ts lib/server/scenario/search.ts` → PASS.
- [ ] **Step 7: Commit** `feat(ai): tool registry with AI SDK and MCP adapters, scenario read tools`.

---

### Task 8: Інструменти партії, персонажа, показу, бою, довідника

**Files:**
- Create: `lib/ai/tools/party.ts`, `lib/ai/tools/show.ts`, `lib/ai/tools/battle.ts`, `lib/ai/tools/reference.ts`
- Modify: `lib/ai/tools/index.ts` (додати в `AI_TOOLS`)
- Test: `lib/ai/tools/__tests__/context-tools.test.ts`

**Interfaces:**
- Consumes: `defineTool`, `AiToolError` (Task 7); `readShowState` (`lib/server/show/show-store.ts`); `loadBattle` (`lib/utils/battle/store`); `getCachedUnits`/`getCachedSpells`/`getCachedRaces` (`lib/cache/reference-data.ts`); `docText` (`lib/utils/scenario/doc.ts`); `CharacterType` (`lib/constants/characters.ts`); `BattleStatus` (`lib/constants/battle.ts`).
- Produces: `getPartyTool`, `readCharacterTool`, `getShowStateTool`, `getBattleStateTool`, `searchReferenceTool`, `readReferenceTool`; а також функції для автоконтексту — `partySummary(campaignId): Promise<PartyMember[]>` (з `party.ts`), `showSummary(campaignId): Promise<string | null>` (з `show.ts`).

- [ ] **Step 1: Тест**

```ts
// lib/ai/tools/__tests__/context-tools.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findMany: vi.fn(), findFirst: vi.fn() },
    scenarioPage: { findFirst: vi.fn() },
    battleScene: { findFirst: vi.fn() },
    battleEvent: { findMany: vi.fn() },
    skill: { findMany: vi.fn(), findFirst: vi.fn() },
    artifact: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/server/show/show-store", () => ({ readShowState: vi.fn() }));
vi.mock("@/lib/utils/battle/store", () => ({ loadBattle: vi.fn() }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedUnits: vi.fn(async () => [{ id: "u1", name: "Фенікс", level: 7 }, { id: "u2", name: "Грифон", level: 3 }]), getCachedSpells: vi.fn(async () => []), getCachedRaces: vi.fn(async () => []) }));

const ctx = { campaignId: "camp1", userId: "dm", threadId: null };

describe("context tools", () => {
  beforeEach(() => vi.clearAllMocks());

  it("get_party: лише герої гравців цієї кампанії", async () => {
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "c1", name: "Годрик", level: 5, class: "Лицар", race: "Людина", armorClass: 16, notes: null }] as never);

    const { getPartyTool } = await import("@/lib/ai/tools/party");

    expect(await getPartyTool.handler(ctx, {})).toEqual([expect.objectContaining({ id: "c1", name: "Годрик", level: 5 })]);
    expect(vi.mocked(prisma.character.findMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "camp1", type: "player" } });
  });

  it("get_show_state: без показу — повідомлення", async () => {
    const { readShowState } = await import("@/lib/server/show/show-store");

    vi.mocked(readShowState).mockResolvedValue(null);

    const { getShowStateTool } = await import("@/lib/ai/tools/show");

    expect(await getShowStateTool.handler(ctx, {})).toBe("Показ зараз не запущено");
  });

  it("get_battle_state: без активного бою — повідомлення", async () => {
    vi.mocked(prisma.battleScene.findFirst).mockResolvedValue(null);

    const { getBattleStateTool } = await import("@/lib/ai/tools/battle");

    expect(await getBattleStateTool.handler(ctx, {})).toBe("Активного бою немає");
  });

  it("search_reference: збіг за назвою без урахування регістру", async () => {
    const { searchReferenceTool } = await import("@/lib/ai/tools/reference");

    expect(await searchReferenceTool.handler(ctx, { kind: "unit", query: "фен" })).toEqual([{ id: "u1", name: "Фенікс" }]);
  });

  it("read_reference: чужий id — AiToolError", async () => {
    const { readReferenceTool } = await import("@/lib/ai/tools/reference");
    const { AiToolError } = await import("@/lib/ai/tools/define");

    await expect(readReferenceTool.handler(ctx, { kind: "unit", id: "nope" })).rejects.toBeInstanceOf(AiToolError);
  });
});
```

- [ ] **Step 2: `party.ts`**

```ts
// lib/ai/tools/party.ts
import "server-only";

import { z } from "zod";

import { AiToolError, defineTool } from "./define";

import { CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { readContent } from "@/lib/server/scenario/page-store";
import { docText } from "@/lib/utils/scenario/doc";

const PARTY_SELECT = { id: true, name: true, level: true, class: true, race: true, armorClass: true, notes: true } as const;

export type PartyMember = { id: string; name: string; level: number; class: string; race: string; armorClass: number; notes: string | null };

export async function partySummary(campaignId: string): Promise<PartyMember[]> {
  return prisma.character.findMany({ where: { campaignId, type: CharacterType.PLAYER }, select: PARTY_SELECT, orderBy: { name: "asc" } });
}

export const getPartyTool = defineTool({
  name: "get_party",
  title: "Партія",
  description: "Player heroes of the campaign: id, name, level, class, race, AC, DM notes.",
  input: z.object({}),
  kind: "read",
  handler: async (ctx) => partySummary(ctx.campaignId),
});

export const readCharacterTool = defineTool({
  name: "read_character",
  title: "Лист персонажа",
  description: "Full character sheet (player hero or NPC hero): ability scores, AC, HP-related stats, goals, DM notes and the hero biography from the scenario.",
  input: z.object({ id: z.string().min(1) }),
  kind: "read",
  handler: async (ctx, { id }) => {
    const c = await prisma.character.findFirst({
      where: { id, campaignId: ctx.campaignId },
      select: { ...PARTY_SELECT, type: true, subclass: true, alignment: true, background: true, strength: true, dexterity: true, constitution: true, intelligence: true, wisdom: true, charisma: true, speed: true, morale: true, goals: true },
    });

    if (!c) throw new AiToolError(`Персонажа ${id} немає в цій кампанії`);

    const bio = await prisma.scenarioPage.findFirst({ where: { campaignId: ctx.campaignId, characterId: id, kind: "hero" }, select: { content: true } });

    const biography = bio ? readContent(bio.content).sections.map((s) => `${s.title}: ${s.rows.map((r) => docText(r.story)).join(" ")}`).join("\n") : null;

    return { ...c, biography };
  },
});
```

Додати до мока `prisma.scenarioPage.findFirst` у тесті при потребі.

- [ ] **Step 3: `show.ts`**

```ts
// lib/ai/tools/show.ts
import "server-only";

import { z } from "zod";

import { defineTool } from "./define";

import { readShowState } from "@/lib/server/show/show-store";

export async function showSummary(campaignId: string): Promise<string | null> {
  const s = await readShowState(campaignId);

  if (!s?.slide) return null;

  return [`Набір: ${s.deckTitle ?? "—"}`, `Слайд: ${s.slide.title ?? "без назви"}`, s.slide.caption && `Підпис: ${s.slide.caption}`, s.battle && `Гравців кличуть у бій: ${s.battle.name}`].filter(Boolean).join("\n");
}

export const getShowStateTool = defineTool({
  name: "get_show_state",
  title: "Поточний показ",
  description: "What the players currently see on the show screen: deck, slide title and caption, battle call.",
  input: z.object({}),
  kind: "read",
  handler: async (ctx) => (await showSummary(ctx.campaignId)) ?? "Показ зараз не запущено",
});
```

- [ ] **Step 4: `battle.ts`**

```ts
// lib/ai/tools/battle.ts
import "server-only";

import { z } from "zod";

import { AiToolError, defineTool } from "./define";

import { AI_LIMITS } from "@/lib/constants/ai";
import { BattleStatus } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { loadBattle } from "@/lib/utils/battle/store";

export const getBattleStateTool = defineTool({
  name: "get_battle_state",
  title: "Стан бою",
  description: "State of a battle (the active one when battleId is omitted): round, turn order, participants with side, HP, AC, status, and the last events.",
  input: z.object({ battleId: z.string().min(1).optional() }),
  kind: "read",
  handler: async (ctx, { battleId }) => {
    const id = battleId ?? (await prisma.battleScene.findFirst({ where: { campaignId: ctx.campaignId, status: BattleStatus.ACTIVE }, orderBy: { startedAt: "desc" }, select: { id: true } }))?.id;

    if (!id) return "Активного бою немає";

    const battle = await loadBattle(prisma, { battleId: id, campaignId: ctx.campaignId, userId: ctx.userId });

    if (!battle) throw new AiToolError(`Бою ${id} немає в цій кампанії`);

    const events = await prisma.battleEvent.findMany({ where: { battleId: id, cancelledAt: null }, orderBy: { seq: "desc" }, take: AI_LIMITS.battleEvents, select: { round: true, resultText: true } });

    return {
      name: battle.name,
      status: battle.status,
      round: battle.currentRound,
      currentTurnIndex: battle.currentTurnIndex,
      participants: battle.participants.map((p) => ({
        name: p.basicInfo.name,
        side: p.basicInfo.side,
        hp: `${p.combatStats.currentHp}/${p.combatStats.maxHp}`,
        ac: p.combatStats.armorClass,
        status: p.combatStats.status,
      })),
      lastEvents: events.reverse().map((e) => `Р${e.round}: ${e.resultText}`),
    };
  },
});
```

Звірити поля з типом `LoadedBattle` у `lib/utils/battle/store/load-battle.ts` (назви `name`, `status`, `currentRound`, `currentTurnIndex`, `participants`, і де лежать `name`/`side`/`currentHp`/`maxHp`/`armorClass`/`status` учасника у `types/battle.ts` — `basicInfo` / `combatStats`); підлаштувати мапінг під фактичні назви. Додати до тесту кейс з моком `loadBattle`, що повертає двох учасників, і перевірити `hp: "12/20"`.

- [ ] **Step 5: `reference.ts`**

```ts
// lib/ai/tools/reference.ts
import "server-only";

import { z } from "zod";

import { AiToolError, defineTool } from "./define";

import { AI_LIMITS } from "@/lib/constants/ai";
import { getCachedRaces, getCachedSpells, getCachedUnits } from "@/lib/cache/reference-data";
import { prisma } from "@/lib/db";

const KINDS = ["unit", "spell", "race", "skill", "artifact"] as const;

type Kind = (typeof KINDS)[number];

type Entry = { id: string; name: string } & Record<string, unknown>;

// skills and artifacts are not in the reference cache
async function listOf(campaignId: string, kind: Kind): Promise<Entry[]> {
  if (kind === "unit") return (await getCachedUnits(campaignId)) as unknown as Entry[];

  if (kind === "spell") return (await getCachedSpells(campaignId)) as unknown as Entry[];

  if (kind === "race") return (await getCachedRaces(campaignId)) as unknown as Entry[];

  if (kind === "skill") return prisma.skill.findMany({ where: { campaignId }, select: { id: true, name: true, description: true } }) as unknown as Promise<Entry[]>;

  return prisma.artifact.findMany({ where: { campaignId }, select: { id: true, name: true, description: true } }) as unknown as Promise<Entry[]>;
}

const kindSchema = z.enum(KINDS);

export const searchReferenceTool = defineTool({
  name: "search_reference",
  title: "Пошук у довіднику",
  description: "Search the campaign reference by name: units, spells, races, skills, artifacts. Returns id and name; use read_reference for details.",
  input: z.object({ kind: kindSchema, query: z.string().trim().min(1).max(60) }),
  kind: "read",
  handler: async (ctx, { kind, query }) => {
    const q = query.toLocaleLowerCase("uk");

    return (await listOf(ctx.campaignId, kind)).filter((e) => e.name.toLocaleLowerCase("uk").includes(q)).slice(0, AI_LIMITS.searchHits).map(({ id, name }) => ({ id, name }));
  },
});

export const readReferenceTool = defineTool({
  name: "read_reference",
  title: "Запис довідника",
  description: "Full reference entry (unit stats and abilities, spell effects, race traits, skill or artifact description) by kind and id.",
  input: z.object({ kind: kindSchema, id: z.string().min(1) }),
  kind: "read",
  handler: async (ctx, { kind, id }) => {
    const entry = (await listOf(ctx.campaignId, kind)).find((e) => e.id === id);

    if (!entry) throw new AiToolError(`Запису ${kind} ${id} немає в довіднику кампанії`);

    return entry;
  },
});
```

Перевірити, що `getCachedSkills/Artifacts` справді немає в `lib/cache/reference-data.ts` (на момент плану їх немає); для `skill`/`artifact` у `read_reference` варто читати повний рядок (`findFirst({ where: { id, campaignId } })` без `select`) — замінити гілку `read_reference` для цих двох видів на прямий `findFirst`, щоб модель бачила `abilities`/`bonuses`.

- [ ] **Step 6: Додати в `AI_TOOLS`** — `getPartyTool, readCharacterTool, getShowStateTool, getBattleStateTool, searchReferenceTool, readReferenceTool`.
- [ ] **Step 7: Run** `pnpm test:related lib/ai/tools/*.ts` → PASS.
- [ ] **Step 8: Commit** `feat(ai): party, character, show, battle and reference tools`.

---

### Task 9: Пропозиції — інструмент, сховище, застосування, маршрути

**Files:**
- Create: `lib/ai/proposals.ts`, `lib/ai/tools/propose.ts`, `app/api/campaigns/[id]/ai/ai-handlers.ts` (частина пропозицій), `app/api/campaigns/[id]/ai/proposals/route.ts`, `…/proposals/[proposalId]/apply/route.ts`, `…/proposals/[proposalId]/reject/route.ts`
- Modify: `lib/ai/tools/index.ts`
- Test: `app/api/__tests__/ai-proposals-api.test.ts`, `lib/ai/tools/__tests__/propose.test.ts`

**Interfaces:**
- Consumes: `resolveAiOps`, `applyAiOps` (Task 6); `loadPageForAi` (Task 7); `contentWrite`, `readContent`, `toPage`, `OWNED_WITH_CONTENT_SELECT` (`lib/server/scenario/page-store.ts`); `snapshotIfDue`, `pruneVersions` (`lib/server/scenario/versions.ts`).
- Produces:
  - `createProposal(ctx: AiToolContext, pageId, summary, ops: ScenarioAiOp[]): Promise<AiProposal>`
  - `listProposals(campaignId, { pageId?, status? }): Promise<AiProposal[]>`
  - `applyProposal(campaignId, userId, proposalId): Promise<{ ok: true; page: ScenarioPage } | { ok: false; status: 404 | 409; error: string }>`
  - `rejectProposal(campaignId, proposalId): Promise<AiProposal | null>`
  - `proposeScenarioEditTool`
  - обробники `listProposalsHandler(req, campaignId)`, `applyProposalHandler(campaignId, proposalId)`, `rejectProposalHandler(campaignId, proposalId)`

- [ ] **Step 1: `proposals.ts`**

```ts
// lib/ai/proposals.ts
import "server-only";

import type { Prisma } from "@prisma/client";

import type { AiToolContext } from "@/lib/ai/tools/define";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { contentWrite, OWNED_WITH_CONTENT_SELECT, readContent, toPage } from "@/lib/server/scenario/page-store";
import { pruneVersions, snapshotIfDue } from "@/lib/server/scenario/versions";
import { applyAiOps } from "@/lib/utils/scenario/ai-ops";
import type { AiProposal, AiProposalStatus, ScenarioAiOp } from "@/types/ai";
import type { ScenarioPage } from "@/types/scenario";

const SELECT = { id: true, pageId: true, threadId: true, summary: true, ops: true, status: true, appliedVersion: true, createdAt: true } as const;

type Row = Prisma.AiProposalGetPayload<{ select: typeof SELECT }>;

const toProposal = (r: Row): AiProposal => ({ ...r, ops: r.ops as unknown as ScenarioAiOp[], status: r.status as AiProposalStatus, createdAt: r.createdAt.toISOString() });

export async function createProposal(ctx: AiToolContext, pageId: string, summary: string, ops: ScenarioAiOp[]): Promise<AiProposal> {
  const row = await prisma.aiProposal.create({ data: { campaignId: ctx.campaignId, threadId: ctx.threadId, pageId, summary, ops: ops as unknown as Prisma.InputJsonValue }, select: SELECT });

  return toProposal(row);
}

export async function listProposals(campaignId: string, filter: { pageId?: string; status?: AiProposalStatus }): Promise<AiProposal[]> {
  const rows = await prisma.aiProposal.findMany({ where: { campaignId, ...filter }, select: SELECT, orderBy: { createdAt: "desc" }, take: 50 });

  return rows.map(toProposal);
}

type ApplyResult = { ok: true; page: ScenarioPage } | { ok: false; status: 404 | 409; error: string };

export async function applyProposal(campaignId: string, userId: string, proposalId: string): Promise<ApplyResult> {
  return prisma.$transaction(async (tx) => {
    const proposal = await tx.aiProposal.findFirst({ where: { id: proposalId, campaignId }, select: SELECT });

    if (!proposal) return { ok: false, status: 404, error: API_ERRORS.AI_PROPOSAL_NOT_FOUND };

    if (proposal.status !== "pending") return { ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_DONE };

    const page = await tx.scenarioPage.findFirst({ where: { id: proposal.pageId, campaignId }, select: OWNED_WITH_CONTENT_SELECT });

    if (!page) return { ok: false, status: 404, error: API_ERRORS.SCENARIO_NOT_FOUND };

    const applied = applyAiOps(readContent(page.content), proposal.ops as unknown as ScenarioAiOp[]);

    if (!applied.ok) {
      await tx.aiProposal.update({ where: { id: proposalId }, data: { status: "stale" } });

      return { ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_STALE };
    }

    await snapshotIfDue(tx, page.id, userId, { force: true });
    await pruneVersions(tx, page.id);

    const { count } = await tx.scenarioPage.updateMany({ where: { id: page.id, version: page.version }, data: { ...contentWrite(page.title, applied.content), version: { increment: 1 } } });

    if (count === 0) return { ok: false, status: 409, error: API_ERRORS.SCENARIO_CONFLICT };

    await tx.aiProposal.update({ where: { id: proposalId }, data: { status: "applied", appliedVersion: page.version + 1 } });

    return { ok: true, page: toPage({ ...page, content: applied.content, version: page.version + 1, updatedAt: new Date() }) };
  });
}

export async function rejectProposal(campaignId: string, proposalId: string): Promise<AiProposal | null> {
  const { count } = await prisma.aiProposal.updateMany({ where: { id: proposalId, campaignId, status: { in: ["pending", "stale"] } }, data: { status: "rejected" } });

  if (count === 0) return null;

  const row = await prisma.aiProposal.findUnique({ where: { id: proposalId }, select: SELECT });

  return row && toProposal(row);
}
```

Звірити: що `OWNED_WITH_CONTENT_SELECT` містить `id`, `title`, `version`, `campaignId` і поля `toPage` (якщо `toPage` вимагає `SUMMARY_SELECT`+`content` — використати `{ ...SUMMARY_SELECT, content: true }`); `snapshotIfDue` приймає `Prisma.TransactionClient` (так, `Db`).

- [ ] **Step 2: Інструмент**

```ts
// lib/ai/tools/propose.ts
import "server-only";

import { AiToolError, defineTool } from "./define";
import { loadPageForAi } from "./scenario-read";

import { createProposal } from "@/lib/ai/proposals";
import { proposeScenarioEditSchema } from "@/lib/schemas/ai";
import { resolveAiOps } from "@/lib/utils/scenario/ai-ops";

export const proposeScenarioEditTool = defineTool({
  name: "propose_scenario_edit",
  title: "Запропонувати правку сценарію",
  description:
    "Propose edits to a scenario page; the DM reviews and applies them. Never paste full rewritten rows into the chat — use this tool. Ops: replaceRow (story and/or notes), insertRow (afterRowId omitted = top of section), addSection (afterSectionId omitted = top of page), renameSection. Text uses the scenario markdown dialect: **bold**, _italic_, ||DM secret||, - lists, ### heading, :::read … ::: (read aloud), :::say … :::, :::callout kind=\"check\" tag=\"Перевірка\" … :::, [@Name](character:id) mentions, {{token:red}}. Read the page first to get section and row ids.",
  input: proposeScenarioEditSchema,
  kind: "propose",
  handler: async (ctx, { pageId, summary, ops }) => {
    const page = await loadPageForAi(ctx.campaignId, pageId);

    const resolved = resolveAiOps(page.content, ops);

    if (!resolved.ok) throw new AiToolError(resolved.error);

    const proposal = await createProposal(ctx, page.id, summary, resolved.ops);

    return { proposalId: proposal.id, status: "pending", note: "ДМ побачить картку пропозиції і застосує або відхилить її" };
  },
});
```

Додати `proposeScenarioEditTool` у `AI_TOOLS`.

- [ ] **Step 3: Обробники і маршрути**

```ts
// app/api/campaigns/[id]/ai/ai-handlers.ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { isAiConfigured } from "@/lib/ai/crypto";
import { applyProposal, listProposals, rejectProposal } from "@/lib/ai/proposals";
import { AI_PROPOSAL_STATUSES } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function aiGuard(campaignId: string) {
  if (!isAiConfigured()) return errorResponse(API_ERRORS.AI_NOT_CONFIGURED, 503);

  return requireDM(campaignId);
}

const listQuery = z.object({ pageId: z.string().min(1).max(40).optional(), status: z.enum(AI_PROPOSAL_STATUSES).optional() });

export async function listProposalsHandler(req: Request, campaignId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const query = listQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));

    if (!query.success) return errorResponse(API_ERRORS.INVALID_QUERY, 400, query.error.issues);

    return NextResponse.json(await listProposals(campaignId, query.data));
  } catch (error) {
    return handleApiError(error, { action: "list ai proposals" });
  }
}

export async function applyProposalHandler(campaignId: string, proposalId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const result = await applyProposal(campaignId, access.userId, proposalId);

    return result.ok ? NextResponse.json(result.page) : errorResponse(result.error, result.status);
  } catch (error) {
    return handleApiError(error, { action: "apply ai proposal" });
  }
}

export async function rejectProposalHandler(campaignId: string, proposalId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const row = await rejectProposal(campaignId, proposalId);

    return row ? NextResponse.json(row) : errorResponse(API_ERRORS.AI_PROPOSAL_DONE, 409);
  } catch (error) {
    return handleApiError(error, { action: "reject ai proposal" });
  }
}
```

```ts
// app/api/campaigns/[id]/ai/proposals/route.ts
import { listProposalsHandler } from "../ai-handlers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return listProposalsHandler(req, (await params).id);
}
```

```ts
// app/api/campaigns/[id]/ai/proposals/[proposalId]/apply/route.ts
import { applyProposalHandler } from "../../../ai-handlers";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; proposalId: string }> }) {
  const { id, proposalId } = await params;

  return applyProposalHandler(id, proposalId);
}
```

`…/reject/route.ts` — так само з `rejectProposalHandler`.

- [ ] **Step 4: Тест API пропозицій**

```ts
// app/api/__tests__/ai-proposals-api.test.ts
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { resolveAiOps } from "@/lib/utils/scenario/ai-ops";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/db", () => {
  const tx = {
    aiProposal: { findFirst: vi.fn(), update: vi.fn() },
    scenarioPage: { findFirst: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    scenarioPageVersion: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(async () => []), deleteMany: vi.fn() },
  };

  return { prisma: { ...tx, $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } };
});

const dm = { userId: "dm", isDM: true, campaign: { id: "camp1" } } as never;

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const content = { legend: [], sections: [{ id: "s1", title: "Собор", played: false, rows: [{ id: "r1", story: doc("Дзвони"), notes: doc("") }] }] };

const page = (over: Record<string, unknown> = {}) => ({ id: "p1", campaignId: "camp1", kind: "scene", arc: null, title: "Монастир", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 3, updatedAt: new Date(), content, ...over });

const ops = () => {
  const r = resolveAiOps(content as never, [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "Дзвони гудуть" }]);

  if (!r.ok) throw new Error(r.error);

  return r.ops;
};

const proposal = (over: Record<string, unknown> = {}) => ({ id: "ap1", pageId: "p1", threadId: "t1", summary: "s", ops: ops(), status: "pending", appliedVersion: null, createdAt: new Date(), ...over });

const params = { params: Promise.resolve({ id: "camp1", proposalId: "ap1" }) } as never;

const apply = async () => (await import("@/app/api/campaigns/[id]/ai/proposals/[proposalId]/apply/route")).POST(new Request("http://x", { method: "POST" }), params);

describe("AI proposals API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_KEYS_SECRET", randomBytes(32).toString("base64"));
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(prisma.aiProposal.findFirst).mockResolvedValue(proposal() as never);
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue(page() as never);
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(page() as never);
    vi.mocked(prisma.scenarioPage.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("не DM — 403", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    expect((await apply()).status).toBe(403);
  });

  it("apply: знімок версії ДО правки, version+1, статус applied", async () => {
    const res = await apply();

    expect(res.status).toBe(200);
    expect((await res.json()).version).toBe(4);
    expect(prisma.scenarioPageVersion.create).toHaveBeenCalled();
    expect(vi.mocked(prisma.scenarioPageVersion.create).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(prisma.scenarioPage.updateMany).mock.invocationCallOrder[0]);
    expect(vi.mocked(prisma.scenarioPage.updateMany).mock.calls[0][0]).toMatchObject({ where: { id: "p1", version: 3 } });
    expect(vi.mocked(prisma.aiProposal.update).mock.calls[0][0]).toMatchObject({ data: { status: "applied", appliedVersion: 4 } });
  });

  it("рядок змінено — 409 stale, сторінка не змінена", async () => {
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue(page({ content: { ...content, sections: [{ ...content.sections[0], rows: [{ id: "r1", story: doc("Дзвони!"), notes: doc("") }] }] } }) as never);

    const res = await apply();

    expect(res.status).toBe(409);
    expect(prisma.scenarioPage.updateMany).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.aiProposal.update).mock.calls[0][0]).toMatchObject({ data: { status: "stale" } });
  });

  it("повторний apply — 409 «вже застосовано», сторінка не змінена", async () => {
    vi.mocked(prisma.aiProposal.findFirst).mockResolvedValue(proposal({ status: "applied", appliedVersion: 4 }) as never);

    const res = await apply();

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Пропозицію вже застосовано або відхилено");
    expect(prisma.scenarioPage.updateMany).not.toHaveBeenCalled();
  });

  it("сторінки немає — 404, статус лишається pending", async () => {
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue(null);

    expect((await apply()).status).toBe(404);
    expect(prisma.aiProposal.update).not.toHaveBeenCalled();
  });

  it("чужа кампанія — 404", async () => {
    vi.mocked(prisma.aiProposal.findFirst).mockResolvedValue(null);

    expect((await apply()).status).toBe(404);
  });
});
```

- [ ] **Step 5: Тест інструмента**

```ts
// lib/ai/tools/__tests__/propose.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({ prisma: { scenarioPage: { findFirst: vi.fn() }, aiProposal: { create: vi.fn() } } }));

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const ctx = { campaignId: "camp1", userId: "dm", threadId: "t1" };

describe("propose_scenario_edit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1", title: "М", kind: "scene", content: { legend: [], sections: [{ id: "s1", title: "Собор", played: false, rows: [{ id: "r1", story: doc("a"), notes: doc("") }] }] } } as never);
    vi.mocked(prisma.aiProposal.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => ({ id: "ap1", ...data, status: "pending", appliedVersion: null, createdAt: new Date() })) as never);
  });

  it("створює pending-пропозицію з threadId і before", async () => {
    const { proposeScenarioEditTool } = await import("@/lib/ai/tools/propose");

    expect(await proposeScenarioEditTool.handler(ctx, { pageId: "p1", summary: "Похмуріше", ops: [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "b" }] })).toMatchObject({ proposalId: "ap1" });

    const data = vi.mocked(prisma.aiProposal.create).mock.calls[0][0].data as Record<string, unknown> & { ops: { before: unknown }[] };

    expect(data).toMatchObject({ campaignId: "camp1", threadId: "t1", pageId: "p1" });
    expect(data.ops[0].before).toEqual({ story: doc("a"), notes: doc("") });
  });

  it("невідомий рядок — AiToolError, нічого не створено", async () => {
    const { proposeScenarioEditTool } = await import("@/lib/ai/tools/propose");

    await expect(proposeScenarioEditTool.handler(ctx, { pageId: "p1", summary: "x", ops: [{ op: "replaceRow", sectionId: "s1", rowId: "zz", story: "b" }] })).rejects.toThrow("zz");
    expect(prisma.aiProposal.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run** `pnpm test:related lib/ai/proposals.ts lib/ai/tools/propose.ts app/api/campaigns/[id]/ai/ai-handlers.ts` → PASS.
- [ ] **Step 7: Commit** `feat(ai): scenario edit proposals — tool, apply with forced version snapshot, routes`.

---

### Task 10: Збирач промпту й автоконтексту

**Files:**
- Create: `lib/ai/context/prompt.ts`
- Test: `lib/ai/context/__tests__/prompt.test.ts`

**Interfaces:**
- Consumes: `loadPageForAi`, `contentToMarkdown`, `sectionToMarkdown` (Task 7); `partySummary`, `showSummary` (Task 8).
- Produces: `buildInstructions(args: { campaignId: string; mode: AiThreadMode; pageId: string | null; focus?: AiFocus }): Promise<string>` — один рядок інструкцій (роль + режим + автоконтекст), обрізаний до `AI_LIMITS.contextChars`; `pickLiveSection(content: ScenarioContent): ScenarioSection | null` — перший незіграний розділ.

- [ ] **Step 1: Тест**

```ts
// lib/ai/context/__tests__/prompt.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({ prisma: { campaign: { findUnique: vi.fn() }, scenarioPage: { findFirst: vi.fn() } } }));
vi.mock("@/lib/ai/tools/party", () => ({ partySummary: vi.fn(async () => [{ id: "c1", name: "Годрик", level: 5, class: "Лицар", race: "Людина", armorClass: 16, notes: "боїться вогню" }]) }));
vi.mock("@/lib/ai/tools/show", () => ({ showSummary: vi.fn(async () => "Слайд: Собор") }));

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const section = (id: string, played: boolean, text: string) => ({ id, title: `Розділ ${id}`, played, rows: [{ id: `r-${id}`, story: doc(text), notes: doc(`нотатка ${id}`) }] });

describe("buildInstructions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ name: "Асхан", description: "Темне фентезі" } as never);
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1", title: "Монастир", kind: "scene", content: { legend: [], sections: [section("s1", true, "зіграний текст"), section("s2", false, "поточний текст"), section("s3", false, "майбутній текст")] } } as never);
  });

  it("live: роль, стислість, партія, показ, поточний розділ повністю, зіграні — лише назвами", async () => {
    const { buildInstructions } = await import("@/lib/ai/context/prompt");

    const out = await buildInstructions({ campaignId: "camp1", mode: "live", pageId: "p1" });

    expect(out).toContain("Асхан");
    expect(out).toContain("українською");
    expect(out).toMatch(/1–5 речень/);
    expect(out).toContain("Годрик");
    expect(out).toContain("Слайд: Собор");
    expect(out).toContain("поточний текст");
    expect(out).toContain("Розділ s1");
    expect(out).not.toContain("зіграний текст");
  });

  it("scenario: вся сторінка + focus", async () => {
    const { buildInstructions } = await import("@/lib/ai/context/prompt");

    const out = await buildInstructions({ campaignId: "camp1", mode: "scenario", pageId: "p1", focus: { pageId: "p1", sectionId: "s3", rowIds: ["r-s3"] } });

    expect(out).toContain("зіграний текст");
    expect(out).toContain("майбутній текст");
    expect(out).toContain("propose_scenario_edit");
    expect(out).toMatch(/Фокус ДМ:.*s3/s);
  });

  it("бюджет: довга сторінка обрізається до contextChars", async () => {
    const { AI_LIMITS } = await import("@/lib/constants/ai");

    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1", title: "М", kind: "scene", content: { legend: [], sections: Array.from({ length: 80 }, (_, i) => section(`x${i}`, false, "слово ".repeat(200))) } } as never);

    const { buildInstructions } = await import("@/lib/ai/context/prompt");

    const out = await buildInstructions({ campaignId: "camp1", mode: "scenario", pageId: "p1" });

    expect(out.length).toBeLessThanOrEqual(AI_LIMITS.contextChars + 2000);
    expect(out).toContain("[обрізано]");
  });

  it("без сторінки — тільки роль, режим, партія", async () => {
    const { buildInstructions } = await import("@/lib/ai/context/prompt");

    const out = await buildInstructions({ campaignId: "camp1", mode: "live", pageId: null });

    expect(out).toContain("Годрик");
    expect(prisma.scenarioPage.findFirst).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Реалізація**

```ts
// lib/ai/context/prompt.ts
import "server-only";

import { partySummary } from "@/lib/ai/tools/party";
import { contentToMarkdown, loadPageForAi, sectionToMarkdown } from "@/lib/ai/tools/scenario-read";
import { showSummary } from "@/lib/ai/tools/show";
import { AI_LIMITS, type AiThreadMode } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import type { AiFocus } from "@/types/ai";
import type { ScenarioContent, ScenarioSection } from "@/types/scenario";

const MODE_RULES: Record<AiThreadMode, string> = {
  scenario: [
    "Режим: співавтор сценарію.",
    "Ідеї, варіанти, питання — текстом у чаті.",
    "Будь-яку зміну тексту сторінки пропонуй ЛИШЕ через інструмент propose_scenario_edit з коротким summary; не вставляй у чат готові переписані рядки.",
    "Перед правкою прочитай сторінку (read_scenario_page), щоб мати id розділів і рядків. Зберігай стиль і розмітку автора.",
  ].join("\n"),
  live: [
    "Режим: живий помічник під час гри. Відповідай стисло, 1–5 речень, без вступів.",
    "Питання про правила, юнітів, заклинання — спершу знайди в довіднику (search_reference / read_reference), не вигадуй цифр.",
    "Стан бою — через get_battle_state.",
  ].join("\n"),
};

const clipTo = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}\n…[обрізано]` : text);

export const pickLiveSection = (content: ScenarioContent): ScenarioSection | null => content.sections.find((s) => !s.played) ?? null;

function liveScene(title: string, content: ScenarioContent): string {
  const current = pickLiveSection(content);

  const played = content.sections.filter((s) => s.played).map((s) => s.title);

  return [`Сцена: ${title}`, played.length && `Уже зіграно: ${played.join(", ")}`, current ? `Поточний розділ:\n${sectionToMarkdown(current)}` : "Усі розділи зіграно."].filter(Boolean).join("\n\n");
}

export async function buildInstructions({ campaignId, mode, pageId, focus }: { campaignId: string; mode: AiThreadMode; pageId: string | null; focus?: AiFocus }): Promise<string> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { name: true, description: true } });

  const role = [
    `Ти — помічник Майстра (ДМ) у настільній рольовій кампанії «${campaign?.name ?? ""}».`,
    campaign?.description && `Опис кампанії: ${campaign.description}`,
    "Відповідай українською. Ти говориш лише з ДМ: нотатки і ||секрети|| можна обговорювати відкрито, гравці цього чату не бачать.",
    "Текст сценарію записаний markdown-діалектом: **жирний**, _курсив_, ||секрет ДМ||, :::read … ::: (читати вголос), :::say … :::, :::callout … :::, [@Ім'я](character:id).",
  ].filter(Boolean).join("\n");

  const [party, show] = await Promise.all([partySummary(campaignId), mode === "live" ? showSummary(campaignId) : Promise.resolve(null)]);

  const partyText = party.length ? `Партія:\n${party.map((p) => `- ${p.name} [${p.id}]: рів. ${p.level}, ${p.race}, ${p.class}, AC ${p.armorClass}${p.notes ? `; нотатки: ${p.notes}` : ""}`).join("\n")}` : "";

  let sceneText = "";

  if (pageId) {
    const page = await loadPageForAi(campaignId, pageId).catch(() => null);

    if (page) sceneText = mode === "live" ? liveScene(page.title, page.content) : `Сторінка, яку редагує ДМ (id ${page.id}):\n\n${contentToMarkdown(page.title, page.content)}`;
  }

  const focusText = focus ? `Фокус ДМ: сторінка ${focus.pageId}${focus.sectionId ? `, розділ ${focus.sectionId}` : ""}${focus.rowIds?.length ? `, рядки ${focus.rowIds.join(", ")}` : ""}.` : "";

  const fixed = [role, MODE_RULES[mode], partyText, show && `Показ:\n${show}`, focusText].filter(Boolean).join("\n\n");

  return [fixed, sceneText && clipTo(sceneText, Math.max(0, AI_LIMITS.contextChars - fixed.length))].filter(Boolean).join("\n\n");
}
```

- [ ] **Step 3: Run** → PASS. **Step 4: Commit** `feat(ai): instructions and scene auto-context with a size budget`.

---

### Task 11: Треди й повідомлення — сховище і маршрути

**Files:**
- Create: `lib/ai/threads.ts`, `app/api/campaigns/[id]/ai/threads/route.ts`, `…/threads/[threadId]/route.ts`, `…/threads/[threadId]/messages/route.ts`
- Modify: `app/api/campaigns/[id]/ai/ai-handlers.ts` (обробники тредів)
- Test: `app/api/__tests__/ai-threads-api.test.ts`

**Interfaces:**
- Produces:
  - `listThreads(campaignId, userId, pageId?: string): Promise<AiThread[]>`
  - `createThread(campaignId, userId, input: { mode; scenarioPageId?; provider; model? }): Promise<AiThread>` — `model` за замовчуванням: `defaultModel` ключа провайдера, якщо він `isKnownModel`, інакше `defaultModelFor(provider, mode)`; `title` = «Новий тред»
  - `loadThread(campaignId, userId, threadId): Promise<AiThread | null>`
  - `patchThread(...)`, `deleteThread(...)`
  - `loadMessages(threadId, limit = AI_LIMITS.historyMessages): Promise<AiChatMessage[]>` (останні `limit` у хронологічному порядку)
  - `appendMessage(threadId, message: { id?: string; role; parts; metadata? }): Promise<void>` — `seq` = max+1 у транзакції; при першому повідомленні користувача тред отримує `title` = перші 60 символів тексту
  - `threadUsage(threadId): Promise<AiUsage>` — сума з `metadata.usage`
  - обробники `listThreadsHandler`, `createThreadHandler`, `patchThreadHandler`, `deleteThreadHandler`, `listMessagesHandler`

- [ ] **Step 1: Тест** (ключові кейси)

```ts
// app/api/__tests__/ai-threads-api.test.ts
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    aiThread: { findMany: vi.fn(async () => []), create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    aiMessage: { findMany: vi.fn(async () => []) },
    aiCredential: { findUnique: vi.fn() },
    scenarioPage: { findFirst: vi.fn() },
  },
}));

const dm = { userId: "dm", isDM: true, campaign: { id: "camp1" } } as never;

const req = (method: string, body?: unknown, url = "http://x") => new Request(url, { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const params = (extra: Record<string, string> = {}) => ({ params: Promise.resolve({ id: "camp1", ...extra }) }) as never;

const threadRow = (over: Record<string, unknown> = {}) => ({ id: "t1", campaignId: "camp1", userId: "dm", mode: "live", scenarioPageId: "p1", title: "Новий тред", provider: "anthropic", model: "claude-haiku-4-5-20251001", createdAt: new Date(), updatedAt: new Date(), ...over });

describe("AI threads API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_KEYS_SECRET", randomBytes(32).toString("base64"));
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.aiThread.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => threadRow(data)) as never);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("гравець — 403", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    const { GET } = await import("@/app/api/campaigns/[id]/ai/threads/route");

    expect((await GET(req("GET"), params())).status).toBe(403);
  });

  it("POST live без моделі — fast-модель провайдера", async () => {
    const { POST } = await import("@/app/api/campaigns/[id]/ai/threads/route");

    const res = await POST(req("POST", { mode: "live", scenarioPageId: "p1", provider: "anthropic" }), params());

    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.aiThread.create).mock.calls[0][0].data).toMatchObject({ campaignId: "camp1", userId: "dm", model: "claude-haiku-4-5-20251001" });
  });

  it("POST з defaultModel ключа — бере його", async () => {
    vi.mocked(prisma.aiCredential.findUnique).mockResolvedValue({ defaultModel: "claude-opus-5-5" } as never);

    const { POST } = await import("@/app/api/campaigns/[id]/ai/threads/route");

    await POST(req("POST", { mode: "live", provider: "anthropic" }), params());
    expect(vi.mocked(prisma.aiThread.create).mock.calls[0][0].data).toMatchObject({ model: "claude-opus-5-5" });
  });

  it("POST зі сторінкою іншої кампанії — 404", async () => {
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue(null);

    const { POST } = await import("@/app/api/campaigns/[id]/ai/threads/route");

    expect((await POST(req("POST", { mode: "scenario", scenarioPageId: "foreign", provider: "anthropic" }), params())).status).toBe(404);
  });

  it("PATCH невідомої моделі — 400", async () => {
    vi.mocked(prisma.aiThread.findFirst).mockResolvedValue(threadRow() as never);

    const { PATCH } = await import("@/app/api/campaigns/[id]/ai/threads/[threadId]/route");

    expect((await PATCH(req("PATCH", { model: "gpt-x" }), params({ threadId: "t1" }))).status).toBe(400);
  });

  it("чужий тред — 404 на повідомлення", async () => {
    vi.mocked(prisma.aiThread.findFirst).mockResolvedValue(null);

    const { GET } = await import("@/app/api/campaigns/[id]/ai/threads/[threadId]/messages/route");

    expect((await GET(req("GET"), params({ threadId: "t9" }))).status).toBe(404);
  });
});
```

- [ ] **Step 2: `lib/ai/threads.ts`**

```ts
// lib/ai/threads.ts
import "server-only";

import type { Prisma } from "@prisma/client";

import { type AiProvider, type AiThreadMode, defaultModelFor, isKnownModel } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import type { AiChatMessage, AiMessageMetadata, AiThread, AiUsage } from "@/types/ai";

const SELECT = { id: true, mode: true, scenarioPageId: true, title: true, provider: true, model: true, updatedAt: true } as const;

type Row = Prisma.AiThreadGetPayload<{ select: typeof SELECT }>;

const ZERO: AiUsage = { inputTokens: 0, outputTokens: 0 };

const toThread = (r: Row, usage: AiUsage = ZERO): AiThread => ({ ...r, mode: r.mode as AiThreadMode, provider: r.provider as AiProvider, updatedAt: r.updatedAt.toISOString(), usage });

export async function listThreads(campaignId: string, userId: string, pageId?: string): Promise<AiThread[]> {
  const rows = await prisma.aiThread.findMany({ where: { campaignId, userId, ...(pageId && { scenarioPageId: pageId }) }, select: SELECT, orderBy: { updatedAt: "desc" }, take: 30 });

  return rows.map((r) => toThread(r));
}

export async function createThread(campaignId: string, userId: string, input: { mode: AiThreadMode; scenarioPageId?: string | null; provider: AiProvider; model?: string }): Promise<AiThread> {
  let model = input.model;

  if (!model) {
    const cred = await prisma.aiCredential.findUnique({ where: { userId_provider: { userId, provider: input.provider } }, select: { defaultModel: true } });

    model = cred?.defaultModel && isKnownModel(input.provider, cred.defaultModel) ? cred.defaultModel : defaultModelFor(input.provider, input.mode);
  }

  const row = await prisma.aiThread.create({ data: { campaignId, userId, mode: input.mode, scenarioPageId: input.scenarioPageId ?? null, provider: input.provider, model, title: "Новий тред" }, select: SELECT });

  return toThread(row);
}

export async function loadThread(campaignId: string, userId: string, threadId: string): Promise<AiThread | null> {
  const row = await prisma.aiThread.findFirst({ where: { id: threadId, campaignId, userId }, select: SELECT });

  return row ? toThread(row, await threadUsage(threadId)) : null;
}

export async function patchThread(campaignId: string, userId: string, threadId: string, data: { title?: string; provider?: AiProvider; model?: string }): Promise<AiThread | null> {
  const { count } = await prisma.aiThread.updateMany({ where: { id: threadId, campaignId, userId }, data });

  return count ? loadThread(campaignId, userId, threadId) : null;
}

export async function deleteThread(campaignId: string, userId: string, threadId: string): Promise<boolean> {
  return (await prisma.aiThread.deleteMany({ where: { id: threadId, campaignId, userId } })).count > 0;
}

export async function loadMessages(threadId: string, limit: number): Promise<AiChatMessage[]> {
  const rows = await prisma.aiMessage.findMany({ where: { threadId }, orderBy: { seq: "desc" }, take: limit, select: { id: true, role: true, parts: true, metadata: true } });

  return rows.reverse().map((r) => ({ id: r.id, role: r.role as "user" | "assistant", parts: r.parts as unknown[], metadata: r.metadata as AiMessageMetadata }));
}

const textOf = (parts: unknown[]) => parts.map((p) => (p && typeof p === "object" && (p as { type?: string }).type === "text" ? String((p as { text?: string }).text ?? "") : "")).join(" ").trim();

export async function appendMessage(threadId: string, message: { id?: string; role: "user" | "assistant"; parts: unknown[]; metadata?: AiMessageMetadata }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const last = await tx.aiMessage.findFirst({ where: { threadId }, orderBy: { seq: "desc" }, select: { seq: true } });

    await tx.aiMessage.create({ data: { ...(message.id && { id: message.id }), threadId, seq: (last?.seq ?? 0) + 1, role: message.role, parts: message.parts as Prisma.InputJsonValue, metadata: (message.metadata ?? {}) as Prisma.InputJsonValue } });

    const title = !last && message.role === "user" ? textOf(message.parts).slice(0, 60) : undefined;

    await tx.aiThread.update({ where: { id: threadId }, data: { updatedAt: new Date(), ...(title && { title }) } });
  });
}

export async function threadUsage(threadId: string): Promise<AiUsage> {
  const rows = await prisma.aiMessage.findMany({ where: { threadId, role: "assistant" }, select: { metadata: true } });

  return rows.reduce<AiUsage>((acc, r) => {
    const u = (r.metadata as AiMessageMetadata | null)?.usage;

    return u ? { inputTokens: acc.inputTokens + u.inputTokens, outputTokens: acc.outputTokens + u.outputTokens } : acc;
  }, ZERO);
}
```

(Для `threadUsage` на великій кількості повідомлень — прийнятно: ліміт треду не потрібен у першій версії; якщо тест на моках вимагає `aiMessage.findMany` з різними аргументами — мокати `mockImplementation` за `where.role`.)

- [ ] **Step 3: Обробники** — дописати в `ai-handlers.ts`:

```ts
// додати імпорти: createThread, deleteThread, listThreads, loadMessages, loadThread, patchThread з "@/lib/ai/threads";
// createThreadSchema, patchThreadSchema з "@/lib/schemas/ai"; AI_LIMITS, defaultModelFor, isKnownModel з "@/lib/constants/ai"; prisma з "@/lib/db"; parseBody з "@/lib/utils/api/parse-body"

export async function listThreadsHandler(req: Request, campaignId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const pageId = new URL(req.url).searchParams.get("pageId") ?? undefined;

    return NextResponse.json(await listThreads(campaignId, access.userId, pageId));
  } catch (error) {
    return handleApiError(error, { action: "list ai threads" });
  }
}

export async function createThreadHandler(req: Request, campaignId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(createThreadSchema, req);

    if (body instanceof NextResponse) return body;

    if (body.model && !isKnownModel(body.provider, body.model)) return errorResponse(API_ERRORS.AI_MODEL_UNKNOWN, 400);

    if (body.scenarioPageId && !(await prisma.scenarioPage.findFirst({ where: { id: body.scenarioPageId, campaignId }, select: { id: true } }))) return errorResponse(API_ERRORS.SCENARIO_NOT_FOUND, 404);

    return NextResponse.json(await createThread(campaignId, access.userId, body), { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create ai thread" });
  }
}

export async function patchThreadHandler(req: Request, campaignId: string, threadId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(patchThreadSchema, req);

    if (body instanceof NextResponse) return body;

    const current = await loadThread(campaignId, access.userId, threadId);

    if (!current) return errorResponse(API_ERRORS.AI_THREAD_NOT_FOUND, 404);

    const provider = body.provider ?? current.provider;

    // switching provider without a model picks that provider's default for the thread mode
    const model = body.model ?? (provider === current.provider ? current.model : defaultModelFor(provider, current.mode));

    if (!isKnownModel(provider, model)) return errorResponse(API_ERRORS.AI_MODEL_UNKNOWN, 400);

    return NextResponse.json(await patchThread(campaignId, access.userId, threadId, { ...body, provider, model }));
  } catch (error) {
    return handleApiError(error, { action: "patch ai thread" });
  }
}

export async function deleteThreadHandler(campaignId: string, threadId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    return (await deleteThread(campaignId, access.userId, threadId)) ? NextResponse.json({ ok: true }) : errorResponse(API_ERRORS.AI_THREAD_NOT_FOUND, 404);
  } catch (error) {
    return handleApiError(error, { action: "delete ai thread" });
  }
}

export async function listMessagesHandler(campaignId: string, threadId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const thread = await loadThread(campaignId, access.userId, threadId);

    if (!thread) return errorResponse(API_ERRORS.AI_THREAD_NOT_FOUND, 404);

    return NextResponse.json({ thread, messages: await loadMessages(threadId, AI_LIMITS.historyMessages * 2) });
  } catch (error) {
    return handleApiError(error, { action: "list ai messages" });
  }
}
```

Маршрути: `threads/route.ts` (GET → `listThreadsHandler(req, id)`, POST → `createThreadHandler`), `threads/[threadId]/route.ts` (PATCH, DELETE), `threads/[threadId]/messages/route.ts` (GET) — тонкі, як у Task 9.

- [ ] **Step 4: Run** `pnpm test:run app/api/__tests__/ai-threads-api.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(ai): chat threads and messages storage and routes`.

---

### Task 12: Чат-пайплайн і стрім-маршрут

**Files:**
- Create: `lib/ai/chat/run-chat.ts`, `app/api/campaigns/[id]/ai/threads/[threadId]/chat/route.ts`
- Test: `lib/ai/chat/__tests__/run-chat.test.ts`

**Interfaces:**
- Consumes: `loadThread`, `loadMessages`, `appendMessage` (Task 11); `loadApiKey` (Task 4); `createModel` (Task 4); `aiErrorMessage` (Task 4); `buildInstructions` (Task 10); `toAiSdkTools` (Task 7).
- Produces: `runChat(args: { campaignId: string; userId: string; threadId: string; text: string; focus?: AiFocus; abortSignal?: AbortSignal }, deps?: { model?: LanguageModel }): Promise<Response>` — повертає готовий `Response` (UI message stream або JSON-помилку). `deps.model` — для тестів (`MockLanguageModelV4`).
- Повідомлення історії для моделі: `compactHistory(messages: AiChatMessage[]): AiChatMessage[]` (експорт для тесту) — у повідомленнях, старших за останні `AI_LIMITS.fullToolResultsInLast`, `output` інструментів замінюється рядком `"[результат інструменту стиснуто]"`.

- [ ] **Step 1: Тест**

```ts
// lib/ai/chat/__tests__/run-chat.test.ts
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/threads", () => ({ loadThread: vi.fn(), loadMessages: vi.fn(async () => []), appendMessage: vi.fn() }));
vi.mock("@/lib/ai/credentials", () => ({ loadApiKey: vi.fn(async () => "sk-test") }));
vi.mock("@/lib/ai/context/prompt", () => ({ buildInstructions: vi.fn(async () => "ІНСТРУКЦІЇ") }));
vi.mock("@/lib/ai/tools", () => ({ toAiSdkTools: vi.fn(() => ({})) }));

const thread = { id: "t1", mode: "live", scenarioPageId: "p1", title: "x", provider: "anthropic", model: "claude-haiku-4-5-20251001", updatedAt: "", usage: { inputTokens: 0, outputTokens: 0 } };

const textModel = (text: string) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "1" },
          { type: "text-delta", id: "1", delta: text },
          { type: "text-end", id: "1" },
          { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 5, text: 5, reasoning: 0 } } },
        ],
      }),
    }),
  });

const args = { campaignId: "camp1", userId: "dm", threadId: "t1", text: "Хто охороняє браму?" };

describe("runChat", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { loadThread } = await import("@/lib/ai/threads");

    vi.mocked(loadThread).mockResolvedValue(thread as never);
  });

  it("стрімить відповідь, зберігає повідомлення користувача ДО стріму і відповідь з usage", async () => {
    const { runChat } = await import("@/lib/ai/chat/run-chat");
    const { appendMessage } = await import("@/lib/ai/threads");

    const res = await runChat(args, { model: textModel("Двоє вартових.") });

    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Двоє вартових.");
    expect(vi.mocked(appendMessage).mock.calls[0][1]).toMatchObject({ role: "user", parts: [{ type: "text", text: "Хто охороняє браму?" }] });

    const assistant = vi.mocked(appendMessage).mock.calls.find((c) => c[1].role === "assistant")?.[1];

    expect(assistant?.metadata?.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it("лише текст → жодної пропозиції (propose не викликано)", async () => {
    const { runChat } = await import("@/lib/ai/chat/run-chat");

    await (await runChat(args, { model: textModel("Ось переписаний рядок: …") })).text();

    const { toAiSdkTools } = await import("@/lib/ai/tools");

    expect(toAiSdkTools).toHaveBeenCalledWith({ campaignId: "camp1", userId: "dm", threadId: "t1" });
  });

  it("чужий тред — 404", async () => {
    const { loadThread } = await import("@/lib/ai/threads");

    vi.mocked(loadThread).mockResolvedValue(null);

    const { runChat } = await import("@/lib/ai/chat/run-chat");

    expect((await runChat(args)).status).toBe(404);
  });

  it("ключ видалено — 400 «Додайте ключ», модель не викликається", async () => {
    const { loadApiKey } = await import("@/lib/ai/credentials");

    vi.mocked(loadApiKey).mockResolvedValue(null);

    const { runChat } = await import("@/lib/ai/chat/run-chat");

    const res = await runChat(args);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Додайте ключ");
  });

  it("помилка провайдера → український текст у стрімі, без тексту оригіналу", async () => {
    const { APICallError } = await import("ai");

    const failing = new MockLanguageModelV4({ doStream: async () => { throw new APICallError({ message: "invalid x-api-key sk-test", url: "u", requestBodyValues: {}, statusCode: 401, isRetryable: false }); } });

    const { runChat } = await import("@/lib/ai/chat/run-chat");

    const body = await (await runChat(args, { model: failing })).text();

    expect(body).toContain("Ключ недійсний");
    expect(body).not.toContain("sk-test");
  });

  it("compactHistory стискає старі результати інструментів", async () => {
    const { compactHistory } = await import("@/lib/ai/chat/run-chat");

    const toolMsg = (id: string) => ({ id, role: "assistant" as const, parts: [{ type: "tool-read_scenario_page", toolCallId: id, state: "output-available", input: {}, output: "ДОВГИЙ ТЕКСТ" }] });

    const msgs = Array.from({ length: 10 }, (_, i) => toolMsg(`m${i}`));

    const out = compactHistory(msgs);

    expect(JSON.stringify(out[0])).not.toContain("ДОВГИЙ ТЕКСТ");
    expect(JSON.stringify(out[9])).toContain("ДОВГИЙ ТЕКСТ");
  });
});
```

Форма чанків `MockLanguageModelV4` (`usage`, `finishReason`) — звірити з `node_modules/ai/docs/03-ai-sdk-core/55-testing.mdx` і підлаштувати.

- [ ] **Step 2: Реалізація**

```ts
// lib/ai/chat/run-chat.ts
import "server-only";

import { convertToModelMessages, createUIMessageStreamResponse, isStepCount, type LanguageModel, streamText, toUIMessageStream, type UIMessage } from "ai";

import { buildInstructions } from "@/lib/ai/context/prompt";
import { loadApiKey } from "@/lib/ai/credentials";
import { aiErrorMessage } from "@/lib/ai/errors";
import { createModel } from "@/lib/ai/providers";
import { appendMessage, loadMessages, loadThread } from "@/lib/ai/threads";
import { toAiSdkTools } from "@/lib/ai/tools";
import { AI_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { errorResponse } from "@/lib/utils/api/api-response";
import type { AiChatMessage, AiFocus, AiMessageMetadata } from "@/types/ai";

const COMPACTED = "[результат інструменту стиснуто]";

const isToolPart = (p: unknown): p is { type: string; output?: unknown } => !!p && typeof p === "object" && String((p as { type?: string }).type).startsWith("tool-");

export function compactHistory(messages: AiChatMessage[]): AiChatMessage[] {
  const keepFrom = messages.length - AI_LIMITS.fullToolResultsInLast;

  return messages.map((m, i) => (i >= keepFrom ? m : { ...m, parts: m.parts.map((p) => (isToolPart(p) && "output" in p ? { ...p, output: COMPACTED } : p)) }));
}

type RunChatArgs = { campaignId: string; userId: string; threadId: string; text: string; focus?: AiFocus; abortSignal?: AbortSignal };

export async function runChat({ campaignId, userId, threadId, text, focus, abortSignal }: RunChatArgs, deps: { model?: LanguageModel } = {}): Promise<Response> {
  const thread = await loadThread(campaignId, userId, threadId);

  if (!thread) return errorResponse(API_ERRORS.AI_THREAD_NOT_FOUND, 404);

  let model = deps.model;

  if (!model) {
    const apiKey = await loadApiKey(userId, thread.provider);

    if (!apiKey) return errorResponse(API_ERRORS.AI_KEY_MISSING, 400);

    model = createModel(thread.provider, apiKey, thread.model);
  }

  const userMessage: UIMessage = { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] };

  await appendMessage(threadId, userMessage);

  const history = compactHistory(await loadMessages(threadId, AI_LIMITS.historyMessages)) as unknown as UIMessage[];

  const tools = toAiSdkTools({ campaignId, userId, threadId });

  const instructions = await buildInstructions({ campaignId, mode: thread.mode, pageId: focus?.pageId ?? thread.scenarioPageId, focus });

  const result = streamText({
    model,
    instructions: { role: "system", content: instructions, providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } },
    messages: await convertToModelMessages(history, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: isStepCount(AI_LIMITS.maxSteps),
    abortSignal,
  });

  let usage: AiMessageMetadata["usage"];

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      originalMessages: history,
      onError: (error) => aiErrorMessage(error),
      messageMetadata: ({ part }) => {
        if (part.type === "finish") {
          usage = { inputTokens: part.totalUsage.inputTokens ?? 0, outputTokens: part.totalUsage.outputTokens ?? 0 };

          return { usage, model: thread.model } satisfies AiMessageMetadata;
        }

        return undefined;
      },
      onEnd: async ({ messages }) => {
        const last = messages[messages.length - 1];

        if (last?.role === "assistant" && last.id !== userMessage.id) await appendMessage(threadId, { id: last.id, role: "assistant", parts: last.parts, metadata: { usage, model: thread.model } });
      },
    }),
  });
}
```

Звірити з `node_modules/ai`: опції `convertToModelMessages` (наявність `ignoreIncompleteToolCalls`; якщо немає — прибрати), тип `instructions` (рядок | `SystemModelMessage`), поля `part.totalUsage` у `messageMetadata`, наявність `onEnd` і що `onEnd` викликається й при `abortSignal` (якщо ні — додати `onAbort`/`isAborted` гілку, щоб зберегти частковий текст). Якщо `toUIMessageStream` вимагає `generateMessageId` для стабільних id — передати `generateMessageId: () => crypto.randomUUID()`.

- [ ] **Step 3: Маршрут**

```ts
// app/api/campaigns/[id]/ai/threads/[threadId]/chat/route.ts
import { NextResponse } from "next/server";

import { aiGuard } from "../../../ai-handlers";

import { runChat } from "@/lib/ai/chat/run-chat";
import { chatRequestSchema } from "@/lib/schemas/ai";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string; threadId: string }> }) {
  try {
    const { id, threadId } = await params;

    const access = await aiGuard(id);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(chatRequestSchema, req);

    if (body instanceof NextResponse) return body;

    return await runChat({ campaignId: id, userId: access.userId, threadId, text: body.text, focus: body.focus, abortSignal: req.signal });
  } catch (error) {
    return handleApiError(error, { action: "ai chat" });
  }
}
```

- [ ] **Step 4: Run** `pnpm test:run lib/ai/chat/__tests__/run-chat.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(ai): streaming chat pipeline with tools, history compaction and usage`.

---

### Task 13: API-токени, MCP-маршрут, виняток CSRF

**Files:**
- Create: `lib/ai/api-tokens.ts`, `app/api/campaigns/[id]/api-tokens/route.ts`, `…/api-tokens/[tokenId]/route.ts`, `app/api/campaigns/[id]/api-tokens/token-handlers.ts`, `app/api/mcp/route.ts`
- Modify: `lib/supabase/middleware.ts`
- Test: `app/api/__tests__/api-tokens-mcp.test.ts`, тест CSRF — дописати кейс у наявний тест `rejectCrossOriginMutation` (знайти `grep -rl rejectCrossOriginMutation lib app --include=*.test.ts`)

**Interfaces:**
- Consumes: `registerMcpTools` (Task 7); `isDmMember` (`lib/utils/api/is-dm.ts`).
- Produces: `createApiToken(campaignId, userId, name): Promise<CreatedApiToken>`, `listApiTokens(campaignId, userId): Promise<ApiTokenSummary[]>`, `revokeApiToken(campaignId, userId, tokenId): Promise<boolean>`, `verifyApiToken(raw: string): Promise<{ campaignId: string; userId: string } | null>`, `hashToken(raw: string): string`.

- [ ] **Step 1: `api-tokens.ts`**

```ts
// lib/ai/api-tokens.ts
import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { API_TOKEN_PREFIX, API_TOKEN_SCOPES } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import { isDmMember } from "@/lib/utils/api/is-dm";
import type { ApiTokenSummary, CreatedApiToken } from "@/types/ai";

const SELECT = { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true } as const;

const LAST_USED_THROTTLE_MS = 60_000;

export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

const toSummary = (r: { id: string; name: string; prefix: string; lastUsedAt: Date | null; createdAt: Date }): ApiTokenSummary => ({ ...r, lastUsedAt: r.lastUsedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() });

export async function createApiToken(campaignId: string, userId: string, name: string): Promise<CreatedApiToken> {
  const token = `${API_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;

  const row = await prisma.apiToken.create({ data: { campaignId, userId, name, tokenHash: hashToken(token), prefix: token.slice(0, API_TOKEN_PREFIX.length + 4), scopes: [...API_TOKEN_SCOPES] }, select: SELECT });

  return { ...toSummary(row), token };
}

export async function listApiTokens(campaignId: string, userId: string): Promise<ApiTokenSummary[]> {
  const rows = await prisma.apiToken.findMany({ where: { campaignId, userId, revokedAt: null }, select: SELECT, orderBy: { createdAt: "desc" } });

  return rows.map(toSummary);
}

export async function revokeApiToken(campaignId: string, userId: string, tokenId: string): Promise<boolean> {
  return (await prisma.apiToken.updateMany({ where: { id: tokenId, campaignId, userId, revokedAt: null }, data: { revokedAt: new Date() } })).count > 0;
}

export async function verifyApiToken(raw: string): Promise<{ campaignId: string; userId: string } | null> {
  if (!raw.startsWith(API_TOKEN_PREFIX)) return null;

  const row = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(raw) }, select: { id: true, campaignId: true, userId: true, revokedAt: true, lastUsedAt: true } });

  if (!row || row.revokedAt) return null;

  const members = await prisma.campaignMember.findMany({ where: { campaignId: row.campaignId, userId: row.userId }, select: { userId: true, role: true } });

  if (!isDmMember(members)) return null;

  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS) await prisma.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });

  return { campaignId: row.campaignId, userId: row.userId };
}
```

Звірити сигнатуру `isDmMember` у `lib/utils/api/is-dm.ts` і назву моделі учасників (`campaignMember`).

- [ ] **Step 2: MCP-маршрут**

```ts
// app/api/mcp/route.ts
import { createMcpHandler } from "mcp-handler";

import { verifyApiToken } from "@/lib/ai/api-tokens";
import { registerMcpTools } from "@/lib/ai/tools";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { errorResponse } from "@/lib/utils/api/api-response";

export const maxDuration = 60;

// stateless: a handler per request, closed over the token's campaign
async function handler(req: Request): Promise<Response> {
  const raw = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  const auth = raw ? await verifyApiToken(raw) : null;

  if (!auth) return errorResponse(API_ERRORS.UNAUTHORIZED, 401);

  const mcp = createMcpHandler((server) => registerMcpTools(server, { campaignId: auth.campaignId, userId: auth.userId, threadId: null }), { serverInfo: { name: "dnd-tracker", version: "1.0.0" } });

  return mcp(req);
}

export { handler as DELETE, handler as GET, handler as POST };
```

Звірити ім'я опції `serverInfo` у `McpHandlerOptions` (`node_modules/mcp-handler/dist/index.d.ts`).

- [ ] **Step 3: CSRF-виняток** — у `lib/supabase/middleware.ts`, функція `rejectCrossOriginMutation`, одразу після перевірки шляху `/api/`:

```ts
  // bearer-only, never reads cookies — browser MCP clients send a foreign Origin
  if (pathname.startsWith("/api/mcp")) return null;
```

Тест: у наявному тесті CSRF додати кейс — `POST /api/mcp` з `Origin: https://evil.example` → `null`; `POST /api/campaigns/x/ai/threads` з тим самим Origin → відповідь 403.

- [ ] **Step 4: Маршрути токенів** — `token-handlers.ts` з `listApiTokensHandler`, `createApiTokenHandler` (`parseBody(createApiTokenSchema)`, 201 з `CreatedApiToken`), `revokeApiTokenHandler` (404 `API_TOKEN_NOT_FOUND`), усі через `requireDM` (без `isAiConfigured` — токени не залежать від ключа шифрування); тонкі `route.ts` у `api-tokens/` і `api-tokens/[tokenId]/`.

- [ ] **Step 5: Тест**

```ts
// app/api/__tests__/api-tokens-mcp.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashToken } from "@/lib/ai/api-tokens";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    apiToken: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    campaignMember: { findMany: vi.fn() },
  },
}));

const mcpReq = (token?: string) => new Request("http://x/api/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(token && { authorization: `Bearer ${token}` }) }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }) });

describe("API tokens + MCP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([{ userId: "dm", role: "dm" }] as never);
  });

  it("створення: у БД лише хеш, токен з префіксом повертається один раз", async () => {
    vi.mocked(prisma.apiToken.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => ({ id: "k1", name: data.name, prefix: data.prefix, lastUsedAt: null, createdAt: new Date() })) as never);

    const { createApiToken } = await import("@/lib/ai/api-tokens");

    const created = await createApiToken("camp1", "dm", "Claude Desktop");

    expect(created.token).toMatch(/^dndt_/);

    const data = vi.mocked(prisma.apiToken.create).mock.calls[0][0].data as Record<string, unknown>;

    expect(data.tokenHash).toBe(hashToken(created.token));
    expect(JSON.stringify(data)).not.toContain(created.token);
  });

  it("MCP без токена — 401", async () => {
    const { POST } = await import("@/app/api/mcp/route");

    expect((await POST(mcpReq())).status).toBe(401);
  });

  it("відкликаний токен — 401", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: new Date(), lastUsedAt: null } as never);

    const { POST } = await import("@/app/api/mcp/route");

    expect((await POST(mcpReq("dndt_abc"))).status).toBe(401);
  });

  it("власник більше не ДМ — 401", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: null } as never);
    vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([{ userId: "dm", role: "player" }] as never);

    const { POST } = await import("@/app/api/mcp/route");

    expect((await POST(mcpReq("dndt_abc"))).status).toBe(401);
  });

  it("валідний токен — tools/list містить інструменти реєстру", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: new Date() } as never);

    const { POST } = await import("@/app/api/mcp/route");

    const res = await POST(mcpReq("dndt_abc"));

    expect(res.status).toBe(200);
    expect(await res.text()).toContain("read_scenario_page");
  });
});
```

(Останній кейс може вимагати `initialize` перед `tools/list` у легасі-режимі; якщо 2026-протокол stateless приймає `tools/list` одразу — ок, інакше надіслати спершу `initialize` за прикладом із README `mcp-handler`.)

- [ ] **Step 6: Run** `pnpm test:related lib/ai/api-tokens.ts app/api/mcp/route.ts lib/supabase/middleware.ts` → PASS.
- [ ] **Step 7: Commit** `feat(ai): campaign API tokens and MCP server at /api/mcp`.

---

### Task 14: Клієнтський API і хуки

**Files:**
- Create: `lib/api/ai.ts`, `lib/hooks/ai/keys.ts`, `lib/hooks/ai/index.ts`, `lib/hooks/ai/useAiCredentials.ts`, `lib/hooks/ai/useAiThreads.ts`, `lib/hooks/ai/useAiChat.ts`, `lib/hooks/ai/useAiProposals.ts`, `lib/hooks/ai/useApiTokens.ts`
- Modify: `lib/hooks/__tests__/keys.test.ts`
- Test: `lib/hooks/ai/__tests__/useAiProposals.test.tsx`

**Interfaces:**
- Consumes: `campaignGet/campaignPost/campaignPatch/campaignDelete`, `request` (`lib/api/client.ts`; звірити наявні назви хелперів — у `lib/api/scenario.ts` використано `campaignGet`, `campaignPut`, `campaignPatch`, `campaignPost`); `scenarioKeys.page` (наявний).
- Produces:
  - `lib/api/ai.ts`: `getAiCredentials()`, `saveAiCredential(provider, { apiKey, defaultModel? })`, `patchAiCredential(provider, { defaultModel })`, `deleteAiCredential(provider)`, `getAiThreads(campaignId, pageId?)`, `createAiThread(campaignId, body)`, `patchAiThread(campaignId, threadId, body)`, `deleteAiThread(campaignId, threadId)`, `getAiThreadMessages(campaignId, threadId): Promise<{ thread: AiThread; messages: AiChatMessage[] }>`, `getAiProposals(campaignId, { pageId?, status? })`, `applyAiProposal(campaignId, id): Promise<ScenarioPage>`, `rejectAiProposal(campaignId, id)`, `getApiTokens(campaignId)`, `createApiToken(campaignId, name): Promise<CreatedApiToken>`, `revokeApiToken(campaignId, id)`, `createAiChatTransport(campaignId, threadId, getFocus: () => AiFocus | undefined): DefaultChatTransport<UIMessage>`
  - `aiKeys`: `credentials()`, `threads(campaignId, pageId?)`, `messages(campaignId, threadId)`, `proposals(campaignId, pageId)`, `apiTokens(campaignId)` → масиви з першим елементом `"ai-credentials"`, `"ai-threads"`, `"ai-messages"`, `"ai-proposals"`, `"api-tokens"`
  - хуки: `useAiCredentials()` → `{ credentials, save, patch, remove, isPending }`; `useAiThreads(campaignId, pageId)` → `{ threads, create, patch, remove }`; `useAiChat({ campaignId, thread, initialMessages, getFocus })` → `{ messages, send(text), stop, status, error }` (обгортка `useChat`); `useAiProposals(campaignId, pageId, { beforeApply?, onApplied? })` → `{ pending, byId(id), apply(id), reject(id), isApplying }`; `useApiTokens(campaignId)` → `{ tokens, create, revoke }`

- [ ] **Step 1: `lib/api/ai.ts`**

```ts
// lib/api/ai.ts
import { DefaultChatTransport, type UIMessage } from "ai";

import { getCampaignApiUrl } from "./api-helpers";
import { campaignDelete, campaignGet, campaignPatch, campaignPost, request } from "./client";

import type { AiProvider } from "@/lib/constants/ai";
import type { AiChatMessage, AiCredentialSummary, AiFocus, AiProposal, AiProposalStatus, AiThread, AiThreadMode, ApiTokenSummary, CreatedApiToken } from "@/types/ai";
import type { ScenarioPage } from "@/types/scenario";

const json = (method: string, body?: unknown): RequestInit => ({ method, headers: { "content-type": "application/json" }, ...(body !== undefined && { body: JSON.stringify(body) }) });

export const getAiCredentials = () => request<AiCredentialSummary[]>("/api/ai/credentials", { cache: "no-store" });

export const saveAiCredential = (provider: AiProvider, body: { apiKey: string; defaultModel?: string | null }) => request<AiCredentialSummary>(`/api/ai/credentials/${provider}`, json("PUT", body));

export const patchAiCredential = (provider: AiProvider, body: { defaultModel: string | null }) => request<AiCredentialSummary>(`/api/ai/credentials/${provider}`, json("PATCH", body));

export const deleteAiCredential = (provider: AiProvider) => request<{ ok: true }>(`/api/ai/credentials/${provider}`, { method: "DELETE" });

export const getAiThreads = (campaignId: string, pageId?: string) => campaignGet<AiThread[]>(campaignId, `/ai/threads${pageId ? `?pageId=${encodeURIComponent(pageId)}` : ""}`, { cache: "no-store" });

export const createAiThread = (campaignId: string, body: { mode: AiThreadMode; scenarioPageId?: string | null; provider: AiProvider; model?: string }) => campaignPost<AiThread>(campaignId, "/ai/threads", body);

export const patchAiThread = (campaignId: string, threadId: string, body: { title?: string; provider?: AiProvider; model?: string }) => campaignPatch<AiThread>(campaignId, `/ai/threads/${threadId}`, body);

export const deleteAiThread = (campaignId: string, threadId: string) => campaignDelete<{ ok: true }>(campaignId, `/ai/threads/${threadId}`);

export const getAiThreadMessages = (campaignId: string, threadId: string) => campaignGet<{ thread: AiThread; messages: AiChatMessage[] }>(campaignId, `/ai/threads/${threadId}/messages`, { cache: "no-store" });

export const getAiProposals = (campaignId: string, filter: { pageId?: string; status?: AiProposalStatus }) =>
  campaignGet<AiProposal[]>(campaignId, `/ai/proposals?${new URLSearchParams(Object.entries(filter).filter(([, v]) => v) as [string, string][])}`, { cache: "no-store" });

export const applyAiProposal = (campaignId: string, proposalId: string) => campaignPost<ScenarioPage>(campaignId, `/ai/proposals/${proposalId}/apply`, {});

export const rejectAiProposal = (campaignId: string, proposalId: string) => campaignPost<AiProposal>(campaignId, `/ai/proposals/${proposalId}/reject`, {});

export const getApiTokens = (campaignId: string) => campaignGet<ApiTokenSummary[]>(campaignId, "/api-tokens", { cache: "no-store" });

export const createApiToken = (campaignId: string, name: string) => campaignPost<CreatedApiToken>(campaignId, "/api-tokens", { name });

export const revokeApiToken = (campaignId: string, tokenId: string) => campaignDelete<{ ok: true }>(campaignId, `/api-tokens/${tokenId}`);

// the server keeps the history; send only the new text and the DM's focus
export const createAiChatTransport = (campaignId: string, threadId: string, getFocus: () => AiFocus | undefined) =>
  new DefaultChatTransport<UIMessage>({
    api: getCampaignApiUrl(campaignId, `/ai/threads/${threadId}/chat`),
    prepareSendMessagesRequest: ({ messages }) => {
      const last = messages[messages.length - 1];

      const text = last?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";

      return { body: { text, focus: getFocus() } };
    },
  });
```

Звірити: точні назви експортів `lib/api/client.ts` (`campaignDelete` може називатися інакше) і сигнатуру `getCampaignApiUrl` у `lib/api/api-helpers.ts`; `request` для не-кампанійних URL.

- [ ] **Step 2: Ключі і barrel**

```ts
// lib/hooks/ai/keys.ts
export const aiKeys = {
  credentials: () => ["ai-credentials"] as const,
  threads: (campaignId: string, pageId?: string) => ["ai-threads", campaignId, pageId ?? null] as const,
  messages: (campaignId: string, threadId: string) => ["ai-messages", campaignId, threadId] as const,
  proposals: (campaignId: string, pageId: string) => ["ai-proposals", campaignId, pageId] as const,
  apiTokens: (campaignId: string) => ["api-tokens", campaignId] as const,
};
```

Додати `aiKeys` у `lib/hooks/__tests__/keys.test.ts` за наявним патерном (перевірка унікальності/kebab-case перших елементів).

- [ ] **Step 3: `useAiProposals` — тест першим**

```tsx
// lib/hooks/ai/__tests__/useAiProposals.test.tsx
// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import * as aiApi from "@/lib/api/ai";
import { useAiProposals } from "@/lib/hooks/ai";
import { scenarioKeys } from "@/lib/hooks/scenario/keys";

vi.mock("@/lib/api/ai", () => ({ getAiProposals: vi.fn(async () => [{ id: "ap1", status: "pending" }]), applyAiProposal: vi.fn(async () => ({ id: "p1", version: 4, content: { legend: [], sections: [] } })), rejectAiProposal: vi.fn() }));

const setup = (opts: Parameters<typeof useAiProposals>[2] = {}) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { qc, ...renderHook(() => useAiProposals("camp1", "p1", opts), { wrapper }) };
};

describe("useAiProposals", () => {
  it("apply: спершу beforeApply, потім запит, сторінка в кеші, onApplied", async () => {
    const order: string[] = [];

    const beforeApply = vi.fn(async () => { order.push("flush"); return true; });

    vi.mocked(aiApi.applyAiProposal).mockImplementationOnce(async () => { order.push("apply"); return { id: "p1", version: 4 } as never; });

    const onApplied = vi.fn();

    const { qc, result } = setup({ beforeApply, onApplied });

    await waitFor(() => expect(result.current.pending).toHaveLength(1));
    await act(() => result.current.apply("ap1"));

    expect(order).toEqual(["flush", "apply"]);
    expect(qc.getQueryData(scenarioKeys.page("camp1", "p1"))).toMatchObject({ version: 4 });
    expect(onApplied).toHaveBeenCalledWith(expect.objectContaining({ version: 4 }));
  });

  it("beforeApply повернув false (незбережено) — запит не йде", async () => {
    const { result } = setup({ beforeApply: async () => false });

    await waitFor(() => expect(result.current.pending).toHaveLength(1));
    await act(() => result.current.apply("ap1"));

    expect(aiApi.applyAiProposal).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Хуки**

```ts
// lib/hooks/ai/useAiProposals.ts
"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { aiKeys } from "./keys";

import { applyAiProposal, getAiProposals, rejectAiProposal } from "@/lib/api/ai";
import { useOptionalNotify } from "@/lib/hooks/common";
import { scenarioKeys } from "@/lib/hooks/scenario/keys";
import type { ScenarioPage } from "@/types/scenario";

type Options = { beforeApply?: () => Promise<boolean>; onApplied?: (page: ScenarioPage) => void };

export function useAiProposals(campaignId: string, pageId: string, { beforeApply, onApplied }: Options = {}) {
  const queryClient = useQueryClient();

  const notify = useOptionalNotify();

  const key = aiKeys.proposals(campaignId, pageId);

  const query = useQuery({ queryKey: key, queryFn: () => getAiProposals(campaignId, { pageId }) });

  const invalidate = useCallback(() => queryClient.invalidateQueries({ queryKey: key }), [queryClient, key]);

  const applyMutation = useMutation({
    mutationFn: async (id: string) => {
      if (beforeApply && !(await beforeApply())) return null;

      return applyAiProposal(campaignId, id);
    },
    onSuccess: (page) => {
      if (!page) return;

      queryClient.setQueryData(scenarioKeys.page(campaignId, pageId), page);
      onApplied?.(page);
    },
    onError: (e: Error) => notify(e.message),
    onSettled: invalidate,
  });

  const rejectMutation = useMutation({ mutationFn: (id: string) => rejectAiProposal(campaignId, id), onError: (e: Error) => notify(e.message), onSettled: invalidate });

  const all = query.data ?? [];

  return {
    all,
    pending: all.filter((p) => p.status === "pending"),
    byId: (id: string) => all.find((p) => p.id === id),
    apply: (id: string) => applyMutation.mutateAsync(id).then(() => undefined, () => undefined),
    reject: (id: string) => rejectMutation.mutateAsync(id).then(() => undefined, () => undefined),
    isApplying: applyMutation.isPending,
    refresh: invalidate,
  };
}
```

(`useOptionalNotify` уже використовується в `useScenarioDraft`; `notify` приймає рядок.)

```ts
// lib/hooks/ai/useAiChat.ts
"use client";

import { useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";

import { createAiChatTransport } from "@/lib/api/ai";
import type { AiChatMessage, AiFocus } from "@/types/ai";

export function useAiChat({ campaignId, threadId, initialMessages, focus, onFinish }: { campaignId: string; threadId: string; initialMessages: AiChatMessage[]; focus: AiFocus | undefined; onFinish?: () => void }) {
  const focusRef = useRef(focus);

  focusRef.current = focus;

  const transport = useMemo(() => createAiChatTransport(campaignId, threadId, () => focusRef.current), [campaignId, threadId]);

  const chat = useChat({ id: threadId, messages: initialMessages as unknown as UIMessage[], transport, onFinish });

  return { messages: chat.messages, send: (text: string) => chat.sendMessage({ text }), stop: chat.stop, status: chat.status, error: chat.error };
}
```

Звірити API `useChat` у `node_modules/@ai-sdk/react` (v4): `sendMessage({ text })`, `status` (`"ready" | "submitted" | "streaming" | "error"`), `stop`, `onFinish`; ESLint `react-hooks` може скаржитися на присвоєння `focusRef.current` під час рендера — тоді перенести в `useEffect`.

`useAiCredentials`, `useAiThreads`, `useApiTokens` — стандартні `useQuery` + `useMutation` з інвалідацією свого ключа (за зразком `useAiProposals`); `useAiThreads.create` після успіху додає тред у кеш списку і повертає його.

`lib/hooks/ai/index.ts`: `export * from "./keys"; export * from "./useAiChat"; …` для всіх п'яти хуків.

- [ ] **Step 5: Run** `pnpm test:related lib/api/ai.ts lib/hooks/ai/*.ts` → PASS.
- [ ] **Step 6: Commit** `feat(ai): client API, chat transport and hooks`.

---

### Task 15: Сторінка «Налаштування → AI» (ключі)

**Files:**
- Create: `app/settings/ai/page.tsx`, `app/settings/ai/page-client.tsx`, `components/ai/AiProviderCard.tsx`, `components/ai/index.ts`
- Modify: `components/layout/Header.tsx` (пункт меню профілю «AI-ключі» перед «Вийти»)
- Test: `components/ai/__tests__/ai-provider-card.test.tsx`

**Interfaces:**
- Consumes: `useAiCredentials` (Task 14); `AI_PROVIDERS`, `AI_PROVIDER_LABELS`, `AI_MODELS` (Task 1); `HudPage`, `HudPageHeader`, `HudCard` (`components/hud/page`); `getSessionUserId` (`lib/auth.ts`).
- Produces: `AiProviderCard({ provider, credential, actions: { onSave(apiKey, model), onModel(model), onDelete() }, pending })`.

- [ ] **Step 1: Тест картки**

```tsx
// components/ai/__tests__/ai-provider-card.test.tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AiProviderCard } from "@/components/ai";

const actions = () => ({ onSave: vi.fn(), onModel: vi.fn(), onDelete: vi.fn() });

describe("AiProviderCard", () => {
  it("без ключа: поле і кнопка збереження; ключ передається обрізаним", () => {
    const a = actions();

    render(<AiProviderCard provider="anthropic" credential={null} actions={a} pending={false} />);
    fireEvent.change(screen.getByLabelText("Ключ API"), { target: { value: "  sk-ant-123456789 " } });
    fireEvent.click(screen.getByRole("button", { name: "Перевірити і зберегти" }));
    expect(a.onSave).toHaveBeenCalledWith("sk-ant-123456789", null);
  });

  it("з ключем: показує лише маску, кнопка видалення", () => {
    render(<AiProviderCard provider="anthropic" credential={{ provider: "anthropic", last4: "a1b2", defaultModel: null, updatedAt: "2026-10-21T00:00:00Z" }} actions={actions()} pending={false} />);
    expect(screen.getByText("…a1b2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Видалити" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Компонент**

```tsx
// components/ai/AiProviderCard.tsx
"use client";

import { useState } from "react";

import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AI_MODELS, AI_PROVIDER_LABELS, type AiProvider } from "@/lib/constants/ai";
import type { AiCredentialSummary } from "@/types/ai";

type Actions = { onSave: (apiKey: string, model: string | null) => void; onModel: (model: string | null) => void; onDelete: () => void };

export function AiProviderCard({ provider, credential, actions, pending }: { provider: AiProvider; credential: AiCredentialSummary | null; actions: Actions; pending: boolean }) {
  const [apiKey, setApiKey] = useState("");

  const inputId = `ai-key-${provider}`;

  return (
    <HudCard>
      <h3 className="font-semibold">{AI_PROVIDER_LABELS[provider]}</h3>
      {credential && <p className="text-sm text-hud-muted">…{credential.last4}</p>}
      <label htmlFor={inputId} className="text-sm">
        Ключ API
      </label>
      <Input id={inputId} type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={credential ? "Новий ключ, щоб замінити" : "Вставте ключ"} />
      <label className="text-sm">
        Модель за замовчуванням
        <select className="ml-2" value={credential?.defaultModel ?? ""} disabled={!credential || pending} onChange={(e) => actions.onModel(e.target.value || null)}>
          <option value="">Автоматично</option>
          {AI_MODELS[provider].map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <Button disabled={pending || apiKey.trim().length < 10} onClick={() => { actions.onSave(apiKey.trim(), credential?.defaultModel ?? null); setApiKey(""); }}>
          Перевірити і зберегти
        </Button>
        {credential && (
          <Button variant="ghost" disabled={pending} onClick={actions.onDelete}>
            Видалити
          </Button>
        )}
      </div>
    </HudCard>
  );
}
```

Звірити шляхи `Button`/`Input` у `components/ui`; якщо в проєкті є HUD-select (`components/hud/form`), використати його замість нативного `<select>`.

- [ ] **Step 3: Сторінка**

```tsx
// app/settings/ai/page.tsx
import { redirect } from "next/navigation";

import { AiSettingsClient } from "./page-client";

import { isAiConfigured } from "@/lib/ai/crypto";
import { getSessionUserId } from "@/lib/auth";

export default async function AiSettingsPage() {
  if (!(await getSessionUserId())) redirect("/sign-in");

  return <AiSettingsClient configured={isAiConfigured()} />;
}
```

```tsx
// app/settings/ai/page-client.tsx
"use client";

import { AiProviderCard } from "@/components/ai";
import { ErrorState, QueryState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { AI_PROVIDERS } from "@/lib/constants/ai";
import { useConfirm } from "@/lib/hooks/common";
import { useAiCredentials } from "@/lib/hooks/ai";

export function AiSettingsClient({ configured }: { configured: boolean }) {
  const ai = useAiCredentials();

  const confirm = useConfirm();

  if (!configured) return <ErrorState message="AI-асистент не налаштований на сервері" />;

  return (
    <HudPage>
      <HudPageHeader title="AI-ключі" subtitle="Ключ зберігається зашифрованим і ніколи не показується повністю. Оплата — напряму з вашого рахунку провайдера." />
      <QueryState query={ai.query}>
        {(credentials) => (
          <div className="grid gap-4 md:grid-cols-3">
            {AI_PROVIDERS.map((provider) => (
              <AiProviderCard
                key={provider}
                provider={provider}
                credential={credentials.find((c) => c.provider === provider) ?? null}
                pending={ai.isPending}
                actions={{
                  onSave: (apiKey, defaultModel) => ai.save({ provider, apiKey, defaultModel }),
                  onModel: (defaultModel) => ai.patch({ provider, defaultModel }),
                  onDelete: async () => { if (await confirm({ title: "Видалити ключ?", description: "AI-чати цього провайдера перестануть працювати." })) ai.remove(provider); },
                }}
              />
            ))}
          </div>
        )}
      </QueryState>
    </HudPage>
  );
}
```

Звірити: API `QueryState` (приймає `query`), `ErrorState` (пропси), `useConfirm` (сигнатура `confirm({...})` повертає `Promise<boolean>`), `HudPageHeader` (пропси). `useAiCredentials` має віддавати `query` (повний результат `useQuery`) поряд із мутаціями — узгодити з Task 14. Перевірити, що `proxy.ts` matcher покриває `/settings/*` (сесія оновлюється, без сесії — редирект); сторінка сама робить `redirect` теж.

- [ ] **Step 4: Посилання в Header** — у меню профілю (`components/layout/Header.tsx`, перед пунктом «Вийти»):

```tsx
              <DropdownMenuItem asChild>
                <Link href="/settings/ai">
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI-ключі
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
```

(`Sparkles` з `lucide-react`, як `LogOut`.)

- [ ] **Step 5: Run** `pnpm test:related components/ai/AiProviderCard.tsx` → PASS; `pnpm lint` для змінених файлів.
- [ ] **Step 6: Commit** `feat(ai): AI keys settings page`.

---

### Task 16: Сторінка «AI і API-токени» для ДМ

**Files:**
- Create: `app/campaigns/[id]/dm/ai/page.tsx`, `app/campaigns/[id]/dm/ai/page-client.tsx`, `components/ai/ApiTokenList.tsx`
- Modify: `components/layout/Header.tsx` (DM-меню: пункт «AI і API» після «Сценарій»), `app/campaigns/[id]/dm/page.tsx` (плитка/посилання, за наявним патерном дашборда), `components/ai/index.ts`
- Test: `components/ai/__tests__/api-token-list.test.tsx`

**Interfaces:**
- Consumes: `useApiTokens` (Task 14), `requireCampaignDM` (`lib/server/campaigns/access.ts`), `ResponsiveDialog` (`components/ui/responsive-dialog`).
- Produces: `ApiTokenList({ tokens, actions: { onCreate(name): Promise<CreatedApiToken | null>, onRevoke(id) } })`.

- [ ] **Step 1: Тест** — після `onCreate` повертає `{ token: "dndt_xyz", … }` → у діалозі видно `dndt_xyz` і кнопку «Скопіювати»; після закриття діалогу токен більше ніде не видно; список показує `prefix` і «ще не використовувався» для `lastUsedAt: null`.

```tsx
// components/ai/__tests__/api-token-list.test.tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { ApiTokenList } from "@/components/ai";

const token = { id: "k1", name: "Claude Desktop", prefix: "dndt_ab12", lastUsedAt: null, createdAt: "2026-10-21T00:00:00Z" };

describe("ApiTokenList", () => {
  it("новий токен видно лише в діалозі створення", async () => {
    const onCreate = vi.fn(async () => ({ ...token, id: "k2", token: "dndt_SECRETVALUE" }));

    renderWithConfirm(<ApiTokenList tokens={[token]} actions={{ onCreate, onRevoke: vi.fn() }} />);

    expect(screen.getByText("dndt_ab12…")).toBeTruthy();
    expect(screen.getByText("ще не використовувався")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Створити токен" }));
    fireEvent.change(screen.getByLabelText("Назва"), { target: { value: "Cursor" } });
    fireEvent.click(screen.getByRole("button", { name: "Створити" }));

    await waitFor(() => expect(screen.getByText("dndt_SECRETVALUE")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Готово" }));
    await waitFor(() => expect(screen.queryByText("dndt_SECRETVALUE")).toBeNull());
  });
});
```

(Звірити експорт `renderWithConfirm` у `components/ui/__tests__/render-with-confirm.tsx`.)

- [ ] **Step 2: Компонент** — `ApiTokenList`: список рядків (`name`, `${prefix}…`, `lastUsedAt` → `toLocaleString("uk")` або «ще не використовувався», кнопка «Відкликати» через `useConfirm`); кнопка «Створити токен» відкриває `ResponsiveDialog hud` з формою `id="api-token-form"` (поле «Назва», кнопка у `footer` з `form="api-token-form"`); після успіху діалог перемикається на показ токена (`<code>`), кнопки «Скопіювати» (`navigator.clipboard.writeText`) і «Готово»; стан токена тримається лише в локальному `useState` і очищається при закритті.

- [ ] **Step 3: Сторінка**

```tsx
// app/campaigns/[id]/dm/ai/page.tsx
import { DmAiPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function DmAiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <DmAiPageClient campaignId={id} origin={process.env.NEXT_PUBLIC_APP_URL ?? ""} />;
}
```

`page-client.tsx`: `HudPage` + `HudPageHeader title="AI і API"`; `HudPanel` «Ключі провайдерів» з посиланням на `/settings/ai`; `ApiTokenList` з `useApiTokens(campaignId)`; `HudPanel` «Підключення MCP» з двома блоками `<pre>`:

```json
{ "mcpServers": { "dnd-tracker": { "command": "npx", "args": ["-y", "mcp-remote", "<origin>/api/mcp", "--header", "Authorization: Bearer ${DNDT_TOKEN}"], "env": { "DNDT_TOKEN": "<ваш токен>" } } } }
```

```json
{ "mcpServers": { "dnd-tracker": { "url": "<origin>/api/mcp", "headers": { "Authorization": "Bearer <ваш токен>" } } } }
```

з підписами «Claude Desktop» і «Cursor»; `<origin>` = `origin` пропса або `window.location.origin` (якщо `NEXT_PUBLIC_APP_URL` немає — перевірити `grep -rn NEXT_PUBLIC_APP_URL` і використати `window.location.origin` у `useEffect`).

- [ ] **Step 4: Посилання** — у DM-меню `Header.tsx` після «Сценарій» додати `<Link href={`/campaigns/${campaignId}/dm/ai`}>AI і API</Link>` у `DropdownMenuItem`; на DM-дашборді — плитку за наявним патерном (`app/campaigns/[id]/dm/page.tsx`).
- [ ] **Step 5: Run** тести компонента → PASS. **Step 6: Commit** `feat(ai): DM page for API tokens and MCP setup`.

---

### Task 17: AI-панель — треди, стрічка, інструменти, поле вводу

**Files:**
- Create: `components/ai/AiPanel.tsx`, `components/ai/AiThreadHeader.tsx`, `components/ai/AiMessageList.tsx`, `components/ai/AiToolChip.tsx`, `components/ai/AiComposer.tsx`, `components/ai/ai-panel.css` (або Tailwind-класи — за стилем `components/scenario`)
- Modify: `components/ai/index.ts`
- Test: `components/ai/__tests__/ai-message-list.test.tsx`, `components/ai/__tests__/ai-composer.test.tsx`

**Interfaces:**
- Consumes: `useAiThreads`, `useAiChat`, `useAiCredentials` (Task 14); `AI_MODELS`, `AI_PROVIDER_LABELS`, `AI_MODE_LABELS`.
- Produces:
  - `AiPanel({ campaignId, page, mode, focus, proposals, onClose })` — `page: ScenarioPage`, `mode: AiThreadMode`, `focus: AiFocus | undefined`, `proposals: ReturnType<typeof useAiProposals>` (для карток у стрічці, Task 18)
  - `AiToolChip({ part })` — показ виклику інструменту
  - `TOOL_LABELS: Record<string, (input: Record<string, unknown>) => string>` — `read_scenario_page` → «Читаю сторінку…», `search_reference` → `Шукаю в довіднику: ${query}`, `get_battle_state` → «Дивлюся бій…», `get_party` → «Дивлюся партію…», `propose_scenario_edit` → «Готую пропозицію…», решта → назва інструменту

Поведінка:
- Без жодного ключа (`credentials` порожній) — панель показує `EmptyState` «Підключіть ключ AI» з посиланням на `/settings/ai`.
- `AiThreadHeader`: селект тредів для сторінки (`useAiThreads(campaignId, page.id)`, фільтр за `mode`), «Новий тред» (створює з `mode`, першим провайдером, для якого є ключ), селект провайдера (лише ті, для яких є ключ) і моделі (`AI_MODELS[provider]`) → `patch`, лічильник `↑{input} ↓{output}` токенів.
- Під час завантаження повідомлень треду — `LoadingState`; потім `AiThreadChat` (внутрішній компонент), який монтується з `key={thread.id}` і викликає `useAiChat({ campaignId, threadId, initialMessages, focus, onFinish: proposals.refresh })`.
- `AiMessageList`: для кожного повідомлення — частини `text` (рендер через наявний markdown-рендер, якщо є в проєкті — `grep -rn "react-markdown" package.json`; якщо немає — простий рендер абзаців з `whitespace-pre-wrap`, без нової залежності), частини `tool-*` — `AiToolChip`; для частини `tool-propose_scenario_edit` у стані `output-available` з `output` що містить `proposalId` — `AiProposalCard` (Task 18) за `proposals.byId(id)`; метадані `error` або `chat.error` — червоний рядок з текстом.
- `AiComposer`: `textarea` (Enter — відправити, Shift+Enter — новий рядок), лічильник при > 7000 символів, показ `focus` («Фокус: розділ «Собор», 2 рядки» з кнопкою «×» → `onClearFocus`), у `live` — швидкі чипи «Ім'я для NPC», «Що далі за сценарієм?», «Яке DC?» (клік відправляє текст одразу), кнопка «Стоп» під час `status === "streaming" | "submitted"`, відправку заблоковано в цих станах.

- [ ] **Step 1: Тести**

```tsx
// components/ai/__tests__/ai-composer.test.tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AiComposer } from "@/components/ai/AiComposer";

describe("AiComposer", () => {
  it("Enter відправляє, Shift+Enter — ні; поле очищається", () => {
    const onSend = vi.fn();

    render(<AiComposer mode="scenario" busy={false} focusLabel={null} actions={{ onSend, onStop: vi.fn(), onClearFocus: vi.fn() }} />);

    const box = screen.getByRole("textbox");

    fireEvent.change(box, { target: { value: "Дай 3 твісти" } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("Дай 3 твісти");
    expect((box as HTMLTextAreaElement).value).toBe("");
  });

  it("під час стріму — лише «Стоп»", () => {
    const onStop = vi.fn();

    render(<AiComposer mode="live" busy focusLabel={null} actions={{ onSend: vi.fn(), onStop, onClearFocus: vi.fn() }} />);
    fireEvent.click(screen.getByRole("button", { name: "Стоп" }));
    expect(onStop).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Надіслати" })).toBeNull();
  });

  it("live: швидкий чип відправляє одразу", () => {
    const onSend = vi.fn();

    render(<AiComposer mode="live" busy={false} focusLabel={null} actions={{ onSend, onStop: vi.fn(), onClearFocus: vi.fn() }} />);
    fireEvent.click(screen.getByRole("button", { name: "Яке DC?" }));
    expect(onSend).toHaveBeenCalledWith("Яке DC?");
  });
});
```

```tsx
// components/ai/__tests__/ai-message-list.test.tsx
// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AiMessageList } from "@/components/ai/AiMessageList";

const proposals = { byId: () => undefined, apply: async () => {}, reject: async () => {}, isApplying: false } as never;

describe("AiMessageList", () => {
  it("текст, чип інструменту з параметром, помилка", () => {
    render(
      <AiMessageList
        messages={[
          { id: "1", role: "user", parts: [{ type: "text", text: "Хто такий Фенікс?" }] },
          { id: "2", role: "assistant", parts: [{ type: "tool-search_reference", toolCallId: "c1", state: "output-available", input: { kind: "unit", query: "Фенікс" }, output: "[]" }, { type: "text", text: "Птах вогню." }] },
        ] as never}
        error="Ліміт провайдера, спробуйте за хвилину"
        proposals={proposals}
        onRedo={() => {}}
      />,
    );

    expect(screen.getByText("Хто такий Фенікс?")).toBeTruthy();
    expect(screen.getByText("Шукаю в довіднику: Фенікс")).toBeTruthy();
    expect(screen.getByText("Птах вогню.")).toBeTruthy();
    expect(screen.getByText("Ліміт провайдера, спробуйте за хвилину")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Реалізація компонентів** за поведінкою вище; пропси ≤ 7, колбеки — об'єктом `actions`. Компоненти не імпортують `@/lib/api/*`.
- [ ] **Step 3: Run** тести → PASS; `pnpm lint` по `components/ai`.
- [ ] **Step 4: Commit** `feat(ai): chat panel with threads, message list, tool chips and composer`.

---

### Task 18: Картка пропозиції, бейдж і інтеграція в сторінку сценарію

**Files:**
- Create: `components/ai/AiProposalCard.tsx`, `components/ai/AiProposalBadge.tsx`
- Modify: `app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx`, `components/scenario/editor/ScenarioEditor.tsx`, `components/ai/index.ts`, `components/scenario/scenario-book.css` (розкладка з панеллю)
- Test: `components/ai/__tests__/ai-proposal-card.test.tsx`, `app/campaigns/[id]/dm/scenario/__tests__/page.test.tsx` (дописати кейс)

**Interfaces:**
- Consumes: `useAiProposals` (Task 14), `AiPanel` (Task 17), `ScenarioRichText` (`components/scenario/ScenarioRichText.tsx` — звірити пропси), `useScenarioDraft().flush`.
- Produces:
  - `AiProposalCard({ proposal, actions: { onApply, onReject, onRedo }, busy })`
  - `AiProposalBadge({ count, onClick })`
  - `ScenarioEditor` отримує проп `onDraftReady?: (draft: { flush: () => Promise<boolean> }) => void`

- [ ] **Step 1: Тест картки**

```tsx
// components/ai/__tests__/ai-proposal-card.test.tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AiProposalCard } from "@/components/ai";

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const base = { id: "ap1", pageId: "p1", threadId: "t1", summary: "Похмуріший вхід", appliedVersion: null, createdAt: "", ops: [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: doc("Дзвони мовчать"), before: { story: doc("Дзвони б'ють"), notes: doc("") } }] } as const;

const actions = () => ({ onApply: vi.fn(), onReject: vi.fn(), onRedo: vi.fn() });

describe("AiProposalCard", () => {
  it("pending: було → стало, застосувати/відхилити", () => {
    const a = actions();

    render(<AiProposalCard proposal={{ ...base, status: "pending" } as never} actions={a} busy={false} />);
    expect(screen.getByText("Похмуріший вхід")).toBeTruthy();
    expect(screen.getByText("Дзвони б'ють")).toBeTruthy();
    expect(screen.getByText("Дзвони мовчать")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Застосувати" }));
    expect(a.onApply).toHaveBeenCalled();
  });

  it("stale: пояснення і «Переробити»", () => {
    const a = actions();

    render(<AiProposalCard proposal={{ ...base, status: "stale" } as never} actions={a} busy={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Переробити" }));
    expect(a.onRedo).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Застосувати" })).toBeNull();
  });

  it("applied: лише статус", () => {
    render(<AiProposalCard proposal={{ ...base, status: "applied", appliedVersion: 4 } as never} actions={actions()} busy={false} />);
    expect(screen.getByText("Застосовано")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
```

- [ ] **Step 2: `AiProposalCard`** — для `replaceRow`: дві колонки «Було» / «Стало» для кожного зміненого поля (`story`/`notes`) через `ScenarioRichText`; `insertRow` — «Новий рядок» зі `story`/`notes`; `addSection` — «Новий розділ «{title}»» з рядками; `renameSection` — ««{before.title}» → «{title}»». Статуси: `pending` → «Застосувати» / «Відхилити»; `stale` → «Фрагмент змінився після пропозиції» + «Переробити» / «Відхилити»; `applied` → «Застосовано»; `rejected` → «Відхилено». `onRedo` у панелі надсилає в чат текст `Пропозиція «${summary}» застаріла: перечитай сторінку й запропонуй її заново.`

- [ ] **Step 3: `ScenarioEditor` віддає `flush`**

У `components/scenario/editor/ScenarioEditor.tsx` додати проп `onDraftReady?: (draft: { flush: () => Promise<boolean> }) => void` і після `const draft = useScenarioDraft(...)`:

```tsx
  useEffect(() => {
    onDraftReady?.({ flush: draft.flush });
  }, [onDraftReady, draft.flush]);
```

- [ ] **Step 4: Інтеграція в `page-client.tsx`**

У `ScenarioPageBody`:

```tsx
  const [aiOpen, setAiOpen] = useState(false);

  const draftRef = useRef<{ flush: () => Promise<boolean> } | null>(null);

  const onDraftReady = useCallback((d: { flush: () => Promise<boolean> }) => {
    draftRef.current = d;
  }, []);

  const proposals = useAiProposals(campaignId, page.id, {
    beforeApply: async () => (editBase && draftRef.current ? draftRef.current.flush() : true),
    // remount the editor from the applied page so its draft carries the new version — no 409 on the next autosave
    onApplied: (next) => setEditBase((cur) => (cur ? next : cur)),
  });

  const aiMode: AiThreadMode = editBase ? "scenario" : playEnabled ? "live" : "scenario";
```

- кнопку `AI` додати в `actions` для обох режимів (поза умовою `!editBase`), поруч — `<AiProposalBadge count={proposals.pending.length} onClick={() => setAiOpen(true)} />` (бейдж ховається при `count === 0`);
- `ScenarioEditor` рендерити з `key={editBase.version}` і `onDraftReady={onDraftReady}`;
- `focus`: у режимі гри — `{ pageId: page.id, sectionId: pickCurrentSection }` де поточний розділ — перший незіграний (`page.content.sections.find((s) => !s.played)`), у редагуванні — `{ pageId: page.id }` (виділення рядка — розширення, не в першій версії: передавати `active` рядок, якщо `ScenarioEditor` уже тримає `active` — тоді додати другий колбек `onActiveRowChange`; якщо це ускладнює — лишити `{ pageId }`);
- `{aiOpen && <AiPanel campaignId={campaignId} page={page} mode={aiMode} focus={focus} proposals={proposals} onClose={() => setAiOpen(false)} />}` всередині `ScenarioBook`;
- `AiPanel` на десктопі (≥ 1024 px) — фіксована права панель шириною 420 px, а `ScenarioBook` отримує `padding-right: 420px` (CSS-клас `sb-with-ai` у `scenario-book.css`); на телефоні — `ResponsiveDialog` (bottom sheet). Перемикання — через наявний хук медіазапиту (`grep -rn "useMediaQuery\|useIsDesktop" lib/hooks/common`).

Показувати кнопку `AI` лише якщо сервер налаштований: сторінка-сервер (`app/campaigns/[id]/dm/scenario/[pageId]/page.tsx`) передає `aiEnabled={isAiConfigured()}` у `ScenarioPageClient` → `ScenarioPageBody`.

- [ ] **Step 5: Тест сторінки** — у `app/campaigns/[id]/dm/scenario/__tests__/page.test.tsx` (або новий `page-ai.test.tsx` поряд) змокати `@/lib/hooks/ai` і перевірити: `aiEnabled=false` → кнопки «AI» немає; `aiEnabled=true` → є, клік відкриває панель (змоканий `AiPanel` рендерить `data-testid="ai-panel"`); бейдж з `pending.length = 2` показує «2».
- [ ] **Step 6: Run** `pnpm test:related components/ai/*.tsx app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx components/scenario/editor/ScenarioEditor.tsx` → PASS.
- [ ] **Step 7: Commit** `feat(ai): proposal cards, pending badge and AI panel on the scenario page`.

---

### Task 19: Повна перевірка, збірка, браузер

**Files:** —

- [ ] **Step 1: Повний набір** — `pnpm test:run` → усі PASS (записати кількість тестів).
- [ ] **Step 2: Lint і типи** — `pnpm lint` → 0 помилок; `pnpm exec tsc --noEmit` → 0.
- [ ] **Step 3: Збірка** — `pnpm build` → успіх (Turbopack).
- [ ] **Step 4: Браузер (локально, БД `aiassistant`)** — `pnpm dev` у worktree; через `claude-in-chrome` (GIF `ai_assistant_check.gif`):
  1. Профіль → «AI-ключі»: вставити реальний ключ Anthropic користувача (попросити в користувача ввести його самостійно в браузері, не через чат) → маска `…xxxx`.
  2. Сторінка сценарію сцени → «AI» → новий тред (співавтор у режимі редагування): «Перепиши перший рядок розділу X похмуріше» → чип «Читаю сторінку…» → картка пропозиції → «Застосувати» → текст у редакторі оновився, автозбереження далі без діалогу конфлікту, у «Версії» є знімок до правки.
  3. Пропозиція → руками змінити той самий рядок → «Застосувати» → stale + «Переробити».
  4. Режим гри: «Хто зараз у сцені?» → коротка відповідь з урахуванням поточного розділу; «Яке DC на перевірку зламу?» → чип довідника/відповідь.
  5. «AI і API» → створити токен → `curl -s -X POST localhost:3000/api/mcp -H "authorization: Bearer <token>" -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'` → список інструментів; відкликати → 401.
  6. Телефонна ширина (390 px): панель відкривається bottom sheet.
- [ ] **Step 5: Прибрати** тестові треди/токени з `aiassistant` (не обов'язково — локальна БД); переконатися, що в git немає `.env.local`.
- [ ] **Step 6: Commit** будь-яких виправлень з перевірки окремими комітами `fix(ai): …`.
- [ ] **Step 7: `/simplify`** на diff гілки проти `main` (правило `CLAUDE.md`), виправлення — окремим комітом.
- [ ] **Step 8: Документація** (українською):
  - створити `docs/architecture/ai.md`: шари (`lib/ai/*`, реєстр інструментів і два адаптери, пропозиції з `before`, markdown-діалект, автоконтекст), правила, які не можна ламати (ключ ніколи не виходить із сервера; правки сценарію лише через `ai_proposals` + `apply`; новий інструмент = файл у `lib/ai/tools` + рядок у `AI_TOOLS`; `/api/mcp` поза CSRF-перевіркою і лише Bearer), env `AI_KEYS_SECRET`/`AI_KEYS_SECRET_PREV` і процедура ротації (`UPDATE ai_credentials SET "keyVersion" = 0` → старий секрет у `_PREV` → новий у `AI_KEYS_SECRET`);
  - рядок про `ai.md` в індексі `docs/architecture/README.md` і в розділі «Subsystems» `CLAUDE.md` (одне речення-правило з посиланням);
  - `docs/STATUS.md`: рядок AI-асистента — стан; у «Домовленості» — `api_tokens` і `/api/mcp` уже є, етап 2 «Конструктора» розширює їх (scopes, OpenAPI), а не створює заново.
- [ ] **Step 9: Commit** `docs(ai): architecture note, status`.

Розгортання (після мержу, з підтвердження користувача): `AI_KEYS_SECRET` у Vercel Production і Preview (`openssl rand -base64 32` → `vercel env add AI_KEYS_SECRET production` / `preview`), потім merge у `main` — міграція застосується продакшн-білдом; у коміті злиття `git mv` спеки й плану в `docs/archive/superpowers/`.
