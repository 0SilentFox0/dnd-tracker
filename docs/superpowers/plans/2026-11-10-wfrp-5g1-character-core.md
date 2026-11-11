# WFRP 5g-1: ядро персонажа шаблону Grim d100 — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Без per-task рев'ю: одне фінальне Opus-рев'ю гілки після Task 7.

**Goal:** `data/templates/grim-d100/` містить 4 види з профілями, 16 кар'єр (8 класів × 2, по 4 рівні), 50 талантів і rules-патч, а `pnpm constructor:grim-template` публікує шаблон, з якого майстер створення героя 5e-3 працює без правок.

**Architecture:** Код рушія, міграції й UI не змінюються. Змінюються лише валідатор даних (`scripts/grim/validate-data.ts`: формат навичок кар'єри, повнота профілю, статус рівня, заборонені терміни), новий звіт покриття `scripts/grim/coverage.ts` (попередження, не помилки) і самі JSON-дані. Усі числа й імена контенту — лише з таблиць цього плану («Ростер»), виконавці їх не вигадують.

**Tech Stack:** TypeScript (tsx-скрипти), Zod-схеми ресурсів (`CONTENT_RESOURCES`, `IMPORT_SPECS`), Vitest, Prisma (лише інтеграційний тест), JSON-дані.

**Spec:** `docs/superpowers/specs/2026-11-10-wfrp-5g1-design.md` (читати разом із `docs/architecture/rule-systems.md`: «Межі 5e-1», «Межі 5e-2», «Межі 5e-3», «Межі 5g-0»).

## Global Constraints

- Коміти лише на `feat/wfrp` у worktree `/Users/silentfox/Work/dnd-tracker-wfrp`; не мерджити й не пушити (WFRP off main до кінця епіку). Кінцевий рядок коміту — `Co-Authored-By` моделі-виконавця.
- Виконує Sonnet; одне фінальне Opus-рев'ю в кінці (включно з ручним читанням усіх текстів на GW-терміни).
- Тести лише вузько: `pnpm test:run <файл>`, `pnpm test:related <файли>`; eslint лише `pnpm exec eslint --fix <змінені .ts>`. Повний `pnpm test:run` і repo-wide `pnpm lint` НЕ запускати (це pre-deploy гейт епіку).
- Мова контенту — англійська (усі `name`/`description`/`trappings`/назви рівнів); проза плану й доків — українська.
- Жодних GW-термінів (назви імперії, богів, міст, кар'єр WFRP, «Warhammer», «Old World», «Chaos»-боги тощо), див. `scripts/grim/forbidden-terms.ts` з Task 1; список не гарантія — тексти пишуться оригінальні.
- Ефекти талантів лише наявні: passive `modifyStat` зі `stat` ∈ {`attackBonus`, `maxHp`, `initiative`} (див. «Рішення 2»). Нових ефектів, полів схем, міграцій немає.
- Не піднімати `scope-size` і OpenAPI-бюджети (контент іде в БД шаблону, не в `messages`).
- Імпорти `@/…`, `import/no-cycle` увімкнено; коментарі мінімальні (лише неочевидне «чому»).
- Кожен JSON-файл має проходити `validateGrimData` на кожному коміті (тест `real-data.test.ts` з Task 1).

## Review Focus

1. **Профіль виду без явного ключа.** `SpeciesProfileSchema` у валідаторі підставляє дефолти, а `resolveProfile` у завантажувачі робить `profile.talents.map(...)` без них: профіль без `talents`/`randomTalents`/`careerTable` проходить валідацію і падає при записі. Очікування: валідатор вимагає всі 8 ключів (тест у Task 1).
2. **Посилання з іншим регістром/пробілами.** Валідатор і завантажувач порівнюють через `nameKey` (trim + lower), тож `"blade practice "` проходить, але в UI/логах дає розбіжні імена. Очікування: e2e-тест (Task 6) резолвить імена профілів і кар'єр **точним** збігом з каталогом.
3. **Механічний талант, що проходить `AbilitySchema`, але інертний для героя wfrp** (напр. `modifyStat` на `strength`/`armor`/`speed`, або не-passive тригер). Очікування: тест реального каталогу (Task 5) пропускає лише passive `modifyStat` з `attackBonus`/`maxHp`/`initiative`.
4. **d100-таблиці та досяжність.** Межі `max` не зростають/не закінчуються на 100, `randomTalentCount` більший за кількість різних талантів таблиці поза фіксованими, кар'єра поза всіма таблицями, рівень 1 з меншою кількістю пунктів, ніж `ticksRequired[0]` (рівень 1 недосяжний). Очікування: помилки валідатора (схема) і попередження `grimCoverage` (Task 1), `grimCoverage(real) = []` (Task 5).
5. **GW-терміни в глибоких рядках** (`tier3_trappings`, `passiveAbility.description`, назва рівня, назва ability). Очікування: валідатор сканує всі рядкові листки всіх рядків, регістронезалежно, по межах слова (тест у Task 1).

## Рішення (закриття «Відкрито для plan» spec)

### Рішення 1. Формат `skills` у кар'єрі

`listed()` у `wfrp/advancement/career.ts` вважає ключ у кар'єрі, якщо рівень містить точний `key:spec` **або** голий `key`; тік — унікальний `skill:<key:spec>`. Голий `melee` відкрив би всі спеціалізації як окремі тіки. Тому:

- навичка з `spec: "none"` — голий ключ (`perception`, `dodge`);
- `spec: "fixed"` (`melee`, `ranged`) — `key:spec`, `spec` ∈ `MELEE_SPECS`/`RANGED_SPECS` (`melee:basic`, `ranged:bow`);
- `spec: "open"` (`lore`, `language`, `trade`, `art`, `performance`) — `key:spec`, `spec` за `SPEC_RE` (`lore:local`, `trade:carpentry`).

Регекс `SKILL_ADVANCE_KEY_RE` це вже допускає (схема `careerTierSchema`); новий `careerSkillIssue(value)` у валідаторі перевіряє каталог (Task 1). Фікстури 5g-0 (`"melee"`, `"lore"`) оновлюються до `melee:basic`/`lore:local`.

### Рішення 2. Ефекти механічних талантів

- `abilities` у `feats` — поле `abilitiesText` (`FEATS_IMPORT`): JSON-масив передається як є і перевіряється `createFeatSchema.abilities = AbilitiesSchema` у наявному `validateRows`. Додаткових полів не потрібно; окрема перевірка `AbilitySchema` вже є, Task 1 лише пінить її тестом.
- Що реально діє на героя wfrp (зчитано з коду): `attackBonus` — `resolveWfrpAttack` додає `collectModifiers(...{stat:"attackBonus", attackKind}).flat` як +SL; `maxHp` і `initiative` — baked-стати, `bakePassives` у `from-character.ts` додає їх до Wounds і `baseInitiative` (яку читає `wfrpInitiative`); passive baked-стати `collectModifiers` пропускає, подвійного обліку немає. Характеристики (`value()`), `armor`, `speed`, `morale` (вимкнено в `WFRP_RULES`) і `damageBonus` (`computeWfrpDamage` його не читає) для героя wfrp інертні — не використовувати.
- Ранг: `talentGroups` повторює групу `rank` разів, тож ефект задається на 1 ранг.
- Форма ability (одна на талант, `id` `"a1"`, `name` = назва таланту):

```json
{ "id": "a1", "name": "Blade Practice", "trigger": { "event": "passive" }, "effects": [{ "kind": "modifyStat", "stat": "attackBonus", "flat": 1, "attackKind": "melee" }] }
```

Коди ефектів у таблиці талантів (кожен — один елемент `effects`; `+` = два елементи в тій самій ability):

| Код | Ефект |
|---|---|
| `MEL` | `{ kind: "modifyStat", stat: "attackBonus", flat: 1, attackKind: "melee" }` |
| `RNG` | те саме з `attackKind: "ranged"` |
| `ATK` | `{ kind: "modifyStat", stat: "attackBonus", flat: 1 }` (без `attackKind`) |
| `HP2` / `HP3` | `{ kind: "modifyStat", stat: "maxHp", flat: 2 }` / `flat: 3` |
| `INI` | `{ kind: "modifyStat", stat: "initiative", flat: 5 }` |

Відхилення від spec: механічних 20 з 50 (40 %), а не «приблизно половина» — для героя wfrp наявні ефекти покривають лише три осі, більше механічних талантів були б дублікатами.

### Рішення 3. Числа

**Шкала `xpCost`** (ціна рангу = `xpCost × (rank+1) × talentCostMultiplier`, множник лишається 1):

| Клас таланту | `xpCost` | `maxRank` |
|---|---|---|
| Дрібний описовий / дрібний механічний (`INI`, `HP2` одноранговий) | 100 | 1 |
| Стековий описовий (мови, навчання, подорожі) | 100 | 2–3 |
| Середній описовий (Charm/Lockpicking-рулінги) | 150 | 1–2 |
| Механічний +1 SL одного виду атаки | 100 (ранг 1) / 150 (ранги 2) | 1–2 |
| `HP2` стековий | 150 | 3 |
| `HP3`, комбо з двох ефектів (крім `ATK`) | 200 | 1–2 |
| Сильний описовий (лідерство, страх) | 200 | 1 |
| `ATK` | 250 | 1 |
| `ATK+INI` | 300 | 1 |
| Видовий (`type: "origin"`) | без `xpCost` (купівля → `TALENT_NO_COST`) | 1 |

Обґрунтування: ціна першого кроку характеристики 25 XP, тож талант 100–300 = 4–12 кроків, що узгоджується з дефолтами `DEFAULT_ADVANCEMENT_RULES`; стартові 100 XP (кар'єра кинута + характеристики кинуті) купують рівно один дрібний талант.

**`rules.json`** (повний вміст; `mergeRules` зливає секції на один рівень, тож `career` пишеться цілим):

```json
{ "advancement": { "career": { "ticksRequired": [8, 10, 12], "outOfCareerMultiplier": 2 } } }
```

Зміщення лише одне: `ticksRequired` 10/12/14 → 8/10/12. Тік = унікальний пункт поточного й попередніх рівнів, а рівень 1 цього шаблону має рівно 10 пунктів (3 характеристики + 5 навичок + 2 таланти); при 10 тіках гравець мусив би купити геть усе, включно з талантом, що вже може бути взятий видом. Ціни характеристик/навичок, `talentCostMultiplier` і `creation` (50/25/0, 50/25/0, `freeBudget` 100 — середнє 10 на характеристику ≈ матсподівання 2d10 = 11) лишаються дефолтними, у патч не пишуться.

**Склад рівня кар'єри:** T1 — рівно 3 характеристики, 5 навичок, 2 таланти, 3–4 траппінги; T2–T4 — 2 характеристики, 3–4 навички, 2 таланти (T4 — 3), 2–3 траппінги. Статус `"<Brass|Silver|Gold> <1-9>"` строго зростає (Brass < Silver < Gold, далі рівень).

**Види** (`STAT_FLOOR` 20 + `mods` + 2d10; люди-еталон без модифікаторів, решта компенсують Fate/таланти):

| Вид | `mods` | `move` | `fate` | `extraWounds` | `talents` | `randomTalentCount` |
|---|---|---|---|---|---|---|
| Lowlander | `{}` | 4 | 2 | 0 | Quick Study | 3 |
| Delver | ws +10, t +10, wp +20, ag −10, dex +10, fel −10 | 3 | 0 | 1 | Stone Sense, Deep Sight | 1 |
| Hearthkin | ws −10, bs +10, s −10, ag +10, dex +10, wp +10, fel +10 | 3 | 2 | 0 | Light Step, Underfoot | 2 |
| Veyl | i +20, ag +10, dex +10, int +10, wp +10, s −10, t −10 | 5 | 0 | 0 | Twilight Eyes, Long Memory | 1 |

## Ростер (єдине джерело імен і чисел)

### Таланти (50)

`type` — `general`, крім O1–O7 (`origin`). Опис — 1–2 оригінальні англійські речення; у механічних опис називає ефект («+1 SL on melee attack tests per rank»), в описових — що ДМ дозволяє/дає (рулінг).

| # | name | xpCost | maxRank | ефект | суть |
|---|---|---|---|---|---|
| M01 | Blade Practice | 150 | 2 | `MEL` | регулярні вправи з клинком |
| M02 | Steady Aim | 150 | 2 | `RNG` | рівне дихання перед пострілом |
| M03 | Battle Instinct | 250 | 1 | `ATK` | чуття бою |
| M04 | Tough Hide | 150 | 3 | `HP2` | загартована шкіра |
| M05 | Oxen Constitution | 200 | 2 | `HP3` | витривалість вола |
| M06 | Snap Reaction | 100 | 3 | `INI` | миттєва реакція |
| M07 | Tavern Brawler | 100 | 1 | `MEL` | бійки в шинках |
| M08 | Keen Sighting | 100 | 1 | `RNG` | гостре око |
| M09 | Shield Drill | 250 | 1 | `MEL+HP2` | стройова робота щитом |
| M10 | Watchful | 100 | 1 | `INI` | завжди насторожі |
| M11 | Last Stand Grit | 200 | 1 | `HP3` | стоїть до кінця |
| M12 | Ambusher | 200 | 1 | `RNG+INI` | засідки |
| M13 | Fencer's Footwork | 200 | 1 | `MEL+INI` | фехтувальні кроки |
| M14 | Oarsman's Back | 100 | 1 | `HP2` | спина весляра |
| M15 | Cudgel Work | 150 | 1 | `MEL` | кийок і вулиця |
| M16 | Knife Thrower | 150 | 1 | `RNG` | метальні ножі |
| M17 | Veteran's Poise | 300 | 1 | `ATK+INI` | спокій ветерана |
| M18 | Hearty Eater | 100 | 2 | `HP2` | міцний шлунок і сила |
| M19 | Alert Sleeper | 150 | 2 | `INI` | прокидається від шереху |
| M20 | Pack Mule | 100 | 1 | `HP2` | носить важке |
| D01 | Lettered | 100 | 1 | — | читає й пише |
| D02 | Tongue for Tongues | 100 | 3 | — | швидко вчить мови |
| D03 | Court Manners | 100 | 1 | — | етикет двору |
| D04 | Silver Tongue | 150 | 2 | — | переконливість (Charm) |
| D05 | Haggler's Instinct | 100 | 2 | — | торг |
| D06 | Night Owl | 100 | 1 | — | нічна пильність |
| D07 | Light Fingers | 150 | 2 | — | спритні пальці |
| D08 | Lock Whisperer | 150 | 2 | — | замки |
| D09 | Trail Sense | 100 | 2 | — | не губить стежку |
| D10 | Way with Beasts | 100 | 1 | — | тварини довіряють |
| D11 | Weather Eye | 100 | 1 | — | передбачає погоду |
| D12 | River Reader | 100 | 1 | — | течії й мілини |
| D13 | Born Swimmer | 100 | 1 | — | плаває змалку |
| D14 | Steady Hands | 150 | 2 | — | точна ручна робота/хірургія |
| D15 | Green Thumb | 100 | 1 | — | трави й рослини |
| D16 | Iron Stomach | 100 | 1 | — | не боїться отрут і гнилі |
| D17 | Parade-Ground Voice | 200 | 1 | — | командний голос |
| D18 | Steel Nerves | 200 | 1 | — | не піддається страху |
| D19 | Lamp-Lit Studies | 100 | 3 | — | нічне навчання (Research) |
| D20 | Crowd Reader | 100 | 1 | — | читає натовп |
| D21 | Fast Talker | 150 | 1 | — | забалакує |
| D22 | Road-Worn | 100 | 2 | — | досвід доріг |
| D23 | Keen Ears | 100 | 1 | — | чутливий слух |
| O1 | Quick Study | — | 1 | — | Lowlander: швидко переймає ремесло |
| O2 | Stone Sense | — | 1 | — | Delver: відчуває хибну кладку |
| O3 | Deep Sight | — | 1 | — | Delver: бачить у тьмяному світлі |
| O4 | Light Step | — | 1 | — | Hearthkin: тихий крок |
| O5 | Underfoot | — | 1 | — | Hearthkin: малий, його не помічають |
| O6 | Twilight Eyes | — | 1 | — | Veyl: бачить у присмерку |
| O7 | Long Memory | — | 1 | — | Veyl: пам'ять поколінь |

### Кар'єри (16): назви, статуси, характеристики

Формат рядка — як `scripts/grim/__tests__/fixtures/careers.json` (плоскі `tier{1..4}_{name,status,characteristics,skills,talents,trappings}`, `class`). Колонка «характеристики» — T1 | T2 | T3 | T4.

| # | name | class | рівні T1 / T2 / T3 / T4 | статуси | характеристики |
|---|---|---|---|---|---|
| C01 | Archivist | Academic | Copyist / Archivist / Keeper of Records / Master Archivist | Brass 3 / Silver 1 / Silver 3 / Gold 1 | int,wp,dex \| i,fel \| int,wp \| fel,i |
| C02 | Bonesetter | Academic | Orderly / Bonesetter / Surgeon / Master Surgeon | Brass 4 / Silver 1 / Silver 3 / Gold 1 | dex,int,wp \| i,t \| dex,fel \| int,wp |
| C03 | Chandler | Burgher | Shop Hand / Chandler / Guild Factor / Trade Magnate | Brass 3 / Silver 2 / Silver 4 / Gold 2 | int,fel,dex \| i,wp \| fel,int \| wp,i |
| C04 | Lamplighter | Burgher | Wick Hand / Lamplighter / Night Steward / Lantern Marshal | Brass 1 / Brass 3 / Silver 1 / Silver 3 | ag,i,t \| ws,wp \| i,fel \| wp,ws |
| C05 | Herald | Courtier | Page / Herald / Emissary / Lord Herald | Silver 1 / Silver 3 / Gold 1 / Gold 2 | fel,int,ag \| i,wp \| fel,int \| wp,i |
| C06 | Masquer | Courtier | Mummer / Masquer / Court Masquer / Master of Revels | Brass 4 / Silver 2 / Silver 4 / Gold 1 | fel,ag,dex \| i,int \| fel,wp \| dex,ag |
| C07 | Shepherd | Peasant | Herd Hand / Shepherd / Drover / Flockmaster | Brass 1 / Brass 2 / Brass 4 / Silver 2 | t,i,bs \| wp,ag \| s,fel \| t,wp |
| C08 | Charcoal Burner | Peasant | Kiln Hand / Charcoal Burner / Forest Collier / Master Collier | Brass 1 / Brass 2 / Brass 3 / Silver 1 | s,t,wp \| ws,dex \| t,int \| s,fel |
| C09 | Pathfinder | Ranger | Guide / Pathfinder / Trailblazer / Wayfinder | Brass 2 / Brass 4 / Silver 1 / Silver 3 | i,ag,t \| bs,int \| wp,i \| fel,bs |
| C10 | Falconer | Ranger | Mews Hand / Falconer / Austringer / Master of Hawks | Brass 3 / Silver 1 / Silver 2 / Silver 4 | bs,i,dex \| ag,fel \| int,wp \| bs,i |
| C11 | Ferry Keeper | Riverfolk | Rope Hand / Ferry Keeper / Crossing Master / Lord of the Ford | Brass 2 / Brass 3 / Silver 1 / Silver 3 | s,t,ag \| fel,i \| ws,int \| wp,fel |
| C12 | Eel Fisher | Riverfolk | Net Mender / Eel Fisher / River Angler / Weir Master | Brass 1 / Brass 2 / Brass 4 / Silver 2 | dex,ag,t \| i,s \| int,wp \| bs,fel |
| C13 | Dicer | Rogue | Dice Runner / Dicer / Table Fox / Lord of Chances | Brass 1 / Brass 3 / Silver 2 / Silver 5 | int,fel,dex \| i,ag \| wp,fel \| int,ws |
| C14 | Lockbreaker | Rogue | Latch Lifter / Lockbreaker / Vault Cracker / Master of Keys | Brass 1 / Brass 3 / Silver 1 / Silver 3 | dex,ag,i \| int,wp \| dex,s \| fel,i |
| C15 | Shieldbearer | Warrior | Shield Hand / Shieldbearer / Shield Captain / Banner Lord | Silver 1 / Silver 2 / Silver 4 / Gold 1 | ws,t,s \| wp,i \| ws,fel \| t,wp |
| C16 | Sellsword | Warrior | Hireling / Sellsword / Free Lance / Mercenary Captain | Brass 4 / Silver 1 / Silver 3 / Gold 1 | ws,bs,ag \| s,t \| i,wp \| fel,ws |

### Кар'єри: таланти по рівнях

| # | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| C01 | Lettered, Lamp-Lit Studies | Tongue for Tongues, Keen Ears | Night Owl, Steel Nerves | Court Manners, Crowd Reader, Lamp-Lit Studies |
| C02 | Steady Hands, Iron Stomach | Lettered, Green Thumb | Steel Nerves, Steady Hands | Lamp-Lit Studies, Parade-Ground Voice, Oxen Constitution |
| C03 | Haggler's Instinct, Pack Mule | Lettered, Crowd Reader | Silver Tongue, Haggler's Instinct | Court Manners, Fast Talker, Tongue for Tongues |
| C04 | Night Owl, Snap Reaction | Keen Ears, Cudgel Work | Watchful, Crowd Reader | Parade-Ground Voice, Steel Nerves, Alert Sleeper |
| C05 | Court Manners, Lettered | Silver Tongue, Tongue for Tongues | Crowd Reader, Fast Talker | Parade-Ground Voice, Steel Nerves, Fencer's Footwork |
| C06 | Fast Talker, Light Fingers | Court Manners, Crowd Reader | Silver Tongue, Fencer's Footwork | Snap Reaction, Knife Thrower, Steel Nerves |
| C07 | Way with Beasts, Weather Eye | Keen Sighting, Hearty Eater | Road-Worn, Trail Sense | Tough Hide, Alert Sleeper, Parade-Ground Voice |
| C08 | Hearty Eater, Iron Stomach | Tough Hide, Green Thumb | Oxen Constitution, Weather Eye | Last Stand Grit, Haggler's Instinct, Tavern Brawler |
| C09 | Trail Sense, Road-Worn | Steady Aim, Weather Eye | Alert Sleeper, Ambusher | Keen Ears, Steady Aim, Tough Hide |
| C10 | Way with Beasts, Keen Sighting | Steady Aim, Watchful | Ambusher, Court Manners | Keen Ears, Steady Aim, Weather Eye |
| C11 | Oarsman's Back, Born Swimmer | River Reader, Haggler's Instinct | Cudgel Work, Weather Eye | Tough Hide, Parade-Ground Voice, Crowd Reader |
| C12 | Born Swimmer, River Reader | Iron Stomach, Oarsman's Back | Weather Eye, Steady Hands | Knife Thrower, Hearty Eater, Haggler's Instinct |
| C13 | Fast Talker, Crowd Reader | Light Fingers, Night Owl | Silver Tongue, Snap Reaction | Tavern Brawler, Steel Nerves, Knife Thrower |
| C14 | Lock Whisperer, Light Fingers | Night Owl, Keen Ears | Lock Whisperer, Watchful | Fast Talker, Snap Reaction, Ambusher |
| C15 | Shield Drill, Tough Hide | Blade Practice, Oxen Constitution | Parade-Ground Voice, Last Stand Grit | Veteran's Poise, Steel Nerves, Battle Instinct |
| C16 | Blade Practice, Tavern Brawler | Steady Aim, Fencer's Footwork | Battle Instinct, Watchful | Veteran's Poise, Last Stand Grit, Haggler's Instinct |

Покриття (перевірено при складанні): кожен з 43 `general` є хоча б в одному рівні; кожна з 10 характеристик прокачується; O1–O7 — лише у фіксованих талантах видів.

**Навички** обирає виконавець у межах пулу класу й «Рішення 1» (T1 — рівно 5, T2–T4 — 3–4, без повторів у рівні; навички попередніх рівнів не повторювати без потреби). Пули:

| Клас | Пул |
|---|---|
| Academic | research, heal, evaluate, perception, cool, intuition, gossip, lore:\<x\>, language:\<x\>, trade:\<x\> |
| Burgher | haggle, evaluate, gossip, charm, perception, drink, cool, intuition, lore:local, trade:\<x\>, melee:basic |
| Courtier | charm, gossip, leadership, intuition, perception, entertain, ride, language:\<x\>, lore:\<x\>, performance:\<x\>, art:\<x\>, melee:fencing |
| Peasant | animal-care, endurance, survival, athletics, climb, drive, haggle, melee:basic, lore:local, trade:\<x\> |
| Ranger | survival, track, perception, stealth, navigation, climb, animal-care, endurance, ranged:bow, ranged:sling |
| Riverfolk | row, swim, athletics, navigation, perception, haggle, endurance, melee:basic, ranged:throwing, lore:rivers, trade:\<x\> |
| Rogue | sleight-of-hand, lockpicking, stealth, gamble, gossip, perception, charm, dodge, traps, intuition, melee:brawling |
| Warrior | melee:basic, melee:parry, melee:two-handed, ranged:crossbow, dodge, endurance, intimidate, athletics, cool, leadership |

`<x>` — оригінальна нейтральна спеціалізація за `SPEC_RE` (`lore:herbs`, `trade:candles`, `performance:mime`), без власних назв місць/богів.

### Види: `races.json` і таблиці

`races.json`: `{ "name", "passiveAbility": { "name", "description" } }`, назви `passiveAbility`: Lowlander — **Many Roads**, Delver — **Stoneborn**, Hearthkin — **Hearth and Home**, Veyl — **Old Blood** (опис 1–2 речення: характер і звичаї виду, без механіки).

`race-profiles.json`: `[{ "race", "profile" }]`, у `profile` усі 8 ключів явно (`mods`, `move`, `fate`, `extraWounds`, `talents`, `randomTalentCount`, `randomTalents`, `careerTable`), числа з таблиці «Види». `max` — включна верхня межа d100:

- **Lowlander** `careerTable`: Archivist 6, Bonesetter 12, Chandler 19, Lamplighter 25, Herald 31, Masquer 37, Shepherd 44, Charcoal Burner 50, Pathfinder 56, Falconer 62, Ferry Keeper 69, Eel Fisher 75, Dicer 81, Lockbreaker 87, Shieldbearer 94, Sellsword 100. `randomTalents`: Snap Reaction 10, Tough Hide 20, Keen Sighting 30, Hearty Eater 40, Silver Tongue 50, Lettered 60, Road-Worn 70, Weather Eye 80, Night Owl 90, Steel Nerves 100.
- **Delver** `careerTable`: Archivist 8, Bonesetter 16, Chandler 26, Lamplighter 32, Herald 38, Charcoal Burner 48, Pathfinder 56, Ferry Keeper 62, Lockbreaker 72, Shieldbearer 88, Sellsword 100. `randomTalents`: Oxen Constitution 25, Steady Hands 50, Iron Stomach 75, Steel Nerves 100.
- **Hearthkin** `careerTable`: Bonesetter 6, Chandler 18, Lamplighter 26, Masquer 34, Shepherd 46, Charcoal Burner 52, Falconer 58, Ferry Keeper 64, Eel Fisher 74, Dicer 86, Lockbreaker 94, Sellsword 100. `randomTalents`: Iron Stomach 20, Light Fingers 40, Green Thumb 60, Haggler's Instinct 80, Keen Ears 100.
- **Veyl** `careerTable`: Archivist 10, Herald 22, Masquer 32, Pathfinder 46, Falconer 62, Eel Fisher 70, Lockbreaker 78, Shieldbearer 86, Sellsword 100. `randomTalents`: Keen Sighting 25, Lamp-Lit Studies 50, Snap Reaction 75, Court Manners 100.

`manifest.json`: `"credits": "Original content."`, `counts`: races 4, careers 16, feats 50, units 0, spells 0, artifacts 0, raceProfiles 4.

## Структура файлів

- Змінюються: `scripts/grim/validate-data.ts`, `scripts/grim/load-template.ts` (вивід попереджень покриття), фікстури `scripts/grim/__tests__/fixtures/{careers,race-profiles}.json`, `scripts/grim/__tests__/validate-data.test.ts`, `data/templates/grim-d100/manifest.json`, `docs/architecture/rule-systems.md`, `docs/STATUS.md`.
- Створюються: `scripts/grim/forbidden-terms.ts`, `scripts/grim/coverage.ts`, `scripts/grim/__tests__/{coverage,real-data}.test.ts`, `scripts/grim/__tests__/real-data.integration.test.ts`, `data/templates/grim-d100/{feats,careers,races,race-profiles,rules}.json`.

Порядок залежностей даних = `GRIM_ROW_KINDS`: feats (Task 2) → careers (Tasks 3–4) → races + profiles + rules (Task 5). На кожному проміжному коміті каталог неповний, але всі наявні посилання резолвляться, тож `validateGrimData(real)` = ok; повноту (`grimCoverage(real) = []`) вимагає лише Task 5.

---

### Task 1: Валідатор, заборонені терміни, покриття, тест реального каталогу

**Files:**
- Create: `scripts/grim/forbidden-terms.ts`, `scripts/grim/coverage.ts`, `scripts/grim/__tests__/coverage.test.ts`, `scripts/grim/__tests__/real-data.test.ts`
- Modify: `scripts/grim/validate-data.ts`, `scripts/grim/load-template.ts`, `scripts/grim/__tests__/validate-data.test.ts`, `scripts/grim/__tests__/fixtures/{careers,race-profiles}.json`

**Interfaces:**
- Consumes: `GrimData`, `readGrimData`, `GRIM_DATA_DIR` (`scripts/grim/data.ts`); `skillDef`, `MELEE_SPECS`/`RANGED_SPECS` (`@/lib/utils/rules/systems/wfrp/skills/catalog`), `SPEC_RE`, `CHARACTERISTIC_KEYS` (`@/lib/utils/rules/systems`); `parseStatus` (`@/lib/utils/rules/systems/wfrp/downtime/status`); `mergeRules`, `WFRP_RULES`; `coerceRecord`, `IMPORT_SPECS`, `nameKey`; `careerTierKey`, `CAREER_TIER_COUNT` (`@/lib/constants/import-aliases`).
- Produces:
  - `export const FORBIDDEN_TERMS: readonly string[]` і `export function findForbiddenTerms(text: string): string[]` (`forbidden-terms.ts`) — регістронезалежно, межа слова з обох боків (`\b…\b`, пробіли в багатослівних термінах як `\s+`), повертає знайдені терміни в написанні зі списку.
  - `export function careerSkillIssue(value: string): string | null` (`validate-data.ts`) — `null` для коректного ключа, інакше текст причини (`unknown skill`, `needs a specialisation`, `takes no specialisation`, `unknown specialisation`).
  - `export function grimCoverage(data: GrimData): string[]` (`coverage.ts`) — попередження; `validateGrimData` лишається з типом `GrimValidation` без змін.

Нові помилки `validateGrimData` (формат повідомлення як наявні: `` `${label(kind, index, name)}: …` ``):
1. Навичка кар'єри: для кожного `tier{n}_skills` — `careerSkillIssue`; повідомлення `careers #1 "X": tier1_skills "melee" needs a specialisation`.
2. Статус рівня: якщо `tier{n}_status` задано, `/^(brass|silver|gold)\s+[1-9]$/i`; інакше `tier{n}_status "…" is not "<Brass|Silver|Gold> <1-9>"`.
3. Профіль: відсутній будь-який з 8 ключів `SpeciesProfile` у сирому `profile` → `race-profiles #1 "X": profile missing "talents"` (див. Review Focus 1).
4. Заборонені терміни: усі рядкові листки (значення, не ключі) кожного рядка всіх `GRIM_ROW_KINDS` і `raceProfiles[].race` → `feats #1 "X": forbidden term "Sigmar"`.

Попередження `grimCoverage` (у `load-template.ts` після валідації: `for (const w of grimCoverage(data)) console.warn(w)`):
1. `careers "X": not in any species careerTable` (лише якщо є хоча б один профіль);
2. `feats "X": unused` — не в жодному `tier*_talents`, `profile.talents`, `profile.randomTalents`;
3. `characteristic "k": no career advances it` (лише якщо є хоча б одна кар'єра);
4. `careers "X": tier 1 lists N items, ticksRequired[0] is M` — N = характеристики + навички + таланти T1, M з `mergeRules(WFRP_RULES, data.rules)`;
5. `careers "X": tier statuses do not rise` — коли всі 4 статуси задані, ранг `brass 0 / silver 1 / gold 2 × 100 + level` строго зростає;
6. `race-profiles "X": randomTalentCount N exceeds M distinct table talents` — M = різні `featId` таблиці поза фіксованими `talents`.

`FORBIDDEN_TERMS` (мінімум; виконавець може доповнити очевидними власними назвами WFRP): Warhammer, Games Workshop, Old World, Empire, Imperial, Reikland, Altdorf, Middenheim, Nuln, Talabheim, Marienburg, Kislev, Bretonnia, Ostland, Averland, Stirland, Wissenland, Middenland, Nordland, Hochland, Talabecland, Ostermark, Sylvania, Athel Loren, Ulthuan, Karak, Sigmar, Sigmarite, Ulric, Ulrican, Taal, Rhya, Manann, Morr, Myrmidia, Shallya, Ranald, Verena, Khaine, Grungni, Valaya, Asuryan, Morrslieb, Mannslieb, Chaos, Nurgle, Khorne, Slaanesh, Tzeentch, Daemon, Skaven, Warpstone, Ratcatcher, Rat Catcher, Witch Hunter, Road Warden, Roadwarden, Riverwarden, Bawd, Pit Fighter, Troll Slayer, Giant Slayer, Huffer, Mudlark.

- [ ] **Step 1: Оновити фікстури під нові правила.** `fixtures/careers.json`: перейменувати `Ratcatcher` → `Vermin Hunter` (і назву T2 `Ratcatcher` → `Vermin Catcher`), навички `"melee"` → `"melee:basic"`, `"lore"` → `"lore:local"`; `fixtures/race-profiles.json`: `careerId` `"Ratcatcher"` → `"Vermin Hunter"`. У `validate-data.test.ts` замінити очікування `careers #1 "Ratcatcher"` на `"Vermin Hunter"`. Фікстура має лишитися без попереджень, крім покриття (вона мала).
- [ ] **Step 2: Написати падаючі тести** у `validate-data.test.ts` (кожен мутує `load()`):
  - `"melee"` у `tier1_skills` → issue містить `needs a specialisation`; `"perception:x"` → `takes no specialisation`; `"melee:spear"` → `unknown specialisation`; `"sailing"` → `unknown skill`; `"lore:herbs"` і `"ranged:bow"` — без issue.
  - `tier1_status: "Copper 2"` → issue зі `tier1_status`.
  - `delete profile.talents` → `profile missing "talents"`; те саме для `careerTable`.
  - `careerTable` `[{max:60,…},{max:40,…},{max:100,…}]` → issue з `creation.tableAscending` (пінить наявну схему).
  - заборонені терміни: `feats[0].description = "Blessed by SIGMAR."` → `forbidden term "Sigmar"`; `races[0].passiveAbility.description = "From the old world"` → `"Old World"`; `careers[0].tier3_trappings = ["Warpstone shard"]` → `"Warpstone"`; `feats[0].description = "Tomorrow, chaotic"` → без issue (межа слова: `Morr`/`Chaos` не збігаються).
  - механічний талант з битим `abilities` (`[{ name: "x", trigger: { event: "passive" }, effects: [] }]`) → issue `feats #1 "Hardy": abilities…` (пінить наявну перевірку `AbilitySchema`).
  - `coverage.test.ts`: на фікстурі `grimCoverage` дорівнює рівно `['characteristic "i": no career advances it', 'characteristic "dex": no career advances it', 'careers "Vermin Hunter": tier 1 lists 4 items, ticksRequired[0] is 10', 'careers "Watchman": tier 1 lists 3 items, ticksRequired[0] is 10']` (порядок — як генерує реалізація; порівнювати через `toEqual(expect.arrayContaining(…))` + довжину 4). Окремі мутації: новий feat `Spare` → `feats "Spare": unused`; третя кар'єра поза `careerTable` → `not in any species careerTable`; статуси `Silver 1 / Brass 2 / Gold 1 / Gold 2` → `do not rise`; `randomTalentCount: 3` при одному варіанті → `exceeds`.
  - `real-data.test.ts`: `validateGrimData(readGrimData())` дорівнює `{ ok: true }` (зараз каталог порожній, лише `manifest.json`).
- [ ] **Step 3:** `pnpm test:run scripts/grim/__tests__/validate-data.test.ts scripts/grim/__tests__/coverage.test.ts` — FAIL (нових перевірок і модулів немає).
- [ ] **Step 4: Реалізувати** `forbidden-terms.ts`, `careerSkillIssue` + 4 нові перевірки в `validate-data.ts` (окремі функції `validateCareerTiers`, `validateProfileKeys`, `validateTerms`, кожна додає в `issues`; рядкові листки — рекурсивний обхід, аналог наявного `nestedNames`), `coverage.ts`, виклик у `load-template.ts`. `careerSkillIssue`:

```ts
export function careerSkillIssue(value: string): string | null {
  const [key, spec] = value.split(":");
  const def = skillDef(key);
  if (!def) return "unknown skill";
  if (def.spec === "none") return spec === undefined ? null : "takes no specialisation";
  if (spec === undefined) return "needs a specialisation";
  if (def.spec === "fixed") return def.specs?.includes(spec) ? null : "unknown specialisation";
  return SPEC_RE.test(spec) ? null : "unknown specialisation";
}
```

- [ ] **Step 5:** `pnpm test:run scripts/grim/__tests__/validate-data.test.ts scripts/grim/__tests__/coverage.test.ts scripts/grim/__tests__/real-data.test.ts` — PASS; `pnpm test:related scripts/grim/validate-data.ts scripts/grim/load-template.ts` — PASS (інтеграційні файли без локальної БД скіпаються); `pnpm exec eslint --fix scripts/grim/*.ts scripts/grim/__tests__/*.ts`.
- [ ] **Step 6: Commit** `feat(wfrp): 5g-1 grim validator checks, forbidden terms and coverage report`.

### Task 2: Таланти (`feats.json`, 50)

**Files:** Create `data/templates/grim-d100/feats.json`.

**Interfaces:**
- Consumes: таблиця «Таланти (50)», коди ефектів «Рішення 2», шкала `xpCost`.
- Produces: 50 рядків `{ name, type, description, xpCost?, maxRank, abilities? }` з іменами **точно** як у таблиці (Tasks 3–5 посилаються на них дослівно).

- [ ] **Step 1:** Написати 50 рядків у порядку таблиці (M01–M20, D01–D23, O1–O7). Механічні — `abilities` за кодом (одна ability `id: "a1"`, `name` = назва таланту, `trigger: { event: "passive" }`, `effects` з коду; для `X+Y` два елементи). Описові й видові — без `abilities`. Видові: `type: "origin"`, без `xpCost`. Поля `prerequisite`/`repeatable`/`icon` не писати (передумови, якщо потрібні, — словами в `description`).
- [ ] **Step 2:** `pnpm test:run scripts/grim/__tests__/real-data.test.ts` — PASS (feats без посилань).
- [ ] **Step 3: Commit** `feat(wfrp): 5g-1 grim talents catalog`.

### Task 3: Кар'єри C01–C08 (Academic, Burgher, Courtier, Peasant)

**Files:** Create `data/templates/grim-d100/careers.json`.

**Interfaces:**
- Consumes: `feats.json` (Task 2), таблиці «Кар'єри (16)», «Кар'єри: таланти по рівнях», пули навичок, «Склад рівня кар'єри», «Рішення 1».
- Produces: 8 рядків кар'єр з `name` точно як у таблиці.

- [ ] **Step 1:** Написати C01–C08: `name`, `class`, для кожного рівня `tier{n}_name`, `tier{n}_status`, `tier{n}_characteristics` (з таблиці), `tier{n}_skills` (з пулу класу, T1 = 5, T2–T4 = 3–4), `tier{n}_talents` (з таблиці), `tier{n}_trappings` (T1 3–4, далі 2–3, оригінальні короткі англійські рядки).
- [ ] **Step 2:** `pnpm test:run scripts/grim/__tests__/real-data.test.ts` — PASS (посилання на таланти резолвляться; навички проходять `careerSkillIssue`; терміни чисті).
- [ ] **Step 3: Commit** `feat(wfrp): 5g-1 grim careers (academic, burgher, courtier, peasant)`.

### Task 4: Кар'єри C09–C16 (Ranger, Riverfolk, Rogue, Warrior)

**Files:** Modify `data/templates/grim-d100/careers.json` (дописати в кінець масиву).

**Interfaces:** ті самі, що Task 3; Produces: усі 16 кар'єр.

- [ ] **Step 1:** Дописати C09–C16 за тими самими правилами.
- [ ] **Step 2:** `pnpm test:run scripts/grim/__tests__/real-data.test.ts` — PASS.
- [ ] **Step 3: Commit** `feat(wfrp): 5g-1 grim careers (ranger, riverfolk, rogue, warrior)`.

### Task 5: Види, профілі, rules, manifest і повнота каталогу

**Files:**
- Create: `data/templates/grim-d100/{races,race-profiles,rules}.json`
- Modify: `data/templates/grim-d100/manifest.json`, `scripts/grim/__tests__/real-data.test.ts`

**Interfaces:**
- Consumes: `feats.json`, `careers.json`; таблиці «Види», «Види: races.json і таблиці», `rules.json` з «Рішення 3»; `grimCoverage`, `readGrimManifest`.
- Produces: повний каталог; тест повноти.

- [ ] **Step 1: Падаючі тести** в `real-data.test.ts`:
  - `grimCoverage(data)` дорівнює `[]`;
  - `readGrimManifest().counts` дорівнює `{ races: 4, careers: 16, feats: 50, units: 0, spells: 0, artifacts: 0, raceProfiles: 4 }` і збігається з довжинами `data`;
  - кожна ability кожного feat: `trigger.event === "passive"`, кожен effect — `kind: "modifyStat"` зі `stat` ∈ `["attackBonus", "maxHp", "initiative"]` (Review Focus 3); механічних рівно 20, `origin` рівно 7 і без `xpCost`;
  - об'єднання `careerTable` усіх видів = усі 16 кар'єр; Lowlander містить усі 16.
- [ ] **Step 2:** `pnpm test:run scripts/grim/__tests__/real-data.test.ts` — FAIL (видів і профілів ще немає).
- [ ] **Step 3:** Написати `races.json`, `race-profiles.json` (усі 8 ключів явно; `mods` лише ненульові ключі; імена дослівно з таблиць), `rules.json` (дослівно з «Рішення 3»), оновити `manifest.json`.
- [ ] **Step 4:** `pnpm test:run scripts/grim/__tests__/real-data.test.ts` — PASS.
- [ ] **Step 5: Commit** `feat(wfrp): 5g-1 grim species, profiles and rules`.

### Task 6: End-to-end: майстер створення і завантаження в локальну БД

**Files:**
- Modify: `scripts/grim/__tests__/real-data.test.ts`
- Create: `scripts/grim/__tests__/real-data.integration.test.ts`

**Interfaces:**
- Consumes: `rollCreation`, `planDraft` (`@/lib/utils/rules/systems/wfrp/creation/roll`, `…/creation/plan`), `mulberry32` (`@/lib/utils/common/rng`), `mergeRules`, `WFRP_RULES`; `loadGrimTemplate` (`scripts/grim/load-template.ts`), `createCampaignForUser`, `listRaceProfiles`, `isLocalDevDatabaseEnv`, `singleConnectionDatabaseUrl` — як у `load-template.integration.test.ts`.
- Produces: нічого для інших задач.

- [ ] **Step 1: Юніт-e2e** у `real-data.test.ts` (`describe("creation e2e")`): `rules = mergeRules(WFRP_RULES, data.rules).rules.advancement`; `careerIds = new Set(data.careers.map(c => c.name))`, `featIds = new Set(data.feats.map(f => f.name))` — **точні** імена (Review Focus 2); для кожного профілю `profile` як є (імена замість id). Для кожного виду × кожна кар'єра з його `careerTable`, seed = `1000 * speciesIndex + rowIndex` (детерміновано, без `Math.random`):
  - `rolls = rollCreation(mulberry32(seed), profile)`; `planDraft({ career: { mode: "choice", careerId }, stats: { mode: "rolled", rolls: rolls.statRolls }, talents: rolls.randomTalents }, ctx)` → `ok: true`, `experience === rules.creation.careerBonus.choice + rules.creation.statBonus.rolled`, `characteristics.base[k] === 20 + (mods[k] ?? 0) + statRolls[i]`, `characteristics.career.careerId === careerId`, таланти включають усі фіксовані;
  - для кожного виду один прогін `mode: "rolled"` з `rolls.careerRolls[0].careerId` і один `stats: { mode: "free", points: Array(10).fill(rules.creation.freeBudget / 10) }` → `ok: true`.
- [ ] **Step 2:** `pnpm test:run scripts/grim/__tests__/real-data.test.ts` — PASS (якщо FAIL — виправляти дані, не тест).
- [ ] **Step 3: Інтеграційний тест** `real-data.integration.test.ts`: скопіювати прелюдію `load-template.integration.test.ts` (PrismaClient на `singleConnectionDatabaseUrl`, `vi.mock("@/lib/db")`, `vi.mock("@/lib/cache/tags")`, `describe.skipIf(!isLocalDevDatabaseEnv())`, `beforeAll` з перевіркою «шаблону Grim d100 ще немає» і створенням користувача, `afterAll` з тим самим прибиранням), але `loadGrimTemplate({ owner: userId, allowRemote: false })` без `dir` (дефолтний `GRIM_DATA_DIR`). Кейси: (а) `created: true`, `counts` ⊇ `{ feats: 50, careers: 16, races: 4, raceProfiles: 4 }`; (б) клон через `createCampaignForUser` → `invalidateCampaignLayer()` → `listRaceProfiles` має 4 профілі, у кожного довжина `careerTable` як у даних і всі `careerId` — id (довжина > 10), не імена; (в) другий запуск → `created: false`, `contentVersion` той самий, кількість рядків `feat`/`career`/`race` у шаблоні та сама.
- [ ] **Step 4: Прогін на локальній БД `wfrp`.** Потрібен docker-контейнер Postgres на порту 54322 (`docker ps | grep 54322`; БД `wfrp` з міграціями 5g-0: `DATABASE_URL=<wfrp> pnpm exec prisma migrate status`). URL — облікові дані з `.env.local` (там `…@localhost:54322/prodcopy`), ім'я БД замінити на `wfrp`; явні змінні мають пріоритет над `dotenv`. Перевірити, що шаблону ще немає: `select count(*) from campaigns where kind='template' and name='Grim d100'` = 0 (інакше тести відмовляться стартувати — спитати користувача, не видаляти самостійно). Запуск:

```bash
DATABASE_URL=postgresql://<user>:<pw>@localhost:54322/wfrp DIRECT_URL=postgresql://<user>:<pw>@localhost:54322/wfrp \
  pnpm exec vitest run --config vitest.integration.config.mts scripts/grim/__tests__/real-data.integration.test.ts scripts/grim/__tests__/load-template.integration.test.ts
```

  Expected: обидва файли PASS (файли йдуть послідовно, кожен прибирає свій шаблон).
- [ ] **Step 5: CLI-смоук (після тестів).** Те саме оточення: `pnpm constructor:grim-template` (якщо немає власника за замовчуванням — `--owner <id будь-якого користувача wfrp>`), потім удруге. Expected: перший — `(створено)`, без попереджень покриття, `+N ~0 -0`; другий — `+0 ~0 -0`. Шаблон лишається на `wfrp` для ручних перевірок 5g-4 — записати це в STATUS (Task 7); наступний прогін grim-інтеграційних тестів вимагатиме його прибрати.
- [ ] **Step 6:** `pnpm exec eslint --fix scripts/grim/__tests__/real-data.test.ts scripts/grim/__tests__/real-data.integration.test.ts`; **Commit** `test(wfrp): 5g-1 grim creation e2e and template load integration`.

### Task 7: Документація і фінальні вузькі перевірки

**Files:** Modify `docs/architecture/rule-systems.md`, `docs/STATUS.md`.

- [ ] **Step 1:** `rule-systems.md` — новий розділ «Межі 5g-1» після «Межі 5g-0» (українською, 5–8 пунктів): склад каталогу (4 види, 16 кар'єр, 50 талантів, 20 механічних); формат навичок кар'єри (Рішення 1); механічні таланти лише `attackBonus`/`maxHp`/`initiative`, решта ефектів для героя wfrp інертні; `rules.json` = лише `ticksRequired` 8/10/12 і чому; нові перевірки валідатора та `grimCoverage` (попередження, у реальному каталозі — порожньо); заборонені терміни як захід, а не гарантія; відхилення від spec (40 % механічних). У «Звірити з книгою» нічого не змінювати (дефолти коду лишаються для інших шаблонів).
- [ ] **Step 2:** `docs/STATUS.md` — у рядку WFRP після речення про 5g-0 додати «**5g-1 (ядро персонажа Grim d100) реалізовано на `feat/wfrp`, не змерджено:** …» з посиланням на spec/план і «Межі 5g-1», нотаткою, що шаблон завантажено на локальну `wfrp`, і «Далі 5g-2 (бестіарій)».
- [ ] **Step 3:** Фінальні вузькі тести: `pnpm test:run scripts/grim` і `pnpm test:related scripts/grim/validate-data.ts scripts/grim/coverage.ts scripts/grim/load-template.ts` — PASS; `git status` чистий після коміту.
- [ ] **Step 4: Commit** `docs(wfrp): 5g-1 boundaries and status`.

Після Task 7 — фінальне Opus-рев'ю гілки (diff від `f9a89124e`): Review Focus 1–5, ручне читання всіх `description`/`trappings`/назв на GW-терміни й запозичені тексти, збіг даних з таблицями плану.

## Self-review

- **Покриття spec:** §1 файли — Tasks 2–5; §2 види — Task 5 (+ `origin` у Task 2); §3 кар'єри — Tasks 3–4, «кожна характеристика/талант використані» — `grimCoverage` + Task 5; §4 таланти — Task 2, шкала й мапінг — «Рішення 2–3»; §5 `rules.json` — «Рішення 3», Task 5 (сходинки цін свідомо дефолтні, обґрунтовано); §6 валідатор — Task 1 (d100-межі вже в `SpeciesProfileSchema`, запінено тестом; «невикористане» — попередження, як дозволяє spec); §7 e2e — Task 6; docs — Task 7.
- **Відхилення від spec:** 20/50 механічних замість ~половини; `rules.advancement` змінює лише `ticksRequired` (характеристики/навички/створення — дефолти, бо вже узгоджені з каталогом); рівень 1 має фіксований склад 3/5/2 (вужче за 2–3/3–5/2–3) заради досяжності тіків.
- **Узгодженість імен:** `careerSkillIssue`, `findForbiddenTerms`, `FORBIDDEN_TERMS`, `grimCoverage` визначені в Task 1 і використовуються лише так; імена контенту — лише з таблиць «Ростер».
- **Плейсхолдери:** `<x>` у пулах навичок — свідомий вибір виконавця в межах `SPEC_RE`; `<user>:<pw>` — з `.env.local`.
