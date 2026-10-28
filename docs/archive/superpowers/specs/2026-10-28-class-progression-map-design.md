# Карта класу: прокачка 5е як єдина картина

## Проблема

Прокачка 5е працює в рушії (вміння класу й підкласу за рівнями, `subclassLevel`, `Choice` з ASI/рисами/опціями, `ClassLevelUpDialog`), але ніде не видна як цілісна картина «рівні 1–20».

- ДМ бачить клас як розрізнені вкладки `ClassForm`: «Основне», «Таблиця класу», «Вміння за рівнями», «Підкласи».
- Гравець бачить на листі плоский список `sheet.classFeatureDescriptions` (`SkillsTab`), а вибір рівня робить в окремому діалозі. Що вже відкрито, що буде далі й де чекає невикористаний вибір — не видно.
- Дерев навичок (`SkillTree`, прив'язані до раси, очки на вузли) у шаблоні 5е немає і бути не повинно: у 5е усе дається автоматично за рівнем плюс вибори.

Еталон від користувача: інфографіка «Варвар — Дерево прокачки» (`~/Downloads/Barbarian Progression Tree Infographic.png`). Рядки — рівні, колонки — база класу, підкласи, вибір гравця.

## Мета й критерії успіху

1. Для кожного класу є одна «Карта класу» 1–20: база класу, колонки підкласів, колонка виборів гравця (ASI / риса / опція / вибір підкласу).
2. ДМ бачить карту на сторінці класу і переходить з клітинки до редагування.
3. Гравець бачить карту на листі з позначками: досягнуто / поточний / наступний / майбутнє, невикористані вибори підсвічені.
4. Нових таблиць і міграцій немає: карта — проекція наявних `features`, `subclasses`, `choices`, `entry.choices`.
5. Шаблон SRD 5.2 відображається без зміни даних (12 класів × 1 підклас).

Поза межами: нова модель вузлів, очки прокачки, зміна правил level-up, нові підкласи в шаблоні (див. «Підкласи»).

## Підкласи й ліцензія

SRD 5.2 дає по одному підкласу на клас (у варвара — Path of the Berserker). Ancestral Guardian, Wild Heart, Totem Warrior та інші з інфографіки в SRD не входять, тому в офіційний шаблон їх не кладемо. ДМ додає їх у `SubclassesEditor`; карта показує будь-яку кількість колонок підкласів. Підказка в `SubclassesEditor`: «SRD містить лише один підклас на клас; інші додайте самі».

## Дизайн

### Чиста функція

`lib/utils/characters/classes/progression.ts`, тести в `__tests__/progression.test.ts`.

```ts
buildClassProgression(cls: GameClassData, entry?: CharacterClassEntry): ClassProgression

interface ClassProgression {
  classId: string;
  subclasses: { id: string; name: string; chosen: boolean }[];
  subclassLevel: number | null;
  rows: ProgressionRow[]; // рівно MAX_CLASS_LEVEL (20)
}

interface ProgressionRow {
  level: number;
  state: "reached" | "current" | "next" | "future" | "template"; // template — без entry (режим ДМа)
  base: ProgressionItem[];
  bySubclass: Record<string, ProgressionItem[]>;
  picks: ProgressionPick[];
}

interface ProgressionItem { key: string; name: string; summary: string }

interface ProgressionPick {
  key: string;
  kind: ChoiceKind | "subclass";
  label: string;
  required: number;
  done: number | null; // null без entry
  status: "open" | "done" | "locked" | "template";
}
```

Правила:

- `base` — `cls.features` на цьому рівні: `abilities[].name` (`summary` — перший рядок опису, обрізаний), `choices` у `base` не потрапляють.
- `bySubclass[id]` — `subclass.features` на цьому рівні.
- `picks`:
  - усі `choices` з `cls.features` і з вибраного підкласу (або з усіх підкласів у режимі ДМа), розміщені за `choice.level`, а не за `feature.level`;
  - на `subclassLevel` додається `kind: "subclass"`, якщо у класі є підкласи; `done` = 1, якщо `entry.subclassId` задано;
  - `required` — `resolveChoiceCount`, `done` — кількість наявних піків у `entry.choices`;
  - `locked` — рівень у класі ще не досягнуто.
- `state`: `reached` — рівень ≤ `entry.level`; `current` — `= entry.level`; `next` — `= entry.level + 1`; решта `future`. Без `entry` — `template`.
- Функція чиста, без `zod` і без доступу до БД; перевикористовує `classChoiceDefs`, `resolveChoiceCount` та `classesById` з `lib/utils/characters/{choices,classes}`. Нового парсингу абілок немає.

### Компонент

`components/classes/progression/ClassProgressionMap.tsx` (+ маленькі підкомпоненти в тій самій теці).

- Props: `progression`, `mode: "dm" | "sheet"`, `actions?: { onOpenLevel(level), onPick(pick), onChooseSubclass() }`.
- Верстка: `HudPanel`, таблиця: рівень | база | колонки підкласів | вибір гравця. Кольорова схема береться з `cls.color`; обраний підклас підсвічено, решта приглушена. Клітинка підкласу зі «слотом» ASI/риси спільна — колонка «вибір» одна.
- Мобільний (<640 px): рядки-картки за рівнями, чіпи `HudChipTabs` для вибору колонки підкласу. Акордеонів у формах немає, а це не форма.
- Стани: поточний рівень виділений, `next` має мітку «наступний», `open`-вибори мають бейдж `PendingChoicesBadge`-стилю.
- Лише відображення, без запитів: дані й колбеки приходять ззовні (правило layering: компонент не імпортує `lib/api`).

### Екрани

1. **ДМ, сторінка класу.** Нова перша вкладка «Карта» в `ClassForm` (`ClassFormTabId` + `"map"`), `mode: "dm"`, `entry` немає. Клік по клітинці: перемикає на вкладку «Вміння за рівнями» чи «Підкласи» і прокручує до рівня. Список класів `ClassCard` без змін.
2. **Лист гравця.** У `SkillsTab` плоский блок «Вміння класу та підкласу» замінюється картою (`mode: "sheet"`, по одній на клас персонажа). Для кампаній без класів (HoMM) вкладка не змінюється: лишається `ProgressionPanel` дерев навичок. Клік по `open`-вибору відкриває наявні `ChoicesDialog` / `CharacterChoicesTab`; кнопка «+ рівень» (`LevelUpAction`) лишається, `LevelUpBadge` без змін.
3. **Level-up.** `ClassLevelUpDialog` не переписуємо. Додається лише короткий підсумок «Що дає рівень N» (рядок мапи `next`) над кроками вибору, з тих самих `ProgressionRow`.

### Дані для листа

`readCharacterSheet` вже віддає `classFeatureDescriptions`. Додається `sheet.classProgression: ClassProgression[]`, зібране на сервері `buildClassProgression` (клас, підклас, піки персонажа вже завантажені); `classFeatureDescriptions` лишається для опису в деталях клітинки. Точне місце в листі визначається в плані після читання `readCharacterSheet`.

### Помилки й краї

- Клас видалено / не знайдено (`ResolvedClassEntry.class === null`): карта цього запису не будується, у листі лишається поточне повідомлення.
- Підкласів немає або `subclassLevel === null`: колонки підкласів і мітки вибору підкласу немає.
- Числові колонки класу (`columns`, вкладка «Таблиця класу») не змінюються; карта їх не дублює.
- Мультиклас: окрема карта на кожен запис, рівні в межах класу.

## Тестування

- `progression.test.ts`: Barbarian із шаблону (рівні 1–20, ASI на 4/8/12/16/19, підклас на 3), без `entry`, з `entry` (current/next/future), з невибраним підкласом, з частково заповненими піками, `locked` вибір, клас без підкласів, мультиклас, невідомі піки ігноруються.
- Компонент (`happy-dom`): рендер 20 рядків, стани, колбеки дії, мобільні чіпи.
- Інтеграційно: сторінка класу SRD і лист персонажа в браузері (десктоп 1440 і 390 px).

## Документація

- `docs/architecture/characters.md` (або `battle.md` «5e: класи й рівні»): розділ «Карта класу».
- `docs/STATUS.md`, запис у `lib/onboarding/whats-new.ts` (користувацька зміна, відповідний хінт «Карта класу» на сторінці класу).

## Повторне використання

`classChoiceDefs`, `resolveChoiceCount`, `classesById`, `toGameClassData` (`lib/utils/characters/...`), `HudPanel`, `HudChipTabs`, `PendingChoicesBadge`-стиль, `ChoicesDialog`, `LevelUpAction`. Нова лише `buildClassProgression` та компонент карти.
