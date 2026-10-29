# Глобальний аудит якості коду — 2026-10-29

Охоплення: `app`, `components`, `lib`, `types`, `prisma/schema.prisma` (~160k рядків). П'ять паралельних read-only проходів: рушій бою, UI бою, API та клієнтські шари, серверні доменні модулі, решта UI.

**Статус знахідок:** кожну агенти перевіряли читанням коду або grep, але вибірково не перевіряв ніхто інший; живих запусків і `EXPLAIN` не було. Перед виправленням підтверджуйте знахідку читанням коду. Пункти позначені ID (`A1`, `B3`, …), щоб посилатися в задачах.

## Що в порядку

- Authz-дір у 156 `route.ts` (крім battles) не знайдено: усі делегують у `operationRoute`/`runContent`/`withDM`/`withAccess`/`requireAuth`.
- Порушень `snapshotHash`, `advanceTurn`, `applyDamageConsequences` немає.
- Ключ AI-провайдера не витікає; `campaign_shows` не видаляються, `seq` монотонний; `abilities` читається через `read.ts`.
- Шар `components → lib/api` чистий; raw `fetch`, `window.confirm/alert`, Radix/vaul поза `components/ui`, інлайн query-key — відсутні.

## A. Можливі реальні баги (спочатку)

| ID | Де | Проблема | Виправлення |
|---|---|---|---|
| A1 | `lib/server/content/write.ts:29`, `write-context.ts` (`afterContentCommit`), `campaigns/action-service.ts:166` | `afterCommit`-ефекти без try/catch: збій Pusher/invalidate віддає клієнту помилку після коміту, решта ефектів пропускається; async-ефект без `await` → unhandled rejection | `Promise.allSettled` + логування; тип ефекту `() => void \| Promise<void>` |
| A2 | `lib/server/show/action-service.ts:130,177,185,219` | гілка `ctx ? ctx.afterCommit(e) : afterContentCommit(...)` повторена 4 рази; `void import().then()` без `.catch` | хелпер `scheduleEffect(ctx, effect)` з обробкою помилок |
| A3 | `lib/utils/battle/pipeline/run-battle-mutation.ts` (`guardBattleContext`, ~295–325) | перевірка `expectedVersion` (409) стоїть після status/mode/awaiting/crit → стара версія дає 422 замість 409; клієнт перечитує кеш лише на 409 (`useBattleAction.ts:64`) | перенести перевірку версії першою (перевірити на живому бою) |
| A4 | `lib/utils/battle/attack/critical.ts:21,115`, `participant/from-character.ts:230`, `from-unit.ts:~150` | `Date.now()` і модульний `effectSeq++` у «чистому» рушії, який `runWithCritChoice` виконує повторно за seed → недетермінованість | id з `rng`/seed або генератор id у ctx |
| A5 | `lib/server/templates/sync/service.ts:34` | вручну відтворює `withCampaignContentWrite` з `FOR NO KEY UPDATE` і таймаутом 60 с (замість `FOR UPDATE`, 30 с) — два режими блокування одного рядка | переписати на `withCampaignContentWrite` з параметрами lock/timeout |
| A6 | `lib/server/world/marker-handlers.ts:25-44`, `map-handlers.ts:65-78` | перевірка ліміту (`aggregate`/`count`) і `create` не атомарні; `sortOrder` може дублюватись; world не йде через `withCampaignContentWrite` | транзакція з advisory lock або unique `(mapId, sortOrder)` |
| A7 | `lib/schemas/battles.ts:32` проти `classes.ts:19`, `races.ts:43`, `spells.ts:72/78`, `scenario.ts:56`, `world.ts:26` | hex-колір валідується 6 різними regex; `battles.ts` відхиляє `#AABBCC`, решта приймають | `hexColorSchema` у `lib/schemas/common.ts` |
| A8 | `components/ai/AssistantReview.tsx:30-50` (+ частково `AssistantIntentCard.tsx`, `AssistantContextDisclosure.tsx`) | файл фактично мінімізований: рядки 300+ символів, без пробілів, весь JSX в одному `const review=` | prettier/eslint --fix, розбити на `AssistantQueuePane`, `LegacyProposalPane`, `ReviewMessages` |
| A9 | `app/api/pusher/auth/route.ts:41` | `user_info:{name:userId}` віддає внутрішній id; власний `console.error` замість `handleApiError` | `user_info:{}`, `handleApiError` |
| A10 | `app/api/cron/assistant-cleanup/route.ts:11-25` | сирий `NextResponse.json({error})` з англійськими текстами поза `API_ERRORS`; `catch{}` ковтає помилку | `errorResponse(API_ERRORS…)` + `handleApiError` |
| A11 | `lib/utils/battle/attack/process/damage.ts:12-33` | `Math.max(MIN_DAMAGE=0, …)` як нижня межа HP → гілка `currentHp < 0 ? DEAD` недосяжна; зайва обгортка `{updatedTarget}` | прибрати мертву гілку й обгортку |
| A12 | `lib/utils/battle/attack/consume-effects.ts:12` (`withoutEffects`) | видаляє ефекти повз `removeEffects` (правило CLAUDE.md) | реалізувати через `removeEffects` |
| A13 | `run-battle-mutation.ts:98-116` (`assertAccess`) | гілка `CURRENT_CONTROLLER` дублює `TURN_CONTROLLER`, який ніде не використовується; рядки «Зараз не ваш хід» захардкоджені | видалити `TURN_CONTROLLER` (і з docs), константи в `api-errors.ts` |
| A14 | `lib/server/battles/record-service.ts:67-134` | вхід парситься тричі; у `clear-history` список рядків читається окремо від `deleteMany` (TOCTOU) | парсити один раз, розділити за операціями |

## B. Egress і БД (головний ризик за CLAUDE.md)

| ID | Де | Проблема | Виправлення |
|---|---|---|---|
| B1 | `prisma/schema.prisma` | немає індексів на FK: `InventoryLog.campaignId`, `CharacterLog.campaignId`, `Spell.groupId/summonUnitId`, `Skill.mainSkillId/spellGroupId/spellId/grantedSpellId`, `Artifact.setId`, `AiProposal.campaignId/threadId`, `Campaign.createdFromId` → seq scan при cascade/SetNull | expand-only міграція з `@@index` (перед цим `EXPLAIN`; пам'ятати про RLS-правило лише для CREATE TABLE) |
| B2 | `lib/server/compendium-import/repository.ts:120` (`loadContext`), `:75` (`loadRows`) | на кожен preview/confirm читає всі `compendiumEntry` кампанії з великими JSON (`baseline/locator/bindings`) | `select` потрібних полів, `where canonicalKey in …` |
| B3 | `compendium-import/bundle.ts:42-44`, `sync.ts:15-25`, `service.ts:270` | N+1: окремі create/upsert/findUnique/saveEntry на рядок для тисяч записів | `createMany`, один `findMany`, пакетний upsert |
| B4 | `lib/server/skills/read-skills-list.ts:6`, `characters/action-service.ts:45`, `progression-service.ts:58`, `artifacts/read-artifacts-list.ts:17`, `artifact-set-queries.ts:63`, `app/api/campaigns/route.ts:68` | `include` замість `select` у списках | звузити до потрібних полів / `_count` |
| B5 | `lib/server/world/view-handlers.ts:19` | `worldPosition.findMany` без `select` на кожен player view | `select characterId,mapId,x,y` |
| B6 | `lib/server/world/map-handlers.ts:93-100` | GET мапи: два запити однієї мапи, далі послідовні | об'єднати + `Promise.all` |
| B7 | `lib/server/assistant/actions/content.ts:80-85` | `content.*.list` вантажить усі рядки, ріже `slice` у пам'яті | `take/skip` у запит |
| B8 | `lib/server/campaigns/action-service.ts:~84` (`loadCampaignState`) | на кожен preview/execute clone/template.save експортується весь bundle лише для хешу | хеш за `updatedAt`/лічильниками (як `assistant/digest.ts`) |
| B9 | `lib/server/content/operation-service.ts:103-110,182`, `characters/core/rest-handler.ts:48`, `experience-handler.ts:33` | 7 безлімітних `findMany`; послідовні `update` у циклі | `$transaction([...])` / `UPDATE … FROM (VALUES …)`, `take` |
| B10 | `lib/ai/images.ts:110,121` | `ensureSlidesBucket/ensureBucket` на кожну генерацію; магічний таймаут `110_000` | кеш ensure на інстанс, таймаут у `AI_LIMITS` |

## C. Дублікати

### Бій
| ID | Де | Проблема → виправлення |
|---|---|---|
| C1 | `lib/api/battles.ts:104-274`, `lib/hooks/battles/useBattles.ts:150-244`, `lib/server/battles/operations.ts:11-312`, `useBattleScene` (`BattleSceneActions`), `types/api.ts:149-240` | кожна операція бою розмазана по 5–6 місцях (~25 копій); `access` — рядки замість `BattleAccess.*`. → реєстр операцій `{op: {load, defaults}}`, фабрика `battleOp`/`makeBattleHook`, DTO через `z.infer` |
| C2 | `mutations/ability-action/ability-action-mutation.ts` ↔ `bonus-action/bonus-action-mutation.ts` | майже ідентичні (різниця — `targetParticipantId` і слот). → `createAbilityUseMutation(slot)` |
| C3 | `legendary-mutation.ts:48,96`, `spell-mutation.ts:207-214`, `ability-use.ts:70` | дубльований bookkeeping legendary/lair, `evaluateCondition` у 3 місцях. → `spendLegendaryUse`, `legendaryLabel`, `assertAbilityCondition` у `lib/utils/battle/actions/legendary-options.ts` |
| C4 | `useAttackWizard.ts:222-245` ↔ `useSpellBook.ts:196-225` | однаковий каркас submit+crit (`seen`, `useCritPause`, `FAIL`). → `useSubmitWithCrit`, `errorMessage()` з `lib/utils/common/error-message` |
| C5 | `participant/from-unit.ts:63-234` ↔ `from-character.ts:160-300` | однаковий каркас (6 `getAbilityModifier`, id з `Date.now()`, `actionFlags`/`battleData`). → `abilityModifiersOf`, `baseParticipantShell` |
| C6 | 8 місць `ctx.participants[ctx.scene.turnIndex]`; 22 × `ctx.rng ?? Math.random` | → `currentOf(ctx)` у `common/control.ts`, `rngOf(ctx)` |
| C7 | `attack-mutation.ts:142,148`, `maze-move.ts:57`, `next-turn-mutation.ts:13`; summons-messages у 4 місцях | → `withAdvancedTurn(ctx, result)`, `appendSummonMessages` |
| C8 | `useAuraZones.ts:50`, `useCoreActions.ts:42`, `usePlayerTurn.ts:89,107`, `useAbilityPicker.ts:41` | однаковий `try { await m.mutateAsync } catch { return }`. → `safeMutate` у `lib/hooks/battles` |
| C9 | `participants/patch-participant-mutation.ts:99-178` | `updateHp`/`revive` дублюють `findIndex`+map. → `findParticipant`/`replaceParticipant` |
| C10 | `types/api.ts:~210`, `lib/api/battles.ts:~268`, `useBattles.ts:~228` | клієнтські DTO вручну (`MazeActionData` вже через `z.infer`); тип патчу учасника ×2. → експорт схем без серверних імпортів |
| C11 | `useBattles.ts:5-6,60-62` | два імпорти з `./keys`; `pauseRefetchWhen` ≡ `pauseRefetchWhenPusherConnected`. → один |

### Сервер
| ID | Де | Проблема → виправлення |
|---|---|---|
| C12 | `templates/sync/apply.ts:102` (`cleanRow`) ↔ `templates/import-bundle.ts:63-83` | один конвеєр рядка двічі з різною поведінкою (виняток для backgrounds є лише в sync). → `remapBundleRow(table, row, idMap, knownIds, onDangling)` у `templates/bundle.ts` |
| C13 | `compendium-import/bundle.ts:10`, `service.ts:21`, `repository.ts:41`, `types.ts` | список видів `units\|spells\|…` у 3+ місцях. → `TARGET_KINDS as const` |
| C14 | `adapters/character-traits.ts:11,15` ↔ `lib/constants/monster.ts:1-2`; `monster-traits.ts:11`, `content.ts:205`, `shared.ts:20` ↔ `constants/damage.ts`, `abilities.ts` | паралельні словники з різними термінами («Темний зір»/«Темнозір»). → виводити з констант |
| C15 | `content/resources/{classes,feats,backgrounds}.ts`, `choices/resolve-choices.ts:19`, `show/show-store.ts:51`, `assistant/json.ts:15`; `assistant/http.ts:24`, `compendium-import/http.ts:15`; `object()` у `repository.ts:44`/`bundle.ts:10` | копії `json`/`privateJson`/`object`. → `lib/utils/common/json.ts`, `privateJson` у `lib/utils/api` |
| C16 | `campaigns/action-service.ts:35`, `assistant/actions/content.ts:85`, `ai/tools/assistant.ts:35`, `templates/sync/page-diff.ts:15`, `battles/action-service.ts:216` | ручна пагінація `slice+nextOffset` ×5 при наявному `lib/utils/api/page-of.ts`. → `pageOf` |
| C17 | `content/write.ts:22`, `assistant/execute.ts:107`, `assistant/runs.ts:80`, `assistant/execution-transaction.ts:44` | 4 копії `SELECT id FROM campaigns … FOR UPDATE`. → `lockCampaignRow(tx, id, mode)` |
| C18 | `import/ai-map.ts:72`, `ai/chat/run-chat.ts:124`, `import-content.ts:270`; `ai/tools/define.ts:52` | однакова розгортка безпечного тегу помилки; магічне `22000`. → `safeErrorTag(e)`, константа в `AI_LIMITS` |
| C19 | `compendium-import/repository.ts:296`, `templates/sync/service.ts:29,44`, `campaigns/action-service.ts:169`, assistant content-effects | `invalidateReference(Object.values(ReferenceKind), campaignId)` ×5. → `invalidateAllReference` у `lib/cache/tags.ts` |
| C20 | `lib/constants/abilities.ts:13-52` | 5 паралельних таблиць для 6 ключів. → одна `{key,label,short,abbr}` з похідними |

### API і клієнтські шари
| ID | Де | Проблема → виправлення |
|---|---|---|
| C21 | `acquaintances/handlers.ts:14`, `world/note-handlers.ts:18`, `lib/utils/api/as-dm.ts:6` | три однакові обгортки `requireX → run → handleApiError`. → один `withAccess(campaignId, action, run, {dmOnly})`, `withDM` як аліас |
| C22 | `characters/campaign-access.ts:11`, `show/action-service.ts:45`, `lib/utils/api/actor.ts` | паралельні шляхи авторизації. → звести до `resolveActor`/`NEED` |
| C23 | `lib/utils/api/content-routes.ts:17` | локальний `readJson` кидає `ContentError` замість `parseBody`. → спільний шлях |
| C24 | `lib/schemas/*` (artifacts, acquaintances, ai, skills, main-skills, world) | повтор `z.string().url().max(N)`/`avatarField`. → `urlField(max)` |
| C25 | 12 `route.ts` (`acquaintances/route.ts:3`, `world/rest/route.ts:3`, …) | локальний `type Params` при наявному `CampaignRouteContext`. → імпорт |
| C26 | `useCampaignMutations`, `useAssistantIntents`, `useDecks`, `useCompendiumImport`, `useAiCredentials`, `useApiTokens`, `useAiThreads` | 26 хуків із сирим `useMutation` + ручний invalidate, хоча `useCrudMutation` (39 використань). → мігрувати |

### UI
| ID | Де | Проблема → виправлення |
|---|---|---|
| C27 | `components/{classes,feats,backgrounds,main-skills,races,artifact-sets}/*Card.tsx` | одна й та сама картка (HudCard, Link, ActionsMenu, Badge). → `DmEntityCard({href,title,accent?,badges,onDelete})` |
| C28 | `app/campaigns/[id]/dm/{backgrounds,feats,classes,main-skills,races,artifact-sets}/page-client.tsx` | один каркас сторінки-списку, `isLoading ? … : empty ? … : grid` — ручна розгортка `QueryState` (18 проти 38 прямих `LoadingState`). → `DmListPage` (крок до CRUD-фабрики stage 2) |
| C29 | `Create{Class,Feat,Background,MainSkill,Race,SpellGroup,ScenarioPage}Dialog.tsx` | діалог «назва → створити». → `CreateByNameDialog` |
| C30 | `scenario/editor/{SlidePicker,BattlePicker,MarkerPicker}Dialog`, `TransferArtifactDialog`, `stash/GrantArtifactDialog` | один скелет пікера. → `PickerDialog` на `QueryState` |
| C31 | `ArtifactDeleteButton.tsx:26-42`, `WorldInspectorBar.tsx:76`, `WorldMarkerPanel`, `WorldMapSettings`, `WorldPanelHeader` | іконка-кошик з `useConfirm({destructive:true})` написана заново (23 файли з `destructive`). → `ConfirmDeleteButton` у `components/common` |
| C32 | 12 копій `clamp` (`UnitBasicInfo.tsx:21`, `ArtifactWeaponFields.tsx:45`, `SpellFormPowerFields.tsx:31`, `spells/derive/text.ts:1`, `monster-attacks.ts:11`, `map-editor.ts:100`, `usePuzzleDrag.ts:57`, `puzzle-command.ts:31`, MapHitFloat, MapTokenHud, hit-chance, items/grant); різний порядок аргументів | → `clamp(n,min,max)` у `lib/utils/common/calculations.ts` |
| C33 | `ReferenceSectionAccordion.tsx:33-75`, `abilities/build/bake.ts` | ручний groupBy. → `groupBy` з `lib/utils/common/collections.ts` |
| C34 | `lib/utils/scenario/structure.ts:5` | `newId` дублює `shortId()` і падає в незахищеному контексті (http по LAN). → `shortId(10)` |
| C35 | `localeCompare(…, "uk")` у 9 місцях; `byName` у `units/group-units.ts:33`; `signed` у `format.ts` ↔ `damage-breakdown.ts:11` | → `compareUk`/`byName` у `lib/utils/common/text.ts` |
| C36 | `components/battle/**`: `#f2c14e`, `#e0603a`, `text-[#9fcf9a]`, `text-[#e9a08f]` (~141 hex); ~10 ручних `<button className="hud-sc…">`, ~7 `border-white/.. bg-black/..` | → `MAP_COLORS`/CSS-змінні, `text-hud-good/danger`, HUD-варіант кнопки/`HudPanel` |
| C37 | `BattleMap.tsx:345-361` | ручний ResizeObserver при наявному `lib/hooks/common/useElementSize.ts` |
| C38 | `ParticipantDetails.tsx:14` (локальний `Section`), `BattleResultScreen.tsx:11-24` (`HEADLINE/STATS`), `ReservePanel.tsx:15-16` (side→label) | → `HudSection`, `lib/utils/battle/view`, спільна константа сторін |

## D. Декомпозиція

**Функції:**
`spell-mutation.ts:56-224` (~170), `attack/process/run.ts:26-244` `processAttack` (~218), `compute.ts:54-232` (~178), `extract-attacks.ts:49-221` (~172), `run-attack-phase.ts:49-212` (~163), `legendary-mutation.ts:35-125` (90, три гілки), `adapters/content.ts:49` `monster` (154), `characters/operations/patch.ts:35` `patchCore` (142), `ai/chat/run-chat.ts:25` (138), `spell-derive.ts:112` (132), `assistant/execution-transaction.ts:26` (131), `show/action-service.ts:101` `runShowOperation` (131), `stash-update.ts:65` (127), `inventory-update.ts:40` (120), `templates/sync/apply.ts:145` `writeTables` (113), `compendium-import/repository.ts:113` `loadContext` (~110), `battles/action-service.ts:92-190` `prepared` (100).

**Хуки і файли:**
- `useAttackWizard.ts` (~316; `finish()` будує `ResultFx` — view-логіка в хуку, `predictAttack` у 3 місцях) → `buildAttackResultFx` у `lib/utils/battle/view`, `forcedFor`.
- `useBattleScene.ts` (408: 15 інтерфейсів, 2 контексти, чисті `deriveScene/deriveTurn`, 25 мутацій) → типи в `types/battle-scene.ts`, `derive*` у `lib/utils/battle/view/derive-scene.ts`, `useBattleActions`.
- `BattleMap.tsx` (640): хуки `useStrokePaint`/`useScrollToCurrent`, компоненти `RangedHint`/`MapStage`; `MapToken`/`MapTokenHud`/`MapHitFloat` з 10–12 props → `MapGeometryContext` або `placement={box,mapSize,pxPerUnit}`; `onTokenClick` залежить від цілого `actions` і ламає `memo(MapToken)`; `editing = {}` створює новий об'єкт на кожен рендер.
- `compendium-import/adapters/character-traits.ts` (410) → `race-traits`, `equipment`, `feat-prerequisites`, `feat-spells`; `plan.ts` (379).
- `app/campaigns/[id]/dm/world/page-client.tsx` (284, 7 хуків, 6 useState), `WorldInspectorBar.tsx` (296), `scenario/editor/AcquaintanceDialog.tsx` (269, 6 внутрішніх компонентів).
- `AddParticipantDialog.tsx:30-60` → `useAddParticipantForm`; `ParticipantDetails.tsx:61` — рядок ~330 символів, `statblockOf` у `lib/utils`.
- Хуки >200 рядків: `usePuzzleDrag` (316), `usePlayerDraftForm` (286), `useEmailAuth` (227), `useContentImport` (216), `useViewport` (207).
- Диспетчери `if (operation === "…")` (~65 порівнянь у 4 `action-service`) → таблиця обробників.
- `app/api/mcp/route.ts:36` — рядок ~500 символів → `buildToolContext(auth, req)` у `lib/ai/`; `content/import/import-content.ts:248` — перемикання за ідентичністю `deps ===` → явний параметр `transactional`.
- `lib/server/battles/read-battle.ts:27-38` — читання сцени через `runBattleMutation` із фейковим `Request` і `dryRun` → окремий read-path.

## E. Межі шарів

- `lib/utils/battle/{store,participant,spell,balance,artifact-sets}` (8 файлів) імпортують `prisma` (`from-character-learned-spells.ts:3`, `extract-skills.ts:5`, `load-race.ts:1`, `load-character-context.ts:8`, `from-character-spell-slots.ts`, `spell/load-spells-db.ts`, `balance/unit-library.ts`, `artifact-sets/load-maps.ts`) → перенести завантажувачі в `lib/server/…`.
- Цикл `lib/ai` ↔ `lib/server/assistant`: 54 імпорти ai→server проти 12 server→ai; `lib/ai/proposals.ts` ↔ `assistant/actions/legacy-proposal.ts`, `scenario-edit.ts`; 15 файлів `templates/compendium-import/battles/campaigns/characters` імпортують `assistant/*`. → `json.ts` у `lib/utils/common`, `proposals.ts` у `lib/server/assistant`.
- Три стилі помилок: `throw ContentError`, `{ok:false,status}` (`lib/ai/proposals.ts:63`), `return NextResponse` (~88 `instanceof NextResponse` у `lib/server`; `characters/operation-runner.ts:62-85` конвертує назад). → нові домени лише через `throw ContentError`.
- Handler-и в `app/api/campaigns/[id]/{scenario,show,skills,artifacts,spells,races,artifact-sets}/*-handler(s).ts` імпортуються зі сторінок → у `lib/server/<domain>`; `progression/route.ts:8` — GET з третім аргументом `actor?`.
- `lib/server/artifacts/lock.ts:10` (`ensureInventory`) лежить у файлі з ім'ям lock; `characters/battle-lock.ts` має два API (NextResponse і throw).

## F. i18n-хвіст (відомий part 5)

~514 рядків кирилиці в `lib/utils/battle`/`lib/server/battles` (`modes/maze/texts.ts` 36, `conditions/registry.ts` 27, `damage/impl.ts` 22, `spell-targeting.ts` 18, `actions/grapple.ts` 16); 989 рядків у 166 файлах `lib/server` + `lib/ai` + `lib/constants` (`critical-effects.ts` 106, `save-critical-effects.ts` 50); ~133 файли `components/battle`; 377 tsx-файлів поза battle. Порада: спочатку спільні дієслова («Скасувати» ×38, «Видалити», «Створити», «Редагувати») на `useTranslations("common")`, далі по каталогах; у рушії пріоритет — тексти, які бачать гравці (відмови, лог).

## G. Мертвий код

`getCampaignId` (`lib/api/api-helpers.ts`), `bodyErrorMessage` (`lib/api/client.ts`), `featureDescription` (`adapters/characters.ts:102`), `getDamageElementLabel`, `CHAT_SCOPES`, `XP_THRESHOLDS` (експорт), `memberGate`, `readFlagMap`, `setBonusToPrismaInput`, `parseContent`, `toBattleAudioTrack`, `movedProgress`, `isArtifactEffectAudience`, `MAX_WORLD_MAP_MB`, `RACE_COLOR_PALETTE`, `QUAT_ID` (`fx/dice/math.ts:19`), `hash01` (`fx/dice/rng.ts:16`), `POP_MS` (`fx/dice/throw.ts:48`), `isMazeDark` (`modes/maze/grid.ts:13`). Експорти лише для тестів: `critEffectsFor`/`getCritEffect`, `registerTestMode`, `saveRollMode`, `clearSnapshotCache`, `spellTier`, `modeLogVisible`; п'ять `*-coverage.ts` у `lib/server/assistant/actions` із застарілим коментарем «T14 activates» → у `__tests__/helpers`.

## H. A11y

`ScenarioCell.tsx:33` (`role="button"` лише Enter), `skill-tree/editor/SlotPicker.tsx:59` (`<li role="option" onClick>` без tabIndex), `LevelUpOverlay.tsx:22` (`role="dialog"` без фокусу/Esc), `MapToken` (немає role/tabIndex/onKeyDown), `BattleResultScreen.tsx:31-39` (`<dd>` перед `<dt>`). Порожні стани помилки (`isError` → порожній екран) у `UploadTrackButton`, `AbilityCopySourcePicker`, `UnitPickerField`, `VersionsDialog`, `MarkerPickerDialog`, `RulesForm`, `SkillTreeEditor` → `QueryState` з `ErrorState`.

## I. Дрібне

- Зайвий `"use client"`: `ClassCard`, `FeatCard`, `BackgroundCard`, `MainSkillCard`, `SpellIcon`, `SkillGroupAccordionItem`, `StoryChapters`, `app/campaigns/[id]/world/page-client.tsx`, `dm/assistant/page-client.tsx` (зайвий шар `export const X = AssistantWorkspace`), `ConnectionBanner`, `BattleOverBanner` — перевіряти по одному.
- `fx/BattleFxLayer.tsx:25` — `window.setTimeout(fireFxImpact…)` без скасування при unmount.
- Магічні числа візуалів карти (`MORALE_SKIP_MS`, `AURA_MS`, `PULSE_STEP_MS`, `0.18/0.32/0.45` у `BattleMap.tsx:575-583`) → `map/constants.ts`.
- `useBattleScene.ts:303-306` пише `document.title` у колбеку, ще один запис у `BattlePageClient.tsx:20`; `anyPending` перебирає 25 мутацій щоразу.
- `marker-handlers.ts:61` — `Record<string, unknown>` + `delete data.x` втрачає типи Prisma → `Prisma.WorldMarkerUpdateInput`.
- Catch без логування: `ai/tools/define.ts:97`, `assistant/execution-effects.ts:36,53` → логувати `error.name` (без message).
- Рядки >200 символів: `useSpellBook.ts:260-300`, `action-service.ts`, `record-service.ts:78/105/124`.
- Dev-код: `localeCompare(b.name, "uk")` у `components/battle/dev/spells/FxSpells.tsx:24`.

## Рекомендований порядок

1. **PR «баги + мертвий код»** — розділ A (A1–A14) і G. Низький ризик, малий обсяг.
2. **Міграція індексів + `select`** — B1, B4, B5, B2/B3. Закриває головний ризик по egress.
3. **Дрібні спільні утиліти** — `clamp`, `hexColorSchema`, `pageOf`, `currentOf(ctx)`, `rngOf`, `withAccess`, `TARGET_KINDS`, `json.ts`, `lockCampaignRow`, `invalidateAllReference` (C6, C13, C15–C17, C19, C21, C24, C32–C35).
4. **Реєстр операцій бою** + `z.infer`-типи (C1, C2, C10, C11) — найбільший структурний виграш.
5. **DM-каркаси UI** (C27–C31) — разом із CRUD-фабрикою constructor stage 2, щоб не робити двічі.
6. **Розбиття монолітів** (розділ D) — кожне окремою задачею з тестами.
7. **Межі шарів** (розділ E): prisma із `lib/utils/battle`, цикл ai↔assistant.
8. **i18n-хвіст** (розділ F) — у межах i18n part 5.
