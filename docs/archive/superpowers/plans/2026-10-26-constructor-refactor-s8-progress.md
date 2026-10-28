# S8 — assistant keys та background form lifecycle

Дата: 2026-10-27. Поточний статус: S8.1–S8.4 завершено; фінальні розділи містять extraction/refresh/browser evidence. Нижче — історія незалежної S8.1/8.3.

- Branch: `refactor/constructor-s8-keys-forms`.
- Worktree: `/Users/silentfox/.codex/worktrees/8fe0/dnd-tracker-constructor` (native managed worktree).
- Base/start HEAD `feat/constructor`: `e8b5ebcd5ff4aafa022a067c7dd2f9599a49490e`.
- Плани S8/execution guide прочитані у вихідному checkout, де вони untracked; roadmap, CLAUDE.md, актуальні S1/S2/S5/S6 checkpoint-и прочитані. Base вже містить інтегровані S7.1–S7.3.
- Baseline: 5 targeted suites плану (assistant-workspace, assistant-effects, BackgroundForm, ClassFeaturesEditor-choices, FeatForm): 15 passed, 0 skipped, exit 0; `/tmp/constructor-s8-baseline.log`.
- Залежності: symlink node_modules на наявні залежності вихідного checkout; install/env/package/lockfile не змінювалися.

Ruling: явний дозвіл користувача обмежує виконання незалежними S8.1/S8.3 до загальних S4/S7 gates. S8.2/S8.4 не розпочинати; DB/browser/provider/external services не запускати.
Ruling: extraction перевіряється чинними поведінковими тестами; непокриті контракти спочатку фіксуються characterization tests, нові factories — RED→GREEN. Shared docs не редагуються; цей checkpoint є ledger сесії.
Pre-flight: S8.1 та S8.3 не мають спільних runtime interfaces. useUpdateBackground уже делегує useCrudMutation; useNavigateFresh уже інкапсулює push+refresh; useAbilityValidity рахує ability errors і не замінює boolean choices validity.

- [x] S8.1
- [x] S8.3
- [x] S8.2 — завершено наступною послідовною сесією, див. фінальний розділ.
- [x] S8.4 — завершено наступною послідовною сесією, див. фінальний розділ.

## S8.1 — interfaces та evidence

- `aiKeys` має додаткові client/server-safe factories: `intentsRoot(campaignId)` → `["assistant-intents", campaignId]`, `intentRoot` → `["assistant-intent", campaignId]`, `receiptsRoot` → `["assistant-receipt", campaignId]`, `proposalsRoot` → `["ai-proposals", campaignId]`, `workspaceProposals` → `["ai-proposals", campaignId, "workspace"]`.
- Старі factory signatures/tuples незмінні, зокрема `intents(campaignId,cursor?,limit?)` з `cursor ?? null`, `limit ?? 20`. Нові prefix keys використовуються тільки для refresh; cursor/limit лишаються частиною cache identity.
- `assistant-polling.ts` експортує `ASSISTANT_POLLING = { intentsMs: 10000, executingReceiptMs: 2000 } as const`. У `useAssistantIntents` більше немає inline keys/interval literals. API filters, retry, enabled conditions та receipt statuses не змінювалися.
- Новий `assistant-keys.test.ts` використовує happy-dom, QueryClientProvider, mocked fetch і справжній API client. Він перевіряє фактичні HTTP `status=pending`, `workspace=true`, cursor/limit; compatibility із pre-existing cache tuples; confirm/reject success/failure onSettled refetch активних list/workspace queries та prefix invalidation inactive list pages/detail/receipt/legacy page entries; інша кампанія лишається valid.
- Fake-clock characterization для pending/applied/executing/unknown/failed/rejected/stale підтверджує receipt eligibility, відсутність раннього polling та refetch біля 2000/10000 ms. Без intentId detail/receipt не завантажуються.
- RED: 5 failures через відсутні factories, 8 passed чинних контрактів; `/tmp/constructor-s8-keys-red.log`. Початкове припущення fixture `workspace=1` виправлено на чинний `workspace=true` після читання HTTP output; production API не змінювався.
- GREEN команда S8.1 плану: 3 файли, 24 passed, 0 skipped, exit 0; `/tmp/constructor-s8-1.log`. TypeScript exit 0; eslint --max-warnings=0 та diff check exit 0.
- Commit: `76b474f5` — `refactor(ai): centralize assistant query keys and polling`.

## S8.3 — interfaces та evidence

- Новий `useBackgroundForm(campaignId: string, background: BackgroundData)` у backgrounds barrel повертає `form: {data,set,patch}`, `validation: {invalid,setInvalid}`, `status: {isSaving}`, `actions: {submit,cancel}`.
- Hook володіє initial state без id, partial patch, choices validity, name.trim, update і navigation. Submit делегує чинному `useUpdateBackground` → `useCrudMutation`; success — чинному `useNavigateFresh` (push, потім refresh), cancel — router.push без mutation/refresh.
- `BackgroundForm` залишає HUD rendering, choice editor, feats reference loading та прив’язки полів. Background-specific nullable field handling і tool trimming/filtering onBlur незмінні; description/equipment не отримали feat-specific trim.
- Фактичне дублювання class/feat: локальний state та submit boilerplate, але class builder нормалізує caster/spellList/subclass, feat — nullable icon/description, ability validity використовує error counts. Усі вже використовують navigation helper, class/background mutations — чинний CRUD helper. Generic wrapper лише приховав би ці відмінності; class/feat hooks не змінено. Boolean choices validity background не підмінюється ability error-count helper.
- Перед extraction розширено існуючий BackgroundForm suite: 5 passed, 0 skipped, exit 0; `/tmp/constructor-s8-form-characterization.log`. Поведінкові тести використовують чинні QueryClientProvider/ConfirmProvider, реальні update/CRUD/navigation hooks, mocked background API, choice editor callbacks. У failure case notice спочатку закривається через «Зрозуміло», бо provider приховує решту UI від accessibility queries.
- Контракти: invalid choices → кнопка disabled і programmatic submit не викликає update; valid choices → один update із точним body/trimmed name та без id; tool blur normalization; list/sheet invalidation; success → один push перед refresh; failure → notice без navigation, saving знову доступне; cancel → без update/refresh; pending → disabled save, повторний click не дає другого update.
- Команда S8.3 плану + чинний `lib/hooks/classes/__tests__/useClassForm.test.tsx`: 4 файли, 13 passed, 0 skipped, exit 0; `/tmp/constructor-s8-3.log`. Самі 3 suites із плану: 8 tests у цьому прогоні. Extraction не потребував нової production поведінки/зміни mutation semantics.
- Commit: `445fe1952fce00bb3b92bffdd04f5630cf5a8d9d` — `refactor(forms): isolate background form lifecycle` (end code/test HEAD).

## Фінальна перевірка

На code HEAD `445fe195` виконано:

```sh
pnpm exec vitest run lib/hooks/ai/__tests__/assistant-keys.test.ts components/ai/__tests__/assistant-workspace.test.tsx lib/hooks/ai/__tests__/assistant-effects.test.tsx components/backgrounds/__tests__/BackgroundForm.test.tsx components/classes/__tests__/ClassFeaturesEditor-choices.test.tsx components/feats/__tests__/FeatForm.test.tsx lib/hooks/classes/__tests__/useClassForm.test.tsx
pnpm exec tsc --noEmit --incremental false
pnpm exec eslint --max-warnings=0 lib/hooks/ai/keys.ts lib/hooks/ai/useAssistantIntents.ts lib/hooks/ai/assistant-polling.ts lib/hooks/ai/__tests__/assistant-keys.test.ts lib/hooks/backgrounds/useBackgroundForm.ts lib/hooks/backgrounds/index.ts components/backgrounds/BackgroundForm.tsx components/backgrounds/__tests__/BackgroundForm.test.tsx
git diff --check e8b5ebcd..HEAD
```

- Vitest: 7 файлів / 37 passed / 0 failed / 0 skipped / exit 0. Лог: `/tmp/constructor-s8-final-targeted.log`.
- TypeScript: exit 0; `/tmp/constructor-s8-final-tsc.log`. Baseline TypeScript також exit 0; `/tmp/constructor-s8-baseline-tsc.log`.
- ESLint: exit 0, 0 errors/warnings; `/tmp/constructor-s8-final-lint.log`. Diff check exit 0.
- Є наявний Radix warning `Missing Description or aria-describedby` від спільного notice dialog у negative test; він був і до extraction, shared UI поза scope.
- Середовище: Node v22.0.0, pnpm 9.15.5. HTTP mocked; реальні DB/browser/provider/Storage/Pusher/Redis не запускалися, env не копіювався. Full suite/build належать S10 і не запускалися.
- Security findings у scoped diff: підтверджених немає. Campaign prefixes перевірено фактичною QueryClient invalidation. Server authorization/writers не редагувалися й цими UI/mock tests не перевірялися.
- Performance: окремий benchmark/refetch/render вимір S8.4 не виконано; прискорення, SQL count/bytes/p50/p95 — unavailable. Fake-clock tests доводять сумісність timing, не production latency.

## Review та завершення

За `superpowers:requesting-code-review` незалежний read-only reviewer перевірив увесь range `e8b5ebcd..445fe195`, план і rulings; провів simplify-огляд. Critical/Important/Minor: 0/0/0, виправлень не потрібно. Незалежно запущено ті самі 7 suites: 37 passed, 0 failed/skipped, exit 0; `git diff --check BASE..HEAD` exit 0. Reviewer не повторював TypeScript/lint; їхнє evidence — власний фінальний прогін вище.

Межі reviewer assessment прийнято й залишено інтегратору: S8.2/S8.4 та full regression/DB/browser/provider перевірки поза scope; callback contract ChoiceListEditor перевірено через mock, його внутрішня валідація не змінена; посилення submit guards/mutation semantics не належить сумісному extraction; notice accessibility warning є в unchanged shared dialog. Висновок стосується тільки інтеграції двох scoped commits, не всього S8 чи deployment. Відкладених minor findings немає.

## Інтеграція й залишки

Інтегратору передати власні commits у порядку поверх base `e8b5ebcd5ff4aafa022a067c7dd2f9599a49490e`:

1. `76b474f5` — S8.1 keys/polling/tests.
2. `445fe195` — S8.3 background hook/component/tests.
3. Документаційний commit із цим checkpoint; його end HEAD: `git log -1 --format=%H -- docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s8-progress.md`.

S8.1 та S8.3 завершено в межах незалежної частини. **S8.2 та S8.4 не виконано й не розпочато.** Наступна задача — узгодження інтегратором залежностей S4/S7 перед S8.2; S8.4 з browser/receipt/disclosure загальними перевірками лишається окремою сесією. Цей checkpoint не оголошує весь S8 завершеним.

Використано `superpowers:finishing-a-development-branch`: гілку/worktree залишено як є за прямим дорученням користувача. Merge/push/deploy заборонені й не запускалися. Чужі working copies, shared roadmap/README/STATUS/handoff, forbidden code/package/Prisma не редагувалися. Після checkpoint роботу зупинити.

## Локальна інтеграція у feat/constructor

Наступне доручення користувача «мерджи» дозволило локальний merge підготовленої гілки.

- Target перед merge: `feat/constructor`, `5d5cf6e9a8e535984d8fddc7c624f1b1ea36be7f` (уже містить інтегровану S3).
- Source: `refactor/constructor-s8-keys-forms`, `1600fce915a8f01ee58fd767651e4838dbe6733c`.
- `git merge --no-ff refactor/constructor-s8-keys-forms -m 'Merge S8.1 and S8.3 assistant keys and form lifecycle'`: exit 0, без конфліктів.
- Merge commit: `cafa4ced8d01fbc2372ef0ddc8ac5a1df4a916f9`.
- На merge HEAD повторено фінальний targeted набір із розділу вище: 7 suites / 37 passed / 0 failed/skipped / exit 0; лог `/tmp/constructor-s8-merged-tests.log`. Radix notice warning той самий.
- ESLint змінених TS/TSX з `--max-warnings=0`: exit 0, errors/warnings 0; `/tmp/constructor-s8-merged-lint.log`.
- `git diff --check 5d5cf6e9..HEAD`: exit 0.
- Локальні зміни README й untracked плани залишено недоторканими. S8.2/S8.4 не розпочато. Worktree та source branch збережено; push/deploy/DB/browser/provider/external services не запускалися.
- `pnpm exec tsc --noEmit --incremental false` на merge HEAD: exit 0; `/tmp/constructor-s8-merged-tsc.log`.

## S8.2 — spellbook data/map lifecycle (2026-10-27)

Start HEAD `c5b33ac7`; S5.4/S6.4/S7.4 закрито, S4 інтегровано.

- [x] S8.2. `useSpellMapTargeting.ts` володіє MapTargetingContext, latest callback refs, hover, registrations та Escape cleanup; effect bodies/dependencies перенесено без зміни.
- `useBattleSpellLibrary.ts` володіє viewer-scoped IDs, known filtering, loading і bonus/reaction/prefetch hooks. useSpellBook зберігає reducer/submit orchestration і compatibility exports. Новий generic wizard/engine не вводився.
- Characterization перед extraction: 4 suites /52 passed. Після extraction і додаткових DM/player privacy/cache assertions: **4 suites /54 passed /0 failed/skipped**, exit0. HTTP fetch mocked, API client/TanStack/hooks справжні. DM IDs включають enemy-secret; player лише controlled roster; bonus/reaction observers ділять один запит.
- Scenario ray: before→after **1→1 HTTP requests,7→7 hook renders**. Cloud: **1→1 requests,9→9 renders**. Mount→open→load→pick→targets→caster switch→pick/aim→unmount; setMapAim/setMapPick clear, keydown handlers removed. Це synthetic happy-dom render/request counts, не browser latency чи DB authority.
- Fixture cloud спочатку помилково очікував лише gob; поточна friendly-fire/flow семантика включає також ally; characterization виправлено до extraction, gameplay не змінювали.
- TypeScript --noEmit --incremental false, zero-warning ESLint чотирьох changed TS/TSX та diff check — exit0. Logs `.superpowers/sdd/2026-10-26-constructor-refactor-s10-final-review/s8-{before,after,tsc}.log`.

Наступне — S8.4; S8.1/8.3 раніше завершено, browser/disclosure/refetch gate ще не закрито цим записом.

## S8.4 — receipt/disclosure/browser gate (2026-10-27)

Start HEAD `6f83256e`.

- [x] S8.4. Named effects/context/workspace + harness tests: **6 suites /29 passed /0 failed/skipped**, exit0. Receipt повтор/ремоунт не дублює refresh, failure дає retry; campaign/QueryClient dedup незалежний. Throw/false flush блокує confirm; dispose прибирає registration. Campaign/thread/focus/notes change під час deferred preview не відновлює approval; cancel під час flush блокує send.
- Real QueryClient/active queries: після одного receipt кожен query кампанії має рівно один додатковий read (1→2); повтор receipt0 додаткових reads; інша кампанія1→1. Broad invalidation для unknown/cascade domain збережено, нової dependency registry немає. Production effects/context не змінювалися.
- Tracked harness розширено справжніми RulesForm/BackgroundForm/ClassForm/ChoiceListEditor та useSpellMapTargeting. Browser **18/18 assistant +8/8 constructor UI**,1440/390, exceptions0, no horizontal overflow; rules save, valid class/background choices save=один HTTP write, spell pick і Escape cleanup. HTTP/router synthetic; invalid choices/failure/pending guards окремо у UI suites, server authority — SQL. Default новий skill choice валідний, початкове припущення browser fixture про disabled save виправлено; Radix tab switching потребує mousedown.
- `assistant-check --run`: **12/12 SQL**, connection_limit1, both URLs local constructor, migrations41→41, owned leftovers[0,0,0,0,0], own Chrome stopped. Перший старт відмовив до fixture writes через stopped Docker; запуск існуючого local container відновив перевірку. Попередні невдалі browser probes owned cleanup завершили.
- Raw outputs: `.superpowers/sdd/2026-10-26-constructor-refactor-s10-final-review/browser-s8/refactor-sequential-s8-20261027-5w0Vl0/`; unit/type logs `s8-4-final.log`, `s8-4-tsc.log`; TypeScript/zero-warning ESLint/diff exit0. S8.2 initial TS spy overload/non-null warning виправлено; final s8-tsc.exit=0, map4/4, lint0.

S8.1–S8.4 завершені на integrated branch. Наявний shared notice accessibility warning — окремий triage S10; live external/provider/Next auth не перевірялися. Render/request extraction metrics наведені в S8.2, production latency unavailable. Наступне — S9.5.
