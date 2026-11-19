# Епік «Якість 9–10»: повторний аудит (L10-5), «було/стало»

Main `d871500da` (2026-11-18), порівняння з аудитом main `155874c7d` (2026-11-17). Аудит лише читав код: тести, tsc, eslint не запускалися, покриття взято з вимірювання перед аудитом (lib 88.8% рядки / 84.6% гілки). 15 зрізів: 4 Fable (F1 генератор карт, F2 безпека, F3 межа core↔systems, F4 MCP) і 11 Sonnet (S1–S11). Звіти зрізів: `research/2026-11-18-reaudit-slices/`.

Примітка щодо бази: початковий звіт мав загальну 6.5, план і STATUS кажуть 6.7; тут порівнюю з оцінками критеріїв із плану.

## 1. Таблиця «було/стало»

| Зріз | Було | Стало | Що змінилося |
|---|---|---|---|
| Якість коду | 7 (план 7.5) | **8.0** | `as unknown as` у lib 123→25 (ціль ≤25 виконано), 0 функцій >150 рядків у lib/server, 0 `as any`/`@ts-ignore`. Не виконано: 9 файлів >700 рядків (`world-service.ts` 1255, `spell-mutation.ts` 1008), Zod на snapshot лише перевіряє контейнер, `levelUpCore` 238 рядків, `castSpell` 468 |
| Перевикористання / дублювання | 5 (план 6) | **7.0** | один `cellKey`, один image-decode, d20↔wfrp same-named клони зникли (wfrp reuse 4.5→7). Лишилось: 38 пар клонів, 4 у `world/editor`, 2 у wfrp (21 рядок), `CHUNK_SIDE` ×3, ~68 inline clamp, pan/zoom у 3+ стеках |
| Безпека | 7 | **8.0** | authz на всіх 208 маршрутах, RLS на 79 таблицях, Demo-join, `inviteCode`, DM-only бібліотека карт, SSRF-піннінг, health secret закрито. Не виконано: rate limit fail-open у prod для боєвих мутацій, CSP лише report-only, редакція учасників на denylist, 3 Medium при цілі 0 |
| Архітектура (загалом) | 7 | **7.5** | 0 циклів, шари дотримано, 0 `@/lib/api`/`fetch` у UI, 0 route.ts з прямим prisma |
| Модульність core↔systems | 5 | **6.5** | morale, lair, skilltrees, artifactsets переїхали в `systems/*`, але назви модулів ще у core (morale 62 файли, artifactSet 48, skillTree 32), сторінки/API skilltrees і artifactsets у core, схема й messages лише заморожені |
| Маніфест і реєстр | 8 | **8.0** | без змін; `types.ts` 1120 розбито на слоти, `combat.*` null-object |
| Ratchet-и | 5 | **7.0** | `props-budget-exempt` 24→5 (ціль виконано); `system-literals-exempt` 5, не зменшився (ціль ≤2 ні); сканер літералів досі сліпий до id аддонів і camelCase; CI немає |
| Розділення відповідальностей / шари | 9 | **9.5** | 0 порушень шарів, 0 inline queryKey, 0 deep-імпортів хуків |
| Хуки | 7 | **8.5** | 0 хук-файлів >300 (найбільший у map 275), 0 route.ts з prisma. Не виконано: `BattleMap.tsx` 436 і `MapStage.tsx` 408 >400, `keys.ts` відсутній у audio/auth/battle/systems/theme, `useBattleActions` 35 полів, 3 хуки рівно 300 |
| Тести | 6 (план 6.5) | **7.5** | 17559 зелених, пороги покриття у vitest.config, composition/contract 8.5. Не виконано: CI немає (пороги нічого не блокують), покриття не рахує app/components, 81 із 208 маршрутів без прямого тесту, UI в systems майже без тестів, 4 модулі без composition-тесту |
| UI-бібліотека | 6 | **8.0** | сирих контролів 242→1 (`MapToken`), `components/battle` ≤10 виконано, kit має Slider/HudToggleChip/HudToolbar, ESLint-правило з baseline. Не виконано: правило не покриває textarea/details/dialog/label, 2 з 3 винятків застарілі, 5 локальних оверлеїв і 2 локальні таби, HudToggleChip лише 5 споживачів |
| Генератор карт | 5.5 | **7.5** | якість 5.5→7.5, reuse 4.5→7, безпека 7→7.5, архітектура 7→8, хуки 4.5→7.5, тести 5→7, UI-kit 4→8. Алгоритми: UVTT 8, edge-стіни 8.5, камера 8.5, туман 7, chunk/raster 6.5 |
| wfrp (додатково) | — | 7.5 | 0 сирих контролів (UI-kit 8), reuse vs d20 7; `downtime-handler.ts` 542 рядки без юніт-тесту, 7 кастів |
| d20/dnd5e/homm (додатково) | — | 7.5 | модульність 8, reuse 6.5, тести 6.5 (~81 з 134 d20 файлів без парного тесту, евристика) |
| Вимкнення аддон-модулів (додатково) | — | 6.5 | вимикання працює, але 4 з 11 без composition-тесту, `unitstacks` порожня оболонка з claim без реалізації, d20 `state.ts` читає ext чужих модулів |
| MCP | 7.0 | **8.0** | `annotations`, `structuredContent`, коди помилок, `WWW-Authenticate`, IP-ліміт до auth, аудит-лог, токени з `expiresAt`/rotate. Не виконано: ідемпотентність без `Mcp-Session-Id` не працює, L11-11 (12 легасі-читань), немає e2e IDOR/retry тесту |

**Загальна: ≈ 7.6/10 (середнє 10 рядків плану; було 6.25 за плановою таблицею, 6.5–6.7 за аудитом).**

## 2. Відкриті дефекти за важливістю

Critical: немає.

Important
1. Приватність: туман лише клієнтський, позиції невидимих ворогів приходять гравцю (`useBattleMapFog.ts:100`, `redact-participants.ts`); редакція на denylist (`redact-participants.ts:20-30`) лишає ворожі `equippedArtifacts`, `pools`, `abilityUsage`, `pendingCast`, повні `resolvedAbilities`. Фікс: allowlist і серверний `fogView`.
2. Rate limit fail-open у prod для всіх боєвих мутацій (`rate-limit.ts:125-159`, `pipeline-deps.ts:38`).
3. CSP лише report-only з `unsafe-inline`, без збору звітів, без Permissions-Policy/HSTS (`next.config.ts:9-26`).
4. Модулі в core: назви morale/artifactSet/skillTree/inspiration у десятках файлів, сторінки й API skilltrees/artifactsets/inspiration у core, 18 колонок схеми і 34 ключі messages лише заморожені; сканер літералів не бачить id аддонів і camelCase; `system-literals-exempt` 5 при цілі ≤2.
5. CI немає: ratchet-и, пороги покриття і 17k тестів не блокують мердж.
6. MCP: ідемпотентність за замовчуванням не працює, `propose_scenario_edit` без `requestId`, L11-11, немає e2e IDOR/retry.
7. Тести: 81 маршрут без тесту (34 battle; 8 `map-*` і `maps/[mapId]`), покриття без app/components, UI систем (skilltrees 25/36, wfrp 37/68, d20 15/44 без тестів), d20 rules (level-up, attack, spell-roll, reactions) без прямих тестів, `downtime-handler.ts` без тесту.
8. 9 файлів >700 рядків; `levelUpCore` 238, `castSpell` 468; snapshot Zod лише контейнер (`snapshot-schema.ts:8`, `split-participant.ts:143`).
9. Карти: `BattleMap.tsx`/`MapStage.tsx` >400; `rasterSignature` будується на кожне перемальовування (`chunk-cache.ts:130`); `TileCanvas` скидає `canvas.width` щоразу; `patchTileChunks` читає/пише всю карту на патч (до 512 upsert).
10. Клони: `MapStrip`↔`WorldMapSettings` (19 р.), `MarkerStrip`/`WorldMarkerPanel`, `useWfrpDraftForm`↔`useWfrpDraftPicks` (21 р.), `assistant/actions/campaign.ts`↔`campaigns/action-service.ts`, `world-service`↔`travel-handlers`.
11. UI-kit: 2 застарілі записи exempt виводять файли з-під правила; правило не бачить textarea/details/dialog/label.

Minor (скорочено)
- `CHUNK_SIDE` ×3 і інлайн-ключі чанків; хардкод-кольори в `GridStatic`/`MapLayers`; `rasterCache` ніколи не очищається; UVTT: `file.text()` без перевірки розміру, англійські повідомлення, `diagonal` для позасіткових стін, `map_origin` у піксельних координатах.
- `player-access.ts:30` PREPARED-бій відкриває карту гравцю; cron-секрет через `!==`; `deck-operations` пише за `{id}` без `campaignId`; `x-forwarded-for` довіряється; немає ratchet-тестів «кожен route має auth» і «кожна міграція з CREATE TABLE має RLS»; join повертає зайві поля кампанії; публічні бакети без квоти.
- MCP: `outputSchema` загальний, необмежені рядки, `AiToolError` завжди 422, `ai.md` застарів (3 scopes замість 15), каст `def.input as z.ZodObject`.
- Модулі: `unitstacks` порожня; 4 модулі без composition-тесту; слоти названі за модулями; d20 називає аддони; вибіркові маски в `system-module-subsets`.
- Хуки: `keys.ts` у 5 доменах, god-хуки (`useBattleActions` 35), 3 хуки рівно 300; 542 `as unknown as` у тестах; запас гілок 0.6 п.п.; прості дублі `RestBadges`/`ResourceFields` з wfrp.

## 3. Висновок: чи досягнуто 9–10

Ні. Загалом ≈7.6; жоден рядок не досяг 9, найближчі шари/відповідальності (9.5) і хуки (8.5). Плановий exit-критерій виконано повністю лише для частини рядків (UI-kit `components/battle`, `as unknown as`, функції lib/server, props-budget, хуки ≤300). Чого бракує до 9:
- Безпека: allowlist-редакція і серверний туман, fail-closed rate limit, enforce-CSP.
- Модульність: справді винести skilltrees/artifactsets/inspiration/morale зі схеми, API, messages і сторінок core; розширити сканер на id і camelCase; `system-literals-exempt` ≤2.
- Тести і ворота: CI, покриття з app/components, route-тести для 81 маршруту, тести d20 rules і UI систем.
- Кодова гігієна: 9 файлів >700, clone-кластери, CHUNK_SIDE, BattleMap/MapStage.
- MCP: реальна ідемпотентність і L11-11.
10/10 за такою шкалою недосяжне без CI і закритих схемних модулів.

Оцінки мають похибку: лічильники тестів «без парного» — евристика за іменами, тести й eslint не запускалися, оцінки субагентів не перехресно перевірялися, крім самих F-зрізів.

## 4. Аудит процесу

Вимірів токенів немає, нижче оцінка за журналом плану.
- Найдорожче: хвиля 2 (11 паралельних гілок з перетинами в `raw-controls`, `props-budget`, барелях хуків, трекері; окрема інтеграційна гілка, 9 червоних тестів, правки ~25 тестів) і те, що тести 4 хвилі «писали, не запускали», тож усі помилки спливли в одному прогоні. Друге: повторні переписування одного й того ж (`Button bare` → ghost/HudButton → видалення bare, 138 місць у 3 проходах; kit1/kit2/props). Третє: фікс-раунди після Opus-рев'ю (L8b C1/C2, kit I1–I3) і 319-рядковий журнал, який кожна сесія перечитує.
- Дешевше було б: (1) CI або pre-push на 1-2 хв (tsc, cycles) від першого дня, дешевий `tsc` у кожній смузі замість «нічого не запускалося»; (2) смуги за непересічними файлами та генерація baseline-файлів скриптом замість ручного злиття; (3) один раз вирішити дизайн kit (HudButton/SelectField) до масової заміни, а не за три проходи; (4) журнал як короткі рядки зі статусом, подробиці в PR/коміті; (5) цілі «9» без CI недосяжні, бо ratchet-и нічого не блокують, тож CI варто було зробити першим.
- Сам цей аудит: файли-звіти замість контексту оркестратора спрацювали (у першому аудиті оркестратор не отримав 6 з 14 звітів); дублювання між зрізами (CHUNK_SIDE, BattleMap/MapStage у F1, S1, S2, S3, S11) — перекриття, яке можна було зняти чіткішими межами.

## 5. Міні-переаудит після хвилі 4 (слайси 1–3, лише змінені критерії)

Виміряно сканерами й гейтом (tsc 0, cycles 0 SCC, 2611 файлів / 18761 тест зелені), без нових оцінок субагентів.

| Критерій | Було (реаудит) | Стало |
|---|---|---|
| `system-literals-exempt` | 45 файлів / 67 хітів | 5 файлів / 9 хітів (2 одноразові плани P16 + 2 backfill-morale + `morale-store.ts`) |
| surface code (сума хітів) | 1477 (честний reset) | 1060 (210 файлів) |
| surface schema | 18 | 9 (3 після D3 контракту) |
| surface messages | 192 | 164 |
| `system-imports-exempt` | `[]` | `[]` |
| raw-controls baseline | непорожній | `[]` |
| Дрібні дефекти | hit-dice `healed` без clamp | виправлено + тест |
| Тести систем UI | skilltrees без тестів EditorTable/SkillGroupAccordion/MainSkillCard | +15 тестів |

Не досягнуто / свідомо відкрито: `moraleStore`/`morale-store.ts` у ядрі називає модуль (потрібен узагальнений seam на `STORED_COLUMN_ENTRIES`; зараз це зростання ratchet на 1 файл); `BattleParticipant.morale` і `isEnableInSkillTree` лишаються в схемі ядра (D5/D6); поріг покриття `app/api` не додано (потрібен виміряний `--coverage`); CI немає. Читачі колонок лишаються до D2: `usageSelect.skillTreeProgress`. Прод не чіпали: міграція M1, бекфіли і деплой чекають «так» власника.

## 6. Завершення хвилі 4 (2026-11-19: смуга E, seam, D1–D3 на проді)

Виміряно гейтами й сканерами: tsc 0, cycles 0 SCC, повний `test:run` 2611 файлів / 18758 тестів зелені (після D3: 2610 + виправлений ратчет), `lint:dirs --changed` чистий.

| Критерій | Було (реаудит) | Після слайсів 1–3 | Стало (після D3) |
|---|---|---|---|
| `system-literals-exempt` | 45 файлів / 67 хітів | 5 / 9 | **3 файли / 7 хітів** |
| surface code (файлів / сума хітів) | 1477 (честний reset) | 210 / 1060 | **201 / 971** |
| surface schema | 18 | 9 | **3** |
| surface messages | 192 | 164 | 164 |
| Колонки модулів у ядрі (`pendingMoraleCheck`, `characters.inspiration/morale/skillTreeProgress`, `units(.base).morale`) | 6 | 6 (dual-write) | **0, видалені на проді** |
| Читання/запис модульних даних | колонки ядра | dual-write + fallback | **лише нове сховище** (`ext.*`, таблиця `skill_tree_progress`, слот сцени) |
| Поріг покриття `app/api` | немає | немає | 80/80/80/70 (виміряний `--coverage`) |
| Файли > 150 рядків у `lib/server`, `world-service`/`import-content` та ін. | кілька | — | розбиті (смуга E) |

Прод (2026-11-19): активний бій завершено власником; `RATE_LIMIT_ALLOW_MEMORY=1` у Vercel production; токен лише з `ai` розширено read-scope'ами; бекапи перед D1 і D3; M1 застосовано вручну до push (D2-prep читає таблицю), бекфіли: skill_tree_progress 8 (6 порожніх), morale units 612 / units_base 153, characters 0, inspiration 0, pending-morale 0; усі `--report --expect-zero` = 0 перед DROP; D1 → D2 → D3 задеплоєні, `migrate status` 82 міграції, health 200, помилок у логах немає.

Знайдено й виправлено під час виконання: sweep писав навички героїв лише в колонку (таблиця має пріоритет, 17 хибних збоїв `heroes-homm`); Opus-рев'ю D2: I1 (хеш контенту без `morale` після дропу змінював би baseline template sync — дефолт `morale: 0` у `contentRowHash`), I2 (`active-battles-report` читав видалену колонку).

Свідомо відкрито: `BattleParticipant.morale` і `isEnableInSkillTree` у схемі ядра (D5/D6); CI немає; M3 (скидання прогресу дерева при пониженні рівня незалежно від композиції — поведінка з D1); M4 (створення персонажа не зберігає `morale`, давній дефект); `heroes-homm` «темрява в лабіринті» — одна відома помилка sweep, ідентична базовому main; розвчення навички не перевірено в UI (кнопки в DM-екрані немає); браузерну перевірку виконано на prodcopy_w4c (learn, inspiration, morale-check), а не на проді.
