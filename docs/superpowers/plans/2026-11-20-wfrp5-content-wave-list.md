# Grim d100 (5e): список контент-хвилі (пакети даних)

Продовження `2026-11-19-wfrp5-canon-mechanics.md` (розділ «Контент-хвиля»). Тут: виміряний стан, цілі, схема рядків, правила i18n, сторінки книги, порядок пакетів і готовий блок інструкцій для агента-генератора. Книжковий текст у репозиторій не копіюється.

## 1. Виміряний стан (2026-11-20, `data/templates/grim-d100/`)

| Категорія | Файл / джерело | Зараз | Ціль (канон 5e) | Іконок зараз |
|---|---|---|---|---|
| Раси | `races.json` + `race-profiles.json` | 4 | 5 (два ельфи: різні списки навичок/талантів) | 4 |
| Кар'єри | `careers.json` | 16 (2 на клас) | 64 (8 класів × 8, по 4 рівні) | 16 |
| Навички | не рядки шаблону: `systems/wfrp/rules/skills/catalog.ts` (`SKILL_CATALOG`) | 40 | 45 (+Animal Training, Bribery, Charm Animal, Play, Sail) | немає (не kind) |
| Таланти | `feats.json` (43 general + 7 origin) | 50 | ~166 | 50 |
| Заклинання | `spells.json` | 30 (6 списків: Cantrips 6, Embers 5, Gloam 5, Fenlore 3, Thornwitchery 3, Hearth Rites 8) | ~141 + 19 благословень + ~60 чудес | 30 |
| Спорядження | `artifacts.json` (weapon 25, gear 19, armour 12) | 56 | ~290 | 56 |
| Бестіарій | `units.json` | 30 | ~45 + 7 шаблонів істот (p353) + рецепти трейтів | 30 |

Інвентар іконок: `pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/assets/grim-icons/inventory.ts [--missing|--json|--ui]` (зараз усі 186 рядків мають іконку; після кожного пакета показує дельту). Ціль іконок після хвилі: приблизно 5+64+166+~220+~290+~45 мінус наявні 186, тобто порядку 600.

Опис шаблону: `manifest.json` (`kinds`, `counts` — оновлювати), `rules.json` (таблиці `tables`, `advancement`), `i18n/uk.json`, `icons.json`.

## 2. Схема рядків (за `scripts/templates/systems/wfrp/validate.ts`, `equipment.ts`, `spells.ts`, `units.ts`, `common.ts`)

Загальне: `slug` (kebab, унікальний у kind), `name` (англ., унікальна), `description` 1–200 символів (`DESCRIPTION_MAX`). Заборонені терміни IP — `scripts/templates/grim-d100/forbidden-terms.ts` (Warhammer, Empire, Reikland, імена богів/місць, Chaos тощо): усі назви оригінальні, з книги беруться лише числа й структура.

- **races**: `{slug,name,passiveAbility:{name,description}}` + запис у `race-profiles.json`: `{race:<slug>,profile:{mods,move,fate,fortune,extraWounds,talents[names],randomTalentCount,randomTalents[{featId:name,max}],careerTable[{careerId:name,max}]}}`; усі `PROFILE_KEYS` обовʼязкові; імена талантів/кар'єр мають існувати (резолвиться імпортером). Потрібні також видові навички (`skillPicks`, M-09), якщо W6 додав поле.
- **careers**: `slug,name,class` + для n=1..4 `tierN_name`, `tierN_status` (`Brass|Silver|Gold 1-9`), `tierN_characteristics[]`, `tierN_skills[]`, `tierN_talents[]` (імена feats), `tierN_trappings[]`. Канон: характеристики 3/1/1/1 без дублікатів (M-10); навичок 10/6/4/2, талантів 4 на рівень (M-11); позначена Income-навичка. Навичка: `key` або `key:spec`, перевірка `careerSkillIssue` (grouped потребує спеціалізації, fixed — зі списку).
- **feats**: `{slug,name,type:'general'|'origin',description,xpCost:100,maxRank,abilities?}`; `abilities[]` лише `trigger.event:'passive'` + effects `modifyStat` на `attackBonus|maxHp|initiative`. Решта талантів — лише опис + `maxRank` (механіка в системному коді); `xpCost` усюди 100 (M-05). Origin-таланти — видові.
- **spells**: `{slug,name,level:1,cost:'action',description,casting:{magic:{cn,kind,overcast,attribute?}},targeting,dice,spellEffects,lists:[один список з GRIM_SPELL_LISTS],ingredients?}`; `kind` ∈ petty|arcane|hedge|witchcraft|blessing|miracle; CN petty 0 (канон; зараз діапазон 0–2 — вирівняти), інші 3–12; `overcast` null|`dice` (не `targets`); `dice≥1` рівно коли є `spellEffects`; шкода `{spellRoll:100}`. **Блокер:** валідатор підтримує лише 6 списків і kind; для 8 колірних лор, daemonology/necromancy та 60 чудес розширити `GRIM_SPELL_LISTS`/`SPELL_CN_BANDS`/duration у системному коді (інша гілка, не контент-агент).
- **artifacts**: ключі з `ARTIFACT_KEYS` (інші колонки помилка); `{slug,name,description,rarity:'common'|'uncommon',slot,systemStats:{type:'weapon'|'gear'|'armour',…}}`; weapon: `group,reach,damage{addSb,flat},qualities[],flaws[],twoHanded,weight,price` (`addSb` задано смугою групи зброї); armour: покриття локацій, слот лише з дозволеними частинами (armor не head, helmet лише head, boots лише leg); gear: `weight,price`. Ціни в пенсах (240 = 1 срібний), вага в енкамбрансах. Нові розділи (їжа, одяг, інструменти, книги, тварини, отрути, трави, протези, магічні) потребують нових `slot`/`type` у `GRIM_ITEM_SLOTS` — узгодити з W8.
- **units**: `slug,name,level:1..4,maxHp,speed(=move×SPEED_PER_MOVE),initiative(=I),gridSize(за Size),statblock:{creatureType: Beasts|Raiders|Restless Dead|Cultists|Constructs|Horrors},characteristics:{base:{всі 10},move 1..12},abilities[],knownSpells?`; `maxHp` = Wounds за формулою (Small 2×TB тощо, p361).
- **skills** (45): правка `catalog.ts` (code), а не JSON; назви оригінальні, i18n окремо в `messages`.

Перевірка: `pnpm template validate grim-d100`, `pnpm template i18n …`, тести `scripts/templates/**/__tests__`.

## 3. i18n (en + uk)

- `en` — це сам рядок у JSON; `uk` — запис у `data/templates/grim-d100/i18n/uk.json` за ключем `<kind>/<slug>/<field>` у форматі `{ "text": "<uk>", "en": "<en-джерело>" }` (поле `en` — копія англ. тексту для виявлення застарілого перекладу). Для кар'єр ключі `careers/tiers[=<tier-slug>].name`, `...trappings[N]`, `careers/class`; для талантів `feats/abilities[#a1].name`; для заклять `spells/ingredients[=slug].name`; для юнітів `units/abilities[#id].name` і `.effects[0].text`.
- Переклад ОБОВʼЯЗКОВИЙ для офіційного шаблону (імпорт без `--allow-untranslated`). Скорочення й терміни — з `i18n/glossary/uk.json` (характеристики: Володіння зброєю/ВЗ тощо); нові терміни спершу додавати в глосарій.
- Описи ≤200 символів і в uk; кирилиця в коментарях коду заборонена (ратчет), у даних дозволена.
- Імена талантів/кар'єр, на які посилаються `race-profiles`/`careers`, перекладаються тим самим ключем, посилання йдуть по англ. імені.

## 4. Сторінки книги (витяг `~/Work/wfrp-extract/out/wfrp5/sections/`)

| Категорія | Файл | Сторінки |
|---|---|---|
| Види | `02-character-building.md` | 22–42 (види p26–35, таблиця p23, створення p36–40) |
| Кар'єри | `03-class-and-careers.md` | 43–108 (схеми розвитку частково втрачені в витягу — потрібні скани сторінок) |
| Навички, таланти | `04-skills-and-talents.md` | 109–128 (навички p110–113, таланти p114–128) |
| Магія | `09-magic.md` | 230–260 (petty p240–247, arcane p243+, лори/hedge/witch p248–260) |
| Релігія | `08-religion-and-belief.md` | 202–229 (благословення p220, чудеса p222) |
| Спорядження | `12-consumer-guide.md` | 296–317 (зброя p303–305, якості p304) |
| Бестіарій | `13-bestiary.md` | 318–363 (шаблони p353, Size/Wounds p360–362) |
| Таблиці | `tables.json` | по `page` |

## 5. Порядок пакетів

Залежності: дані посилаються за іменами (кар'єри → таланти й навички; види → кар'єри й таланти; юніти → заклинання), тому спершу листя.

| № | Пакет | Обсяг | Передумова |
|---|---|---|---|
| C0 | Навички: 5 нових у `catalog.ts` + i18n | 5 | — |
| C1 | Таланти (3 хвилі по ~40: A, B, C) | +116 | C0 (деякі вимагають навичок) |
| C2 | Кар'єри (8 пакетів по класу, 8 кар'єр кожен; перерахунок існуючих 16 до 10/6/4/2, 3+1+1+1) | +48, правка 16 | C0, C1 |
| C3 | Види: +1 вид, видові навички/таланти, таблиці кар'єр, `randomTalents` на єдину таблицю p23 | 1 + 4 правки | C1, C2 |
| C4 | Заклинання: petty → arcane → лори → hedge/witch → dark; благословення; чудеса | +~111 +19 +~60 | розширення валідатора/GRIM_SPELL_LISTS (код) |
| C5 | Спорядження по категоріях p296–317 | +~234 | W8, нові slot/type |
| C6 | Бестіарій: юніти, шаблони істот, рецепти трейтів | +~15 +7 | C4 (knownSpells) |
| C7 | `manifest.json` counts, `pnpm template index`, повна валідація, оновлення STATUS.md | — | усе |
| C8 | Іконки: I.1 інвентар → I.3 промпти → генерація власником → I.5 завантаження | ~600 | C1–C6 |

Кожен пакет: окрема гілка/коміт, дані + i18n разом, `validate` + `i18n` зелені, тести `scripts/templates` по змінених файлах; повний `test:run` лише в кінці хвилі.

## 6. Інструкція для агента-генератора (вставити як є)

```
Ти додаєш контент у шаблон Grim d100 (5e) у /Users/silentfox/Work/dnd-tracker, папка data/templates/grim-d100/. Пакет: <ПАКЕТ, напр. C2 клас Warriors>.
Правила:
1. IP: назви, описи й флейвор ОРИГІНАЛЬНІ. З книги (~/Work/wfrp-extract/out/wfrp5/sections/<файл>, сторінки <p>) беруться тільки числа, структура й механічний зміст. Жодного тексту книги в репозиторії; жодних слів з scripts/templates/grim-d100/forbidden-terms.ts.
2. Схема рядків — за docs/superpowers/plans/2026-11-20-wfrp5-content-wave-list.md розділ 2 та валідатором scripts/templates/systems/wfrp/validate.ts (+ equipment.ts, spells.ts, units.ts). Прочитай відповідний файл і існуючі рядки як зразок перед записом.
3. description 1–200 символів. slug = kebab від name, унікальний. Посилання між рядками — по точному англ. імені існуючого рядка (спершу створи те, на що посилаєшся).
4. i18n: для КОЖНОГО нового текстового поля додай запис у i18n/uk.json ключем <kind>/<slug>/<field> формату {"text":"<українською>","en":"<англ. джерело>"}; терміни з i18n/glossary/uk.json, нові терміни додай у глосарій. Переклад обов'язковий.
5. Не чіпай systems/, lib/ і код; якщо валідатор не дозволяє потрібне поле/список — зупинись і опиши блокер у звіті.
6. Оновити manifest.json counts. Не запускай повний test:run і не робити git commit/push.
7. Перевірка: pnpm template validate grim-d100; pnpm template i18n (перевірка ключів); pnpm test:related scripts/templates/... по змінених файлах; pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/assets/grim-icons/inventory.ts (покаже, скільки іконок бракує).
8. Звіт: що додано (кількості), які сторінки книги використано, які поля/правила не вдалось виразити.
```
