# Дослідження: Warhammer Fantasy Roleplay як рульова система конструктора

Дата: 2026-11-03. Статус: дослідження завершене, базові рішення ухвалені (розділ «Рішення»); spec частини 5a пишеться окремо.

Мета: перевірити список відмінностей WFRP ↔ D&D 5e, доповнити пропущеним, зіставити з тим, що рушій уже вміє після конструктора (етапи 1–4, 6), і зафіксувати архітектурний підхід до третьої рульової системи. Це етап 5 епіку конструктора ([спек](../../archive/superpowers/specs/2026-10-20-campaign-constructor-design.md), пункт 5 «Шаблон Warhammer»).

## Рішення (користувач, 2026-11-03)

| Питання | Рішення |
|---|---|
| Видання | **WFRP 5e** (Cubicle 7, 2026) як база. Варіанти 4e не реалізуємо, поки не попросять; таблиця відмінностей нижче — заготовка для майбутнього перемикача видання. |
| Ліцензія та контент шаблону | Рушій реалізує механіки повністю. Офіційний шаблон — **власний grimdark-d100 контент** (свої назви й тексти кар'єр, лорів, талантів, станів, таблиць критів і провалів магії) без бренду Warhammer. Справжній WFRP ДМ довантажує сам через CSV/JSON/MCP-імпорт (4f-0). |
| Межі узагальнення | **Реєстр рульових систем** для трьох систем (`homm`, `dnd5e`, `wfrp`) за зразком реєстру режимів карти. HOMM і 5e не переписуємо — лише переносимо диспетчеризацію. Універсальний «рушій для будь-якої RPG» не будуємо. |
| Результат кроку | Цей документ → brainstorming → spec частини 5a у свіжій сесії. |

## 1. Видання: 4e чи 5e

П'яте видання вийшло влітку 2026 (PDF із серпня, hardback — передзамовлення). Видавець заявляє зворотну сумісність із матеріалами 4e; рецензії називають його «еволюцією, не революцією». Для рушія 5e простіше, і саме його побачать нові гравці.

Підтверджені зміни 5e проти 4e (з рецензій, перевірити по книзі при написанні spec кожної частини):

| Механіка | 4e | 5e |
|---|---|---|
| Складність тесту | Модифікатор до цільового числа (+60 … −30) | **Модифікатор до SL** після кидка; числові діапазони ті самі |
| Advantage | Лічильник у бою (+10 за одиницю), росте й скидається | **Переворот кубика** (71 → 17), бінарний; Disadvantage — переворот у гірший бік |
| Бойова перевага | Advantage як лічильник | **Momentum**: є/немає; дає Advantage на melee-тести; витрачається на атаку другою рукою, безпечний вихід із бою, таланти; втрачається від шкоди, програшу melee-тесту, нового стану. Дальні атаки Momentum не дають |
| Мета-валюти | Fate/Fortune + Resilience/Resolve | **Лише Fate/Fortune**, розв'язані (Fortune не залежить від Fate); Fortune відновлюється за сесію |
| Advances | по +1 | **по +5**; кар'єрний рівень = 10 / 12 / 14 «тіків» (tier 1→2→3→4) з advances, талантів і спорядження |
| Таланти | Рангові, частина дає +SL за ранг | Переважно одноразові (100 XP), без «+1 SL за рівень»; багато дають Advantage у конкретній ситуації |
| Channelling | Extended test (три версії в різних книгах) | Звичайний тест щоходу, SL накопичуються на наступне заклинання; великий провал — лише на найгіршому результаті |
| Overcast | На всі заклинання | Не на Petty Magic |
| Щити | Зброя | **Броня**: +1 SL у opposed melee + AP при влучанні; можуть протистояти Dodge проти дальніх |
| Крити й броня | Можна «пожертвувати бронею» від крита | **Прибрано** — броня не рятує від критів |
| Якості зброї | Impact, Reload через extended test | Impact прибрано (є Damaging), нова **Inflict [Condition]**, Reload X у раундах |
| Страх | Штраф на тести | Без Momentum, ворог отримує Advantage проти тебе |
| Стани | Базовий список | + **Besmirched** (Disadvantage на Fellowship) |
| Розміри | Small/Average окремо | Об'єднано; розмір = плоский бонус шкоди; Large рахується за двох при outnumbering |
| NPC | Traits-профілі | Шаблони Soldier / Skirmisher / Elite / Leader / Spellcaster, профілі з наступ/захист |
| Corruption | Dark Deals, Dark Whispers | Прибрано |
| Спорядження | — | Зношення й ремонт; ціни суттєво вищі |
| Кар'єри | Bard | Bard прибрано, Knave додано; 64 кар'єри, 5 видів |
| Downtime | Endeavours за класом | Будь-який endeavour; таблиця Character Events; XP витрачається явно в downtime |
| Амбіції | 4 (мотивація, коротка, довга, партійна) | 1 особиста + 1 партійна |

## 2. Ліцензія

У надісланому списку цього немає, а це головне обмеження.

- WFRP не має SRD чи відкритої ліцензії. Правила — ліцензія Cubicle 7 на IP Games Workshop; GW активно захищає IP (фан-політика 2021 року забороняє навіть неліцензовані фан-анімації).
- Механіки (d100, SL, локації влучань, формули) не охороняються авторським правом. Охороняються **назви, тексти й таблиці**: Old World, назви лорів (Lore of Fire…), кар'єр, талантів, тексти критів і miscast-таблиць, бестіарій.
- Проєктна політика вже є: [product-readiness §6](../../product/product-readiness-2026-10-21.md) — в офіційних шаблонах лише відкриті ліцензії (SRD 5.2 CC-BY), без product identity, консультація юриста перед запуском.

Наслідки для етапу 5:

1. Офіційний шаблон називається не «Warhammer» і не містить назв GW. Робоча назва — **«Grim d100»** (остаточну обирає користувач). Контент пишемо свій: 5 видів із власними назвами, кар'єри по 4 рівні (достатньо 16–24 замість 64), 6–8 лорів магії з власними атрибутами, стани (механічно ті самі, назви generic: Bleeding/Broken/Fatigued — загальні слова, лишаємо), таблиці критів за локаціями, таблиці провалу магії й корупції — власні тексти.
2. Механіки в рушії називаємо generic: `percentile test`, `successLevel`, `momentum`, `hitLocation`, `armourPoints`, `wounds`, `fate/fortune` (загальні слова, не торгові марки).
3. Справжній WFRP контент ДМ вантажить сам (CSV/JSON-імпорт, MCP). Частина 5g дає **приклади CSV з колонками під формат книги** (characteristics, skills, talents, careers, trappings), без самих даних.
4. Додано пункт у product-readiness §6 (цей коміт).

## 3. Таблиця користувача — верифікація

Статуси: **є** — рушій уже вміє; **розширити** — є база, треба додати; **нове** — поняття відсутнє.

| # | Механіка | Що в рушії зараз | Статус | Коментар |
|---|---|---|---|---|
| 1 | Основна перевірка d100 ≤ характеристика | `rollD20WithMode` (`lib/utils/battle/saves/roll-d20.ts`), `rollCheck`/`rollSave`, `DICE_PATTERN` без d100 | **нове** | Потрібен `PercentileTest` із SL, удачею 01–05 / 96–00, дублями. Бінарний Advantage 5e (переворот) — нова операція над тим самим кидком |
| 2 | Характеристики у відсотках | 6 фізичних колонок `strength…charisma`, `ABILITY_KEYS` закритий enum, `getAbilityModifier` | **нове** | 10 характеристик (WS BS S T I Ag Dex Int WP Fel), бонус = десятки. Також Move, Wounds. Див. ескіз даних |
| 3 | Навички з advances | `DND_SKILLS` (18, enum), `skillProficiencies`/`skillExpertise` | **нове** | ~60 навичок, Basic/Advanced, спеціалізації `Melee (Basic)`, `Lore (X)`; значення = характеристика + advances |
| 4 | Кар'єри замість класів | `classes` (GameClass, підкласи, `columns`), `Choice/ChoicePick` | **розширити** | Кар'єра ≈ клас із 4 рівнями, але прогрес — тіки/advances, не рівень персонажа. Новий content kind `careers`; `Choice` придатний для вибору трапінгів/талантів |
| 5 | XP витрачається | `experience` + `XP_THRESHOLDS` (поріг рівня), `levelUpAvailable` | **нове** | Леджер витрат: характеристики/навички з прогресивною ціною, таланти 100 XP, тіки кар'єри. `Character.level` стає похідним (tier кар'єри) або лишається для HOMM/5e |
| 6 | Бій: opposed test, Momentum, результати | `processAttack` → `calculateAttackRoll` → `judgeHit(total ≥ ac)`, `AttackRollResult{chosenD20, secondRoll}`; `resolveServerAttack` для реакцій | **нове** | Кидка захисника немає взагалі. Momentum — поле в `battleData` + правила втрати (прив'язати до `applyDamageConsequences`, програшу тесту, `applyCondition`) |
| 7 | Броня поглинає шкоду | AC як одне число (`ArmorStatsSchema`, `getEffectiveArmorClass`, 10 споживачів); зменшення шкоди лише `resistance` (%), `damageThreshold` (все-або-нічого), `guard` | **нове** | AP по 4 локаціях (голова/тулуб/руки/ноги), крок «− TB − AP[loc]» у `computeHitDamage`, мінімум 1. Слоти helmet/armor/boots є, але без семантики локацій |
| 8 | Wounds і крит-поранення | HP похідний (`resources.hp`), `applyDamageConsequences` → death saves / `unitDiesAtZero`; крит-таблиці зашиті (`critical-effects.ts`, d10, 23 типи), DM обирає ефект (`crit-choice`) | **розширити** | Wounds = та сама шкала HP; при 0 — крит за локацією замість death saves; таблиці — data-driven d100 (новий content kind `tables`); частина результатів постійна → леджер травм на персонажі |
| 9 | Магія без слотів | `SpellResolution = auto\|save\|attack`, `spell/slot.ts`, `SpellGroup` (= лор), інгредієнти (`spellIngredients`) | **розширити** | Нова резолюція `cn` (тест Language (Magick) ± SL channelling проти CN), overcast, miscast на дублях, Lore attribute. Слоти вимикаються через систему, інгредієнти вже є |
| 10 | Стани Bleeding/Broken/Fatigued… | `ActiveEffect` (duration/permanent/dot/hot/`saveEnds` d20/stackable), `CONDITION_5E_REGISTRY`, рівневий стан лише exhaustion (`syncExhaustion`), custom conditions у `rules.conditions.custom` | **розширити** | Узагальнити exhaustion у «рівневий стан із власним тіком і тестом зняття» (`testEnds` замість `saveEnds`) |
| 11 | Соціальне: статус, репутація | Немає статусу; `Acquaintance*` (знайомства), `goals`, світ/сценарій | **розширити** | Status (Brass/Silver/Gold + tier) на персонажі як модифікатор Fellowship-тестів і доходу; репутацію/ставлення фракцій **не** робимо в етапі 5 (сценарій ДМ) |
| 12 | Таблиці наслідків | Лише `randomOf` (рівномірно) і зашиті d10-таблиці критів | **нове** | Content kind `tables`: d100-діапазони → ефекти DSL (+ текст). Використовують крити, miscast, мутації, Character Events, травми |

## 4. Пропущене у списку

Групи, статус за тією ж шкалою.

### 4.1 Тести
- Удача: 01–05 завжди успіх, 96–00 завжди провал (**нове**, частина PercentileTest).
- Дублі (11, 22, …) = крит/фамбл **лише** в бою та при касті; у звичайних тестах — ні (**нове**).
- Dramatic vs Simple test (чи потрібні SL), Extended tests (накопичення SL), Assisted (+SL від помічника), Combined (**нове**; Extended потрібен для channelling 4e лише — у 5e ні; Assisted/Combined — поза боєм, низький пріоритет).
- Fortune: re-roll, +1 SL, зміна ініціативи; Fate: врятувати від смерті (**нове**, ресурси поза боєм + кнопки в бою).

### 4.2 Структура бою
- Раунд = **Move + Action**, без бонусної дії й реакції (**є**: `actionFlags` можна обмежити через систему; 5e-дії `CORE_ACTION_REGISTRY` вимикаються).
- Ініціатива = характеристика I (статична) або I + 1d10; тай-брейк за Agility (**є**: `rules.initiative.mode: static|roll` — додати `d10` як кубик системи).
- Reach-категорії зброї (Personal … Massive) і дистанції в ярдах; хто довший — б'є першим при зближенні (**розширити**: `attack-reach`, масштаб гекса = 1 ярд? — відкрите питання для spec, зараз клітинка 5 ft у 5e, абстрактна в HOMM).
- Outnumbering (+20 / +40 у 4e; у 5e — Advantage? перевірити) (**нове**, умова в `rollModeReasons`).
- Вихід із melee: вільна атака / Disengage / витрата Momentum (**є** частково: атаки при відході 4b).
- Dodge проти дальніх атак — лише щит у 5e (**нове**).
- Called shots, two-handed, off-hand (**є**: off-hand/`hand`; called shot — нове).
- Strength Bonus / Toughness Bonus = десятки характеристики; мінімальна шкода 1 (**нове**).
- Wounds = SB + 2×TB + WPB (вид/Hardy дають +TB) (**нове**, формула системи замість `heroHpFormula`).
- Розмір істот: плоский бонус шкоди, Large = 2 при outnumbering (**розширити**: `units.size` є для 5e).
- Баланс «fair» (`lib/utils/battle/balance/`, `hit-chance.ts`) зав'язаний на AC/to-hit (**розширити**: для `wfrp` — вимкнути або оцінка за SL-шансом).

### 4.3 Рани, смерть, лікування
- Крит-таблиці за 4 локаціями з **постійними травмами** (ампутації, переломи, шрами) → леджер `injuries` на персонажі, не лише в бою (**нове**).
- Смерть: Unconscious + кількість критів > TB (**нове**, замість death saves).
- Загоєння: Wounds відновлюються по TB за день (з Heal-тестом більше), крити лікуються довго; інфекція рани (Festering Wound) і хвороби з перебігом у **днях** (**розширити**: «день» уже є у відпочинку на карті світу 4d/world-rest; потрібен крок «минув день» для системи).
- Медична допомога: Heal-тест, Bleeding зупинка (**нове**, поза боєм — через sheet-roll).

### 4.4 Стани та психологія
- Список 5e: Ablaze, Bleeding, Blinded, Broken, Deafened, Entangled, Fatigued, Poisoned, Prone, Stunned, Surprised, Unconscious, Besmirched. Рівневі (Bleeding: 1 рана/рівень/раунд, шанс непритомності 10%×рівень; Fatigued: −10/рівень; Poisoned; Stunned; Ablaze: шкода за раунд). Правила зняття — власні тести (Cool для Broken, Endurance для Poisoned…) (**розширити**: каталог станів системи + `testEnds`).
- Психологія: Fear/Terror з рейтингом, Hatred, Animosity, Frenzy — Cool-тести (**нове**: аналог `moraleCheck` HOMM — тригер `moraleCheck` уже є, можна переозначити).

### 4.5 Персонаж і прогресія
- Таланти (~150, частина рангових) — механічні (Hardy, Strike Mighty Blow, Dual Wielder…) (**розширити**: content kind `talents` = abilities DSL + ціна XP + max rank + prerequisites; `feats` майже це).
- Навички: Basic/Advanced, спеціалізації, групи зброї (Basic, Cavalry, Fencing, Flail, Parry, Polearm, Two-Handed, Brawling; ranged: Bow, Crossbow, Blackpowder, Engineering, Entangling, Explosives, Sling, Throwing) (**нове**).
- Створення персонажа: вид → база характеристик + 2d10, випадкові таблиці кар'єр/талантів, trappings (**розширити**: player-draft/generation є для 5e; потрібна d100-генерація).
- Статус Brass/Silver/Gold + tier, дохід за статусом, Fellowship-тести за статусом (**нове**).
- Fate/Fortune: Fortune відновлюється **за сесію** — нова часова одиниця в app (**нове**: кнопка ДМ «нова сесія» або авто при старті дня).
- Corruption: пороги за WPB/TB, таблиці мутацій (фізичних і ментальних) (**нове**, через `tables`).
- Sin для жерців (**нове**, низький пріоритет).

### 4.6 Магія
- Petty / Arcane (лори) / Chaos / Hedge / Witchcraft / Prayers (Blessings і Miracles через Pray, Sin) (**розширити**: `SpellGroup` + тип системи).
- CN, overcast (+ефект за зайві SL), Lore attribute (напр. вогонь → Ablaze), броня штрафує каст (−SL за AP), ingredients знижують ризик (**нове/розширити**).
- Miscast: minor/major таблиці на дублях (**нове**, через `tables` + тригер `doubles`).
- Правила вивчення заклинань (обмеження за лором/XP) — перевірити по книзі 5e (**відкрите**).

### 4.7 Спорядження та економіка
- Qualities/Flaws зброї: Accurate, Blast, Damaging, Defensive, Distract, Entangle, Fast, Hack, Impale, Penetrating, Pistol, Precise, Pummel, Repeater, Shield, Slow, Spread, Trap Blade, Unbreakable, Wrap, Inflict [X]; flaws Dangerous, Imprecise, Reload X, Slow, Tiring, Undamaging, Unreliable (**розширити**: `WeaponStatsSchema.traits` → traits системи; шкода `SB+4` — формула з `sb`).
- Броня: AP за локаціями, Flexible/Impenetrable, Partial/Weakpoints, зношення й ремонт (**нове**).
- Encumbrance (ліміт SB+TB, штрафи), амуніція, Reload (**нове**; низький пріоритет).
- Валюта 12 d = 1 ss, 20 ss = 1 GC (**розширити**: інвентар має gold/silver/copper десяткові — конверсія за системою).

### 4.8 Downtime і світ
- Endeavours, дохід, тренування, Character Events (**нове**, частково через наявні world-rest/day).
- Соціальний статус у тестах, репутація — поза етапом 5 (сценарій).

### 4.9 Бестіарій
- Профіль з 10 характеристик + Traits (~70: Armour X, Weapon +X, Bite, Size, Fear/Terror X, Regenerate, Ward X, Night Vision, Hardy, Breath, Magical, Undead…) + шаблони NPC 5e (**розширити**: `units` з characteristics системи; Traits = abilities DSL).

## 5. Що в рушії вже є і буде перевикористано

| Підсистема | Файли | Як використовуємо |
|---|---|---|
| Правила кампанії й заморозка в бій | `lib/utils/rules/{schema,defaults,registry}.ts`, `start-build-context.ts` → `BattleScene.rules` | Нова секція `system` + секції WFRP; заморозка та сама |
| Реєстр режимів карти (прецедент плагіна) | `lib/utils/battle/modes/{registry,types}.ts` (`ModeServerHooks/ModeEngineHooks/ModeClientHooks`), ESLint-заборона імпорту режиму з ядра | Зразок для `RuleSystem` |
| Abilities DSL і `collectModifiers`/`runAbilities` | `lib/utils/abilities/schema/*`, `engine/core/*` | Таланти, Traits, якості зброї, лор-атрибути — через DSL; нові flag-и й тригери |
| Рівневий стан | `conditions/registry.ts` (`exhaustionEffects`, `syncExhaustion`), `conditions/query.ts` | Узагальнити в `LeveledCondition` |
| Custom conditions | `rules.conditions.custom` (markers + flags) | Стани системи — тим самим форматом, у каталозі системи |
| Crit choice (ДМ обирає) | `lib/utils/battle/crit-choice/*`, `pendingCritChoice` | Вибір результату з d100-таблиці ДМом — той самий механізм |
| Ресурси поза боєм | `characters.resources` (`hp, tempHp, exhaustion, charges…`), `rules.outOfCombat`, `character_logs` | + `wounds, fate, fortune, corruption, momentum?`, журнал тестів |
| Sheet rolls | `sheet-roll.ts`, `roll-handler.ts`, `SheetRollDialog` | Percentile-тести з листа (Heal, Cool, Endurance) |
| Відпочинок / день | `rest.ts`, world-rest | Загоєння Wounds по днях, хвороби |
| Інгредієнти | `spellIngredients` | Ризик miscast |
| Класи + вибори | `classes`, `Choice/ChoicePick`, `PUT …/choices` | Кар'єри, трапінги, вибір талантів |
| Items | `WeaponStatsSchema.traits`, `ItemStats`, composed refs, charges | Qualities/Flaws, AP по локаціях |
| Content API | `defineResource` + `CONTENT_RESOURCES`; вручну `SYNC_TABLE_SCOPES`, `BUNDLE_TABLES`, `IMPORT_SPECS`, `ReferenceKind` | Нові kinds: `careers`, `talents`, `tables` (+ можливо `injuries` як частина персонажа) |
| Імпорт CSV/JSON, MCP `content_import` | `lib/utils/content/import/*` | ДМ вантажить WFRP-контент; приклади CSV у 5g |
| Шаблони й overlay перекладу | `scripts/srd/*`, `data/templates/<key>`, `lib/srd/i18n` | Шаблон «Grim d100» тим самим конвеєром; uk-overlay |
| AI context | `lib/ai/context/prompt.ts` (rule-agnostic) + `parseRules` snapshot | Додати опис системи в контекст; tools підхоплять нові kinds автоматично |
| Онбординг | `lib/onboarding/whats-new.ts` + `messages/*/whatsNew.json` | Запис на кожну частину з UI |

## 6. Карта швів коду

Де зараз зашито d20/AC/6 характеристик і що робити з кожним швом.

| Шов | Де | Викликів | Дія |
|---|---|---|---|
| Кидок d20 | `attack/roll.ts`, `attack/server-attack.ts`, `attack-phase/strike-rolls.ts` (`strikeD20` відкидає >20), `run-attack-phase.ts`, `spell/cast/outcome.ts`, `spell/zone-fire.ts`, `turn/initiative.ts`, `turn/berserk.ts`, `death-saves`, `saves/roll-d20.ts`; hooks `useAttackWizard`, `useSpellBook` | ~11 файлів | Системний хук `resolveTest` / `resolveAttack`; клієнтські хуки читають систему з `battle.rules.system` |
| `total >= ac` | `attack/process/run.ts:judgeHit`, `server-attack.ts`, `common/attack-roll-helpers.ts`, `cast/outcome.ts`, `zone-fire.ts` | 5 | Замінити на результат хука (`hit`, `sl`, `location`) |
| `AttackRollResult` | `types/attack.ts` (`chosenD20`, `secondRoll`, `totalAttackValue`) | тип | Розширити до union за системою: `{kind:"d20"…} \| {kind:"percentile", roll, target, sl, reversed?, location, opposed?:{…}}` |
| `getEffectiveArmorClass` | `participant/helpers.ts` + balance + 3 UI панелі | 10 | Системний `defenseSummary(p)` для UI; у WFRP — AP за локаціями |
| Шкода | `damage/impl.ts` → `compute.ts` (`applyWeaponFlat`, `applyResistance`) | 1 конвеєр | Хук `mitigateDamage(ctx)` між resist і HP: WFRP віднімає TB + AP[loc], мін. 1 |
| 0 HP | `damage/consequences.ts` (`heroGoesDown`, `unitDiesAtZero`) | 1 | Хук `onZeroHp` → крит за локацією (таблиця) замість dying |
| `isFiveE` / `damageModel` | `attack/ability.ts` + ~20 викликів | 20 | Залишити як є для 5e; `damageModel: "wfrp"` ставить `from-character` за `rules.system` |
| `rules.x.y` inline | ~150 перевірок | — | Не чіпаємо; нові секції системи додаються поруч |
| Характеристики персонажа | 6 колонок, `ABILITY_KEYS`, `getAbilityModifier`, `from-character.ts:171` | тип + колонки | Див. ескіз даних |
| Рівень/XP | `XP_THRESHOLDS`, `levelUpAvailable`, `maxLevel`, `heroScaling` (1–20) | — | WFRP не використовує; `level` = tier кар'єри (1–4) для UI/балансу |
| Стани | `CONDITION_5E_KEYS`, `expandCondition5e` | — | Каталог станів системи (`conditionsOf(system)`), той самий формат markers+flags |
| Кидки з листа | `sheet-roll.ts` (`CheckSubject = skill\|ability`) | — | Subject союз: `{characteristic}` / `{skill, spec?}` |
| Sheet UI | `build-sheet.ts`, `ProfileHero`, `CombatTab`, `SkillsTab`, `CharacterAbilityScores`, `AbilityScoresPicker`, `AttackWizard/RollStep`, `ParticipantList`, `MyHeroPanel`, `HealthBar`, `ConditionsDialog` | ~12 компонентів | Системний `sheetModel(p)` + компоненти-варіанти (`CharacteristicsGrid`, `WoundsBar`, `PercentileRollStep`) |

### Архітектурний висновок

Вводимо **реєстр рульових систем** `lib/utils/rules/systems/{registry,types}.ts` + `lib/utils/rules/systems/{homm,dnd5e,wfrp}/`, за зразком режимів карти:

- `rules.system: "homm" | "dnd5e" | "wfrp"` (нова секція; шаблони Heroes/SRD/порожній отримують `homm`/`dnd5e` бекфілом; «без шаблону» = `homm`).
- Хуки (мінімальний набір для 5a–5b, решта додається частинами): `resolveTest`, `resolveAttack` (включно з opposed), `mitigateDamage`, `onZeroHp`, `conditions` (каталог), `initiative`, `sheetModel`, `characteristicsOf(character)`, `progression` (level/tier, XP), `balance` (увімк./модель).
- ESLint-правило як для режимів: ядро не імпортує `systems/wfrp` напряму.
- HOMM і 5e: їхні реалізації хуків — **обгортки навколо наявного коду** (`judgeHit`, `applyResistance`, `heroGoesDown`); поведінка не змінюється, паритет перевіряється `battle-sweep` на prodcopy, як у HOMM-шлюзі.
- Клієнт отримує `system` у `battle.rules` і в `CharacterSheet`; UI-варіанти вибираються за ним.

## 7. Ескіз моделі даних (для spec; рішення не ухвалені)

- **Характеристики.** Варіант A: JSON `characters.characteristics` (`{ws,bs,s,t,i,ag,dex,int,wp,fel}` + advances) і 6 старих колонок лишаються для HOMM/5e. Варіант B: 10 нових колонок. Рекомендація — A (expand-only, без розростання таблиці; `units` так само). Бонуси (SB, TB, …) похідні. `move`, `wounds max` похідні або явні.
- **Навички й таланти персонажа.** `characters.skillAdvances: Record<skillKey, number>`, `characters.talents: {key, rank}[]`. Каталог навичок — `rules`/системна константа + content kind `talents`.
- **Кар'єри.** Content kind `careers` {name, class, tier levels[4] {name, status, characteristics[], skills[], talents[], trappings[]}}; персонаж: `career {careerId, level, ticks}`, `advancementLog[]` (XP-леджер: що, скільки, коли).
- **Ресурси.** `resources`: `+ wounds` (замість hp в системі wfrp — або `hp` і є wounds; рекомендація: лишити `hp` як Wounds, щоб не дублювати HealthBar/consequences), `fate, fortune, corruption, sin`.
- **Травми.** `characters.injuries[]` {tableId, entryId, location, permanent, healsAtDay?} — застосовуються як abilityEffects при побудові учасника.
- **Бій.** `battleData.momentum: boolean`, `battleData.advantageSources?`; у `ActiveEffect` — `level`, `testEnds {skill|characteristic, difficulty}`; `AttackRollResult` union.
- **Таблиці.** Content kind `tables` {key, die: "d100"|"d10"…, entries[{from,to,label,effects: AbilityEffect[], permanent?, text}]}; посилання з `rules.wfrp.critTables[location]`, `miscast.minor/major`, `mutation.physical/mental`.
- **Предмети.** `WeaponStats`: `group`, `reach`, `damage: "sb+4"`, `qualities[]`, `flaws[]`; `ArmorStats`: `locations: {head,body,arms,legs}` → AP, `qualities[]`; `Inventory.currency` — конверсія 12/20 у системі.
- **Магія.** `Spell.cn`, `resolution: {kind:"cn"}`, `SpellGroup.loreAttribute` (ефект), `spellKind: petty|arcane|chaos|hedge|witchcraft|blessing|miracle`.

## 8. Декомпозиція етапу 5

Порядок обрано так, щоб перша частина дала **граючий melee-бій без магії** на новій системі.

| Частина | Зміст | Розмір |
|---|---|---|
| **5a. Шов і тести** | Реєстр `RuleSystem` + обгортки homm/dnd5e (паритет battle-sweep); `rules.system`; `PercentileTest` (SL, удача, дублі, Advantage-переворот, модифікатор SL); характеристики/навички/бонуси персонажа (ескіз даних), кидки з листа, базовий лист персонажа (характеристики, Wounds) | великий |
| **5b. Бій** | Opposed melee, ranged simple test, Momentum, локація влучання, AP за локаціями, шкода SB+… − TB − AP, Wounds, крит при 0 і на дублях через `tables`, ініціатива I, раунд Move+Action, outnumbering, щити; AttackWizard-варіант, HUD | великий |
| **5c. Стани, психологія, травми** | Каталог станів із рівнями й `testEnds`, Fear/Terror/Frenzy, леджер травм, загоєння по днях, Heal/Endurance тести, смерть (крити > TB), Fate/Fortune у бою | середній–великий |
| **5d. Магія** | Лори (`SpellGroup`), CN-резолюція, channelling, overcast, miscast-таблиці на дублях, lore attribute, броня штрафує, інгредієнти, prayers/Sin; book UI | великий |
| **5e. Кар'єри і розвиток** | `careers`, `talents`, XP-леджер із прогресивними цінами, тіки кар'єри, зміна кар'єри, створення персонажа (вид + 2d10, випадкові таблиці), статус | великий |
| **5f. Спорядження** | Qualities/Flaws, групи зброї, reach, AP-броня з якостями, валюта 12/20, encumbrance, амуніція/Reload, зношення (опц.) | середній |
| **5g. Шаблон і контент** | Офіційний шаблон «Grim d100»: правила-пресет, види, кар'єри, таланти, навички, лори+заклинання, стани, таблиці (крити×4, miscast×2, мутації×2), бестіарій; приклади CSV під WFRP-формат; uk-overlay; AI-контекст системи; whats-new/help | великий (контент) |
| **5h. Бестіарій і баланс** | Traits як DSL, NPC-шаблони, баланс для d100 (або вимкнення fair), Corruption/мутації, downtime/Character Events | середній |

Кожна частина: spec-розділ → план → SDD (Sonnet) → фінальний Opus-review → live-run у браузері; злиття в `main` — після 5a–5c щонайменше (граючий бій), далі по частинах, як домовлено для конструктора після епіку. Окремо для кожної частини з UI — запис у `whats-new`.

## 9. Відкриті питання для spec 5a

1. Масштаб гекса для WFRP: 1 клітинка = 1 ярд чи 2 ярди (Move 4 → 8 ярдів кроку)? Впливає на reach і дальності.
2. Характеристики: JSON (A) чи колонки (B)? Чи `units` теж переходять на `characteristics`?
3. `hp` = Wounds (без нового поля) — підтвердити.
4. Чи потрібен 4e-toggle вже в 5a (хоча б `advantage: "reverse" | "counter"`), чи взагалі не закладати.
5. Що робить `Character.level` у системі wfrp: tier кар'єри (1–4) чи сховано.
6. Назва офіційного шаблону й generic-терміни (lore → «школа»? characteristics → «характеристики»; у UI українською та англійською).
7. Fortune «за сесію»: кнопка ДМ «нова сесія» чи авто при першому бою дня.
8. Баланс fair для wfrp: вимкнути в 5b чи оцінка за SL-ймовірністю.

## Джерела

- Cubicle 7 — анонс і реліз WFRP 5e: https://www.enworld.org/threads/warhammer-fantasy-roleplay-5th-edition-is-coming-in-2026.715850/ ; https://www.belloflostsouls.net/2026/08/rpg-cubicle-7-announces-warhammer-fantasy-roleplay-5th-edition-2.html ; https://www.geeknative.com/241205/warhammer-fantasy-roleplay-fifth-edition-streamlines-combat-and-resource-pools/
- Рецензії 5e (відмінності від 4e): https://illmetbymorrslieb.wordpress.com/2026/09/15/review-warhammer-fantasy-roleplay-5th-edition-rulebook/ ; https://ttrpgfans.com/warhammer-fantasy-roleplay-fifth-edition/ ; https://frontlinegaming.org/2026/09/20/whfb-rpg-fifth-edition-streamlines-the-old-world-without-losing-its-teeth/
- Короткий виклад правил 4e: https://tekeli.li/warhammer/rules-summary.html ; https://www.d20radio.com/main/wfrp-4th-edition-review-part-5-combat/ ; https://www.d20radio.com/main/?p=16072 ; https://www.d20radio.com/main/?p=15323
- Fate/Fortune/Resilience/Resolve, Corruption (4e): https://www.enworld.org/posts/7752854
- IP-політика Games Workshop (фан-контент): https://www.pcgamer.com/games-workshop-is-trying-to-shut-down-fan-animations
- Розвідка коду: звіти трьох Explore-агентів 2026-11-03 (правила/персонаж, бойовий рушій, заклинання/предмети/прогресія) — узагальнено в розділах 5–6.
