# Grim d100 (5e): розблокування контент-генерації — варіанти рішень

Чотири блокери з `2026-11-20-wfrp5-content-wave-list.md` (розд. 2, 5). Для кожного: що є зараз, 2–3 варіанти з оцінкою (файли, тести, розмір S/M/L, ризик), рекомендація і одне питання власнику. Обмеження для всіх: міграції лише expand, RLS на нових таблицях, ратчети лише зменшуються, ядро не називає систему, у коді немає кирилиці (i18n-ключі).

> **Увага: паралельна робота в дереві.** На `feat/wfrp5-w9` (станом на 2026-11-20, uncommitted) інша сесія вже почала варіант 1A і 2B: `scripts/templates/systems/wfrp/spells.ts` (`GRIM_CORE_SPELL_LISTS`, `GRIM_ARCANE_LISTS`, `GRIM_DARK_LISTS`, `GRIM_CULT_LISTS`, нові `SPELL_CN_BANDS`), `equipment.ts` (`GRIM_CORE_SLOTS`, слот `cloak`, `GEAR_CATEGORY_BANDS`), `systems/wfrp/rules/equipment/{constants,stats,guard}.ts` (`GEAR_CATEGORIES`, `gear.category`), `coverage.ts`, `__tests__/i18n.test.ts`. Рішення нижче треба звести з цією роботою, а не дублювати. Спостереження щодо неї — у відповідних розділах.

Перевірено: W8 (`feat/wfrp5-w8-gear`, d54f3b481) уже в історії цієї гілки (merge 77f574564), тож координація з W8 = узгодження з кодом, що вже є.

---

## 1. Валідатор заклять

### Що є

- Обмеження живуть лише в `scripts/templates/systems/wfrp/spells.ts` (валідатор шаблону, не ядро): 6 kind (`GRIM_SPELL_KINDS`), 6 списків (`GRIM_SPELL_LISTS`), `SPELL_CN_BANDS`, `level === 1`, `cost === 'action'`, рівно один список, ефект лише `dealDamage|heal` або `attribute`-стан, інакше «spell has neither an effect nor an attribute».
- Ядро вже нейтральне: `spells.lists` — довільний `String[]` (без FK/enum), `SPELL_MAGIC_KINDS` у `lib/utils/spells/model/schema.ts` уже містить `chaos` (мітка `wfrpMagic…chaos` є), `SpellDefinitionSchema` має `executionMode: 'native'|'manual'`, `concentration`, ефекти з `duration: {rounds}`. Тобто розширення списків/смуг **не чіпає ядро**.
- Рушій canon5e (`systems/wfrp/rules/magic/cast-test.ts`) уже рахує CN = 0 для petty і молитов; значення `cn` у таких рядках ігнорується.
- Споживачі констант: `i18n.ts` (список відомих назв списків → ключ `lists/<slug>/name` у `i18n/uk.json`), `coverage.ts`, `__tests__/i18n.test.ts`, `__tests__/localized-clone.integration.test.ts`.
- Форма книги (лише механіка): кожне закляття має CN, Range, Target, Duration (Instant / N раундів / «бонус характеристики» раундів/хвилин/днів / Special); 8 кольорових лор + спільні арканні, hedge, witchcraft, темні (демонологія/некромантія = Chaos-різновид); благословення — 19 штук, кожне входить у 6 культових списків одночасно (таблиця «Blessings by Cult»), SL розширює range/targets/duration; чудеса — без CN (тест Pray +0), по культу; велика частка заклять/чудес наративні (без шкоди/лікування/стану).

### Розриви

1. Списки: 8 лор + спільні + темні + ~10–12 культів.
2. Один список на рядок — благословення спільні для кількох культів.
3. CN-смуги: petty 0 (5 існуючих petty мають cn 1–2 — **у дереві смугу вже звужено до [0,0], а `spells.json` не правлено → `validate` впаде**); чудеса без CN.
4. Наративні закляття не проходять (немає effect/attribute).
5. Тривалість: структурованого поля немає.
6. Темна магія: у дереві покладено в `witchcraft`; у ядрі є `chaos`.

### Варіанти

**1A. Розширити лише валідатор (scripts/), тривалість — текстом в описі.**
- `GRIM_SPELL_LISTS` по kind (як у дереві), `GRIM_SPELL_KINDS += 'chaos'` для темних списків (окремий kind — мітка вже є, інгредієнти дозволити й для `chaos`).
- `lists`: дозволити 1..N для `blessing` (або: одне благословення = один рядок на культ — ×6 дублікатів, гірше).
- CN: petty `[0,0]` + виправити 5 рядків `spells.json` (поведінка не змінюється, бо canon5e вже бере 0); miracle `[0,0]` (книга без CN; рушій теж 0) — 4 існуючих чудеса cn 6–12 виправити на 0.
- Наративні: дозволити `executionMode: 'manual'` (додати в `SPELL_KEYS`), тоді effect/attribute/targeting/dice не обов'язкові; `level`/`cost` лишаються 1/`action` (ритуали в бою не потрібні).
- Тривалість: лише в описі (≤200 символів).
- Файли: `spells.ts`, `i18n.ts` (multi-list), `coverage.ts`, `spells.json` (9 рядків), `i18n/uk.json` (назви ~25 нових списків), тести `scripts/templates/systems/wfrp/__tests__/{spells,i18n}.test.ts`, `localized-clone.integration.test.ts` (перевіряє лише `lists[0]` → на всі елементи).
- **S**, ризик низький (ядро не чіпається; існуючі 30 рядків змінюються тільки в cn, що рушій ігнорує).

**1B. 1A + структурована тривалість/стійкість через наявні поля ядра.**
- Дозволити у валідаторі `concentration` (ядро вже має; `sustain` + Dispel persistent із W9 спираються на «утримане» закляття) і ефекти з `duration: {rounds}` (`applyEffect`/`modifyStat`), а також `attribute` + тривалість раундами.
- Формульні тривалості («WPB раундів») не виражаються: `DurationSchema` = фіксоване число → або номінальне число, або розширення `DurationSchema` на `FormulaSchema` (зміна ядра, нейтральна, але торкається всіх систем і d20-тестів).
- Файли: 1A + `spells.ts` (ефекти/ключі), можливо `lib/utils/abilities/schema/common.ts` + резолвер формули тривалості + тести ядра.
- **M** (без формул) / **L** (з формулами), ризик середній (ефекти почнуть реально діяти в бою — потрібен live-run).

**1C. Каталог списків у дані шаблону.**
- `rules.json` або `manifest.json` отримує `spellLists: [{name, kind, palette}]`; валідатор читає їх із пака, а не з константи; i18n — той самий ключ `lists/<slug>/name`; палітра іконок — звідти ж.
- Плюс: homebrew-паки й `grim-d100-empty` без правки коду. Мінус: нова схема в `RulesetPatch`/маніфесті, правки `common.ts`, `i18n.ts`, `coverage.ts`, тестів.
- **M**, ризик низький–середній.

**Іконки (палітра за лором).** Зараз палітра задається вручну для кожного закляття в `scripts/assets/icon-subjects/grim-spells.json` (`{palette, subject}`, `prompts.ts`). Для ~200 заклять варто ввести мапу `list → palette` (у `scripts/assets/grim-icons/`, або з 1C), а субʼєкт лишити одним рядком — інакше генератор-агент вигадуватиме палітри непослідовно. S, лише scripts.

**Рекомендація:** 1A зараз (з `chaos` для темних, multi-list для благословень, `manual` для наративних, правкою cn у 9 рядках) + мапа палітр; 1B лише для `concentration` (без формульних тривалостей) — коли дійде до бойових persistent-заклять; 1C відкласти.

**Питання:** Беремо 1A (+`concentration` з 1B), темні списки — kind `chaos` (а не `witchcraft`, як у дереві), благословення — один рядок із кількома списками?

---

## 2. Нові категорії спорядження

### Що є

- `slot` — ядровий enum `ArtifactSlot` (`lib/constants/artifacts.ts`), спільний для всіх систем і сітки `ARTIFACT_GRID_9`; означає «куди вдягається», не «що це».
- `systemStats` — системний JSON (`WfrpItemStatsSchema` у `systems/wfrp/rules/equipment/stats.ts` + Zod-free двійник `guard.ts`, паритет перевіряє `guard.test`). У дереві вже додано `GEAR_CATEGORIES` (food, clothing, tools, books, animals, poisons, herbs, trappings, prosthetics, magical) і `gear.category?`, у валідаторі — `GEAR_CATEGORY_BANDS` і слот `cloak`.
- `ARTIFACT_KEYS` (колонки рядка) не міняються: `category` вкладено в `systemStats`.
- Копіювання між кампаніями й імпорт переносять `systemStats` як є — правок не треба.
- Не покрито: редактор (`systems/wfrp/ui/equipment/ArtifactStatsEditor.tsx`, `systems/wfrp/hooks/useArtifactStatsDraft.ts`) не має поля категорії; немає i18n-міток категорій; інвентар/довідник не групує за категорією.

### Варіанти

**2A. Нові слоти в ядрі (`ArtifactSlot` += food, tools, …).** Ламає семантику слота, зачіпає спільний enum, сітку екіпіровки, фільтри інвентарю, i18n слотів, d20-тести, можливо сторонні валідатори; ядро фактично отримує WFRP-категорії. **L**, ризик високий. Не рекомендується.

**2B. `gear.category` у `systemStats`, слот `item` (`cloak` для одягу) — уже почато.** Дописати: поле-селект у редакторі + `useArtifactStatsDraft`; мітки `wfrpEquipmentEditor.category.<key>` у `messages/{en,uk}`; групування/бейдж у картці предмета через системний UI (не ядро); `guard.test` паритет; смуги валідатора. Окремо вирішити: витратні (їжа/отрути/трави) — чи потрібна кількість/`uses` (зараз немає; можна поки описом); тварини — як предмет (вʼючна тварина з ціною) чи юніт (верхова у бою) — пропоную предмет, бойові — юніти C6.
- Файли: ~6–8 (`stats.ts`, `guard.ts`, `ArtifactStatsEditor.tsx`, `useArtifactStatsDraft.ts`, 2 messages, `equipment.ts`, тести `guard.test`, `equipment.test`).
- **S–M**, ризик низький (expand-only, без міграцій; старі рядки без `category` валідні).

**2C. Окремий content kind / таблиця «goods».** Нова таблиця + RLS + ресурс фабрики + copy/import + UI. **L**, ризик середній, вигоди проти 2B немає.

**Рекомендація:** 2B (доробити поточну роботу), без `uses` на старті.

**Питання:** Підтверджуєте 2B (категорія в `systemStats`, слот `item`/`cloak`), витратні без лічильника, тварини — предметами?

---

## 3. Навички в коді (`SKILL_CATALOG`)

### Що є

- `systems/wfrp/rules/skills/catalog.ts`: 40 записів `{key, characteristic, kind, spec}`; споживачі — `skill-label.ts`, `CareerSkillPicker.tsx`, `SkillAdvancesEditor.tsx`, `NewSkillPicker.tsx`, `sheet-test.ts`, `characteristics/{derive,sheet-block}.ts`, валідатор (`careerSkillIssue`).
- Назви — `messages/*/gameTerms.json` → `wfrpSkills.<key>` (+ `wfrpSpecs` для fixed). Персонажі зберігають ключі (`key[:spec]`), не тексти.
- Книга (механіка): Animal Training (Int, advanced, grouped), Bribery (Fel, basic), Charm Animal (WP, basic), Play (Dex, advanced, grouped), Sail (Ag, advanced).

### Варіанти

**3A. Лише код: +5 записів у каталог + ключі в обох `gameTerms.json`.** `animal-training`/`play` — `open` (SPEC_RE) або `fixed` зі списком спеціалізацій + `wfrpSpecs`. `careerSkillIssue` підхоплює автоматично. Існуючі кампанії: нічого не ламається, нові навички просто з'являються в пікерах. Побічно: з'являться й у legacy-редакції WFRP; якщо небажано — фільтр за `editionOf(rules)` у пікерах (+S). Варто вирішити долю `performance` (open, Ag) проти канонічного Play — лишити як є.
- Файли: `catalog.ts`, 2 × `gameTerms.json`, тест каталогу/`careerSkillIssue`. **S**, ризик низький.

**3B. Каталог у дані шаблону (`rules.json` → `skills[]`, переклад у `i18n/uk.json`).** Усі 7 споживачів мають читати навички з `Ruleset` (зараз частина — чисті функції без rules), мітки стають даними (`skills/<key>/name`), валідатор читає каталог із пака; існуючим кампаніям потрібен data-backfill rules (скрипт, не DDL) або злиття «код за замовчуванням + дані». Плюс — homebrew-навички. **L**, ризик середній–високий (широкий рефактор, i18n у двох місцях на перехідний період).

**3C. Гібрид: код — база, `Ruleset.skills.extra` — додаткові навички з даних.** Офіційні 5 — у код (3A), а розширювач лише для homebrew. **M**, ризик середній; вигода лише для майбутніх паків.

**Рекомендація:** 3A (пакет C0 стає дрібною кодовою правкою, не контент-агентом); 3C — лише якщо зʼявиться запит на homebrew-навички.

**Питання:** Додаємо 5 навичок кодом (3A); Animal Training / Play — відкриті спеціалізації чи фіксований список?

---

## 4. UI-іконки (48 шт.: стани, розміри, психологія, пристрасті, ресурси, локації, результати тестів, герой)

### Що є

- `ActiveEffect.icon?: string` — URL; рендер `components/battle/hud/EffectIcon.tsx` через `OptimizedImage` (оптимізує лише Supabase-URL, інші — `unoptimized`), без іконки — `Sparkles`. Стани WFRP зараз без іконок (`systems/wfrp/rules/conditions/apply.ts` ставить лише label).
- `EffectMarker` (`lib/constants/battle.ts`) — логічні маркери, не картинки; готового набору іконок станів немає.
- Прецеденти inline-SVG/lucide: `components/world/marker-icons.tsx` (мапа ключ → `LucideIcon` + власний SVG), `components/character-profile/inventory/slot-silhouettes.tsx`; `lucide-react` уже залежність.
- `public/` зараз: бренд-іконки, тайли, fx; Vercel CDN, не Supabase.

### Варіанти

**4A. Статичні SVG у `public/` (напр. `public/system-icons/wfrp/<group>/<key>.svg`), посилання шляхом.** Працює з поточним `EffectIcon` без змін ядра (рядок-URL). Egress Supabase — 0 (Vercel CDN, ~1–2 КБ на файл). Колір фіксований у файлі (через `<img>` `currentColor` не працює) → на світлих палітрах (parchment/frost) може не читатися; лікується CSS `mask-image` лише зі зміною компонента. Малювання 48 SVG вручну/вектором. **S–M**, ризик низький.

**4B. Inline SVG-компоненти в системі (`systems/wfrp/ui/icons/`): lucide там, де підходить (Flame, Droplet, EyeOff, EarOff, Skull, Shield, Heart, Footprints…, орієнтовно ~25), решта — власні lucide-подібні (24×24, stroke 2).** Тема — `currentColor`, ідеально на 16–24 px, 0 мережі, ~20–30 КБ у бандлі (ліниво в системному чанку). Потрібен нейтральний шов ядра: `icon` формату `ui:<key>`, який `EffectIcon` віддає системному UI (`systemUiOf(rules).icon?(key)`), без назви системи. Файли: `EffectIcon.tsx`, тип системного UI, реєстр іконок у `systems/wfrp/ui`, `apply.ts` (ставить `icon`), тест. **M**, ризик низький–середній (зміна контракту `systemUiOf`, `pnpm systems:index` не потрібен).

**4C. Генерація PNG тим самим генератором + завантаження в бакет (як контентні іконки).** Живописний стиль погано читається на 16–24 px, без теми; кожен показ — Supabase Storage (через Vercel Image Optimization кешується, але перший запит кожного розміру — egress); потрібні промпти, генерація власником, upload-скрипт і мапінг. **M** + час власника, ризик середній (читабельність, egress).

**Рекомендація:** 4B (lucide + ручні SVG, `currentColor`, без egress); якщо не хочемо міняти контракт системного UI зараз — 4A як тимчасовий крок (ті самі SVG потім переносяться в компоненти). Генерацію (4C) лишити тільки для контентних рядків.

**Питання:** Іконки інтерфейсу — inline SVG у `systems/wfrp/ui` з новим шовом `ui:<key>` (4B) чи статичні SVG у `public/` без зміни ядра (4A)?
