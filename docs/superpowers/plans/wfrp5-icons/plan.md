# Grim d100 (5e): іконки контент-хвилі — субʼєкти, інвентар, пробна пачка, пачки (крок 3)

Джерела: маніфести `docs/superpowers/plans/wfrp5-content-manifest/` (README + 7 файлів; `gear.md` — старіша версія `equipment.md`, не використовується), `2026-11-20-wfrp5-icons-prompts.md`, `scripts/assets/grim-icons/{prompts,cli,inventory}.ts`, `scripts/assets/icon-prompts/compose.ts`, `~/Downloads/fantasy-tokens/generate_grim.py` (лише читання). Файли в `scripts/assets` і `data/` не змінювались.

## 1. Інвентар

`inventory.ts` на поточних даних: 186 рядків шаблону, 186 іконок, 0 missing, 0 orphans (шаблон ще без контент-хвилі). Після імпорту маніфестів бракуватиме рівно стільки, скільки субʼєктів написано (рядки маніфесту без `yes:`):

| Категорія (kind) | Рядків у маніфесті | Вже в шаблоні (`yes`) | Нових іконок | Файл субʼєктів |
|---|---|---|---|---|
| feats (таланти) | 166 | 32 | 134 | `subjects-feats.json` (ключі `feats:<name>`) |
| careers | 64 | 10 | 54 | `subjects-careers.json` (`careers:<name>`) |
| races | 5 | 4 | 1 (Thornkin) | `subjects-races.json` (`races:<name>`) |
| spells (петті, арканні, hedge, witchcraft, dark, благословення, чудеса) | 225 | 3 | 222 | `subjects-spells.json` (`{palette, subject}`) |
| artifacts (equipment) | 275 | 29 | 246 | `subjects-artifacts.json` |
| units (+ шаблони істот) | 49 + 7 | 6 | 43 + 7 = 50 | `subjects-units.json` |
| **Разом** | | | **707** | |

Skills не мають іконок (немає такого kind у `WFRP_ROW_KINDS`); у цей список не входять.

Примітки до складу списку:
- 12 рядків artifacts — послуги без предмета (Travel prices 6: Coach Seat Inside/Outside, Barge Cabin/Deck, Cab Ride, Ferry Crossing; Hirelings 6). Субʼєкти для них намальовані як предмет (місце в кареті, пліт, сумка лікаря тощо). Якщо власник викине послуги з шаблону, просто видалити ці 12 ключів, тоді artifacts = 234, разом 695. Ще ~7 рядків — не предмети (Unarmed Strike, Improvised Weapon, Thrown Rock, Tattoo Session, Workshop, Single Drink, нічліг) — теж мають предметний субʼєкт.
- Шаблони істот (Veteran Leader, Warlord Commander, Drilled Soldier, Field Skirmisher, Shock Veteran, Hedge Caster, Master Caster) — по 1 токену з силуетом-бейджем без тексту у вигляді сяйва біля плеча (за таблицею стилів у `...-icons-prompts.md`).
- Ключі, що містять специфікацію в дужках (`Keen Sense (Sense)`, `Lore Casting (Lore)`, `Patron's Boon (Patron)`, `Unafraid (Foe)` тощо; 10 feats) лишені дослівно як у маніфесті; `grimSlug` дає `keen-sense-sense`. Якщо шаблон назве рядок без дужок, ключі треба перейменувати перед копіюванням у `scripts/assets/icon-subjects` (3 рядки sed).
- Імена `Crag Charger` і `Barrow Reaper` у bestiary.md мали хвіст `; is …)` через розбір таблиці; ключі — чисті імена.

## 2. Формат і перевірка субʼєктів

Формат ідентичний існуючим файлам: units/artifacts — `{ "Name": "subject" }`; spells — `{ "Name": { "palette": "...", "subject": "..." } }`; identity (feats/careers/races) — `{ "<kind>:<Name>": "subject" }`. Для ingest потрібно лише злити ключі: `grim-identity.json` ← feats+careers+races, решта 1:1 з `grim-{units,spells,artifacts}.json` (цей крок не виконано, за завданням).

Палітри spells (поле `palette`, вільний текст, як дозволяє `composeSpell`): Cantrips = neutral gold; Common Arcana = neutral gold with violet arcane accents; Embers = fire; Gloam = desaturated shadow grey and necrotic violet; Dusk = bone-white and violet; Radiance = radiant; Alloy = grey-bronze steel; Verdance = nature; Firmament = deep blue and silver; Wilds = ochre and brown amber; Fenlore = murky marsh green; Thornwitchery = dark green and bruise purple; Pact Rites = crimson and black; Grave Rites = necrotic; благословення (19) = radiant; чудеса — teal / pale silver necrotic / steel grey and gold / neutral gold / nature / soft white radiant / radiant gold and ember / forest green / ice blue / neutral gold (за списком palette families у `spells.md`).

Колір кар'єр. `prompts.ts` для будь-якого identity-kind ставить `IDENTITY_COLOURS = 'neutral gold'` (немає мапи клас→колір), тому per-class colour key вписано в сам субʼєкт (останній фрагмент речення): Academic indigo-blue, Burgher amber and brown, Courtier royal purple and gold, Peasant olive green, Ranger forest green, Riverfolk teal, Rogue charcoal and dull crimson, Warrior steel grey and blood red. Пропозиція для коду (після цього кроку, не зараз): у `prompts.ts` замінити константу на мапу `careerClass → colours` (клас береться з рядка кар'єри) і для origin-талантів — колір виду; тоді фрагмент із субʼєктів можна прибрати. Equipment-варіанти розрізнені формою (клинок, гарда, руків'я, кількість стовбурів), не кольором.

Валідація (сценарій у scratchpad, не в репо: `.../scratchpad/validate.ts`, запуск `pnpm exec tsx --tsconfig tsconfig.scripts.json <шлях>`): для всіх 707 субʼєктів зібрано реальні промпти через `composeSkill/Spell/Item/Creature`, перевірено `assertCleanPrompt`, `assertUniqueFiles`, `findForbiddenTerms` (ім'я + субʼєкт), довжину 10–25 слів, ризикові слова (text, letter, word, rune, sign, inscription, caption, readable, scroll of, number) і колізії `kind/slug.png` з наявними рядками шаблону. Результат: ALL CLEAN. Під час роботи спрацювало і виправлено: слова-ризики (3 субʼєкти), заборонені терміни (3 входження), 2 субʼєкти за довжиною.

## 3. Конфлікт ICON_NEGATIVE

Факти з коду:
- `generate.py`: `ICON_NEGATIVE = ', face, head, nose, eyes, portrait, bust portrait, person, character, human figure'`, `UNIT_NEGATIVE = ', multiple subjects, cropped head, blurry face'`; негатив = `NEGATIVE + (UNIT_NEGATIVE якщо record_type == 'unit' інакше ICON_NEGATIVE)`.
- `generate_grim.py` уже робить `generate.ICON_NEGATIVE = ''` для всіх не-unit типів (і додає `words, numbers, runes, captions, signs` до NEGATIVE). Тобто конфлікт «кар'єри/раси малюють людину» формально вже знятий глобально, п.4 доку `...-icons-prompts.md` цим фактично виконано.
- Побічний ефект: з негативу зникли й корисні заборони для spells/artifacts/feats (`person, human figure, character`, `portrait`); для предметів це підвищує ризик, що з'являться руки/фігури/обличчя, хоча композиція item каже «no hands».

Оцінка по новому списку (грубий пошук слів у субʼєктах): людину/обличчя/голову прямо містять 29 з 50 units (їм підходить `UNIT_NEGATIVE`), 20 з 134 feats (очі, вухо, ніс, губи, голова в метафорі), 33 з 222 spells (eye/face у Gloom Sight, Omen Glance тощо), 24 з 246 artifacts (здебільшого «head» = головка сокири/списа, «hand» = hand axe/crossbow), 1 з 54 careers у крупному плані (кар'єри — людина за ремеслом далеко від глядача). Тому повертати глобальний ICON_NEGATIVE не можна (зламає feats «око», spells «погляд», зброю «head»).

Пропозиція (описово, без правок): замінити глобальний `''` на негатив за kind (`generation_group` у рядку CSV уже містить kind):
- careers, races: `', text, letters, close-up face, extreme close-up, portrait crop'` — людина дозволена, велике обличчя заборонене; тип запису лишається `skill` (квадрат, без кола), `UNIT_NEGATIVE` НЕ застосовувати (її `multiple subjects` бореться з фоном-сценою).
- feats: `', full human portrait, standing person, character'` — метафори з рукою/оком/твариною дозволені.
- spells: `', person, character, portrait'` — ефект замість героя; «eye/face» як мотив лишаються можливими (негатив без слів face/eyes).
- artifacts (gear, зброя, броня): `', person, human figure, face, hands, fingers, holding'` без слів `head, nose, eyes` (щоб не гальмувати «axe head»), плюс додатки з п.4.
- units: без змін (`UNIT_NEGATIVE`).
Реалізація в `generate_grim.py`: перед `generate.generate_one` для кожного рядка підставляти `generate.ICON_NEGATIVE = ICON_NEGATIVE_BY_KIND[row['generation_group']]` (бо `payload` читає модульну змінну; seed детермінований за рядком, тож нова негативка змінить fingerprint лише для нових рядків — старі 186 пропускаються за `final.exists()`).
Альтернатива «окремий record_type»: у `TYPES` додати `person-skill` з порожнім ICON_NEGATIVE; складніше, бо `build_prompt` залежить від типу, тому per-kind негатив надійніший.

## 4. Додатки до `generate.NEGATIVE` (gear і careers)

До вже доданих `words, numbers, runes, captions, signs` додати (для artifacts, careers, feats): `book, scroll text, banner, tavern sign, coin inscription, engraved lettering, stamped marks, shop sign, label, price tag, poster, handwriting, calligraphy`. Для artifacts додатково: `multiple items, hand holding, table setting, duplicate object, cropped item, wooden frame`. Для careers: `crowd, text on clothing, heraldry, coat of arms, face close-up`. Для spells: `rune circle with writing, glyphs, sigil text` (круги без письма лишаються дозволеними). Обґрунтування: книги (9 рядків «Books and documents»), карти, ліцензія, листівка, пергамент, плакат, вивіска, монети — головні джерела випадкового тексту.

## 5. Пробна пачка: 3 кар'єри

Перед усіма 54 перевіряємо тип запису/негатив на кар'єрах, що відрізняються класами/палітрами й проблемами:

1. **Gatekeeper** (Warrior, steel grey and blood red) — броня і алебарда: перевіряє читабельність силуету, відсутність крупного обличчя, червоний акцент на сталі.
2. **Channel Pilot** (Riverfolk, teal) — людина на тлі води і маленький ліхтар: перевіряє сцену з далекою постаттю, бірюзову палітру проти вже зроблених Ferry Keeper/Eel Fisher (узгодженість класу).
3. **Hex Caster** (Rogue, charcoal and dull crimson) — найтемніша палітра і дрібні деталі (лялька, гілки): ризик «мило» на 64 px і зайвого тексту/символів.

Команди (з `~/Downloads/fantasy-tokens`, після того як субʼєкти скопійовані в `scripts/assets/icon-subjects` і `build_grim_manifest.py` перебудував `input/grim.csv`; вибрані рядки взяти з grim.csv у `input/grim-trial.csv` — той самий заголовок, 3 рядки):
```
python3 generate_grim.py --csv input/grim-trial.csv --output output-grim-trial --validate-only
python3 generate_grim.py --csv input/grim-trial.csv --output output-grim-trial --limit 3
# варіант B з негативом за kind (п.3): повторити в output-grim-trial-b після правки ICON_NEGATIVE_BY_KIND
python3 generate_grim.py --csv input/grim-trial.csv --output output-grim-trial-b --limit 3
```
Для порівняння A/B зберегти обидва результати і дивитись поруч з 3 наявними (`archivist`, `ferry-keeper`, `lockbreaker`).

Критерії прийняття (всі мають виконуватись):
- Файли 768x768; у кожному кадрі немає літер/цифр/рун/вивісок (огляд мініатюр + збільшення).
- Постать видна в повний зріст чи по пояс, обличчя не крупним планом, є один явний інструмент ремесла.
- Читається на 64 px (мініатюра 64x64 розпізнає ремесло).
- Колір класу очевидний і відрізняється від сусіднього класу; узгоджений зі стилем наявних 16 кар'єр (той самий степінь деталізації, темний димний фон).
- Немає зайвих осіб, дублювання предметів, рамки.
Якщо 2 з 3 не проходять: переглянути фрагмент кольору в субʼєкті і/або негатив п.3; перегенерація точково `--redo <Name>`. Якщо варіант B кращий за A у ≥2 з 3 — приймаємо ICON_NEGATIVE_BY_KIND для всього прогону.

## 6. План пачок (по 50)

707 іконок = 14 пачок по 50 + 1 пачка 7 (`--limit 50`, між пачками перегляд контактного листа, `--delay 0.5`, `--size 768`, `--steps 8`; для artifacts/feats, що виглядають шумними, 20–25 кроків лише в `--redo`). Порядок: найпростіші й найвпливовіші першими.

| Пачки | Категорія | К-сть | Нотатки |
|---|---|---|---|
| 0 | 3 пробні кар'єри (п.5) | 3 | ворота до решти |
| 1–2 | careers (залишок 51) + races (1) | 52 | узгодженість класових кольорів |
| 3–5 | feats | 134 | 3 пачки; origin-таланти малі за кількістю, колір виду через код (див. п.2) або вручну в субʼєкті |
| 6–10 | spells | 222 | 5 пачок: Cantrips+Common Arcana (47), Embers+Gloam+Dusk+Radiance (32, палітри), Alloy+Verdance+Firmament+Wilds+Fenlore+Thornwitchery (48), Pact/Grave + blessings (36), miracles (60) |
| 11–15 | artifacts | 246 | 5 пачок: melee, ranged+ammo+armour, containers+clothing+food, tools+books+animals, poisons+remedies+prosthetics+magic+misc+services; ПЕРЕВІРЯТИ різнiсть схожих предметів (мечі, сокири, шоломи) |
| 16 | units + 7 шаблонів | 50 | круглий токен, перевірка круглості; дуже великі істоти (Hill Colossus, Storm Gryphon) — лише голова |

Контроль пачки: всі 768x768, немає літер, круглість юнітів, відмінність варіантів зброї, колір класу кар'єр, палітра списків заклять. Після кожних ~3 пачок `pnpm assets:grim-icons upload` (або `pnpm template icons grim-d100 --dir <images> --dry-run` спершу), в кінці `inventory.ts` має показати 0 missing, 0 orphans. Перед першою пачкою: `build_grim_manifest.py` + `generate_grim.py --validate-only` має показати «186 already generated (kept), 707 new» (старі id незмінні).

## 7. 48 UI-іконок

Рішення власника: доставка = inline SVG-компоненти в `systems/wfrp/ui` (без PNG, без генерації), `lucide-react` (v0.562) там, де підходить, решту малюємо. Усі вказані lucide-імена є в `node_modules/lucide-react` (перевірено). Єдиний barrel-файл (напр. `systems/wfrp/ui/icons/`) з типами `WfrpConditionIcon` тощо, `currentColor`, viewBox 24, stroke 1.75 як у lucide; на 24–32 px.

| Група | Елементи | Іконка |
|---|---|---|
| conditions (12) | bleeding | `Droplet` |
| | fatigued | `BatteryLow` |
| | poisoned | `FlaskConical` (або `Biohazard`) |
| | stunned | `Sparkles` (або draw: зірки навколо голови) |
| | ablaze | `Flame` |
| | broken | `HeartCrack` |
| | entangled | draw (вузол/мотузка) |
| | prone | draw (фігура, що лежить) |
| | surprised | `TriangleAlert` |
| | blinded | `EyeOff` |
| | deafened | `EarOff` |
| | unconscious | `Moon` |
| sizes (7) | tiny, little, small, average, large, enormous, monstrous | draw (одна серія: силует людини для порівняння + коло зростаючого розміру, 7 масштабів) |
| psychology (2) | fear | `Ghost` |
| | terror | `Skull` |
| passions (3) | frenzy | `Flame` або draw (кулак із зубцями); якщо збігається з ablaze — draw |
| | hatred | `Angry` |
| | animosity | `Swords` |
| resources (8) | advantage | `ChevronsUp` |
| | momentum | `Wind` |
| | fate | `Star` |
| | fortune | `Clover` |
| | resilience | `Shield` |
| | resolve | `Anchor` |
| | corruption | `Biohazard` або draw (крапля з тріщиною) |
| | sin | draw (перевернутий символ-цятка; без релігійної символіки) |
| hitLocations (6) | head, left-arm, right-arm, body, left-leg, right-leg | draw (єдиний силует людини, одна зона підсвічена; 6 варіантів з одного SVG-базису через `className`/`fill`) |
| testOutcomes (5) | critical-success | `Sparkles` |
| | critical-failure | draw (зламана кістка/розбитий куб d10) |
| | fumble | `TriangleAlert` або `Hourglass` (спіткнення) |
| | wrath | `Zap` |
| | miscast | `CloudLightning` |
| hero (5) | status-brass / status-silver / status-gold | `Coins` (три тони через токени теми: brass, silver, gold) |
| | endeavour | `Hammer` |
| | career-tick | `CircleCheck` |

Підрахунок: 12 + 7 + 2 + 3 + 8 + 6 + 5 + 5 = 48; lucide-варіанти ~28, намалювати ~20 (sizes 7, hitLocations 6 з одного базису, entangled, prone, sin, critical-failure + варіанти stunned/frenzy/corruption). Перед реалізацією перевірити reuse: стани бою зараз текстові/`EffectMarker`; чи не існують уже відповідні lucide-іконки в `components/` (обовʼязковий reuse-пошук за CLAUDE.md). Лінт: не імпортувати `@/lib/api`; компоненти чисті, без хуків. Тести: snapshot-list ключів (кожен ключ `WFRP_CONDITION_KEYS`/`TRAIT_SIZES`/`PSYCHOLOGY_KINDS`/`PASSION_KINDS` має іконку) — аналог перевірки покриття в `inventory.ts --ui`.
