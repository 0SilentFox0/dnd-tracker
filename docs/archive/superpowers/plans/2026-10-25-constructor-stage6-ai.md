# Етап 6 — AI та повне керування кампанією через MCP: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline execution or superpowers:subagent-driven-development if the user selects delegation. Execute task-by-task; checkboxes track progress. **План погоджено користувачем 2026-10-25; виконання inline/native.**

**Goal:** Дати ДМ повне керування чинними можливостями кампанії через спільні інструменти вбудованого асистента і MCP, з review/confirm та опційним auto.

**Architecture:** Спільний каталог дій над чинними services та actor/access checks; intent містить незмінний payload і preconditions, виконання проходить єдину серверну політику та залишає receipt. HTTP і MCP/чат ділять доменну логіку; людське підтвердження належить session UI, а не моделі. Чинні scenario/slide proposals інтегруються адаптером без другого apply.

**Tech Stack:** Чинні Next 16/React 19, TypeScript, Zod 4, Prisma 6/Postgres, AI SDK 7, MCP registry, TanStack Query, Vitest; без нових runtime dependencies.

**Spec:** `docs/archive/superpowers/specs/2026-10-25-constructor-stage6-ai-design.md` — погоджено користувачем 2026-10-25. Обов'язковий companion: [route→service→tool ledger](2026-10-25-constructor-stage6-ai-coverage.md), 146 route files на момент планування.

## Global Constraints

- Лише `/Users/silentfox/Work/dnd-tracker-constructor`, `feat/constructor`; зберігати сторонні зміни, без reset/stash/push/merge/deploy.
- Записи лише у локальну constructor після перевірки DATABASE_URL і DIRECT_URL без друку секретів. Очікувані обидва: PostgreSQL, localhost/127.0.0.1/[::1], port 54322, database constructor. Невідповідність або відсутність → stop до DB write; не «виправляти» env мовчки.
- Нові expand-only міграції; застосовані незмінні. Без prod/prodcopy та читання/копіювання Downloads JSON.
- Нема нового CRUD/імпортера/auth. Використовувати CONTENT_RESOURCES/OPERATIONS, actor/need/assertCan, domain guards, battle pipeline, Task19–21 compendium contracts.
- Review за замовчуванням; TTL intent 15 хвилин. Auto окремо для свого треду/токена, змінюється лише session UI. Будь-які delete/clear/reset/rollback/restore/access changes — human confirmation; sessionOnly ніколи не обходиться токеном.
- Асистент лише ДМ. Чинні player draft AI-функції лишаються ізольованими. `additionalSpells` manual/UNSUPPORTED_FIELD, gear/gold вручну, ScenarioPage source-sync unsupported.
- Межі запуску: maxSteps 8, deadline 270000 ms, historyMessages 30, повні tool outputs у останніх 6 повідомленнях; контекст 40000 chars, tool result 24000 chars. Враховувати всі блоки, не розривати JSON.
- Попередні full suite/build/browser/live перевірки не повторювати на етапі документації. HOMM-шлюз — лише після завершення етапу 6, окремим кроком.

## Review Focus

- Підміна вкладеного id/фокуса з іншої кампанії або втрата DM під час стріму → відмова перед записом; T1/T3/T16.
- Обрив після commit і повтор тієї ж команди → той самий receipt, без другого кидка/XP/предмета/генерації; T3/T11/T15.
- Зміна прогресу/refs/залежностей між preview та confirm, включно з новим каскадним зв'язком → stale, без часткового запису; T3/T5/T9.
- Відкритий несинхронізований редактор і show/battle state після MCP дії → flush або конфлікт, актуальний кеш/seq/version, без затирання; T6/T12/T18.
- Секрет у payload/error/tool output та текст із наказом «увімкни auto» → жодного витоку або зміни policy; T13/T14/T16.

## Структура, інтерфейси та порядок

Це один план інтеграції з незалежно перевірюваними доменними блоками. Інші продуктові specs не потрібні: спільна політика пов'язує всі домени. Кожний T — окремий логічний локальний коміт після RED→GREEN. Не вмикати нові mutation tools, поки T1–T4 не завершені; доменні блоки до T14 лишаються недоступними моделі.

Нові файли за відповідальністю:
- `lib/server/assistant/{types,catalog,policy,authorize,prepare,execute,intent-store,receipts,effects,cleanup}.ts`: контракти, політика, доступ, життєвий цикл; без бізнес-CRUD.
- `lib/server/assistant/actions/{content,scenario,campaign,characters,character-progression,battles,battle-actions,show,handoffs}.ts`: доменні адаптери. Кожний експортує `*_ACTIONS: readonly AssistantActionDef[]`.
- `lib/server/{campaigns,characters,scenario,show,battles}/…-service.ts`: лише винесена спільна логіка з чинних routes, із збереженням їхніх схем і поведінки.
- `lib/ai/tools/{assistant,assistant-status}.ts`: каталог/схеми/виклик/status, adapter shared registry. Не створювати другий список business actions.
- `lib/schemas/assistant.ts`, `types/assistant.ts`, `lib/api/assistant.ts`, `lib/hooks/ai/useAssistantIntents.ts`: transport, safe DTO, клієнт і кеш.
- `components/ai/{AssistantWorkspace,AssistantIntentCard,AssistantQueue,AssistantPolicyControl,AssistantHandoff}.tsx`: UI поверх чинного AI chat/panel.
- `app/api/campaigns/[id]/assistant/{intents,…}/route.ts`: session-DM queue/detail/confirm/reject/policy; `app/campaigns/[id]/dm/assistant/{page,page-client}.tsx`: workspace.
- Тести поруч у `__tests__`; синтетичні fixtures у `lib/server/assistant/__tests__/fixtures/`, live scripts/evidence у `.superpowers/sdd/2026-10-25-constructor-stage6-ai/`.

Контракти T1 (імена є обов'язковими для наступних задач):

```ts
type AssistantChannel = 'chat' | 'mcp';
type ExecutionMode = 'review' | 'auto';
type AssistantCaller = { actor: Actor; channel: AssistantChannel; threadId: string | null; tokenId: string | null };
type ActionRequest = { actionId: string; input: unknown; requestId: string };
type ActionPreview = { summary: string; targets: TargetRef[]; changes: FieldChange[]; warnings: string[]; preconditions: JsonValue; effects: EffectDescription[] };
type AssistantActionDef = { id: string; input: z.ZodType; need: ActorNeed; effect: 'read' | 'write' | 'paid' | 'handoff'; confirmation: 'standard' | 'always'; prepare(caller: AssistantCaller, input: unknown): Promise<ActionPreview>; execute(ctx: ActionExecutionContext, input: unknown): Promise<ActionResult> };
type ActionExecutionContext = { caller: AssistantCaller; intentId: string; expected: JsonValue; db: Prisma.TransactionClient; afterCommit(effect: DurableEffect): void };
type DispatchResult = { kind: 'result'; result: ActionResult } | { kind: 'pending'; intent: IntentSummary; reviewUrl: string } | { kind: 'handoff'; href: string; reason: string };
```

T1 визначає решту DTO: `TargetRef={domain,id,name}`, `FieldChange={target:TargetRef,path,before:JsonValue,after:JsonValue}`, `EffectDescription={kind:'update'|'create'|'delete'|'erase-progress'|'change-access'|'publish'|'paid',targets:TargetRef[],description}`; `ActionResult={data:JsonValue,affected:TargetRef[],warnings:string[]}`. `DurableEffect` — union `{key,kind:'invalidate'|'publish'|'media-cleanup',payload:JsonValue}` з allowlisted handler за kind, не довільний callback/HTTP. IntentSummary містить id/actionId/status/summary/targets/expiresAt/channel; IntentDetail додає preview; ReceiptDto містить id/status/result/effectsStatus. Усі є safe projections, не довільні Error/Prisma rows. Read/handoff не потребують `execute` у фактичному TS discriminated union; write/paid мають preconditions. `ActorNeed.scope` розширюється до domain scopes у чинному модулі, а не вводить інший Actor. Домени не приймають campaignId/userId/scopes від моделі.

Scopes: зберегти `ai`, `content:read`, `content:write`; додати `campaign:read/write`, `scenario:read/write`, `characters:read/write`, `battles:read/write`, `show:read/write`. Кожний write включає read **лише власного домену**. Старий `ai` зберігає лише старі read/propose можливості; не отримує нових mutations. Existing scenario proposals залишаються доступними через `ai`, бо це вже чинна можливість. Нові інструменти фільтруються за scopes, handler додатково перевіряє need.

Операційні id — явні domain.verb (наприклад `characters.level-up`, `battles.attack`, `show.command`). Для content використовувати CONTENT_OPERATIONS ids і `content.{kind}.{verb}` для фабричних CRUD. Model-facing інструменти: `assistant_capabilities`, `assistant_schema`, `assistant_read`, `assistant_action`, `assistant_status`, `assistant_reject`; жодного `assistant_confirm` чи `set_auto` у реєстрі моделі. Existing MCP names зберігаються як aliases над тією ж dispatch політикою; pending response — документована зміна контракту запису.

## Task 1: T1 — Каталог, scopes, coverage contract і політика

**Files:** create `lib/server/assistant/{types,catalog,policy,authorize}.ts`, `lib/server/assistant/coverage.ts`; modify `lib/constants/ai.ts`, `lib/utils/api/{actor,need}.ts`, `lib/ai/{api-tokens,tools/define}.ts`; tests `lib/server/assistant/__tests__/{policy,coverage,authorize}.test.ts`.
**Interfaces:** produces `getAction(id): AssistantActionDef`, `authorizeAssistant(caller, need): Promise<void>`, `confirmationFor(def, mode, preview): 'none'|'human'`, reuses verifyApiToken/needFailure. Token identity передається внутрішньо, ніколи не як raw token. Наявність delete/erase-progress/change-access effect завжди human, навіть усередині загального update/source_apply/replace; effects визначає service adapter, не модель.
- [x] RED: `autoCannotDeleteOrChangeAccess`, `legacyAiCannotAttack`, `writeImpliesOnlyOwnRead`, `foreignNestedIdRejected`, `membershipRevokedBeforeAction`; assertions: deny/always-human, no service call. Coverage fixture розгортає всі method+path ledger, aliases мають один actionId, handoff має причину.
- [x] Run `pnpm exec vitest run lib/server/assistant/__tests__/policy.test.ts lib/server/assistant/__tests__/coverage.test.ts lib/server/assistant/__tests__/authorize.test.ts`; очікується RED через відсутні модулі/поведінку.
- [x] Implement контракти вище; registry descriptions не містять secrets. Ledger перевіряє реальні exports collection/item factories, не вгадує methods за назвами папок. Незареєстрована дія fail closed. Під час реалізації кожний ledger запис прив'язується до testId задачі власника.
- [x] GREEN тією ж командою + `pnpm exec vitest run lib/ai/tools/__tests__/registry.test.ts`; commit `feat(assistant): define action catalog and access policy`.
**Acceptance:** жодного нового запису в доменні таблиці; стара token auth поведінка й sessionOnly збережені.

## Task 2: T2 — Intent store, receipts і нова expand-only міграція

**Files:** modify `prisma/schema.prisma`; create `prisma/migrations/20261108000000_assistant_intents/migration.sql`, `lib/server/assistant/{intent-store,receipts,cleanup}.ts`, `lib/schemas/assistant.ts`, `types/assistant.ts`; tests `lib/server/assistant/__tests__/{intent-store,cleanup}.test.ts` (реальне застосування/constraints міграції — T19).
**Interfaces:** `createIntent(caller, request, preview): Promise<IntentSummary>`, `getIntent(caller, id): Promise<IntentDetail>`, `listIntents(caller, cursor?): Promise<IntentPage>`; store functions accept injected tx for atomic execution.
- [x] RED: `sameRequestReturnsSameIntent`, `changedPayloadSameIdConflicts`, `expiresAtExactly15Minutes`, `threadDeletionKeepsPendingIntent`, `campaignDeletionKeepsMinimalReceipt`, `cleanupNeverRemovesLiveIntent`.
- [x] Run `pnpm exec vitest run lib/server/assistant/__tests__/intent-store.test.ts lib/server/assistant/__tests__/cleanup.test.ts`; expect RED.
- [x] Add AssistantIntent (campaign/user/channel/token/thread identity, actionId, immutable payload+digest+preview+expected, status, expiresAt, legacyProposalId unique nullable). Status union: pending/executing/applied/rejected/stale/expired/failed/unknown. Relations to campaign cascade; thread/token nullable SetNull **plus immutable origin ids**, so deletion cannot convert token intent to session intent. Unique request key `(userId, originKey, requestId)`, queue index `(campaignId,userId,status,createdAt,id)`.
- [x] Add AssistantReceipt without campaign FK cascade: scalar campaignId/userId, intentId unique, request key/digest, actionId, status, safe result refs, effects state, timestamps. No old/private payload. Execution settings `executionMode` default review on AiThread/ApiToken. Add AssistantRun with unique thread/requestId and one-active-run claim, expiry/abort/result refs for T15. No API raw secrets in tables.
- [x] Cleanup payloads of terminal intents (including applied/stale) after 7 days; delete terminal receipts (including stale only when effects are complete) after 90 days. Never retry an unknown outcome automatically; deleting campaign preserves only minimal tombstone receipt for same-author status lookup. Applied domain records use their current retention. Document rerun window 90 days.
- [x] GREEN unit tests; `pnpm exec prisma validate` (schema only); commit `feat(assistant): persist intents and execution receipts`. DB apply deferred to guarded T19 setup unless earlier local integration requires it.
**Acceptance:** old rows default review, old migrations unchanged; no production/env changes.

## Task 3: T3 — Prepare, atomic execute, concurrency и durable effects

**Files:** create `lib/server/assistant/{prepare,execute,effects}.ts`; modify `lib/server/content/{write,write-context}.ts` only for reuse hooks; tests `lib/server/assistant/__tests__/{execute,effects}.test.ts`.
**Interfaces:** `dispatchAction(caller, request, signal?): Promise<DispatchResult>`, `confirmIntent(sessionActor, intentId): Promise<ReceiptDto>`, `rejectIntent(caller,id): Promise<IntentSummary>`, `readReceipt(caller,id): Promise<ReceiptDto>`; `ctx.afterCommit(effect): void` persists effect descriptor in the same transaction. Initial execution checks membership/token, then domain service rechecks under its write guard.
- [x] RED: `prepareDoesNotMutateDomain`, `concurrentConfirmRunsOnce`, `staleDependenciesRollbackEverything`, `revokeTokenBetweenPrepareAndConfirm`, `retryAfterCommitReturnsReceipt`, `unknownExternalOutcomeDoesNotRepeat`, `cancelAfterCommitIsNotRollback`.
- [x] Run `pnpm exec vitest run lib/server/assistant/__tests__/execute.test.ts lib/server/assistant/__tests__/effects.test.ts`; expect RED.
- [x] Implement DB writes + receipt in one short tx, use existing reentrant scoped DB context; no independent inner connection. Guard/precondition and write share lock/CAS. Lock intent/claim before domain locks; preserve existing domain lock order, character ids sorted; do not put LLM/Storage calls in tx. DOMAINS with existing lock contracts retain them, and HTTP/MCP both invoke same guarded service. Confirm actor must equal origin user; author token must remain active/scoped, while sessionOnly executes under actual confirming session actor.
- [x] Durable effects use stable `(intentId,effectKey)` and existing publication/media routines. Publish/invalidate after commit; reconcile failed effects via next status/retry request, no worker dependency. Платний external lifecycle перенесено в T12 разом із реальним media adapter; до того paid dispatch fail closed. Campaign delete saves minimal receipt in same delete transaction, with missing campaign status lookup restricted to original user.
- [x] GREEN same command plus `pnpm exec vitest run lib/server/compendium-import/__tests__/write-context.test.ts`; commit `feat(assistant): execute confirmed intents exactly once`.
**Acceptance:** duplicates/stale do not call service twice; receipt contains truthful effect status, not fictitious end-to-end success.

## Task 4: T4 — Session confirmation API, policy settings і безключовий review

**Files:** create `app/api/campaigns/[id]/assistant/intents/route.ts`, `[intentId]/route.ts`, `[intentId]/{confirm,reject}/route.ts`, `app/api/campaigns/[id]/assistant/policy/route.ts`, `lib/server/assistant/http.ts`; modify `app/api/campaigns/[id]/api-tokens/token-handlers.ts`; tests `app/api/__tests__/assistant-intents-api.test.ts`.
**Interfaces:** GET queue/detail (cursor default 20/max50), POST confirm/reject, PUT policy `{target:'thread'|'token',id,executionMode}`. All only same-origin session-DM; Authorization Bearer cannot access confirmation/policy. No AI_KEYS_SECRET requirement for queue/confirm/status; missing key blocks only paid calls/chat.
- [x] RED: `player403`, `tokenCannotConfirm`, `foreignOrigin403`, `otherDmCannotConfirmAuthorsIntent`, `noAiSecretCanReview`, `policyCannotChangeAnotherUsersToken`, `detailPrivateNoStore`, `expired409`.
- [x] Run `pnpm exec vitest run app/api/__tests__/assistant-intents-api.test.ts`; expect RED.
- [x] Implement existing auth/actor guards with explicit sessionOnly; extract reusable same-origin helper from established pattern rather than trust forwarded host. Rate limit reads/writes with existing helper. Response strips raw payload secrets, returns safe paginated preview/detail. Policy update never revives old pending intents for implicit execution.
- [x] GREEN; commit `feat(assistant): expose human confirmation and execution settings`.
**Acceptance:** no model-callable confirmation path; session-only guard is enforced on server.

## Task 5: T5 — Контент, правила, дерева, sync та імпортні aliases

**Files:** create `lib/server/assistant/actions/content.ts`; modify `lib/ai/tools/content.ts`, `lib/server/content/{service,operations}.ts`, `lib/server/templates/sync/service.ts` as needed for shared expected guards; tests `lib/server/assistant/__tests__/content-actions.test.ts`.
**Interfaces:** exports `CONTENT_ACTIONS`; CRUD through CONTENT_RESOURCES, auxiliary through CONTENT_OPERATIONS; preserves content_import dryRun and service partial-result semantics.
- [x] RED: `all12KindsUseExistingResource`, `legacyCreateReturnsPending`, `autoCreatesOnce`, `deleteAllRequiresSessionHuman`, `newReferenceAfterPreviewIsStale`, `syncClosureIncludedInPreview`, `syncDeletionInAutoStillHuman`, `importPartialReportNotAtomicSuccess`, `manualFieldsRemainManual`.
- [x] Run `pnpm exec vitest run lib/server/assistant/__tests__/content-actions.test.ts`; expect RED.
- [x] Implement aliases for kinds/schema/list/get/create/update/delete/import/get_rules/update_rules/get_skill_tree/save_skill_tree/source_diff/source_apply plus currently missing CONTENT_OPERATIONS (abilities sources/get, duplicate, groups/remove, bulk deletes, tracks reorder, export/examples/units import). Exact patch and cascade/dependency fingerprint captured under shared content lock; apply same payload or stale. dryRun remains read/no intent. Do not silently reroute mass delete into per-item bypass of sessionOnly.
- [x] GREEN plus `pnpm exec vitest run lib/ai/tools/__tests__/content.test.ts lib/ai/tools/__tests__/content-import-tool.test.ts`; commit `feat(assistant): route content actions through review policy`.
**Acceptance:** every content ledger row has action/test; external existing write scopes preserved but review behavior explicitly documented.

**T5 checkpoint:** adapters і alias mapping реалізовано та перевірено; одночасне перемикання legacy transport, trusted caller identity, default catalog і effect handlers лишається T14. Поточні зовнішні aliases до цього перемикання зберігають старий transport. Докази — у progress ledger.

## Task 6: T6 — Сценарій, версії та адаптер чинних proposals

**Files:** create `lib/server/scenario/action-service.ts`, `lib/server/assistant/actions/scenario.ts`, `lib/server/assistant/legacy-proposals.ts`; modify scenario handlers in coverage, `lib/ai/{proposals,tools/propose}.ts`; tests `lib/server/assistant/__tests__/{scenario-actions,legacy-proposals}.test.ts`.
**Interfaces:** `runScenarioOperation(actor, operation, input, expected?): Promise<ActionResult>`; `linkLegacyProposal(caller,proposalId): Promise<IntentSummary>` one-to-one; existing applyProposal remains the single scenario/slide writer for legacy proposals.
- [ ] RED: `legacyPendingListedOnce`, `legacyApplyAndConfirmRaceOnlyOneWrite`, `replaceKeepsRichBlocks`, `metadataChangeMakesPreviewStale`, `restoreAlwaysHuman`, `forceSnapshotBeforeAiWrite`, `notesSearchAndBindingsPreserved`.
- [ ] Run `pnpm exec vitest run lib/server/assistant/__tests__/scenario-actions.test.ts lib/server/assistant/__tests__/legacy-proposals.test.ts`; expect RED.
- [ ] Extract existing create/read/meta/content/delete/section/version/search/mentions operations; use page version plus guarded metadata/dependencies hash, limits/searchText/provenance cleanup. Add missing row/section delete/move capabilities as transformations through existing validated content-save service, not direct JSON writes. Legacy apply/reject must reconcile linked intent in same tx; pre-stage legacy pending proposals lazily, no bulk migration.
- [ ] GREEN plus `pnpm exec vitest run lib/ai/__tests__/proposals.test.ts lib/ai/tools/__tests__/propose.test.ts`; commit `feat(assistant): integrate scenario actions and existing proposals`.
**Acceptance:** no ScenarioPage source-sync, no duplicate apply, snapshot/stale behavior retained.

## Task 7: T7 — Налаштування, учасники, шаблони й lifecycle кампанії

**Files:** create `lib/server/campaigns/action-service.ts`, `lib/server/assistant/actions/campaign.ts`; modify campaign/member/template routes from ledger and `lib/ai/settings.ts`; tests `lib/server/assistant/__tests__/campaign-actions.test.ts`.
**Interfaces:** exports `CAMPAIGN_ACTIONS`; `runCampaignOperation(actor,operation,input,expected?): Promise<ActionResult>` delegates createCampaign/exportCampaign/importBundle/listTemplates with their guards.
- [ ] RED: `cannotRemoveDm`, `cannotSetOfficialWithoutAdmin`, `inviteNeverInToolOutput`, `deleteCampaignReceiptSurvivesCascade`, `cloneDoesNotGrantTokenNewScope`, `settingsConcurrentEditStale`, `instructionsEditIsNotPolicyEdit`.
- [ ] Run `pnpm exec vitest run lib/server/assistant/__tests__/campaign-actions.test.ts`; expect RED.
- [ ] Extract route-local lifecycle/member operations preserving invalidation and omit aiInstructions on member views. Provide current-campaign status/settings/instructions/member list/remove, template list/save/update, campaign create/clone/export, onboarding status. Data scope remains current campaign; template reads only existing accessible list. Creating result gives refs/navigation, not actor reuse. Invite/access controls UI-only or always-human per actual contract.
- [ ] GREEN plus `pnpm exec vitest run app/api/__tests__/campaign-delete-api.test.ts lib/server/campaigns/__tests__/create-campaign.test.ts`; commit `feat(assistant): add guarded campaign and template actions`.
**Acceptance:** campaign delete atomic receipt; sessionOnly/admin restrictions unchanged.

## Task 8: T8 — Персонажі — core, ownership, review, notes/goals/tokens

**Files:** create `lib/server/characters/action-service.ts`, `lib/server/assistant/actions/characters.ts`; modify character handlers/routes listed as T8, `lib/server/characters/access.ts`; tests `lib/server/assistant/__tests__/character-actions.test.ts`.
**Interfaces:** exports `CHARACTER_ACTIONS`; `runCharacterOperation(actor,operation,input,expected?): Promise<ActionResult>` uses current creation/defaults/patch/review and DM membership, does not forge CampaignAccessResult.
- [x] RED: `sameCreateHttpAndToolDefaults`, `crossCampaignControlledByRejected`, `deleteAllAlwaysHuman`, `notesAndGoalsDoNotOverwriteBiography`, `tokenIsGameTokenNotApiSecret`, `reviewDraftUsesExistingStatusRules`.
- [x] Run `pnpm exec vitest run lib/server/assistant/__tests__/character-actions.test.ts`; expect RED.
- [x] Extract create/list/roster/get/patch/delete-all/delete, controlledBy/review, notes/goals/game tokens. Keep player ownership enforcement in shared functions, while assistant outer gate always DM. Capture entity/inventory/ownership hashes needed by patch; same HTTP service accepts preconditions, no custom parallel character CRUD.
- [x] GREEN plus `pnpm exec vitest run lib/server/characters/__tests__/access.test.ts app/api/__tests__/character-tokens-api.test.ts`; commit `feat(assistant): expose character management actions`.
**Acceptance:** no increased player rights, creator/actor audit remains correct.

## Task 9: T9 — Choices/прогрес, ресурси, інвентар, rests, XP й кидки

**Files:** create `lib/server/characters/progression-service.ts`, `lib/server/assistant/actions/character-progression.ts`; modify T9 handlers/routes, existing lock/log/class/choices helpers only where needed; tests `lib/server/assistant/__tests__/character-progression-actions.test.ts`.
**Interfaces:** exports `CHARACTER_PROGRESSION_ACTIONS`; `runCharacterProgression(actor,operation,input,expected?): Promise<ActionResult>` shares current choices/inventory/stash/transfer/resources/roll/rest/experience operations and sorted lockCharacters.
- [x] RED: `choicesPreviewThenLevelChangeStale`, `activeBattle409`, `repeatTransferDoesNotDuplicate`, `repeatXpAndRestOnce`, `backgroundGearGoldUntouched`, `additionalSpellsStillUnsupported`, `resetProgressAlwaysHuman`, `explicitDmRollOrServerFormulaNoInventedRoll`.
- [x] Run `pnpm exec vitest run lib/server/assistant/__tests__/character-progression-actions.test.ts`; expect RED.
- [x] Extract routes including both HOMM and 5e level-up; preserve existing Choice/Picks/ASI semantics and journals, inventory charge/attunement/log limits. Read sheet/progression/logs/stash/free-artifacts. For multi-hero transfer/rest lock ids in sorted order and include both before states. Re-read active battle and content refs within shared guard, no stale cached refs for apply.
- [x] GREEN plus `pnpm exec vitest run lib/server/characters/__tests__/lock.test.ts lib/server/characters/__tests__/battle-lock.test.ts`; commit `feat(assistant): add character progression and resource actions`.
**Acceptance:** no duplicate grants or resource spend, no auto conversion of manual mechanics.

## Task 10: T10 — Спільний бойовий pipeline для HTTP та actor-виклику

**Files:** create `lib/utils/battle/pipeline/execute-battle-operation.ts`, `lib/server/battles/operations.ts`; modify `run-battle-mutation.ts`, `default-deps.ts`, battle route options listed in ledger; tests `lib/server/assistant/__tests__/battle-pipeline.test.ts`.
**Interfaces:** `executeBattleOperation(actor, command: {operation:string;battleId:string;input:unknown;expectedVersion:number}, execution?: ActionExecutionContext): Promise<ActionResult>`; operation definitions own schema/access/status/mode/rate rules and mutation. HTTP wrapper parses request, resolves session identity, invokes same core; routes don't duplicate options.
- [x] RED: `httpAndActorShareStatusAndTurnChecks`, `cannotBypassAwaitingDmOrMapMode`, `wrongVersion409`, `revokedActorBeforeSave`, `receiptAndBattleSaveRollbackTogether`, `publishAfterCommitOnly`.
- [x] Run `pnpm exec vitest run lib/server/assistant/__tests__/battle-pipeline.test.ts`; expect RED.
- [x] Extract existing pipeline without changing placement/victory/guardTurnOrder/delta/event behavior. Preserve operation name explicitly rather than deriving from synthetic URL. Actor membership uses existing loadBattle/access, assistant never injects isDM=true. saveBattle uses injected scoped tx for receipt atomicity and no nested pool checkout; return safe operation/delta refs for tools, full existing response for HTTP.
- [x] GREEN + existing pipeline tests selected with `rg --files lib/utils/battle/pipeline | rg 'test'`; execute those exact files, record list; commit `refactor(battle): share guarded operation pipeline with assistant`.
**Acceptance:** no direct mutation-only MCP shortcut; HTTP semantics preserved.

## Task 11: T11 — Бої — lifecycle, баланс, усі дії, карта й журнали

**Files:** create `lib/server/battles/action-service.ts`, `lib/server/assistant/actions/{battles,battle-actions}.ts`; modify T11 battle routes, `lib/ai/tools/battle.ts`; tests `lib/server/assistant/__tests__/battle-actions.test.ts`.
**Interfaces:** exports `BATTLE_ACTIONS`; all command writes use T10. `prepareBattleAction(caller,operation,input)` reads version/targets/resources, never rolls/spends during preview.
- [x] RED: `ledgerEveryBattleEndpointCovered`, `startCompleteAndResetPolicy`, `attackRepeatKeepsSameRollAndEvent`, `illegalReachAndManualSpellFailBeforeSpend`, `targetAndTurnChangeStale`, `mapWeatherMazeAndReserveUseSameGuards`, `rollbackHumanOnly`.
- [x] Run `pnpm exec vitest run lib/server/assistant/__tests__/battle-actions.test.ts`; expect RED.
- [x] Cover CRUD/list/active/summary/events/balance plus start/complete/reset/rollback; add-participant/participants patch/reveal/control/refresh/scale; next-turn/attack/spell/bonus/core/legendary/ability/aura/conditions/morale; move/terrain/weather/maze/maze-mark/audio. Extract CRUD/balance into shared service; preserve current DM/member distinctions for HTTP.
- [x] Server dice adapter uses current damage/formula helpers and rng, captures rolls once per intent execution. User supplied rolls accepted only via explicit roll mode/data shown in preview; model cannot assert unsolicited numbers as actual random results. Multi-target/upcast/reaction limitations remain engine decisions.
- [x] GREEN; commit `feat(assistant): expose complete battle operation set`.
**Acceptance:** every battle ledger method maps to read/action with test, rollback/clear-history always human.

## Task 12: T12 — Показ, набори, слайди, audio та платна генерація

**Files:** create `lib/server/show/action-service.ts`, `lib/server/assistant/actions/show.ts`; modify show/deck/audio handlers, `lib/ai/{images,tools/propose-slide}.ts`; tests `lib/server/assistant/__tests__/show-actions.test.ts`.
**Interfaces:** exports `SHOW_ACTIONS`; `runShowOperation(actor,operation,input,expected?): Promise<ActionResult>` reuses applyShowCommand/writeShowState/persistSlideImages; legacy slide proposal still T6 writer.
- [x] RED: `deckUpdatedAtConflictNoOverwrite`, `showSeqNeverResets`, `sceneBindingChangeCapturedDespiteSameUpdatedAt`, `generationRequiresExplicitRequest`, `oneImagePerRun`, `rejectOnlyDeletesOwnedUnusedAsset`, `failureAfterUploadDoesNotRegenerate`.
- [x] Run `pnpm exec vitest run lib/server/assistant/__tests__/show-actions.test.ts`; expect RED.
- [x] Implement paid intent phase: persist started receipt before network; perform outside tx; persist known asset/result before finalize; crash/unknown outcome never automatically repeats charge; prepared external result resumes finalize without regeneration. Add tests for crash-before-result, crash-after-result and cancelled generation.
- [x] Shared services for all deck/show/audio operations; include slide set diff/deletion policy and current show+audio seq preconditions. Storage copying/generation outside DB tx with T3 started/result tracking, per-run image budget and abort deadline. Reuse generated-image cleanup/owned path checks and current providers; no unsolicited model upgrade or paid request.
- [x] GREEN plus `pnpm exec vitest run lib/ai/__tests__/proposals-slide.test.ts lib/ai/__tests__/images.test.ts`; commit `feat(assistant): add show and media operations`.
**Acceptance:** no secrets/signed URLs returned to tools; failed external effect has truthful status.

## Task 13: T13 — Захищені UI handoffs, compendium reports та приватність

**Files:** create `lib/server/assistant/actions/handoffs.ts`; modify `lib/server/compendium-import/{http,entries}.ts` only to reuse authorized read projections if required; create `components/ai/AssistantHandoff.tsx`; tests `lib/server/assistant/__tests__/handoffs.test.ts`.
**Interfaces:** exports `HANDOFF_ACTIONS`; `buildAssistantHandoff(actor,kind,target?): {href,reason}` uses allowlisted relative paths, no raw JSON, secrets or credentials in URL. Token reads of session-only reports return handoff, not impersonated session.
- [x] RED: `compendiumConfirmStillRequiresSessionPreviewRights`, `tokenAndInviteSecretNeverInOutputs`, `signedUploadTicketNeverEntersHistory`, `externalHrefAndPayloadRejected`, `sourceNotesRequireExplicitSelection`, `draftAiRemainsSeparate`.
- [x] Run `pnpm exec vitest run lib/server/assistant/__tests__/handoffs.test.ts`; expect RED.
- [x] Wire file selection/import/AI mapping/credential/token management/invite creation and existing player draft-only routes to existing UI. Compendium options/reports/entry notes only as authorized bounded summaries; show explicit selection before provider use. No new importer, upload endpoint or commercial JSON access.
- [x] GREEN; commit `feat(assistant): add private handoffs for protected workflows`.
**Acceptance:** handoff is never reported as completed mutation; all UI ledger rows have a safe destination/reason.

## Task 14: T14 — Чат/MCP адаптери та legacy aliases

**Files:** create `lib/ai/tools/{assistant,assistant-status}.ts`; modify `lib/ai/tools/{define,index,content}.ts`, `app/api/mcp/route.ts`; tests `lib/ai/tools/__tests__/assistant.test.ts`, `app/api/__tests__/assistant-mcp.test.ts`.
**Interfaces:** `assistant_capabilities/schema/read/action/status/reject` dispatch T1 catalog and T3 executor; safe `ToolResult` discriminated result/error (code/status/issues/nextOffset) shared by adapters. `registerMcpTools` sets isError on real failure, pending remains success with pending kind.
- [x] RED: `chatAndMcpSamePayloadSameDomainResult`, `legacyContentAliasCannotBypassReview`, `noConfirmOrAutoTool`, `readCannotDispatchWrite`, `toolErrorNotSuccess`, `schemaAndDataPageValidJsonUnderLimit`.
- [x] Run `pnpm exec vitest run lib/ai/tools/__tests__/assistant.test.ts app/api/__tests__/assistant-mcp.test.ts`; expect RED.
- [x] Pass actual AssistantCaller into tool context. Session chat uses null tokenId; MCP uses verify result token id; do not serialize identity. toolsFor filters domain scopes, handler authorizes action need again. Replace blind clip for structured results with bounded projection/pagination. Existing tool return contracts get explicit version/pending metadata and documentation of migration.
- [x] GREEN plus `pnpm exec vitest run lib/ai/tools/__tests__/registry.test.ts`; commit `feat(assistant): connect shared actions to chat and MCP`.
**Acceptance:** no second action registry, no model-accessible apply path, legacy aliases cannot write around dispatcher.

**T14 checkpoint (2026-10-26):** усі6 named acceptance + registry21/21, scoped39files/286PASS, full1242files/8020PASS, усі10 assistant DB suites48/48PASS, tsc/lint/buildPASS. Default catalog включає SHOW_ACTIONS/HANDOFF_ACTIONS; durable handlers комбіновано. Legacy scenario alias — canonical scenario.propose-edit → один T6 writer після human confirm. V2 envelope/pending migration — docs/architecture/ai.md. Trusted run identity відсутня у T14 transports: paid fail closed; T15 не реалізовано. Деталі — latest handoff/ledger. STOP перед Task15.

## Task 15: T15 — Чат — retries, run claim, cancellation та recovery

**Files:** modify `lib/ai/chat/run-chat.ts`, `lib/ai/threads.ts`, `lib/schemas/ai.ts`, `lib/api/ai.ts`, `lib/hooks/ai/useAiChat.ts`; create `lib/server/assistant/runs.ts`; tests `lib/ai/chat/__tests__/assistant-run.test.ts`.
**Interfaces:** `beginAssistantRun(caller,requestId): Promise<RunClaim>`, `finishAssistantRun(runId,result): Promise<void>`; chat input adds stable requestId, tool request keys derived from runId+toolCallId. Reconnect queries status/messages, not blind resend.
- [x] RED: `doubleSubmitOneUserMessage`, `secondActiveRun409`, `retryAfterInterruptedStreamNoSecondIntent`, `deadlineStopsModelAndToolsAt270000`, `stopAfterCommitShowsReceipt`, `partialUsageIsNotReportedAsZeroCost`.
- [x] Run `pnpm exec vitest run lib/ai/chat/__tests__/assistant-run.test.ts`; expect RED.
- [x] Use T2 run claim atomic server-side, unique seq under concurrent append, persisted run start/end/error refs. One combined abort signal for model/tools; no provider auto retry of mutations. Running claim expires only after deadline+grace; unknown actions reconciled before releasing. Terminal run retains requestId mapping for receipt retention window; explicit new user request gets new id.
- [x] GREEN plus `pnpm exec vitest run lib/ai/chat/__tests__/run-chat.test.ts lib/ai/__tests__/threads.test.ts`; commit `feat(assistant): make chat runs resumable and idempotent`.
**Acceptance:** stop/reconnect never hides or duplicates committed action; errors remain Ukrainian and safe.

**T15 checkpoint (2026-10-26):** усі6named acceptancePASS; scoped56files/344PASS (run-chat14/thread6, SDK canonical+legacy keys, API/UI recovery та попередні домени); full1247files/8042PASS; усі11assistant DB suites53/53PASS; tsc/lint/buildPASS. T2 CHECK не змінено: terminal result+usage у resultRefs, lease лишається running до270s+30s; невідомі дії утримують claim. Request mapping не видаляється раніше receipt window; targeted requestId recovery повертає й старі квитанції поза30run. UI повтор лише читає стан. Durable partial usage не рахується вдруге після final assistant message. T14 catalog/caller/effects/paid consent збережено; міграцій/env/реальних external викликів немає. STOP перед Task16.

## Task 16: T16 — Кампанійний контекст, фокус і бюджети

**Files:** modify `lib/ai/context/prompt.ts`, `lib/ai/tools/{campaign,party,scenario-read,battle}.ts`, `types/ai.ts`, `lib/schemas/ai.ts`; create `lib/ai/context/{focus,budget}.ts`; tests `lib/ai/context/__tests__/assistant-context.test.ts`.
**Interfaces:** `AiFocus` backward-compatible union of scenario/character/battle/campaign focus (legacy pageId accepted); `buildInstructions({campaignId,mode,pageId,focus,…})` uses authenticated caller and explicit source-note selections. `fitContext(blocks,budget): {text,truncated}` budgets every block.
- [x] RED: `foreignFocusNeverLoadsSecret`, `deletedFocusClearlyUnavailable`, `allBlocksFit40000`, `standingInstructionsNotSilentlyTruncated`, `importPromptCannotEnableAuto`, `noRawBookOrAllSrdInContext`, `sourceNotesOnlySelected`, `liveRulesUseCurrentSnapshot`.
- [x] Run `pnpm exec vitest run lib/ai/context/__tests__/assistant-context.test.ts`; expect RED.
- [x] Keep scenario/live modes; campaign thread uses null scenarioPageId, default scenario mode label made understandable outside scenario. Allocate fixed system/policy/instructions first, bounded summaries next, optional focus last; explicitly paginate optional data. No silent catch pretending unavailable focus exists; treat content as data and server policy as authority. Reads for writes always fresh despite history compaction.
- [x] GREEN plus `pnpm exec vitest run lib/ai/context/__tests__/prompt.test.ts`; commit `feat(assistant): add bounded campaign context and entity focus`.
**Acceptance:** DM-only context; legacy scenario focus and live mode remain functional.

**T16 checkpoint (2026-10-26):** усі8named acceptancePASS; original prompt9/9 і context14/14PASS; scoped60files/386PASS; full1248files/8056PASS; усі11assistant DB suites54/54PASS; tsc/buildPASS, lint0errors (попередній non-null warning constants/ai.ts:59). Authenticated session caller перевіряється до private reads; tokens лишаються на scoped tools/handoff. Legacy pageId/scenario/live збережені; campaign thread маєnull scenarioPageId. Optional JSON pages не розрізаються, повний assembled context≤40000; обов’язкові інструкції або цілі, або явна413. Notes selection — окремий trusted helper argument, не model/chat field; UI wiring лишаєтьсяT18. Active battle rules — fresh persisted snapshot як loadBattle; prepared — current campaign rules. T14/T15 policy/scopes/writers/effects/leases/paid consent без змін. STOP передTask17; whole-stage independent reviewT20.

## Task 17: T17 — Кампанійний workspace та черга перегляду

**Files:** create `app/campaigns/[id]/dm/assistant/{page,page-client}.tsx`, `components/ai/{AssistantWorkspace,AssistantIntentCard,AssistantQueue}.tsx`, `lib/api/assistant.ts`, `lib/hooks/ai/useAssistantIntents.ts`; modify `components/ai/{AiPanel,AiThreadHeader,AiMessageList,AiToolChip}.tsx`, DM navigation entry found from `app/campaigns/[id]/dm/page.tsx`; tests `components/ai/__tests__/{assistant-workspace,assistant-intent-card}.test.tsx`.
**Interfaces:** `useAssistantIntents(campaignId,filters)` returns paginated queue/detail, confirm/reject mutations; `AssistantIntentCard({intent,onConfirm,onReject,onRefine})` uses safe DTO, links by intent id. Existing scenario panel becomes reusable with optional page/focus while keeping old props adapter.
- [x] RED: `threadWithoutScenarioPage`, `mcpPendingVisibleOnce`, `previewAllChangesBeforeConfirm`, `staleCannotApply`, `noKeyCanReview`, `mobileKeyboardAndFocusAccessible`, `toolFailureNotSuccessChip`.
- [x] Run `pnpm exec vitest run components/ai/__tests__/assistant-workspace.test.tsx components/ai/__tests__/assistant-intent-card.test.tsx`; expect RED.
- [x] Implement shared responsive panel/full workspace, current campaign/provider/model/tokens, focus clear, pending queue (20/max50), full paginated diff, confirmation/reject/refine, errors/expiry. MCP review URL opens exact intent and no raw payload in query. Keep ai keys/API settings routes, no new credential UI.
- [x] GREEN; commit `feat(assistant): add campaign workspace and review queue`.
**Acceptance:** review usable without AI key; no mutation by merely opening card.

**T17 checkpoint:** full1250/8069PASS; scoped50/332PASS; named7/7; localDB11suites/54PASS; Chrome1440/390PASS. Точні докази — latest handoff/ledger. T18 далі, без T19.

## Task 18: T18 — Auto UI, protected confirmations, editor flush і cache effects

**Files:** create `components/ai/AssistantPolicyControl.tsx`, `lib/hooks/ai/useAssistantEffects.ts`; modify `components/ai/{ApiTokenList,AiProposalCard}.tsx`, scenario page-client, `lib/hooks/ai/{useAiProposals,keys}.ts`; tests `components/ai/__tests__/assistant-policy.test.tsx`, `lib/hooks/ai/__tests__/assistant-effects.test.tsx`.
**Interfaces:** `useAssistantEffects(campaignId)` consumes safe result `affected` domain refs, invalidates existing domain query keys; `registerAssistantBeforeApply(target,flush)` supplies open-editor guard locally. Remote dirty editor detects version mismatch and asks reload/retain local draft, never silently overwrites it.
- [x] RED: `newThreadAndTokenDefaultReview`, `autoSwitchDoesNotApplyOldPending`, `dangerousAutoStillShowsConfirm`, `failedFlushBlocksApply`, `remoteEditKeepsUnsavedDraft`, `showAndBattleRefreshOnReceipt`, `noCampaignTextInLocalStorage`.
- [x] Run `pnpm exec vitest run components/ai/__tests__/assistant-policy.test.tsx lib/hooks/ai/__tests__/assistant-effects.test.tsx`; observed RED then 10/10 PASS.
- [x] Implement per-owner thread/token settings with explicit auto state; destructive card always shows targets/cascade. Existing scenario flush/version remount retained. Before first provider send show disclosure of selected context; usage tokens/model and explicit paid image indicators; never fabricate money estimate. Stop/new request affordances reflect T15 run status.
- [x] GREEN plus `pnpm exec vitest run lib/hooks/ai/__tests__/useAiProposals.test.tsx`; 6/6 PASS. Commit `feat(assistant): wire execution modes and domain refresh`.
**Acceptance:** review/auto visibly distinct, server remains authority; no lost unsaved edits.

**T18 checkpoint:** final full1254files/8095testsPASS; scoped69files/426PASS; exact7 acceptance7/7 and legacy useAiProposals6/6; local constructor assistant DB11suites/56PASS; actual Chrome1440/390 all16 assertions each PASS; tsc/lint/build exit0. Evidence and limitations in latest handoff/ledger. T19 is next; T20 independent review remains. Non-AI invisibility audit is separate and still outstanding.

## Task 19: T19 — Local DB integration та наскрізні UI/MCP сценарії

**Files:** create `lib/server/assistant/__tests__/execution.integration.test.ts`, `fixtures/campaign.synthetic.ts`, `scripts/constructor/assistant-check.ts`; local browser harness/evidence under `.superpowers/sdd/2026-10-25-constructor-stage6-ai/`; no reused commercial/raw prod fixture.
**Interfaces:** `assertConstructorDatabaseUrls(env): void` in test-support checks both URLs as Global Constraints; scripts take explicit runId and clean up only owned fixture ids/marker. Local harness denies real provider/Pusher/Redis/Storage network; deterministic mock model and mock media, real local PostgreSQL.
- [x] Added real local DB tests for two concurrent confirms, competing HTTP PATCH/MCP update, stale character refs, campaign cascade receipt, token revocation during in-flight MCP prepare, and durable effect crash/retry. Checks one character/inventory row, one receipt, log rows, stale rollback and stable effect key. Both guarded URLs get `connection_limit=1`; SRD spell/unit/artifact counts compared before/after.
- [x] Before writes, guard-only command emitted only `{"database":"constructor","local":true,"bothUrls":true}`. Read-only `prisma migrate status` found 41 migrations and schema up to date, including T2 migration; no migration deploy/write was needed. Runner recorded 41 before/after.
- [x] `execution.integration.test.ts`: 6/6 PASS, no skips. Pusher/runtime effects mocked; provider, Storage and Redis were not called. Real local PostgreSQL provides transaction/concurrency evidence.
- [x] `assistant-check.ts --run` ran the real bundled AssistantWorkspace in headless Chrome at 1440/390: 9 review cases per viewport (18 assertions), expected/actual HTTP 200 or stale 409, visible destructive preview, read-only open, keyless review and no overflow. Deterministic synthetic HTTP responses isolate UI behavior; production dispatch/authority is verified by local DB tests, not by this browser layer. Existing T18 browser evidence covers auto policy, dangerous confirmation, stop and recovery UI.
- [x] Owned fixture check found 0 users/campaigns/intents/receipts/runs left; owned browser process shut down; migration list unchanged; SRD counts unchanged. No real provider/paid call. Commit `test(assistant): verify local MCP and review workflows`.
**Acceptance:** every scenario has explicit result; no pending single-connection test silently claimed passed, no previous block verification repeated.

**T19 checkpoint (2026-10-26):** guard `DATABASE_URL` and `DIRECT_URL` passed as local `constructor`; `migrate status` read-only reports 41/41 applied, no deploy/reset. `assistant-check --run` final: local DB6/6, browser18/18 across1440/390, migrations41→41, owned leftovers `[0,0,0,0,0]`; `tsc` and changed-file ESLint exit0 (0 warnings); guard unit5/5. Evidence under `.superpowers/sdd/2026-10-25-constructor-stage6-ai/task19-*`. Browser uses genuine production UI components but synthetic deterministic HTTP responses; server/domain atomicity is from real DB tests. STOP before T20; whole-stage review and HOMM gateway not run.

## Task 20: T20 — Coverage closure, документація, focused review та завершення етапу

**Files:** update `docs/architecture/{ai,content-api,battle,characters,show}.md` where contracts changed, `docs/STATUS.md`, `docs/archive/superpowers/constructor-handoff.md`, companion coverage ledger; create `docs/guides/campaign-assistant.md`.
**Interfaces:** docs describe actual tool/scope/pending response, review URLs, auto limits, user-visible errors/recovery, UI handoffs and 90-day receipt retention. No claim that handoff performed upload or unsupported mechanics.
- [x] Verify coverage test has no unmapped method/path; each domain row points to actual service/action map/test and result. Audit scopes/defaults/foreign ids/legacy alias bypass, lock order, unknown external outcomes, privacy and changed code using independent review.
- [x] Run targeted domain/AI tests from T1–T18 once as combined affected set; record command/list/count. `pnpm exec tsc --noEmit`; ESLint on changed product/test files. After all product changes, one `pnpm build`; record exit/status without printing env. Rerun only impacted tests/checks after retention regression fix; no full historic 5e suite/browser/live blocks.
- [x] Resolve review findings with regression evidence. Check clean diff/no secrets/no applied migration edits, guards and acceptance boxes. Update status/checkpoint with exact commits/evidence and explicit deferrals; no promised stage6 action remains unimplemented.
- [x] Commit `docs(assistant): document stage 6 workflows and verification` after final independent review. **Stop before HOMM gateway/prodcopy/merge/deploy**; report stage6 result and mandatory next gateway without executing it in this plan.
**Acceptance:** full agreed scope verified, truthful limitations and review results recorded, no unauthorized integration actions.

**T20 checkpoint — 2026-10-26:** final independent review after retention fixes found no remaining blocking/high-risk issue. The High retention findings (no caller; omitted `stale` terminal states in 7-day redaction/90-day deletion) are covered by commit `41fb9760 fix(assistant): schedule retention cleanup`. Targeted test command/results, tsc, lint, build and documented coverage limits are in the companion ledger. Production deployment and HOMM gateway remain explicitly deferred. Documentation and campaign assistant guide are in the T20 commit named above.

## Залежності та контрольні точки

T1 → T2 → T3 → T4 — фундамент. T5–T13 використовують його; T6 потрібна T12 для legacy slides, T10 перед T11. T14 після всіх доменних adapters; T15/T16 після T14; T17/T18 після API/contracts і chat; T19 після всіх product tasks; T20 завершує stage6, не весь constructor epic.

Після кожної задачі: зберегти commit/evidence/залишок у progress ledger `.superpowers/sdd/2026-10-25-constructor-stage6-ai/progress.md` (створити на початку виконання). Окремі checkpoint-и: T4 (guarded framework), T9 (content/scenario/campaign/characters), T13 (battle/show/handoffs), T18 (UI), T19–20 (перевірка). Незавершений checkpoint не є дозволом пропустити решту.

## Self-review плану

- Покриття spec: capabilities → T5–13 + route ledger; UI → T17–18; actor/scopes → T1/4/14; confirmation/auto → T2–4/18; errors/retries → T3/14/15; privacy/context/cost → T12–16/18; tests/acceptance → кожний T + T19–20.
- Review Focus має тести в зазначених задачах; types/action ids спільні через T1, legacy proposals не мають другого writer, run requestId не плутається з intent requestId.
- Не створено product code/schema/міграцій під час планування. План і ledger — документація, tests/build/DB не запускалися.
- Рекомендований спосіб виконання: **inline/native**, послідовно за задачами, зі scoped review контрольних точок. Суміжні задачі ділять actor/transaction interfaces; паралельні implementers підвищують ризик розходження. Делегування можливе лише якщо користувач обере його або applicable skill вимагатиме конкретний review.
