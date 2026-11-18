# S10: якість тестів (re-audit, main d871500da)

## 1. Оцінки
| Критерій | Було | Тепер | Причина |
|---|---|---|---|
| Тести (загалом) | 6 (map gen 5) | **7.5** | Багато файлів (2521 test-файл), 0 `as any`, 0 snapshot-only, composition/contract є; але нема CI, 35 з 41 UI-файлів systems/skilltrees без тесту, кожен 5-й route без route-тесту |
| Тести map editor / generator | 5 | **6.5** | `components/maps` 6 з 10 файлів не імпортуються жодним тестом (EditorHeader, EditorSidebar, TilePalettePanel, UvttImportSection...); lib-частина (`battle-maps`, `map-catalog`, `map-fog` route) покрита |
| Контракт/композиція | - | **8.5** | 6 contract-тестів у `lib/__tests__` (system-contract, composition-matrix, routes-contract, content-kinds, rules-presets, stat-columns) + `composition.test.ts` у 7+ модулів + `composition-ui` у deathsaves/opportunity |

## 2. Що змінилось (докази)
- Пороги покриття зафіксовано в `vitest.config.mts:19-31` (lib 85/85/85/84, systems 80x4) - виконує exit-критерій "пороги". Виміряно lib 88.8% рядків / 84.6% гілок: запас по гілках лише 0.6 п.п. (коміт d871500da знизив поріг 85->84 під виміряне 84.61 - це підгонка порогу під факт, а не підвищення якості).
- Тести приватності на рівні маршруту: `app/api/__tests__/campaign-invite-code-privacy.test.ts`, `campaign-ai-instructions-hidden.test.ts`, `battle-read-routes.test.ts`, `battles-api.test.ts`; редакція учасників - `lib/utils/battle/view/__tests__/redact-participants.test.ts`, `visibility.test.ts`, `systems/wfrp/rules/__tests__/redact.test.ts`. Але в `app/api` немає окремого route-level теста для редакції `redactParticipantsForViewer` у відповіді мутації/Pusher-дельті (лише unit на утиліту).
- З 2026-11-17: 339 комітів, 41 "test". Журнал: повний `test:run` 17352 зелених / 9 червоних на інтеграції хвилі 2, потім 17559 зелених (за брифом).
- Timeouts підняті точково в 6 місцях (`lookup.test.ts` x2, `cyrillic-comments.test.ts`, `assistant.test.ts`, `DemoTourCoordinator.test.tsx`, integration) - ознака повільних тестів, не системного флейку.

## 3. Цифри
- Test-файли / source (без d.ts, index): app 161/390 (0.41), lib 1521/2024 (0.75), components 418/963 (0.43), systems 300/602 (0.50), scripts 121/227, types 0/41 (ok, типи).
- Source-файли, чиє ім'я не імпортується жодним тестом (груба оцінка, непрямі тести враховано частково): lib 568/1947 (29%), components 514/943 (55%, багато - тонкі презентаційні), systems 162/540 (30%), app/api 19/247.
  - systems UI: skilltrees/ui 25/36, wfrp/ui 37/68, d20/ui 15/44, artifactsets/ui 5/11, morale/ui 4/10, deathsaves/ui 2/2, heroscaling/ui 2/2.
  - systems server: wfrp/server 12/33, artifactsets/server 2/7, d20/server 2/11.
  - components/battle 81/180, components/world 12/30, components/maps 6/10.
- Route handlers: 208 route.ts; 127 імпортуються тестом; 81 без прямого тесту. З них 34 battle-маршрути (attack, spell, move, start, next-turn, complete, rollback, reveal-participant тощо) - логіка покрита через `lib/server/battles/mutations/*` і `system-battle-route.test.ts`, але HTTP-шар (auth/IDOR/Zod 400) не перевірено для кожного; CRUD content-kinds покриті фабрикою (`content-routes.test.ts`), це прийнятно. Реально ризикові без тесту: `world/*` (14 маршрутів: enter/exit/travel/rest/notes/markers), `tracks/*`, `decks/*`, `show/*`, `source-sync/*`, `template/publish`, `save-as-template`, `content-import/*`, `api-tokens` (rotate), `ai/credentials` (ключі провайдера!), `campaigns/join`, `assistant/intents/*` (confirm/reject).
- `as any` у тестах: 0. `as unknown as`: 542 (моки Prisma/Request; не сигнал слабких asserts, але шум). vi.mock: 2276 - тести сильно мокові, ризик розбіжності мока й реальної поведінки; DB-double є (`database-double.ts`), 44 integration-файли виключені з дефолтного прогону.
- Snapshots: 11 `.snap`, усі golden/characterization поряд із поведінковими тестами - ок. skip/todo: 6. Файлів без `expect`: 0. Файлів із >=50% `toHaveBeenCalled()`-asserts: 0 знайдено.
- Ratchet-тести: import-cycles, system-imports, ui-layers, utils-no-server-imports, client/server-entry-imports, registry-cycles, cyrillic-comments.

## 4. Відкриті дефекти
- **I** CI відсутній (`.github` нема; vercel-build без test/lint). Пороги покриття, ratchet-и і 17k тестів не блокують merge. Фікс: GitHub Actions (tsc, cycles, `test:run --coverage`, lint:dirs --changed) або pre-push хук; exit-критерій плану "пороги в CI" формально не виконано (журнал це визнає: "CI в репо немає").
- **I** Покриття збирається лише з `lib/**/*.ts` і `systems/**/*.ts` (`vitest.config.mts:19`): `app/**` (route-хендлери) і `components/**` (`.tsx`) у метриці відсутні, тому 88.8% не описує HTTP- і UI-шар. Фікс: додати `app/api/**/*.ts` у include з окремим порогом (~70%).
- **I** 81 route без прямого тесту, зокрема `ai/credentials*`, `campaigns/join`, `assistant/intents/*/confirm`, `api-tokens/*/rotate`, `world/*`, `source-sync/apply-safe`, `template/publish`. Фікс: один параметризований "route contract" тест (401 без сесії, 403 не-DM, 404 чужа кампанія, 400 Zod) по реєстру маршрутів - дешево і закриває IDOR-клас.
- **I** UI systems майже без тестів: `systems/skilltrees/ui` (25 з 36), `systems/wfrp/ui` (37 з 68), `systems/d20/ui` (15 з 44). Це суперечить цілі "composition-тест кожного модуля" для UI-шару (composition-ui лише у deathsaves, opportunity).
- **M** Немає route-level тесту редакції в мутаціях/Pusher-дельті (`redactPatchesForViewer`/`redactPendingForViewer` перевіряються лише unit). Додати тест на відповідь `attack`/`move` для player-глядача.
- **M** Запас гілок 0.6 п.п. над порогом 84; один великий нетестований файл провалить поріг.
- **M** `components/maps/editor/{EditorHeader,EditorSidebar,TilePalettePanel,UvttImportSection,TileAssetImage}` без тестів одразу після рефакторингу L2 (931->230 рядків): регресій UI не видно.
- **M** 542 `as unknown as` у тестах: винести типізовані фабрики моків (`makeReq`, `makePrismaDouble`).
- **M** Підняті timeouts (lookup, cyrillic-comments) - повільні ratchet-тести; кешувати або звузити.

## 5. Не перевірено
- Тести не запускались; цифри покриття взяті з брифу. Оцінка "untested" - евристика за іменем імпортованого модуля (завищує покриття для спільних імен і занижує для тестів через barrel).
- Якість asserts усередині 17k тестів вибірково не читалась; наявність мутаційного тестування не перевірялась.
- Чи є реальний CI поза репо (Vercel checks) - невідомо.
