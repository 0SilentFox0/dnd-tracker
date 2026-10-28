# S6 — character mechanics checkpoint

Дата: 2026-10-26. Поточний статус: S6.1–S6.4 завершено; integrated lifecycle evidence — у фінальному розділі.

- Branch: `refactor/constructor-s6-character-mechanics`.
- Worktree: `/Users/silentfox/.codex/worktrees/1182/dnd-tracker-constructor`.
- Base/start HEAD: `70825040042217cbbce7ad5f9f9c4415c73f62a5` (готовий S5 checkpoint); код S5: `95181e74`.
- Іменований ref S5 і старий worktree відсутні. `git log --all` показує останній S5 checkpoint `70825040`; використано доступний commit, чужі гілки не відновлювалися.
- Плани прочитано з `/Users/silentfox/Work/dnd-tracker-constructor/docs/superpowers/plans/`: вони untracked у вихідному checkout, у власний worktree не копіюються.
- Ruling: пряма інструкція користувача дозволяє S6.1–S6.3 раніше загальних залежностей; S6.4, інтеграція та lifecycle перевірки відкладені.
- Ruling: для чистого extraction використовуються чинні поведінкові тести згідно з дорученням; нові контракти отримують RED→GREEN.
- Ruling: спільні architecture/STATUS/README не редагуються; потрібні інтеграційні нотатки зберігаються тут.
- Pre-flight: S6.1 повертає ті самі ClassesApplyResult/types; S6.2 лише додає optional maps у CampaignSpellContext; S6.3 споживає незмінні ChoiceSelections та лишає classPools merge у builder. Конфліктів між інтерфейсами немає.

## Хід роботи

- [x] S6.1: pure class derivation.
- [x] S6.2: preloaded choice refs.
- [x] S6.3: pure grants/pools.
- [x] S6.4: integrated lifecycle gate завершено, див. фінальний розділ.

## Baseline та S6.1

- Baseline (об’єднання всіх трьох цільових команд плану): 23 файли, 117 passed, 0 skipped, exit 0; `/tmp/constructor-s6-baseline.log`.
- Baseline TypeScript: `pnpm exec tsc --noEmit --incremental false`, exit 0; `/tmp/constructor-s6-baseline-tsc.log`.
- Новий client-safe `classes/application.ts` експортує `ClassApplicationInput`, `deriveClassApplication(input, byId)`, `ClassesApplied`, `ClassesApplyResult`, `validateClassEntries`. Barrel reexports; server файл зберігає попередні exports і короткі перевірки до завантаження refs.
- Перевикористано `classes/derive`, `classSpellSlots`, `resolveClassEntries`, `toGameClassData`; формули S5 не змінювалися.
- S6.1 команда плану: 4 файли / 30 passed / 0 skipped / exit 0 (`/tmp/constructor-s6-1.log`). Покриває server unknown-class reject, battle HOMM fallback, manual ability, labels, single/multiclass округлення й pact slots.
- S6.1 TypeScript, eslint трьох TS-файлів та `git diff --check`: exit 0, lint без warnings (`/tmp/constructor-s6-1-{tsc,lint}.log`). Consumers звірено через `rg`: create/patch/class-level-up/draft продовжують читати server exports.

## S6.2

- `CampaignSpellContext` доповнено optional `featsById?: Record<string, FeatData>` та `backgroundsById?: Record<string, BackgroundData>`. Це refs кампанії контексту, як наявні classes/skills/artifacts maps; builder не робить міжкампанійних lookup за id.
- `loadFeatsById(campaignId, needed, preloaded?)` має додатковий optional третій аргумент. Явна порожня map authoritative; undefined зберігає fallback. Public builder signature незмінна.
- `loadCharacterContext` попередньо читає лише потрібні refs з loaders цієї кампанії. Умови class mode/selectionNeedsFeats ті самі, включно з unknown-class HOMM fallback; повертає явні порожні maps, якщо refs не потрібні/відсутні.
- RED: до змін 5 нових builder cases падали через зайві fallback calls; 5 context cases — через відсутні maps (`/tmp/constructor-s6-2-{red,context-red}.log`). ASI characterization пройшла до зміни production: повторне застосування не пише характеристик, swap лише переносить delta.
- GREEN: команда S6.2 з плану + sibling `load-character-context.test.ts`: 17 файлів, 80 passed, 0 skipped, exit 0 (`/tmp/constructor-s6-2-final.log`). Є наявний очікуваний stderr негативного tolerant-reader тесту про відкинуте invalid ability.
- Повні participant outputs порівняно зі frozen `Date.now=1793016000000` для fallback/preloaded та повторних heroes; групи, abilities, grants/order і id збігаються. Окремо перевірено missing background→null, campaign-scoped fallback і незалежні послідовні кампанії.
- TypeScript та lint змінених файлів: exit 0 (`/tmp/constructor-s6-2-{tsc,lint}.log`), warnings 0. Проміжне TS зауваження до неповного test fixture усунено; write ESLint потребував sandbox escalation у native worktree.

Mock-вимірювання на fixtures з одним feat і одним background (один сценарій на розмір, не latency benchmark):

| Герої | fallback feat/background cached-loader calls | preloaded builder calls | fallback feat/background row mappings | preloaded builder mappings |
| --- | --- | --- | --- | --- |
| 2 | 2 / 2 | 0 / 0 | 2 / 2 | 0 / 0 |
| 20 | 20 / 20 | 0 / 0 | 20 / 20 | 0 / 0 |

Джерело — Vitest spies на getCachedFeats/getCachedBackgrounds і toFeatData/toBackgroundData. Побудова fixture maps поза підрахунком; context-loader окремо підтверджує один scoped lookup потрібного ref. Це не кількість SQL: cache hits/misses та SQL не вимірювалися; elapsed, p50/p95, wire traffic і прискорення unavailable. Для batch consumers потрібне передавання maps у context їхньої кампанії; їхні loaders поза scope не змінювалися. Глобального cache немає.

## S6.3

- Новий pure `buildCharacterSpellGrants({ selections, artifactRows, consumables, proficiencyBonus }): { grants: SpellGrant[]; pools: Record<string, AbilityPool> }` у `participant/character-spell-grants.ts`. Prisma та EquippedArtifactRow імпортуються лише як типи. Runtime server/DB/cache imports відсутні.
- Перенесено незмінні heroGrantPool, hero/item/scroll mappings; перевикористано `itemStatsFromRow`, `itemPools`, `consumablePools`, `itemPoolKey`, `consumablePoolKey`. Пошук existing dedup helpers: спільного з потрібною last-row-wins/first-id-order семантикою немає; Map-дедуплікація рядків локальна. Ability дедуплікація лишилася в assembly.
- Builder лишає `classPools` перед pools helper: class→item→consumable→grant precedence збережено. `knownSpells` додає grants після selections.spells: character grants уже містяться в selections.spells, тому Set зберігає попередній порядок.
- Перед extraction записано sibling snapshot повного participant із frozen Date.now. Fixture покриває encoded owner/sharedPool, proficiency та uses=0, дубль equipped ring, cost=0, castLevel=0, DC/attackBonus/upcast, linked scroll серед кількох spells, class/item pool collision, persisted HP/tempHP/charges. Snapshot 243 рядки, після extraction не оновлювався.
- Початковий fixture помилково містив недопустимий dc=0; itemStatsFromRow за чинним контрактом відкинув item block. Після перевірки reader/schema fixture виправлено на dc=1 до extraction. Gameplay/reader не змінювалися.
- Characterization: 1 passed / 8 skipped через явний `-t 'frozen complete participant'`, exit 0 (`/tmp/constructor-s6-3-characterization.log`). Це навмисна фільтрація під час запису baseline; фінальний прогін без фільтрації.
- Команда S6.3 плану: 4 файли, 32 passed, 0 skipped, exit 0 (`/tmp/constructor-s6-3-final.log`). TypeScript, lint трьох TS-файлів, diff check: exit 0, warnings 0 (`/tmp/constructor-s6-3-{tsc,lint}.log`).

## Фінальні команди та межі доказів

Середовище: Node `v22.0.0`, pnpm `9.15.5`. Використано symlink node_modules на вже встановлені залежності вихідного checkout; install/package/lockfile/env не змінювалися. Postgres version unavailable: БД не запускалася.

Розширений цільовий прогін на code HEAD `96a62dcf705fdcdbdef4bca7266f5aca0f375331`:

```sh
pnpm exec vitest run lib/server/characters/__tests__/apply-classes.test.ts lib/utils/spells/__tests__/class-slots.test.ts lib/utils/battle/participant/__tests__ lib/server/characters/choices/__tests__/resolve-choices.test.ts lib/utils/characters/choices/__tests__ lib/__tests__/client-entry-imports.test.ts lib/__tests__/item-readers-guard.test.ts
pnpm exec tsc --noEmit --incremental false
pnpm exec eslint lib/server/characters/apply-classes.ts lib/utils/characters/classes/application.ts lib/utils/characters/classes/index.ts lib/utils/battle/types/participant.ts lib/utils/battle/participant/from-character.ts lib/utils/battle/participant/load-character-context.ts lib/utils/battle/participant/load-feats.ts lib/utils/battle/participant/character-spell-grants.ts lib/server/characters/choices/__tests__/resolve-choices.test.ts lib/utils/battle/participant/__tests__/from-character-choices.test.ts lib/utils/battle/participant/__tests__/load-character-context.test.ts lib/utils/battle/participant/__tests__/from-character-items.test.ts
git diff --check 70825040..HEAD
```

Результати: Vitest 45 файлів, 237 passed, 0 skipped, exit 0; TypeScript exit 0; ESLint exit 0, errors/warnings 0; diff check exit 0. Логи: `/tmp/constructor-s6-final-{targeted,tsc,lint}.log`. Entry import guard та item readers guard пройшли. Є лише очікуваний stderr чинного негативного choices/read тесту.

Це unit/mock evidence. DB/integration/browser/provider/Storage/Pusher/Redis не запускалися; реальні SQL count/байти/latency не виміряно. Full suite/build лишаються S10; пакетні залежності/config/shared helpers не змінювалися.

Security findings у зміненій області: підтверджених дефектів не виявлено. Campaign filtering у loaders збережено; authoritative server write validation не переносилася у builder. Auth/transaction/locking/API/MCP/persisted JSON не змінювалися й ця сесія не замінює їхній загальний security audit.

## Review

Один окремий read-only reviewer за `superpowers:requesting-code-review` перевірив увесь range `70825040..96a62dcf` та виконав simplify-огляд. Critical/Important/Minor: 0/0/0; виправлень не потрібно. Незалежний цільовий прогін: 10 файлів, 71 passed, 0 skipped, exit 0 (`/tmp/constructor-s6-review-targeted.log`); frozen snapshot не оновлювався. Reviewer diff check — exit 0.

Declined-to-judge розглянуто й залишено інтегратору: S6.4 lifecycle та сумарний стан інших стадій (відкладено користувачем); реальні SQL/latency/байти/p50/p95 (mock evidence цього не доводить); БД/browser/external services/full regression (поза дозволеною паралельною частиною). Це межі перевірки, не підтверджені дефекти.

## Інтеграція та наступний крок

S6 commits поверх готового S5 `70825040`:

1. `5a575d58` — isolate class derivation from loading.
2. `296c576e` — reuse preloaded choice references.
3. `96a62dcf` — isolate spell grants and pools.
4. Наступний документаційний commit завершує цей checkpoint. Його SHA/end HEAD: `git log -1 --format=%H -- docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s6-progress.md`.

**Наступна задача: S6.4 після інтеграції.** Звірити S1/S2–S4/S5 та інші паралельні checkpoint-и; повторити TypeScript/targeted перевірки на сумарному HEAD і lifecycle create→choices→level-up→rest→battle→finish→sheet. У цій сесії S6.4 не оголошується виконаною.

Для S7/S8 доступні pure class application і grants helper; старі server exports та createBattleParticipantFromCharacter signature збережено. Batch loaders поза scope можуть передавати нові maps у CampaignSpellContext; для них потрібно перевірити campaign ownership і виміряти реальні cached/SQL calls окремо.

Для спільних architecture/STATUS при інтеграції записати: class validation/derivation належить classes/application, loading — server wrapper; participant context підтримує authoritative empty feat/background maps; grants/pools mapping належить character-spell-grants, class pools і persisted resource application лишаються в assembly.

Під час незалежної реалізації worktree і гілку залишено для інтегратора. Чужі sessions не інтегрувалися; merge/push/deploy не запускалися; заборонені файли й спільні docs не редагувалися.

## Локальна інтеграція у constructor

Наступне доручення користувача: «мерджи в constructor - всі зроблені задачі познач». Воно дозволило локальний merge та оновлення статусу S6 у плані.

- Target: `feat/constructor`, worktree `/Users/silentfox/Work/dnd-tracker-constructor`.
- Target до merge: `0fd56e76c6807d1c314e31211a75918e4182775c` (вже містив інтегровані S5 та S1).
- Source: `refactor/constructor-s6-character-mechanics`, `17c680be015ed6ae78892787c2106c13c8d86b1d`.
- `git merge --no-ff refactor/constructor-s6-character-mechanics -m 'Merge S6.1–S6.3 character mechanics refactor'`: exit 0, без конфліктів.
- Merge commit: `4ad9011b15c7806ff9436af54aba45af11a05944`.
- На merge HEAD повторено ті самі фінальні команди Vitest/TypeScript/ESLint з розділу вище: 45 файлів / 237 passed / 0 skipped / exit 0; TypeScript exit 0; ESLint exit 0, errors/warnings 0. `git diff --check 0fd56e76..HEAD`: exit 0.
- Логи повторної перевірки: `/tmp/constructor-s6-merged-{targeted,tsc,lint}.log`.
- У S6 implementation plan позначено всі 19 кроків/перевірок/commits задач S6.1–S6.3 та виконаний документаційний пункт S6.4. Решта S6.4 лишається відкритою: S2–S4/інші паралельні результати ще не інтегровано цією сесією, lifecycle/реальні DB measurements не виконано.
- Чужі локальні зміни README та інші untracked плани залишені недоторканими й не включаються в commit статусу S6. План S6 додається у Git разом із позначками виконання.
- Push/deploy/DB/external services не запускалися. Native worktree і гілка S6 збережені; інших worktree/гілок не перемикали.

## S6.4 — integrated lifecycle gate (2026-10-27)

Start HEAD `e2027353`, branch/worktree `feat/constructor` / constructor. S5.4 завершено; S1–S4 і S6.1–3 інтегровані.

- [x] S6.4. Named API/participant команда + save-battle-resources та character server suites: **49 files / 248 passed / 0 failed/skipped**, exit 0.
- Додаткові resources/choices/classes suites + 2/20 hero reuse scenarios: **29 files / 150 passed / 0 failed/skipped**, exit 0. Покривають ASI delta/idempotency, multiclass/pact, origin feat, attunement, item/consumable spending, rest→snapshot→finish.
- Guard ОБОХ URL → local constructor. Named progression SQL suite baseline **10 passed**, final **11 passed**, exit 0, connection_limit=1. Новий наскрізний case виконує canonical create→repeat background choices→class level-up→long rest→реальний participant builder із scoped context→saveBattle active/complete→canonical sheet. Asserts level2, origin feat ref, 3→2 slots, persisted HP3/spent1, один battle_result log, sheet rest.hp.current3. Native battle setup/store test, не browser/gameplay end-to-end.
- Під час створення тесту виправлено дві помилки fixture: root-client read всередині one-connection transaction замінено `tx.character`; sheet current HP має шлях `rest.hp`, а `hp.total` є максимумом. Це не RED→GREEN продуктового дефекту. Fixtures очищені owned cleanup suites.
- Вимірювання loader calls з реального builder із mocked cached boundary на 2/20 героях повторено: fallback feat/background calls 2/2 та20/20 → preloaded0/0, row mappings так само. Це counts loader boundary, не SQL/network/latency; SQL timing/cache-hit метрики unavailable, speedup не заявляємо. Для loading-only extraction нових storage writer змін немає.
- TypeScript `--noEmit --incremental false`, ESLint зміненого integration test `--max-warnings=0`, diff check — exit 0. Public signatures не змінені.
- Raw logs: `.superpowers/sdd/2026-10-26-constructor-refactor-s10-final-review/s6-{4,resources,integration,lifecycle-final,tsc}.log`.

S6 завершено у межах refactor lifecycle gate. Full suite/build/browser — S10; live provider/external/prod/HOMM не запускалися. Наступне — S7.4.
