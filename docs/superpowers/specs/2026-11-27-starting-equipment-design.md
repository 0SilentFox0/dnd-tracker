# 2.8 Стартове спорядження і заклинання при створенні героя — design

Пункт 2.8 з `docs/superpowers/plans/2026-11-27-ux-audit-fixes.md`. Рішення власника: список береться зі стартового спорядження SRD-шаблону.

## Мета
Новий герой SRD-класу не має бути «зламаним»: у формі створення ДМ може (не мусить) обрати стартовий пакет класу (A/B/C із SRD) і отримати зброю/броню + золото в інвентар; заклинатель бачить, що треба обрати заговори/заклинання.

## Що вже є (з'ясовано в коді)
- **Заклинання вже є.** У `data/templates/srd-5.2/classes.json` у всіх заклинателів є class-choices `cantrips` / `prepared-spells` (`kind: 'spell'`, рівень 1, count за колонкою). Їх показує `ChoicesEditor` у табі «Вибори» форми створення (`CharacterChoicesTab`), а `selections.ts:275` веде вибір у `spells`/`slotSpells` → бій (`from-character.ts:307`). Аудитор просто не дійшов до табу: проблема у видимості, нових даних не треба.
- **Стартового спорядження класу в даних немає.** У `classes.json`/`GameClass` такого поля немає; в open5e воно є тільки текстом у рядку таблиці `|Starting Equipment|…|` фічі `Core <Class> Traits` (`ClassFeature.json`). У передісторій є тільки `equipmentText` (текст; у UI написано, що інвентар він не змінює).
- Зброя й броня SRD — це артефакти шаблону зі `slug` (`srd-2024_dagger`, `slot: weapon|range_weapon|armor|shield`, `item.unique: false`). Пакети, фокуси, роби, інструменти артефактами не є.
- Видача в інвентар уже є: `applyStashAction` (`lib/utils/inventory/stash-actions.ts`: `grant`, `equip`, `gain`), `planGrant` (`lib/utils/items/grant.ts`), `loadStashState`/`ensureInventory`, `writeInventoryLog`.
- Choice-система вже вміє `kind: 'option'` з `options[]`, i18n-оверлей шаблону вже перекладає `classes/<slug>/features[i].choices[#id].options[#id].*`, редактор і sync шаблону вже переносять choices.

## Рішення
1. **Дані = звичайна choice-група класу**, без міграції: у `features[0].choices` SRD-класу додається
   `{ id: 'starting-equipment', kind: 'option', level: 1, count: 1, atCreation: true, options: [{ id: 'a', name: 'Пакет A', description: <повний текст пакета>, abilities: [], kit: { items: [{ artifact: 'srd-2024_dagger', quantity: 2 }], gp: 5 } }, …] }`.
   Варіант «лише золото» (B/C) = `kit: { items: [], gp: N }`.
2. **Нові поля в core (без назв систем):** `Choice.atCreation?: true` і `ChoiceOption.kit?: { items: { artifact: string; quantity: number }[]; gp: number }`. `atCreation`-група показується тільки у формі створення, не рахується в `pending`, не потрапляє в кроки `ChoiceWizard`/level-up, не дає `CHOICE_INCOMPLETE` → «пропустити» = просто не обирати.
3. **Парсер у конвертері SRD:** `scripts/srd/convert/class-choices.ts` читає рядок `Starting Equipment` з `Core * Traits`, ріже на пакети `(A)…; (B)…`, розпізнає «N Name» → артефакт за `slug` (однина/множина: `Daggers`→`dagger`), `N GP` → `gp`. Те, що не артефакт (Explorer's Pack, Robe, Spellbook, «Musical Instrument of your choice»), лишається тільки в `description` пакета й не видається (v1). Ручні винятки — `STARTING_EQUIPMENT_OVERRIDES` у `scripts/srd/overrides/class-choices.ts` (напр. `Arcane Focus (Quarterstaff)` → `srd-2024_quarterstaff`).
4. **Видача — одноразова, тільки в операції create** (`lib/server/characters/operations/create.ts`, після `characterInventory.create`, в тій самій транзакції): для першого класу (`classes[0]`; мультиклас за SRD стартового пакета не дає) береться пік `starting-equipment`, артефакти шукаються в кампанії за `slug` (з урахуванням шарів контенту), кожен видається через `planGrant`+`applyStashAction('grant')`, перша зброя ставиться в `mainHand`, перша броня/щит — у свої слоти (`equip`), `gp` → `gain`. Пишеться `InventoryLog` (kind grant, note «стартове спорядження»). Неможливий slug (кампанія-копія без slug, видалений артефакт) пропускається; у відповіді `kitSkipped: string[]` → тост «Не знайдено: …».
5. **Пізніша зміна піку нічого не робить з інвентарем** (група поза створенням невидима, пік у `classes[].picks` лишається як історія).
6. **UI:** окрема `HudSection` «Стартове спорядження» вгорі секції класу в `ChoicesEditor` (той самий `ChoicePicker` для `option`), з підписом «Необов'язково — можна пропустити» і кнопкою «Без пакета». Таб «Вибори» отримує лічильник відкритих обов'язкових виборів (заговори/заклинання) — новий `HudTab.badge?: number`; при сабміті з відкритими spell-виборами — некритична підказка (не блокує).
7. **Кастомні класи / не-SRD / WFRP:** групи немає в даних → нічого не показується; core перевіряє лише `atCreation`/`kit`, ніде не називає систему. ДМ може вручну додати пакет у редакторі choices пізніше (v1: редактор зберігає `kit` як є, UI редагування `kit` — поза скоупом).

## Перевикористання
`ChoicesEditor`/`ChoicePicker`, `choiceSlug`, i18n-оверлей шаблону, `applyStashAction`/`planGrant`/`ensureInventory`/`writeInventoryLog`, `readArtifacts` (layer-aware), `pruneFormChoices`. Нове лише: два поля в типі/схемі, парсер пакетів, `grantStartingKit`, бейдж табу.

## Файли (сигнатури)
- `types/choices.ts`: `Choice.atCreation?: true`; `ChoiceOption.kit?: StartingKit`; `interface StartingKit { items: { artifact: string; quantity: number }[]; gp: number }`.
- `lib/schemas/choices.ts`: zod для `kit` (ліміти `CHOICE_LIMITS.kitItems = 12`, `gp ≤ 10000`); `atCreation` дозволено тільки з `kind: 'option'`.
- `lib/utils/characters/choices/{pending,wizard,validate,read}.ts`: пропуск `atCreation`-груп (одна утиліта `isCreationOnly(choice)` у `read.ts`).
- `lib/utils/characters/choices/kit.ts`: `pickedKit(classes: CharacterClassEntry[], classesById): StartingKit | null` (чиста).
- `lib/server/characters/kit/grant-kit.ts`: `grantStartingKit(tx, { campaignId, characterId, actorUserId }, kit): Promise<{ skipped: string[] }>`.
- `lib/server/characters/operations/create.ts`: виклик після створення інвентарю; `skipped` у DTO.
- `scripts/srd/convert/class-choices.ts`: `startingEquipmentChoice(coreTraitsDesc: string, artifactsBySlug): Choice | null`; overrides у `scripts/srd/overrides/class-choices.ts`.
- `components/choices/editor/ChoicesEditor.tsx` (секція + «Без пакета», лише коли `mode === 'create'`), `components/hud/form/HudTabs.tsx` (`badge`), `components/characters/NewCharacterForm.tsx` (бейдж = кількість відкритих spell-виборів).
- `messages/{uk,en}/choices.json`: `kit.title`, `kit.optional`, `kit.none`, `kit.skipped`; `lib/onboarding/whats-new.ts` + `whatsNew.startingKit`.

## Зміни даних
Без міграції БД. Змінюються `data/templates/srd-5.2/classes.json` (+12 груп, крім класів без пакета в SRD-джерелі) і `i18n/uk.json` (переклад `label`/`options[#a].name|description` — офіційний шаблон має бути перекладений).

## Тести
- Парсер: Fighter → 3 пакети, A містить `greatsword`, `flail`, `javelin×8`, gp 4; C = лише 155 gp; Wizard A → `dagger×2`, `quarterstaff`, gp 5; невідомий предмет лишається в описі, не в `items`.
- `data-integrity`: кожен `kit.items[].artifact` існує в `artifacts.json`; кожен клас SRD має групу.
- `pending`/`wizard`: `atCreation`-група не рахується й не дає кроку; `validate` не видає `CHOICE_INCOMPLETE`.
- `pickedKit`: немає піку → `null`; пік другого класу ігнорується.
- `grantStartingKit` (мок tx): зброя в `mainHand`, броня в слот, gp додано, лог записано, відсутній slug → `skipped`.
- UI (happy-dom): секція видна тільки в create; «Без пакета» знімає пік; бейдж табу = кількість відкритих spell-виборів; класу без групи — секції нема.

## Прод
1. `pnpm srd:build` → закомітити `data/templates/srd-5.2/*` + переклад.
2. Після деплою — `pnpm constructor:srd-template` (republish шаблону, лише з «так» власника); перевірити, що кампанії на шарі SRD бачать групу, а HOMM5/WFRP-кампанії — ні.
3. Живий прогін на stage: створити Бійця (пакет A) і Мага (пакет A + 3 заговори + 4 заклинання) → інвентар, атака кинджалом і заговор у бою.

## Відкрите питання
Чи видавати не-артефактне спорядження (пакети, роба, книга заклинань, фокус) як прості предмети рюкзака (`addItem` з перекладеною назвою) — чи v1 лише зброя/броня + золото (поточне рішення).
