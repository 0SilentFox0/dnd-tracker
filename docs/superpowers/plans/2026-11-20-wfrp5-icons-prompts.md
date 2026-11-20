# Grim d100 (5e): іконки — шаблон промптів і налаштування генератора (I.2, I.3)

Пункти I.1 (інвентар) і I.2 (не-контентні іконки) — `scripts/assets/grim-icons/inventory.ts` (`--ui` друкує список). Реальні промпти генеруються існуючим `pnpm assets:grim-icons prompts` (`scripts/assets/grim-icons/{prompts,cli}.ts`) з файлів субʼєктів `scripts/assets/icon-subjects/grim-{units,spells,artifacts,identity}.json`. Тобто для нових рядків агент пише лише ОДНОРЯДКОВІ субʼєкти (див. нижче), а обгортка стилю додається кодом (`composeSkill/Spell/Item/Creature`, `assertCleanPrompt`, `assertUniqueFiles`).

## 1. Стан

Усі 186 рядків шаблону мають іконки (feats 50, careers 16, races 4, spells 30, units 30, artifacts 56). Після контент-хвилі бракуватиме порядку 600 (розбивка у `...-content-wave-list.md`, п.1).

## 2. Не-контентні UI-іконки (I.2), 48 шт. (`inventory.ts --ui`)

Перед замовленням перевірити reuse: стани бою зараз текстові/маркери `EffectMarker`; готових набору іконок WFRP-станів у `components/` не знайдено.

| Група | Елементи |
|---|---|
| conditions (12) | bleeding, fatigued, poisoned, stunned, ablaze, broken, entangled, prone, surprised, blinded, deafened, unconscious |
| sizes (7) | tiny, little, small, average, large, enormous, monstrous |
| psychology (2) | fear, terror |
| passions (3) | frenzy, hatred, animosity |
| resources (8) | advantage, momentum, fate, fortune, resilience, resolve, corruption, sin |
| hitLocations (6) | head, left-arm, right-arm, body, left-leg, right-leg |
| testOutcomes (5) | critical-success, critical-failure, fumble, wrath, miscast |
| hero (5) | status-brass, status-silver, status-gold, endeavour, career-tick |

Стиль: монохромні/двоколірні знаки (легко читаються на 24–32 px), без тексту; генерація тим самим генератором як `skill`-тип (квадрат), але ПОТРІБЕН окремий каталог `ui/` і спосіб підключення (не рядки шаблону; ймовірно статичні файли в `public/` або вбудовані SVG) — рішення власника перед генерацією. Альтернатива: намалювати як SVG (lucide-подібні) без генерації, бо потрібен лише силует.

## 3. Шаблон промпта (обгортка вже в коді)

Скелет, який збирає `compose.ts` (не змінювати; наведено для довідки):

```
Digital painting in the spirit of classic fantasy RPG icons, rich colours, dramatic rim light, painterly brushwork, no text, no letters, no watermark. <КОМПОЗИЦІЯ ПО КАТЕГОРІЇ>. Square 1:1, 1024x1024. <СУБʼЄКТ>. <Colour key / rarity flair>. Image only: absolutely no text, letters, words, numbers, runes, captions, signs, signatures or watermarks anywhere in the picture.
```

Правило субʼєкта (одне речення, англійською, 10–25 слів): ОДИН чіткий предмет/дія + одна деталь матеріалу + одна деталь освітлення чи руху. Без імен, назв місць і богів, без слів зі `forbidden-terms.ts`, без літер/цифр/рун/вивісок/книг із читабельним текстом (замінювати «scroll of writing» на «bound scrolls»). Не посилатись на IP (жодних характерних фракційних символів).

## 4. Стилі за категоріями

| Категорія (ключ) | Композиція | Субʼєкт | Нотатки |
|---|---|---|---|
| races | круг/квадрат skill-іконки, погруддя виду | типаж виду + одяг + тло місцевості | 5-й вид: лісовий ельф окремо від високого (інший колір, природне тло) |
| careers (64) | skill-іконка, центральний мотив | людина за ремеслом з 1–2 інструментами (як `archivist`) | різні 8 класів — різний colour key (клас = колір, 8 палітр), щоб кар'єри класу групувались; без облич у крупному плані |
| feats / таланти (~166) | skill-іконка | метафора (рука+предмет, око, тварина), не персонаж | група general відтінок `neutral gold`, origin — колір виду |
| spells | spell-іконка, ефект енергії | сам ефект; палітра за лором (Embers теплі, Gloam холодні, Fenlore зелені, Thornwitchery багряно-чорні, Hearth Rites золотисте світло) | благословення/чудеса — м'яке сяйво, жодних символів богів |
| artifacts / gear | предмет у три чверті, темний пергаментний фон, тінь, без рук | один предмет; rarity flair для uncommon | усі ~290: варіанти (мечі/сокири) розрізняти формою леза/руків'я, не кольором; їжа/одяг — на тарілці/складений |
| units | круглий токен, погруддя, 80% кадру, читається на 64 px | голова істоти + характерна риса | шаблони істот (Leader, Elite…) — 1 токен на шаблон з бейджем-силуетом без тексту |
| UI (п.2) | простий знак по центру, контрастний | силует | див. п.2 |

## 5. Рекомендовані налаштування `generate_grim.py` (лише пропозиція; файли в ~/Downloads не редагувати)

Скрипт читає `input/grim.csv` (+`grim-styles.json`), вихід `output-grim/icons/<kind>/<файл>.png`; зроблене пропускає (`final.exists()`), `--redo NAME_OR_ID` перегенерує; seed детермінований за рядком (`seed_for`).

1. Спочатку `build_grim_manifest.py` (перебудувати `grim.csv` з нових промптів; перевірити, що старі 186 id не змінились) і `python3 generate_grim.py --validate-only` — вивід «N already generated (kept), M new».
2. Пачки по 50: `python3 generate_grim.py --limit 50`, між пачками перегляд контактного листа; ~12 пачок на 600.
3. `--size 768` (за замовчуванням; зберігати, бо завантаження/WebP і існуючі 186 того ж розміру), `--steps 8` лишити, якщо модель — turbo/lightning (за замовчуванням 8); якщо модель стандартна — 20–25 кроків лише для artifacts/feats, що виглядають шумними. `--delay 0.5` залишити.
4. Негативний промпт: `ICON_NEGATIVE` для типів spell/artefact/skill містить «face, head, person, human figure» — це суперечить career/race промптам, де зображена людина (вони йдуть як `skill`). Для careers/races генерувати як тип `unit` (бюст) або зробити окремий `record_type` з `ICON_NEGATIVE=''`; перевірити на 3 кар'єрах перед пачкою (саме тому існують `regenerate_grim_fixes.py` і `grim-fixes*.json`).
5. До `generate.NEGATIVE` вже додано `words, numbers, runes, captions, signs`; додати `book, scroll text, banner, tavern sign, coin inscription` для gear/careers, щоб зменшити випадковий текст.
6. Іменування: `output_filename` = `grimSlug(name).png` у `<kind>/`; після пачки `pnpm assets:grim-icons upload` (або `pnpm template icons grim-d100 --dir <images> --dry-run`), потім `inventory.ts` має показати 0 missing, 0 orphans.
7. Контроль якості пачки: всі файли 768×768, немає літер (швидкий огляд мініатюр), круглість юнітів, відмінність схожих предметів; перегенерація точково через `--redo`.
