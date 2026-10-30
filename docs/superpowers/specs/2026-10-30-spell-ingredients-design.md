# Інгредієнти заклинань — дизайн

Гілка `feat/spell-ingredients` (worktree `../dnd-tracker-ingredients`), основа — main `1e2f0125f`. Епік винесено з етапу 2 ability UX (`docs/archive/superpowers/specs/2026-10-30-ability-ux-stage2-design.md`, «Поза обсягом»).

## Мета і рішення користувача

Матеріальні компоненти 5e стають механікою: заклинання описує структуровані інгредієнти, а бій перевіряє їх у героя й списує при касті. Для ДМ це нова секція форми заклинання, для гравця — рядок «потрібно / бракує» в каст-діалозі.

Рішення, ухвалені до spec:

| Питання | Рішення |
|---|---|
| Джерело | предмет із `character_inventories.items` + gp із гаманця як доплата (rules: автооплата) |
| Що відстежуємо | лише M із вартістю у gp або витратні; безкоштовні M покриває фокус/сумка (не перевіряються) |
| Нестача в бою | відмова з ключем помилки (422) і переліком чого бракує; вільний каст ДМ (`free`) обходить |
| Поза боєм | не входить: позабойового касту в коді немає; наступний крок |
| За замовчуванням | вимкнено в правилах (`spellIngredients.enabled: false`) |

## Поза обсягом

- Каст поза боєм, ритуали, світова карта.
- Масштабування інгредієнтів з upcast (кількість і вартість фіксовані; рідкісні винятки правляться вручну).
- Окремі предмети-фокуси й сумки в інвентарі, вага, магазин/купівля з UI.
- Юніти й NPC (інвентаря немає, перевірка пропускається), HOMM-заклинання (інгредієнтів не мають).
- Відновлення інгредієнтів при перерваному довгому касті (списання лише при завершенні).

## Reuse

| Є | Роль | Чому нове потрібне |
|---|---|---|
| `SpecialItem`, `normalizeItems` (`lib/utils/inventory/items.ts`), `types/inventory.ts` | сховище предметів-інгредієнтів | додаємо два необов'язкові поля `worthGp`, `ingredient`; нового сховища немає |
| `character_inventories` gold/silver/copper, `COIN_VALUE`, `InventoryLogKind.MONEY_SPEND/ITEM_USE`, `lockCampaignArtifacts` | гаманець, журнал, блокування | перерахунок гаманця в мідь і назад пишемо поверх наявних хелперів (знайти спільний «spend money» у `lib/server/characters/operations/inventory-update.ts` і не дублювати) |
| `persistConsumables` (`lib/utils/battle/store/persist-consumables.ts`), `persistedHeroes` | точка списання при завершенні бою (та сама транзакція `saveBattle`, гілка `completing`) | розширюємо тим самим патерном: `persistIngredients` поруч, одна блокування кампанії |
| `consumablePools` / `extract-artifacts.ts` / `character-spell-grants.ts` | збирання бойових запасів з інвентаря | витратні рахуються лише для рядків із `artifactId`; інгредієнти — прості `SpecialItem`, тож власний збирач `buildIngredientStock` викликається з того ж місця |
| `runBattleMutation`, `createSpellMutation`, `ruleErrorOf`, `API_ERRORS`, `textRef` | точка перевірки й помилка | нова перевірка `checkIngredients` стає поруч із перевіркою слота |
| `parseRules`, `DEFAULT_RULES`, `MECHANIC_REGISTRY`, `withDefaults` (`lib/utils/rules/`) | правило кампанії | нова секція `spellIngredients` за тим самим шаблоном, що `items` |
| `SpellFormBody`, `HudSection`, `SelectField`, `Input`, `LabeledInput`, `ResponsiveDialog`, `NestedEffectsEditor` (шаблон списку) | форма заклинання й рядки інгредієнтів | списку інгредієнтів у формі немає |
| `ItemDialog` (`components/character-profile/stash/`) | додавання предмета | два нових поля |
| `SpellCastDialog`, `SpellSummary`, `CastSourceSelect` | каст-діалог | рядок «потрібно / бракує» |
| 5etools-адаптер `spell-cast.ts` (`components()`), `spell-derive.ts`, SRD-скрипти `scripts/srd/` | імпорт | 5etools дає `m: { text, cost, consume }` структурно (зараз згортається в рядок), SRD-шаблон лишає компоненти лише в тексті `description` |
| `whats-new.ts`, `messages/*/whatsNew.json` | оголошення | запис `2026-10-30-spell-ingredients` |

Recipe-модель етапу 2 прив'язана до ефектів вмінь, тому для швидкого додавання інгредієнта беремо звичайний `SelectField` із пресетами (`lib/constants/spell-ingredients.ts`), а не `RecipeGallery`. Перевірити це першим кроком плану; якщо `buildRecipe` підходить без зміни схем — взяти його.

## Дизайн

### 1. Модель даних

`Spell` отримує дві колонки; `components String?` лишається як є (текст для показу й зворотна сумісність).

```ts
// lib/schemas/spell-ingredients.ts
SpellIngredient = { name: string(1..80), qty: int(1..99) = 1, minGp?: number(0..100000), consumed: boolean = false, focus: boolean }
ComponentFlags = { v: boolean, s: boolean, m: boolean }
```

- `focus: true` — інгредієнт замінює фокус/сумка, не перевіряється. Значення за замовчуванням: `!(minGp > 0) && !consumed`. Відстежується все, де `focus: false`.
- `ingredients Json @default("[]")` (порожньо = нічого не відстежується), `componentFlags Json?` (`null` = не вказано, показуємо старий рядок `components`).
- Zod-refine: непорожні `ingredients` вимагають `componentFlags.m === true`; ключ інгредієнта `ingredientKey(name)` (slug, нижній регістр) унікальний у межах заклинання.
- Міграція expand-only: `ALTER TABLE spells ADD COLUMN` ×2 (Json з default/nullable), нових таблиць немає, тож RLS не потрібен. Старі рядки отримують `[]` / `null`, нічого не мігрується.
- Поширення: поля потрапляють у `spellFields` (`lib/schemas/spells.ts`); бандл, sync-хеші, OpenAPI/MCP і CRUD беруть їх автоматично. Спостереження: після оновлення SRD-шаблону DM побачить diff по заклинаннях з інгредієнтами (очікувано).
- Імпорт: 5etools-адаптер мапить `components.m` (`text`, `cost` у мідних, `consume`) у `ingredients` + `componentFlags`; `components` лишається текстом. SRD-шаблон: скрипт збірки розбирає `M (… worth 50+ GP, which the spell consumes)` з `description` (188 із 498 мають M; 57 — із вартістю) у структуру; випадки з кількома предметами в одній дужці (Astral Projection) йдуть у `ingredients` за списком або, якщо розбір неоднозначний, лишаються текстом без відстеження (перелік у `coverage` як manual). Кожне правило розбору — з позитивним і негативним тестом, як у `spell-patterns/`.

### 2. Звідки беруться предмети й гроші

Сховище вже є — нового не створюємо.

- `SpecialItem` + `worthGp?: number` (≥0) та `ingredient?: string` (slug-аліас). Предмет збігається з інгредієнтом, якщо `slug(item.ingredient ?? item.name) === ingredientKey` і `(item.worthGp ?? 0) >= (minGp ?? 0)`. Назва «Diamond» із вартістю 50 gp сама збігається з інгредієнтом «diamond, ≥50 gp».
- Предмети кількісні (`quantity`), список береться з `character_inventories.items` (є в `InventoryTab`/`ItemDialog`; додаємо два поля у форму й у `inventory-update` zod).
- Гроші: `gold/silver/copper` → мідь (`COIN_VALUE`). Доплата gp покриває лише нестачу предметів інгредієнта з `minGp > 0`: `недостача × minGp × 100` мідних. Без `minGp` доплатити неможливо.
- Предмети підбираються від найдешевшого достатнього; частина кількості може піти з предметів, решта — з гаманця.

### 3. Перевірка й списання при касті

Чисті функції без zod у `lib/utils/spells/ingredients/` (імпортуються клієнтом і сервером):

- `ingredientKey(name)`, `trackedIngredients(spell)` (`!focus`).
- `planIngredients(spell.ingredients, stock, { autoPay })` → `{ ok, spendItems: Record<itemId, n>, spendCp, missing: Missing[] }`.

Запас у бою: `battleData.ingredientStock?: { items: { id, key, name, worthGp, qty, used }[], purseCp, usedCp }`. Будується `buildIngredientStock(inventory)` з того ж місця, де збираються consumable-пули (`extract-artifacts.ts` / `character-spell-grants.ts`), лише для героїв, коли `rules.spellIngredients.enabled`. `used` і `usedCp` тримають витрату бою (спільна з клієнтом через звичайну дельту учасника; egress: кілька рядків на героя). `refreshFromSource` зберігає `used`.

У `createSpellMutation`:
1. Перевірка стоїть після `resolveChosenSlot` і `beginLongCast`-розгалуження. Застосовується, коли `enabled && !free && !legendaryAbility && !grant && caster є героєм зі stock && spell.ingredients має відстежувані`. Гранти (предметні, расові, сувої), юніти й NPC без stock пропускаються, бо RAW компоненти там не потрібні.
2. При нестачі: `ruleErrorOf("action_rejected", API_ERRORS.BATTLE_SPELL_INGREDIENTS_MISSING, { list })` (422, ключ + параметри; текст через `textRef`, як сусідні помилки). Жодних змін стану.
3. Прев'ю (`data.preview`) перевіряє, але не списує; список бракуючого повертається клієнту через ту саму помилку-ключ.
4. Списання — у `finalizeCast` після успіху `castSpell`: `used += spendItems`, `usedCp += spendCp`, рядок у лозі `battleLog.spell.ingredientsSpent`. Для `cost: long` списання лише при завершенні касту (`pendingCast` початок лише перевіряє).
5. Upcast: ціни не змінюються (див. «Поза обсягом»).

Фіксація в БД — `persistIngredients` у `saveBattle` (гілка `completing`, та сама транзакція й `lockCampaignArtifacts`), під тим самим `persistedHeroes`: віднімає `used` від `quantity` (запис 0 видаляється), `usedCp` — від гаманця (спершу gp, потім sp, потім cp; решту решти в cp/sp як зараз робить «money spend»), журнал `item_use` і `money_spend` від `campaigns.dmUserId`. Якщо `rules.outOfCombat.persistResources` вимкнено, витрати діють лише в межах бою й не зберігаються (як слоти). У rules-UI тут буде підказка.

Поза боєм: гаманець і предмети правляться як зараз; нічого нового.

### 4. UI

- **Форма заклинання** (`SpellFormBody`, вкладка «Основне»): нова секція `SpellComponentsFields` у `HudSection` — чекбокси V/S/M (`componentFlags`); при M — список рядків інгредієнтів (назва, к-сть, мін. вартість gp, «витрачається», «замінює фокус»), пресети через `SelectField`, превʼю «Потрібно: …» одним рядком. Старий рядок `components` показується поруч для спадкових заклинань і правиться як текст. Для заклинань без прапорців відображаємо похідне «V, S, M» з рядка.
- **Каст-діалог** (`SpellCastDialog`/`SpellSummary`): якщо інгредієнти відстежуються — рядок «Потрібно: …», «Бракує: …» (червоний), підказка про доплату gp; кнопка «Застосувати» заблокована при нестачі й `enforce`. Обчислення — `planIngredients` на клієнті з `battleData.ingredientStock`, сервер лишається арбітром.
- **Лист героя/галерея заклинань:** компонент `SpellComponentsLine` (V S M + інгредієнти) у картці заклинання; «бракує» на листі не рахуємо (там запасу немає, а тягнути stash — зайвий egress).
- **Форма предмета** (`ItemDialog`): поля «Вартість, gp» і «Інгредієнт для…» (необов'язково).
- **Мобільний вигляд:** рядки інгредієнтів — картки в одну колонку з полями на повну ширину (`min-h-11`), без горизонтального скролу; каст-діалог — наявний `ResponsiveDialog`.
- Egress: нових запитів немає; нові дані — поля вже завантажуваних `Spell` і participants.

### 5. Баланс і правила

`rules.spellIngredients = { enabled: false, autoPay: true }`: нова секція в `sectionSchemas`, `DEFAULT_RULES`, `MECHANIC_REGISTRY` (label «Інгредієнти заклинань»), patch-схема й `/dm/rules`. Вимкнено за замовчуванням — наявні кампанії поведінки не змінюють; пресет SRD-шаблону (`scripts/srd/lib/rules-preset.ts`) вмикає. `autoPay: false` — лише предмети.

### 6. i18n, whats-new, документація, тести

- **i18n:** ключі `spells.ingredients.*`, `battleWizards.ingredients.*`, `battleLog.spell.ingredientsSpent`, `errors.*` для нової помилки, `inventory.itemDialog.worthGp/ingredient`, `rules.spellIngredients.*` у `messages/{uk,en}/`; імена інгредієнтів — вміст користувача, не перекладаються. Тест ключів перевіряє обидві мови.
- **Whats-new:** `2026-10-30-spell-ingredients`, `audience: "all"`, ключі `whatsNew.2026-10-30-spell-ingredients` в обох `whatsNew.json`. Довідкова стаття не потрібна (нового екрана немає), підказка біля rules-перемикача.
- **Документація:** `docs/architecture/battle.md` (розділ каст/ресурси), `abilities.md` (правило й поле заклинання), `i18n.md` якщо додані нові простори, `STATUS.md`.
- **Тести:** чисті (`planIngredients`: достатньо/нестача/доплата/мішані джерела/витратні/`focus`), схема (refine, унікальність ключів, зворотна сумісність `null`/`[]`), імпорт (5etools і SRD-розбір позитив/негатив), мутація (відмова без змін стану, preview, `free`, `grant`, довгий каст, юніт без stock, вимкнене правило), `persistIngredients` (предмети, гаманець із розміном, журнал, `persistResources` off), UI (форма, діалог, `ItemDialog`).

## Прихований обсяг (оцінка)

1. **Немає предметів, придатних для списання.** Інвентар не знає ні вартості, ні «інгредієнта»; без полів `worthGp`/`ingredient`, форми й валідації гравцям нічого списувати. Це перший непомічений шматок (≈ 2 задачі).
2. **Гаманець у бою відсутній.** Сума в мідних і розмін при фіксації — нова логіка з тестами на округлення (≈ 1–2 задачі).
3. **Імпорт.** SRD-шаблон не має структурних компонентів: потрібен розбір тексту й регенерація `spells.json` з перевіркою coverage (≈ 2 задачі); 5etools — легше.
4. **Поширення схеми:** content-api/OpenAPI/MCP/sync-хеші/тест-сторожі, що перелічують поля заклинання (≈ 1 задача пошуку й правок).
5. **Живе підтвердження:** окрема перевірка в браузері на копії БД (форма, каст, відмова, списання після завершення бою).

Усього орієнтовно 13–15 задач, три частини: A — дані, імпорт, форма; B — інвентар, рушій, списання; C — UI бою й листа, i18n, документація.
