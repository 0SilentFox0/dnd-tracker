# Промпти для AI-іконок

Набір промптів для генерації іконок і токенів у будь-якій моделі (ChatGPT/gpt-image, Gemini, Midjourney, Stable Diffusion…) та подальшого завантаження готових файлів скриптом `assets:attach`.

## Призначення і ліцензія

- Іконки замінюють арт, узятий з вікі Might and Magic, тож промпти описують сюжет **оригінально**, без посилань на гру, видавця чи чужі зображення.
- Результати генерації належать нам. **Ніколи не подавайте у модель як референс чужий захищений авторським правом арт** (скріншоти, арт з вікі, обкладинки) — лише власні згенеровані якорі.
- Тексти SRD 5.2 — CC-BY-4.0 від Wizards of the Coast; самі зображення в SRD не входять, тому генеруємо свої.

## Вміст

| Файл | Що | Кількість |
| --- | --- | --- |
| `srd-creatures` | істоти SRD 5.2 (токени) | 331 |
| `srd-spells` | закляття SRD 5.2 | 339 |
| `srd-weapons` | зброя SRD 5.2 (38) + щит | 39 |
| `homm5-units` | юніти кампанії HOMM5 | 153 |
| `homm5-spells` | закляття HOMM5 | 54 |
| `homm5-artifacts` | артефакти HOMM5 | 24 |
| `homm5-skills` | навички HOMM5 | 120 |
| `homm5-main-skills` | головні навички (гілки) HOMM5 | 11 |

Разом 1071 зображення. Кожен набір має два варіанти: `*.csv` (колонки `file,name,kind,prompt`, UTF-8, промпт повний — разом зі стильовим префіксом, для пакетних інструментів) і `*.md` (згруповано за типом/школою/расою, нумеровані записи, промпт у блоці коду — для ручного копіювання).

## Єдиний стиль: «painted fantasy»

Усі промпти починаються зі спільного ядра:

> Digital painting in the spirit of classic fantasy RPG icons, rich colours, dramatic rim light, painterly brushwork, no text, no letters, no watermark.

Далі — префікс за видом (саме він уже вшитий у кожен рядок CSV):

**Істоти / юніти** (токен 1024x1024, 80% кола, читається на 64 px):

> Circular token composition on a plain dark vignette background, no frame; the subject sits in the centre of the circle and fills about 80% of it, readable at 64 px. Square 1:1, 1024x1024.

Після префікса йде «Head-and-shoulders portrait of …» або «Full-body view of …» (для малих/дивних істот, ослизів і роїв).

**Закляття:**

> Square game icon with a single strong central motif depicting the effect, dark smoky background, glowing energy, no frame. Square 1:1, 1024x1024.

Далі `Central motif: …` і `Colour key: …` за елементом/школою: fire orange-red, icy blue, lightning violet-white, sickly green-black necrotic, radiant gold, psychic magenta, pale blue force, acid green, poison green-purple, deep thunder blue, warm healing gold-green, abjuration silver-blue, divination teal, enchantment pink, illusion purple, conjuration amber, transmutation emerald (плюс nature та earth для HOMM5).

**Навички:** як закляття, але префікс «Square game skill icon…»; колір — за гілкою (Напад — червоний із сталлю, Стрільба — зелений, Захист — сталево-синій, Лідерство — золотий, Світло/Темрява/Хаос/Природа — за школою). Навички-ступені («Базова/Просунута/Експертна …», «(Базовий)/(Просунутий)/(Експерт)») отримують додаткову вказівку про тонке кільце: бронза, срібло, золото.

**Зброя / артефакти:**

> The item alone in three-quarter view, centred on a dark parchment-textured background with a soft shadow, no frame, no hands, no other objects. Square 1:1, 1024x1024.

Для артефактів рідкість додає легке сяйво (rare — ледь помітне, epic — фіолетове, legendary — золоте).

## Рекомендовані налаштування

- Квадрат 1024x1024 (1:1), один варіант на промпт; потім відбираємо найкращий.
- Негативний промпт (де модель його підтримує; у ChatGPT/Gemini додайте як «без …»): `text, letters, watermark, signature, frame, multiple subjects, blurry, cropped`.
- Midjourney: додайте `--ar 1:1 --style raw`; Stable Diffusion: поле Negative prompt = список вище.

## Узгодженість стилю

1. Спершу згенеруйте 5–8 «якорів» на кожен вид (наприклад, дракон, людина-воїн, нежить, вогняне закляття, меч), оберіть найвдаліші.
2. Далі використовуйте фіксований seed (Midjourney `--seed`, SD seed) або завантажте обраний якір як **style reference** (`--sref`, «використай стиль цього зображення»). Референсом має бути лише наш власний згенерований якір.
3. Один чат/сесія на вид (токени окремо від іконок), щоб модель не «дрейфувала».
4. Не змінюйте префікс — змінюється лише суб'єкт.
5. Перевіряйте читабельність: зменште результат до 64 px; якщо силует не читається — перегенеруйте.

## Іменування файлів

- **SRD** — за slug з колонки `file` (формат `srd-2024_<slug>.png`), наприклад `srd-2024_adult-red-dragon.png`.
- **HOMM5** — за **точною українською назвою** запису, як у колонці `file`: `Архангел.png`, `Вогняна куля.png`. Назви з двокрапкою (`Аграїл: Полум'яна аура.png`) і дужками лишаємо як є — під macOS/Linux це допустимо; під Windows двокрапку у файлових іменах використовувати не можна, тому для цих випадків генеруйте/перейменовуйте на macOS або Linux.
- Формати: `png`, `jpg`, `webp` або `gif` (зіставлення за іменем без розширення).
- Одна тека на вид: `units/`, `spells/`, `artifacts/`, `skills/` (головні навички — окремо в `main-skills/`).

## Завантаження результатів

```bash
pnpm assets:attach <campaignId> <dir> --kind units|spells|artifacts|classes|races|skills|main-skills [--allow-official] [--allow-remote]
```

- Зіставлення нечутливе до пунктуації й регістру (`_`, `-`, `:`, `'`, пробіли — рівнозначні), хвостові суфікси варіантів (`_a1`, `-b2`, `_2`) відкидаються; з кількох варіантів одного запису береться перший за алфавітом, решта йдуть у звіт «інший варіант».
- Файли SRD зіставляються зі `slug` з `data/templates/srd-5.2/<kind>.json` цього ж `--kind` (з префіксом `srd-2024_` і без), файли HOMM5 — з точною назвою запису.
- Підтримані формати: `png`, `jpg`, `webp`, `gif`. Кожен запис без пари виводиться як «без пари».
- `--allow-official` потрібен для офіційних шаблонів (SRD); `--allow-remote` — якщо `DATABASE_URL` не локальна.
- `--kind main-skills` завантажує головні навички (`homm5-main-skills`).

## Перегенерація промптів

Промпти будує `scripts/assets/build-icon-prompts.ts` (чиста композиція — `scripts/assets/icon-prompts/compose.ts`, тест — `scripts/assets/__tests__/icon-prompts.test.ts`):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/constructor \
  pnpm assets:icon-prompts --srd <тека Open5e srd-2024> --campaign <campaignId> [--out docs/assets/icon-prompts]
```

- `--srd` — тека з `Creature.json`, `CreatureTrait.json`, `CreatureAction.json`, `Spell.json`, `Weapon.json`, `Armor.json` (Open5e v2, `srd-2024`).
- `--campaign` — id кампанії HOMM5; читання лише з БД, без запису.
- Суб'єкти (15–40 слів, конкретні й візуальні) лежать у `scripts/assets/icon-subjects/*.json`: SRD — за slug, HOMM5 — за id запису. Для SRD, якщо суб'єкта немає, скрипт збирає його з даних (назва, розмір, тип, прикмети дій, колір дракона; для заклять — школа, тип шкоди, форма області, перше речення опису). Для HOMM5 відсутній суб'єкт — помилка, щоб жоден запис не лишився без промпта.
- Скрипт перевіряє унікальність файлів, непорожні промпти й відсутність згадок гри/видавця.
