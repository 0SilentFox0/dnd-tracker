# Мобільний профіль персонажа: таби в стилі HUD, лист персонажа з сервера, біографія й цілі

- **Дата:** 2026-10-06
- **Пункт роадмапу:** 8
- **Гілка:** `feat/mobile-profile`
- **Макети:** `.superpowers/brainstorm/75188-1791278044/content/` (локально, не в git): `profile-layout.html`
  (обрано каркас **A** — hero + таби зверху), `profile-tabs.html` (Магія — **шторка**, Речі — **по артефактах**).
  Відхилення від макетів, погоджені після них: HP і слоти — без «поточне/макс» (див. §3.1), позначення «AC».

## 1. Мета

На телефоні (390 px) гравець за секунди бачить головне — HP, AC, влучання й середню шкоду атак, слоти, вміння —
і нічого не обрізається. Профіль, бій і прокачка — одна візуальна система (HUD із пункту 6). Цифри профілю
збігаються з боєм, бо їх рахує той самий рушій. Перегляд гравця не тягне бібліотек (egress Supabase).

**Критерії успіху**

- Один компонент профілю з табами для гравця і ДМа; акордеони, калькулятор шкоди й `damage-preview` видалені.
- Перегляд профілю гравцем робить запити лише `sheet` і `progression` (без `skills`, `main-skills`, `artifacts`,
  `artifact-sets`, `spells`).
- Влучання/≈шкода/AC у профілі = те, що рахує бій для того самого персонажа (тест на фікстурі).
- У ДМа на 390 px «Зберегти» в ActionBar і заголовок редактора не обрізаються й не переносяться.
- Тап одразу після закриття шторки `ResponsiveDialog` спрацьовує.
- Прокачка: іконка раси в рядку «Раса», правильний відмінок «варіант(и/ів)», зона дотику слота ≥ 44 px.

## 2. Поточний стан (для довідки)

- `/character` → `CharacterViewClient`: гравцю `CharacterHeroBlock` + `CharacterViewSingleCard`, ДМу
  `CharacterViewAccordion` (форма з no-op сетерами в `ReadOnlyProvider`). Редагування — два інші акордеони:
  `/character/edit` (`edit-client.tsx`) і `/dm/characters/[characterId]` (`DmCharacterEditForm*`, ActionBar
  «Видалити / Скасувати / Зберегти» + «Підняти рівень (N → N+1)»).
- `useCharacterView` вантажить персонажа (fetch у `useEffect`), бібліотеки артефактів, сетів, заклинань, превʼю шкоди;
  `CharacterAbilitiesSection` і калькулятор — повну бібліотеку вмінь.
- Профіль застосовує лише бонуси артефактів (`sumEquippedArtifactFlatBonuses`); раса, вміння, сети — ні. Модифікатори,
  майстерність, влучання, СЛ не показуються.
- `proficiencyBonus`, `spellSaveDC`, `spellAttackBonus` денормалізовані; бій читає `character.proficiencyBonus`
  (`from-character.ts:126`) — у Ліри (30 рів.) колонка = 2, бій б'є з +2 замість +9.
- `calculateAttackBonus` бере СИЛ/СПР інлайн; решта рушія — через `getAttackAbilityModifier`.
- `personalityTraits`, `ideals`, `bonds`, `flaws` протягнуті через zod/форму/сетери, ніде не рендеряться.
  `hitDice` у формулі HP не бере участі.

## 3. Дані й розрахунок

### 3.1 Схема (expand-only міграція `mobile_profile`)

`characters`:

- `primaryAbility TEXT NULL` — `strength|dexterity|constitution|intelligence|wisdom|charisma`. Задає ДМ чекбоксом.
- `goals JSONB NOT NULL DEFAULT '[]'` — `Array<{ id: string; text: string; status: "active"|"done"|"failed"; author: "dm"|"player" }>`,
  `text` ≤ 300 символів, ≤ 30 цілей.
- Біографія — **наявна колонка `background`** (у UI була «Передісторія»). Формат — простий текст, виділення ДМа —
  розмітка `==фрагмент==`. Нової колонки немає.

`races`:

- `icon TEXT NULL` — URL іконки раси (Supabase Storage, довгий `cacheControl`, показ через `next/image`). Задається в
  редакторі раси (`app/campaigns/[id]/dm/races/[raceId]`) наявним `ImageUpload`. Відображається в голові рядка «Раса»
  прокачки й у hero профілю біля назви раси; без іконки — перша літера, як зараз.

Нових таблиць немає (RLS-тест не зачіпається). Колонки `proficiencyBonus`, `spellSaveDC`, `spellAttackBonus`,
`passive*`, `hitDice`, `personalityTraits`, `ideals`, `bonds`, `flaws` лишаються в БД, але більше не читаються й
не пишуться кодом; прибере їх контрактна міграція (поза цим пунктом). `maxHp`/`currentHp` поза боєм не показуються.

HP і слоти поза боєм: бій стартує з повними HP (`computedMaxHp`) і слотами (`resolveSpellSlotsFromCharacter`),
поточні значення з бою в персонажа не пишуться. Тому профіль показує **максимум**: «HP 127», слоти «I · 4».

### 3.2 Рушій

- `getAttackAbilityModifier(abilities, attackType)` (`lib/utils/common/calculations.ts`): якщо
  `abilities.primaryAbility` задано — модифікатор цієї характеристики для будь-якої атаки; інакше як зараз
  (ближня — СИЛ, дальня — СПР). `BattleParticipant.abilities.primaryAbility?: AbilityKey` заповнює лише
  `from-character`; юніти не змінюються.
- `calculateAttackBonus` (`lib/utils/battle/attack/bonus.ts`) переходить на `getAttackAbilityModifier` — так основна
  характеристика діє і на влучання, і на шкоду (`process/compute`, `reaction`, `damage/breakdown`, `view/hero` уже
  її викликають).
- `from-character`: `proficiencyBonus = getProficiencyBonus(level)`; `spellSaveDC`/`spellAttackBonus` — від нього й
  `spellcastingAbility`. Create / PATCH / level-up перестають записувати денормалізовані колонки.

### 3.3 Лист персонажа — `lib/utils/characters/sheet/`

Чиста функція `buildCharacterSheet(participant, character, extras) → CharacterSheet` (тип у `types/characters.ts`),
де `participant` — результат `createBattleParticipantFromCharacter` + `applyBakedAuras` (як у бою), `extras` —
рядки артефактів/сетів, раса (назва, іконка), прогресія не потрібна (має свій запит). Повертає:

- `identity`: імʼя, аватар, рівень, клас/підклас, раса + `raceIcon` (`Race.icon`), світогляд, гравець.
- `abilities`: 6 × `{ key, score, mod, isPrimary, bonuses: Line[] }` — `score` з урахуванням запечених бонусів.
- `proficiency`, `initiative`, `speed`, `morale`, `targets { min, max }`, `immunities[]`, `languages[]`, `proficiencies`.
- `hp { max, lines: Line[] }` — `getHeroMaxHpBreakdown` з `hpMultiplier`.
- `armorClass { total, lines: Line[] }` — база + запечені/зібрані модифікатори з підписами джерел.
- `attacks[]`: `{ id, name, kind: melee|ranged, toHit { total, lines }, avgDamage { total, lines } }`
  - `toHit` = `calculateAttackBonus(participant, attack)`, розкладка: характеристика (★ якщо основна), майстерність,
    бонус зброї, модифікатори (`collectModifiers` entries з підписами).
  - `avgDamage` = `calculateDamageWithModifiers` від `getDiceAverage(attack.damageDice)` + внесок рівня героя
    (`getHeroDamageComponents`, середнє кубиків рівня) + модифікатор атакувальної характеристики, з урахуванням
    коефіцієнтів ДМа `meleeMultiplier`/`rangedMultiplier` (`hero-dm-multiplier.ts`) — так само, як у бою.
    `lines` — кроки з `DamageStep` (кубики, характеристика, рівень, % вмінь, плоскі бонуси артефактів/сетів/раси).
- `saves[]`, `skills[]`: D&D рятівні кидки й навички — `{ key, label, bonus, proficient }` (мод + майстерність, якщо
  відмічено); пасивні `perception/investigation/insight` рахуються тут, не з колонок.
- `magic`: `{ saveDC, attackBonus, ability } | null`, `slots: { level, count }[]`, `spells: BookSpell[]` (вивчені
  заклинання у формі, яку їсть книга з бою).
- `items`: `{ grid: ArtifactCell[9], artifacts: { id, name, icon, slot, rarity, description, effects: string[] }[],
  sets: { id, name, have, total, effects: string[] }[] }` — `effects` з `abilitySummary` (`lib/utils/abilities/summary.ts`).
- `personalSkill: { id, name, icon, description } | null` — з рядків `extract-skills` (окремого запиту немає).
- `story: { biography: string | null, goals: Goal[] }`.

`Line = { label: string; value: number | string; source?: "ability"|"proficiency"|"weapon"|"skill"|"race"|"artifact"|"artifactSet"|"level"|"base" }`.

### 3.4 API

- `GET /api/campaigns/[id]/characters/[characterId]/sheet` — тонкий `route.ts` + `sheet-handler.ts`. Доступ: ДМ
  кампанії — будь-який персонаж; гравець — лише свій (`controlledBy`). Один `findUnique` + побудова учасника.
- `PUT /api/campaigns/[id]/characters/[characterId]/goals` — Zod `{ goals: Goal[] }`. Гравець (власник) може
  змінювати лише цілі з `author: "player"`: сервер бере з БД цілі ДМа без змін, а для нових цілей гравця сам
  ставить `author: "player"`. ДМ змінює все.
- PATCH персонажа (ДМ) приймає `primaryAbility`, `goals`, `background`; перестає приймати/писати мертві поля.
- Видаляється `GET .../damage-preview` разом з `DamagePreviewResponse`.
- `lib/api/characters.ts`: `getCharacterSheet`, `putCharacterGoals`; прибрати `getCharacterDamagePreview`.

### 3.5 Хуки — `lib/hooks/characters/`

- `useCharacterSheet(campaignId, characterId)` — TanStack Query, ключ `["character-sheet", campaignId, characterId]`,
  `staleTime` 60 с. Єдине джерело для перегляду.
- `useCharacterEdit(campaignId, characterId, { editing })` — обгортає наявний `useCharacterForm`; персонажа та бібліотеки
  (артефакти, сети, раси, вміння + main skills, заклинання) вантажить лише при `editing === true`. Зберегти → PATCH →
  інвалідація листа.
- `useCharacterGoals` — мутація цілей з оптимістичним оновленням листа.
- Інвалідація `["character-sheet", …]` після: прокачки (`useProgressionActions` — замість ключів damage-preview і
  калькулятора), level-up, PATCH, екіпірування, цілей.
- Видаляються: `useCharacterView`, `useDamagePreview`, `damage-preview.ts`, `useDamageCalculator*`.

## 4. Інтерфейс

### 4.1 Маршрути

- Гравець: `/campaigns/[id]/character`; ДМ: `/campaigns/[id]/dm/characters/[characterId]` — обидва рендерять
  `CharacterProfile` з `canEdit` (ДМ) / `isOwner`. `/character/edit` → redirect на сторінку ДМа для свого героя.
- Активна таба — `?tab=combat|skills|magic|items|story|basic`, за замовчуванням `combat`; режим редагування — стан
  компонента (не в URL).

### 4.2 `components/character-profile/`

Увесь профіль — у `HUD_SURFACE`, імпортує `components/hud/hud.css`, метали через `metalClass`, шрифти Alegreya.
Нових кольорів/токенів немає. Порожні стани — `components/common/states`.

- **`CharacterProfile`** — збирає hero, таби, ActionBar у режимі редагування; провайдер `ProfileContext`
  (`sheet`, `edit`, `canEdit`, `isOwner`) замість прокидання пропсів.
- **`ProfileHero`** — портрет, імʼя, «рівень · клас (підклас) · раса», світогляд; чипи **AC · Ініц · Швидк · Влуч ·
  Майст** (Влуч — найкраща атака); «HP N» (тап → розкладка формули). При прокрутці стискається в sticky-рядок
  «Ліра · 30 · HP · AC · Влуч». ДМ: кнопки «Редагувати» та «+ рівень» (наявний level-up, `useConfirm`).
- **`ProfileTabs`** — над `components/ui/tabs`; активна таба — золотий метал, решта приглушені; на 390 px
  5 табів (6 у ДМа в редагуванні) уміщаються без скролу.
- **Бій (`CombatTab`)**
  - `AbilityGrid` — 6 плиток: назва, значення, модифікатор; ★ + золота рамка на основній. Редагування: інпут +
    чекбокс «основна» (одна на персонажа, повторний клік знімає).
  - `AttackList` — рядок: іконка, назва, «+13 влуч · ≈47 шкода»; тап розгортає дві розкладки (`toHit.lines`,
    `avgDamage.lines`). Без атак — порожній стан.
  - `DefenseList` — AC з розкладкою, ініціатива, швидкість, мораль, цілі (мін–макс), імунітети.
  - `SavesSkills` — рятівні кидки й навички з бонусами, ● на відмічених; пасивні сприйняття/розслідування/проникливість;
    мови й володіння одним рядком. Редагування: чекбокси.
- **Вміння (`SkillsTab`)** — `ProgressionPanel` як зараз + картка персонального вміння з листа; селект з бібліотекою
  лише в редагуванні ДМа.
- **Магія (`MagicTab`)** — СЛ, атака заклинанням, характеристика; ряд `SlotPlate` («I · 4», метал кола через
  `spellTier`); кнопка «Книга заклинань» відкриває шторку перегляду. Без магії — порожній стан.
- **Речі (`ItemsTab`)** — сітка 3×3 (іконка / літера, рамка за рідкістю); під нею список артефактів (іконка, назва,
  ефекти) і завершених/часткових сетів (`have/total`, ефекти). Тап по артефакту → `ResponsiveDialog` з описом і всіма
  ефектами. Редагування ДМа: тап по клітинці → вибір артефакту для слоту (наявна логіка екіпірування).
- **Історія (`StoryTab`)**
  - `GoalList` — активні зверху, виконані/провалені нижче (закреслені/приглушені); бейдж «від гравця». Гравець-власник:
    додати / редагувати / видалити свої. ДМ: усе + зміна статусу.
  - `BiographyText` — рендер `==…==` як золоте підсвічування; лише текстові вузли (без `dangerouslySetInnerHTML`),
    абзаци за `\n\n`.
  - `BiographyEditor` (ДМ) — `Textarea` + кнопка «Маркер»: обгортає виділення в `==…==` або знімає, якщо виділення
    всередині підсвіченого фрагмента.
- **Основне (`BasicTab`, лише ДМ у редагуванні)** — імʼя, клас/підклас, раса, світогляд, рівень, аватар, гравець,
  коефіцієнти HP/ближньої/дальньої шкоди (з превʼю HP), «Видалити персонажа» (`useConfirm`).
- **ActionBar** (лише в редагуванні): «Скасувати» · «Зберегти». Заголовок сторінки редагування — коротке «Редагування».

### 4.3 Книга заклинань

З `components/battle/wizards/SpellBook.tsx` виноситься `SpellBookPages` (стрічки кіл, сторінка списку, сторінка
деталі заклинання) з інтерфейсом `{ byLevel, slots, level, selected, onLevel, onPick, onBack, detailFooter? }`.
Бій рендерить його у своїй шторці, а кроки цілей/кидків/підсумку лишаються в `SpellBook` (поведінка бою без змін,
наявні тести зелені). Профіль: `ProfileSpellBook` — `ResponsiveDialog` у `HUD_SURFACE` з `SpellBookPages` без
`detailFooter`; стан — `useSpellBrowser(spells)` (рівень, вибране) у `lib/hooks/characters`.

### 4.4 Видаляється

`app/campaigns/[id]/character/components/character-view/**`, `character-view-client.tsx` (замінюється),
`edit-client.tsx`, `DmCharacterEditForm*.tsx`, `components/characters/stats/CharacterDamageCalculator*` та
`DamageCalculator*`, `CharacterDamagePreview`, `CharacterHeroBlock`, read-only режим форм для перегляду, усе, що після
цього залишиться без імпортів (перевірка `grep` + `pnpm lint` + `tsc`), а також поля `roleplay.*` і `hitDice` у
`CharacterFormData`, zod-схемах і сетерах.

## 5. Відомі проблеми з пункту 8

- **Перший тап після закриття vaul-шторки губиться.** Причину визначити відтворенням (systematic-debugging), гіпотези:
  `pointer-events: none` на `body` під час анімації закриття, живий оверлей. Виправлення — у
  `components/ui/responsive-dialog.tsx` (лікує всі діалоги), регресійний тест.
- **Прокачка:** `RacialRow` — іконка раси: `ProgressionDto` отримує `raceIcon: string | null` (`load-progression-context`
  додає паралельний `race.findFirst({ select: { icon } })` за `campaignId` + назвою раси), літера лише як fallback; `OfferList` — «Ще N варіант/
  варіанти/варіантів» через `pluralUk(n, forms)` у `lib/utils/common`; `SlotButton` — зона дотику ≥ 44 px на
  телефоні (візуальний розмір той самий, розширення невидимим псевдоелементом/відступом).
- **ActionBar ДМа / заголовок редактора** — закриваються §4.2 (дві кнопки, «+ рівень» у hero, коротший заголовок).
- **Профіль тягне бібліотеку вмінь / калькулятор** — закривається §3.3–3.5 і видаленням калькулятора.

## 6. Тестування

- `buildCharacterSheet` на фікстурі Ліри: майстерність 9 при колонці 2; `primaryAbility = dexterity` → +4 у влучанні
  й шкоді ближньої атаки; без `primaryAbility` — СИЛ/СПР; `avgDamage.total` = `calculateDamageWithModifiers` від
  середніх (з коефіцієнтами ДМа); AC з розкладкою; ефекти артефакту й сету; пасивні навички.
- Рушій: `getAttackAbilityModifier`, `calculateAttackBonus` з `primaryAbility`; `from-character` — майстерність від
  рівня; `pnpm simulate-battle` без регресій.
- `highlight` (`lib/utils/characters/biography`): `parseHighlights`, `toggleHighlight` — звичайний, на межах,
  зняття, незакритий `==`, порожній фрагмент.
- API: `sheet` — гравець лише свій (403 на чужого), ДМ будь-який; `goals` — гравець не змінює/не видаляє цілі ДМа,
  `author` ставить сервер, ліміти; PATCH — нові поля, мертві поля ігноруються.
- Компоненти (happy-dom): `ProfileTabs` + `?tab=`; `BiographyText`; `GoalList` (гравець/ДМ); `AbilityGrid` чекбокс
  основної; `OfferList` відмінки; `SlotButton` ≥ 44 px; `ResponsiveDialog` — тап після закриття.
- Хуки: `useCharacterEdit` не вантажить бібліотек без `editing`.
- Редактор раси: завантаження/очищення іконки зберігає `icon`; Zod-схема раси приймає `icon`.
- Браузер (локальна Docker-БД, SIM-кампанія, Ліра; 390 px і десктоп): гравець — усі таби без обрізань, у мережі лише
  `sheet` + `progression`, книга, додавання цілі; ДМ (тимчасово роль у `preview-player-member`, потім повернути) —
  редагування, маркер, основна СПР, «Зберегти» влазить; Влуч Ліри в бою = профілю.

## 7. Поза межами

- Контрактна міграція (drop мертвих колонок) — окремо.
- Редагування гравцем чогось, крім своїх цілей.
- Поточні HP/слоти поза боєм.
