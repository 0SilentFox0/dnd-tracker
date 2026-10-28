# Етап 4f-5a: монстри й площі 5e — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** розширити конструктор SRD 5.2 повними даними й поведінкою монстрів 5e: статблок і режими руху, Spellcasting і дії з рятівними кидками, обмежені та перезаряджувані заклинання, легендарні посилання, дії лігва, чуття й точні площі. Завантажувач шаблону створює близько 150 заклинань дій монстрів у групі «Monster Actions». Для кампаній HOMM5 і наявного контенту без нових полів поведінка не змінюється.

**Architecture:** міграція додає JSON-колонки `units.statblock`/`spellcasting` і поля `spells.fixed_dice`/`damage_bonus`. Чисті читачі й типи залишаються без Zod у клієнтському бойовому чанку. Звичайні ресурси контенту, імпорт/експорт, бандл, source sync, OpenAPI та MCP передають нові поля наскрізно. `createBattleParticipantFromUnit` будує snapshot монстра з грантами заклинань і пулами; маршрут касту витрачає пул гранту або слот за старою гілкою. Конвертер SRD генерує рядки заклинань із розібраних дій і посилається на них із юніта та легендарних умінь. Площа реалізується однією `templateCells` для клієнта й сервера.

**Tech Stack:** TypeScript strict, Next.js 16, React 19, Prisma 6, Zod 4, Vitest, `tsx`-скрипти.

**Spec:** `docs/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md`, розділ «4f-5a. Дизайн: монстри повністю» §1–§13 і пов'язані пункти «Ризики». Після прямого доручення користувача почати виконання рекомендовані в спеку рішення прийняті як робочі: JSON-статблок; гранти й пули; N/Day як використання на бій; дія з рятівним як заклинання; `perform`/дії лігва/чуття; max(walk, fly); точна площа-диск; OpenAPI ≤145 000. Уточнення користувача під час виконання мають пріоритет і оновлюють спек до відповідного коду. Поділ 4f-5a/4f-5b та близько 150 згенерованих заклинань — межі частини.

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; основну папку `/Users/silentfox/Work/dnd-tracker` не чіпати. База тільки локальна `constructor`; prod і prodcopy не чіпати. Не зливати цю гілку в `main` і нічого не деплоїти.
- Рекомендовані рішення зі спека використовуються як робочі за прямим дорученням користувача «починай виконувати»; нові уточнення користувача мають пріоритет і фіксуються у спеку/плані перед відповідним кодом.
- Поточний HEAD на момент плану `3f4fd20b`; він містить `f30b8935`. `origin/main` оновлено fetch-ем, нових комітів відносно спільної бази немає.
- Нульова зміна HOMM5: юніт без `cr` і заклинання без нових полів залишаються на старих гілках. Не змінювати значення й форму площ для HOMM-контенту без `exact`; HOMM-юніти зберігають три універсальні слоти, старий список `knownSpells`, звичайний каст і стару легендарну поведінку.
- Усі нові поля читати без Zod там, де код потрапляє в клієнтський бойовий чанк. Не імпортувати Zod у `lib/utils/battle/**` або `lib/utils/spells/**` читачі, що використовує клієнт.
- У кожному `$transaction(async (tx) => …)` усі запити виконувати через `tx`; не використовувати singleton `prisma` всередині callback.
- Міграція — одна, після `20261103000000_choices_feats`: `20261104000000_monster_5e_full`. Лише розширення; RLS для таблиць не потрібне, бо таблиці вже існують. Локально застосовувати тільки `set -a; source .env.local; set +a; pnpm exec prisma migrate deploy` і `pnpm exec prisma generate`; не `migrate dev`.
- OpenAPI: `$ref`-дедуплікація; актуальний поріг підняти до `145_000`, якщо заміри підтвердять потребу. Цільовий розмір документа — ≤142 500 символів; спершу стискати описи/повторні схеми, не піднімати ліміт вище 145 000.
- Згенеровані дані лишають повний SRD-текст у описі; нерозпізнані дії лишаються нотатками з повним текстом. Не створювати новий ефект «рятівний у площі».
- «N/Day» і «Recharge after a Short or Long Rest» монстра трактуються як ліміт на бій; Recharge 4–6 — випадкова перезарядка на початку власного ходу. Монстр не переносить ці лічильники між боями.
- `perform` зберігає посилання за id заклинання/назвою атаки з перевіркою розв'язання. Жодних записувачів snapshot повз наявний конвеєр і `snapshotHash`.
- UI українською, ідентифікатори англійською; компоненти не імпортують `@/lib/api/*`; дотримуватися шарів `CLAUDE.md` і відповідних `docs/architecture/*.md`.
- Реалізація — SDD за налаштуванням користувача: виконавці Sonnet, без рев'ю між задачами; одне фінальне рев'ю всієї частини на Opus, одна хвиля виправлень, коротке повторне рев'ю, потім `/simplify` (1–2 агенти). Живий прогін окремим виконавцем. Не комітити `.superpowers/`; коміти мають трейлер `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Цільова перевірка: тести по задачах; повні `pnpm test:run`, `pnpm lint`, `pnpm build` наприкінці; `pnpm battle-sweep` із відомим нестабільним сценарієм лабіринту; браузер і живий прогін за §12 спека. Не торкатися двох відкладених тестових Storage-файлів, HOMM-вкладки «Предмет» і відомого падіння battle-sweep, якщо зміна не доведе прямий зв'язок.

## Review Focus

1. **Нульова зміна HOMM:** юніт без CR зберігає universal: 3, не отримує grants, має той самий каст/легендарний шлях; HOMM-коло без `exact` лишається квадратним, а заклинання без нових полів — із попередньою шкодою. Додати окремі регресійні тести.
2. **Пули та ліміти:** `perBattle` не плутається з пулом вміння; `slotKey` відхиляється для гранту; грантова вартість, `castLevel`, власні DC/attack bonus і `legendaryOnly` зберігаються в усіх гілках касту. Не витрачати дію/пул/легендарні дії при відмові.
3. **Транзакції та snapshot:** зміни `battleData`, `abilityUsage`, легендарних дій і `snapshotHash` проходять наявним конвеєром; транзакційний код користується `tx`.
4. **Дії лігва:** недоступні без активного лігва; не витрачають легендарні дії; один раз за раунд; не повторюють те саме вміння в суміжних раундах; `resistSpent` зберігається при перемиканні, тому опір не відновлюється тумблером; дії не націлюються на клітинку, якщо цього не підтримує план.
5. **Розбір SRD:** унікальність slug/назв, точні ref на атакуючі дії та Spellcasting; невідоме/нестандартне не втрачається, а лишається описом/нотаткою. Перевірити лічильники й dry-run імпорту.
6. **Площі та чуття:** диск для точного кола, еманація від усіх клітинок великої істоти, однакова геометрія на клієнті й сервері; сенсори діють лише в межах і тільки для монстра з CR.
7. **Межі OpenAPI і клієнтський чанк:** документ ≤142 500 за можливості, жорстка межа 145 000; нові модулі читання не додають Zod до клієнтського бойового чанку.

## Рішення щодо неоднозначностей

- Робочі рішення за нічними рекомендаціями описані в спеку §1–§8; уточнення користувача під час виконання фіксувати в обох документах до відповідної зміни. Розділ 4f-5b лишається окремою наступною частиною.
- `isMonster5e` визначати наявністю CR, а не `statblock` чи налаштуванням кампанії; це має бути один спільний чистий предикат для snapshot, грантів, чуттів і UI.
- Заклинання монстра зі `spellcasting.spells` може бути безкоштовним (At Will) або мати пул; `knownSpells` монстра — необов'язкова сумісність/ручне додавання. Повтор того самого id з різними лімітами треба відхилити в схемі/валідації, а не мовчки зливати.
- Дії `Recharge after a Short or Long Rest` конвертувати як `perBattle: 1`; точна площа для `circle` використовує `round(feet / 5)` і евклідів диск; `emanation` — Чебишеву відстань від усіх клітинок кастера без його власних клітинок.
- Для сумісності source sync та bundle нові id у вкладених ref зберігаються за наявними правилами remap; імпорт JSON/CSV має розв'язувати nested spell reference за назвою або id.

## План задач

### Task 1: зафіксувати межі та робочі рішення 4f-5a

**Files:**
- Modify: `docs/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md`
- Modify: this plan

- [ ] Зафіксувати у спеку й плані робоче застосування рекомендованих рішень після доручення «починай виконувати»; будь-яке нове уточнення користувача вносити до коду лише після оновлення обох документів.
- [ ] Перед міграцією звірити послідовність із наявною останньою міграцією `20261103000000_choices_feats` і підтвердити, що `20261104000000_monster_5e_full` вільна.
- [ ] Переконатися, що працюємо в ізольованому worktree `feat/constructor`; `main` не зливати, мердж-реквести/деплой не робити.

### Task 2: міграція, типи й читачі даних

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261104000000_monster_5e_full/migration.sql`
- Modify: `types/units.ts`, `types/spells.ts`, `types/abilities.ts`, `types/battle.ts` (використати фактичні доменні файли)
- Modify: `lib/utils/spells/model/read.ts`, `lib/utils/spells/model/schema.ts`
- Test: міграція, читачі та типи

- [ ] Додати `statblock` і `spellcasting` як JSON із `{}` за замовчуванням; `fixed_dice` і `damage_bonus` як необов'язкові поля заклинання.
- [ ] Міграція лише додає колонки й індекси лише якщо потрібні; не торкатися RLS.
- [ ] Додати типи `UnitStatblock`, `UnitSpellcasting`, `SpellGrant`, `AbilityPool.recharge`, `perform` і `lair` у відповідні наявні типи без Zod-залежності.
- [ ] `readSpellDefinition` і `spellDefinitionColumns` читають/пишуть нові поля, зберігаючи відмінність `undefined`/`null` за стилем наявних полів.
- [ ] Додати тест читання старого рядка без нових колонок: порожні значення мають лишатися необов'язковими й не ламати HOMM.

### Task 3: Zod-схеми ресурсів і OpenAPI для юнітів/заклинань

**Files:**
- Modify: `lib/schemas/units.ts`, схеми заклинань у `lib/schemas/` або `lib/utils/spells/model/schema.ts`
- Modify: `lib/server/content/resources/units.ts`, `lib/server/content/resources/spells.ts`
- Modify: імпорт/експорт полів, bundle/sync схем, `lib/server/content/{json-schema,openapi}.ts`; route `app/api/openapi.json/route.ts` лише якщо потрібне wiring
- Test: unit/spell schemas, content import/export, bundle/sync, OpenAPI

- [ ] Валідувати всі межі з §2.1–§2.3 спека; JSON-об'єкти обмежити за глибиною/кількістю, не приймати зайвих довільних значень.
- [ ] Додати `nestedRef: { kind: "spells", key: "spellId" }` для `spellcasting.spells`; імпорт за назвою/id, експорт назад за назвою.
- [ ] Забезпечити round-trip нових полів через фабричні ресурси, CSV, bundle export/import і source sync.
- [ ] Оновити runtime OpenAPI через `buildOpenApi()`; додати/оновити тест generated document і піднімати межу лише до 145 000 після виміру.
- [ ] Переконатися, що невідомий nested spell reference поводиться за погодженим правилом імпорту й не створює битий id без попередження.

### Task 4: кубики заклинань `fixedDice` і `damageBonus`

**Files:**
- Modify: `lib/utils/battle/spell/caster-dice.ts`, функції preview/server resolution для шкоди та лікування
- Modify: `lib/server/spells/book-spells-by-ids.ts`, `lib/utils/spells/to-book-spell.ts`, spell preview/resolution та `lib/hooks/battle/useSpellBook.ts` лише якщо потрібні для передачі необов'язкових полів
- Test: spell dice, preview parity, HOMM guard

- [x] Передати прапорці з запису заклинання до snapshot/контексту касту без повторного завантаження великих рядків.
- [x] `fixedDice` вимикає масштабування канtrip за рівнем і upcast тільки на грантовому/SRD-контенті, що має прапорець.
- [x] Додати `damageBonus` один раз до одного кидка шкоди/лікування і однаково у прев'ю та серверному результаті.
- [x] Перевірити CR 17 монстра з кантрипом: кубик не масштабується; HOMM-заклинання без полів не змінюються.

### Task 5: форми площ `exact` і `emanation`

**Files:**
- Modify: `lib/utils/spells/model/schema.ts`
- Modify: `lib/utils/battle/grid/template.ts` та клієнтські/серверні виклики площі
- Modify: форми/пікери цілі заклинання
- Test: `templateCells` і клієнт/сервер геометрія

- [x] Додати `template.exact?: boolean` і форму `emanation`; тримати спільні типи без Zod-імпорту в бойовому клієнті.
- [x] Для `circle + exact` побудувати евклідів диск радіуса `round(feet / 5)`; Fireball 20 фт = 49 клітинок.
- [x] Для `emanation` будувати Чебишеву область від усіх клітинок кастера, виключаючи його клітинки; `targetCell` не потрібний.
- [x] Підписи, preview, наведення й серверна множина цілей використовують ту саму `templateCells`.
- [x] HOMM-коло без `exact` має точні старі клітинки; додати окремий guard-тест.

### Task 6: спільний предикат монстра 5e та snapshot статблока

**Files:**
- Modify: `lib/utils/battle/participant/from-unit.ts`, `refresh-from-source.ts`
- Create/modify: чистий `isMonster5e`/reader у `lib/utils/units/` або наявному спільному модулі
- Modify: типи `BattleParticipant`, snapshot і participant views
- Test: from-unit, refresh-from-source, snapshot hash

- [x] Визначати монстра 5e за `cr != null`; старі юніти без CR йдуть незміненою гілкою.
- [x] Перенести `statblock.creatureType`, senses, movement, languages і телепатію в snapshot/battleInfo; `lairResistances` лишити джерелом межі опору.
- [x] Для монстра 5e видавати `spellSlots: {}` і grants з `spellcasting.spells` та, за погодженням, `knownSpells`; HOMM зберігає universal 3.
- [x] Застосувати ability/DC/attack bonus блоку, а також per-spell overrides; слідкувати, щоб `refresh-from-source` зберігав витрачені пули й usage.
- [x] Створювати `battleData.pools` для обмежених grants із ключем `pool:spell:<spellId>` і полем recharge; витрачений стан проходить snapshotHash.

### Task 7: каст за грантом і нові відмови API

**Files:**
- Modify: `app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation.ts` та sibling helpers
- Modify: `lib/utils/battle/spell/*`, `types/battle.ts`, `lib/constants/api-errors.ts`
- Test: spell mutation and API route

- [ ] Додати грантовий шлях без слотів: перевірити grant, `slotKey`, uses pool, castLevel, DC та attack bonus; в іншому випадку лишити старий slot path.
- [ ] Витрачати пул і звичайну дію лише після успішної валідації/резолюції за чинною транзакційною моделлю.
- [ ] `legendaryOnly` без `legendaryKey` відхиляти; `slotKey` із грантом відхиляти з погодженим статусом/кодом.
- [ ] Додати українські помилки `SPELL_USES_EMPTY`, `SPELL_LEGENDARY_ONLY`, `GRANT_NO_SLOT`; узгодити точні межі 4xx з наявним API стилем.
- [ ] Тести: at-will, 1/бій після витрати, вичерпано, некоректний slotKey, overrides, legendaryOnly на власному ході.

### Task 8: перезарядка на початку ходу

**Files:**
- Modify: `lib/utils/battle/turn/start-end.ts` та виклик у `run-advance-turn-loop.ts`
- Modify: `lib/utils/battle` логування/результат `processStartOfTurn`
- Test: seeded RNG, owner-only recharge, snapshot

- [ ] Для витрачених пулів з `recharge` кидати d6 через `ctx.rng` на початку власного ходу; результат ≥ порогу скидає usage до нуля.
- [ ] Не кидати для свіжих пулів, пулів інших учасників чи `recharge` поза 4–6.
- [ ] Логувати назву заклинання та результат українським повідомленням; дотриматися контракту system log/delta.
- [ ] Перевірити pass/fail seeded cases і `snapshotHash` після оновлення пулу.

### Task 9: `perform` і легендарна атака

**Files:**
- Modify: `lib/utils/abilities/schema/ability.ts`, `lib/utils/abilities/editor.ts` та поля форми
- Modify: `app/api/campaigns/[id]/battles/[battleId]/core-action/legendary-mutation.ts`
- Modify: `components/battle` легендарний діалог
- Test: schemas, editor validation, legendary mutation

- [ ] Додати `perform: attack | spell` і `limits.lair` за схемою §5–§6; дозволяти їх лише з потрібною парою limits/event.
- [ ] Для `perform.attack` розв'язувати назву без регістру до атаки snapshot, повертати редакторську проблему/недоступність, якщо ref зламаний.
- [ ] Легендарний каст не виконується через `core-action`; тут лишається атака та наявна поведінка ability.
- [ ] Редактор показує вибір атаки серед атак юніта та вибір заклинання; валідація підказує невирішений ref.
- [ ] Перевірити вартість `legendaryCost`, ліміти perRound/cooldown і відсутність витрати при відмові.

### Task 10: легендарне заклинання через spell route

**Files:**
- Modify: spell route/schema/mutation
- Modify: `LegendaryActionDialog`, `SpellCastDialog` і стани вибору цілі
- Test: route auth/turn/action/legendary resource, spell area targeting

- [ ] Додати `legendaryKey` лише для ДМ; перевірити, що ability належить кастеру, має `perform.spell`, `legendaryCost`, не заблокована та посилається на відповідний grant/spell.
- [ ] Не перевіряти/не витрачати звичайну дію й слот у цій гілці; списувати легендарну вартість рівно один раз.
- [ ] Зберегти звичайний діалог прицілювання/площі та обробку грантових DC, кастового рівня й перезарядки.
- [ ] Тести: поза ходом монстра дозволено, у некоректному стані заборонено, не-ДМ відмова, витрата ресурсу без витрати action.

### Task 11: дії лігва та легендарний опір у лігві

**Files:**
- Modify: participant snapshot/battleData, `participant-patch`, `core-action/legendary-mutation.ts`, advance-round log
- Modify: картка учасника, DM controls і `LegendaryActionDialog`
- Modify: `lib/constants/api-errors.ts`
- Test: mutation, toggles, resistance, round transition

- [ ] Додати `limits.lair`, перевірку `event: action`, lair perform refs і `battleData.lair`.
- [ ] Ініціалізувати `battleData.lair.baseResistances` з `unit.legendaryResistances`, `resistSpent: 0`; кожне автоматичне спрацювання легендарного опору збільшує `resistSpent`.
- [ ] Перемикач стану доступний ДМ; після перемикання обчислити `resistLeft = max(0, active ? max(baseResistances, lairResistances ?? 0) - resistSpent : baseResistances - resistSpent)`.
- [ ] Додати опцію `core-action legendary` виду `{ kind: "lair", abilityKey, targetIds? }`; раз за раунд, у активному лігві, без витрати legendary actions, не той самий ключ у суміжних раундах.
- [ ] На початку раунду виводити системний рядок про доступну дію лігва, не запускати її автоматично.
- [ ] Додати відмови `LAIR_NOT_ACTIVE`, `LAIR_USED`, `LAIR_REPEAT`; тести на межі раундів і snapshotHash.

### Task 12: пасивні чуття у кидках атаки

**Files:**
- Modify: ability schema/registry для `flag sense` і `lib/utils/battle/attack/bonus.ts`
- Modify: snapshot sense abilities для монстра
- Test: `rollModeReasons` і чанк-імпорти

- [ ] Додати пасивне sense як modifier, доступний тільки `isMonster5e`.
- [ ] Blindsight/truesight у межах дальності прибирають потрібну перешкоду невидимості; blindsight також скасовує власну перешкоду стану blinded за погодженим правилом.
- [ ] За межами дальності причини переваги/перешкоди не змінюються; darkvision, tremorsense та passive Perception поки лише відображаються.
- [ ] Додати чисті тести без Zod у клієнтському модулі.

### Task 13: форми контенту й бойовий UI

**Files:**
- Modify: форми юніта, заклинання, уміння та списки бібліотек
- Modify: монстрова панель бою, картка учасника, info panel і легендарні/лair діалоги
- Modify: `components/spells` та onboarding `lib/onboarding/whats-new.ts`
- Test: компонентні тести відповідних форм і діалогів

- [ ] У формі юніта з CR додати вкладки статблока й Spellcasting; не показувати їх старим HOMM-юнітам без CR.
- [ ] У редакторі заклинання додати `fixedDice`, `damageBonus`, `exact` і `emanation`; `exact` показати лише для circle.
- [ ] У редакторі вміння додати perform, lair limit і зрозумілу помилку для невирішеної атаки/заклинання.
- [ ] У бойовій панелі показати гранти, ліміти, витрачений стан і Recharge; інтегрувати легендарний каст у spell dialog із прицілюванням.
- [ ] Показати статблок на картці бібліотеки/учасника, тип істоти й чип групи «Monster Actions»; додати новину в onboarding.

### Task 14: конвертер дій з рятівним кидком

**Files:**
- Create/modify: `scripts/srd/convert/monster-actions.ts`
- Modify: `scripts/srd/convert/units.ts`, shared converter helpers and fixtures
- Test: `scripts/srd/__tests__/monster-actions.test.ts`

- [x] Написати чистий `saveAction(action, creature)` для шаблонів Saving Throw DC, Failure/Success, типових кубиків, бонусів, damage type, станів і тривалості.
- [x] Генерувати стабільний slug `srd-2024_<creature>_<action>` і назву `<Дія> (<Істота>)`; додавати повний текст вихідної дії в description.
- [x] Перетворювати recharge, «N/Day», «Recharge after a Short or Long Rest», area template, одну ціль із дальністю, `onSuccess` half/none, `applyCondition`, `saveEnds`.
- [x] Дії без шкоди й відомого 5e-стану залишати note з текстом і поясненням нерозібраної механіки; не генерувати фальшивий no-op spell.
- [x] Fixtures перевіряють Fire Breath, cone/line/sphere/cylinder/emanation, одна ціль, Recharge, N/Day, condition-only і fallback.

### Task 15: конвертер Spellcasting, легендарних дій і статблока

**Files:**
- Modify: `scripts/srd/convert/units.ts`, `scripts/srd/convert/monster-actions.ts`, `scripts/srd/overrides/units.ts`
- Modify: `scripts/srd` types/data pipeline and fixtures
- Test: `scripts/srd/__tests__`

- [x] Розбирати Spellcasting headings, at-will, N/Day Each, DC, attack bonus, ability, castLevel; окремі `casts the X spell` посилати на наявний spell.
- [x] Перетворити legendary attack refs, `Spellcasting to cast`, посилання на інші дії, `perRound` і залишити нерозпізнані ~3 дії нотатками.
- [x] Винести type/size/alignment/senses/movement/languages/telepathy/lairResistances у `statblock`; швидкість = погоджене правило max(walk, fly).
- [x] Імпортувати згенеровані заклинання до `spells.json`, призначити group «Monster Actions» як 9-й вид/групу SRD згідно наявного механізму груп.
- [x] Для всіх circle spell templates SRD поставити `exact: true`; визначити й позначити заклинання з формою emanation.
- [x] Зберегти fallback-текст для нерозібраних/спеціальних винятків і закріпити ручні override-и fixture-тестами.

### Task 16: шаблон, цілісність і повторне завантаження

**Files:**
- Modify: `scripts/srd/load-template.ts`, generated `data/templates/srd-5.2/*.json`, manifest
- Modify: `scripts/srd/__tests__/data-integrity.test.ts` та build/load tests
- Test/Run: `pnpm srd:build`, `pnpm constructor:srd-template` локально

- [x] Перевірити унікальність згенерованих spell name/slug та resolution кожного unit spell id, perform spell id і attack name.
- [x] Перевірити число заклинань дій монстрів близько до погоджених ~150; пояснити розбіжність fixture-звітами, а не підганяти лічильник.
- [x] Loader імпортує групу «Monster Actions» до заклинань і імпортує заклинання до юнітів; repeated run оновлює за slug/назвою без дублікатів.
- [x] Dry-run `importContent` без помилок; manifest має актуальні counts та hash/source metadata за чинним стилем.
- [x] Перезалити тільки локальний шаблон constructor; production/prodcopy недоторкані.

### Task 17: фінальна перевірка, документація й живий прогін

**Files:**
- Modify: `docs/architecture/battle.md`, `docs/architecture/abilities.md`, `docs/architecture/content-api.md`
- Modify: `docs/STATUS.md`, `docs/superpowers/constructor-handoff.md`
- Modify: memory files за межами репозиторію лише якщо доступ дозволяє

- [x] Оновити опис монстрів, grants/recharge, `perform`, lair, sense, `exact`/`emanation`, імпорт/експорт і SRD template.
- [x] Запустити `pnpm test:run`, `pnpm lint` (0 errors), `pnpm build`, потім `pnpm battle-sweep` на локальній `constructor`; записати відомий лабіринтний збій окремо від регресій 4f-5a.
- [x] Провести живий прогін за §12 спека: Adult Red Dragon, Aboleth, Mummy, Pit Fiend, площі героя та контроль HOMM; створити тестові записи тільки в локальній БД і видалити їх після перевірки.
- [x] Перевірити UI на desktop і вузькому viewport; тестовий учасник під керуванням DM-користувача.
- [x] Завершити Opus-review → одна хвиля виправлень → коротке повторне рев'ю → `/simplify` → повторити потрібні перевірки; оновити handoff/status/memory.
- [x] Переконатися, що `feat/constructor` лишається незлитою в `main`; завершити частину планом 4f-5b як наступним кроком, без реалізації 4f-5b.

## Follow-up у межах епіку: 4f-6 — міграція компедіумів 5etools JSON

> Це запит користувача після початку виконання 4f-5a. Виконати після завершення поточного блоку 4f-5a; не включати в його acceptance чи підсумковий review. Імпорт потрібен гравцям, щоб перенести легально отримані компедіуми на платформу. Зовнішні копії комерційних книжок не завантажувати, не комітити й не розповсюджувати.

**Дослідницький вхідний приклад (локальний, не комітити):** `/Users/silentfox/Downloads/1985 Games; Obojima - Tales from the Tall Grass.json` (2,350,334 байти). Його структура відповідає агрегованому 5etools brew JSON: `_meta.sources` описує джерело `O:TTG`, `_meta.edition` = `classic`; є масиви `subclass` (11), `subclassFeature` (73), `optionalfeature` (37), `background` (6), `race` (3), `subrace` (8), `feat` (20), `spell` (50), `baseitem` (155), `item` (235), `monster` (77), а також `adventure`/`book` і Foundry-специфічні доповнення. Запис містить значно більше типів, ніж поточні ресурси content API. Приклад служить лише для локального аналізу форми й покриття; тести використовують синтетичні мінімальні fixtures без книжкового тексту чи ілюстрацій.

**Поточні точки інтеграції:** шаблон `srd:build` уже перетворює Open5e SRD JSON у доменні дані; кампанії мають bundle import/export; content API підтримує окремі ресурси units, spells, artifacts, races, feats, classes та інші типи; існує CSV-імпорт користувацького контенту. Дослідження має вирішити, що повторно використати, які дані зберігати як редагований контент, а де потрібен звіт про непідтримані поля. Не плутати імпорт компедіуму в кампанію з імпортом кампанії/bundle.

### Task 18: дослідити формат і затвердити мапування

**Files:**
- Create: `docs/superpowers/specs/2026-10-23-constructor-compendium-json-import-design.md`
- Modify: цей план після висновків дослідження
- Input: локальний Obojima JSON тільки для читання; [офіційний опис продукту](https://obojima.com/products/obojima-hardcover-book) й [первинні JSON-схеми 5etools](https://github.com/TheGiddyLimit/5etools-utils/tree/master/schema-template)

- [ ] Зібрати інвентар фактичних полів і варіантів для пріоритетних категорій: `_meta`/джерела, `spell`, `monster`, `item`/`baseitem`, `race`/`subrace`, `background`, `feat`, `subclass`/`subclassFeature`, `optionalfeature`; окремо описати `*Fluff`, `foundry*`, `adventure`/`book` та інші масиви.
- [ ] Зіставити поля з наявними Prisma/domain/content schemas та визначити: пряме мапування, розширення схеми, збереження оригінального структурованого payload, текстовий fallback або явне повідомлення «не імпортовано».
- [ ] Перевірити ідентичність записів і посилань (`name` + `source`, `className`, `subclassSource`, copy/inherits, інші міжсутнісні refs), версію правил (`_meta.edition`) і дублі при повторному імпорті.
- [ ] Визначити UX потоку: завантаження файлу, валідація/ліміти, попередній перегляд лічильників і попереджень, вибір категорій, підтвердження імпорту й підсумок; не додавати повний книжковий текст до логів/аналітики.
- [ ] Зафіксувати межі прав: користувач відповідає за право імпортувати свій файл; зберігати джерельну атрибуцію, коли вона присутня; ніколи не завантажувати Obojima-приклад у seed, fixture, сховище чи репозиторій.
- [ ] У design doc зафіксувати перший підтримуваний набір типів, поведінку пропусків/помилок, межі розміру/складності JSON і acceptance criteria; перелічити відкладені типи.

### Task 19: побудувати адаптер 5etools JSON → доменний імпорт

**Files:**
- Create: `lib/server/compendium-import/` чисті типи, валідатор, нормалізація source/ref і адаптери за результатом Task 18
- Modify: `lib/server/content/` або спеціалізований імпортний сервіс, залежно від затвердженого дизайну
- Test: синтетичні fixtures для підтримуваних категорій і граничних/непідтримуваних варіантів

- [ ] Безпечно розбирати один агрегований 5etools JSON об'єкт: перевіряти кореневий тип, `_meta`, розміри/глибину й масиви; відхиляти некоректний файл до будь-якого запису.
- [ ] Перетворювати підтримані категорії в наявні resource schemas, зберігаючи source/source id, стабільний ключ повторного імпорту та взаємні посилання між сутностями.
- [ ] Нормалізувати 5etools entry tags лише там, де є перевірене відповідне поле; оригінальні entries зберігати або показувати як текст там, де механіку неможливо перенести без втрат.
- [ ] Явно звітувати про пропущені записи/поля з категорією й причиною; не вдавати, що Foundry-специфічна механіка, картинки або довільні `entries` стала повністю нативною механікою конструктора.
- [ ] Імпортувати взаємозалежні записи в коректному порядку та транзакційно; повторний імпорт того самого source оновлює збіги за стабільним ключем без дублів і не стирає користувацькі записи іншого source.
- [ ] Тести для пошкодженого JSON, дубльованих назв із різними sources, нерозв'язаних refs, unknown fields, edition metadata, повторного імпорту й rollback.

### Task 20: додати UI попереднього перегляду й імпорту

**Files:**
- Modify: кампанійний UI/налаштування контенту та API routes згідно design doc
- Test: API authorization/validation, UI preview/select/summary

- [ ] Дозволити власнику/DM кампанії вибрати локальний JSON compendium і побачити джерела, edition, кількість записів за типами та попередження до імпорту.
- [ ] Дозволити вибрати підтримані категорії, показувати непідтримані категорії окремо й пояснювати, які поля залишаться текстом або будуть пропущені.
- [ ] Показувати підсумок створених/оновлених/пропущених записів і помилок після імпорту; повторна відправка того самого файлу має бути безпечною.
- [ ] Перевірити розмір запиту, timeout/довгі файли, права кампанії, відсутність запису до підтвердження та відсутність витоку всього payload у server logs.

### Task 21: інтеграційна перевірка з дозволеним компедіумом і документація

**Files:**
- Modify: `docs/architecture/content-api.md`, user docs/handoff/status
- Test/Run: синтетичний повний fixture; за наявності легального тестового матеріалу — позарепозиторний локальний live import

- [ ] Побудувати один синтетичний fixture, що включає взаємопов'язані spell/monster/item/species/class-option приклади, 5etools tags і Foundry-розширення.
- [ ] Перевірити імпорт у тимчасову локальну кампанію, повторний імпорт, відображення контенту в конструкторах/бібліотеках і коректний звіт про unsupported data.
- [ ] Документувати очікувану форму JSON, підтримувані категорії, обмеження edition/механік, попередній перегляд і відповідальність користувача за право на файл.
- [ ] Не використовувати наведений комерційний Obojima JSON як fixture чи live test без окремого дозволеного тестового середовища/матеріалу.
