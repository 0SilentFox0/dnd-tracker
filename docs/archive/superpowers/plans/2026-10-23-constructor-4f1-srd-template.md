# Етап 4f-1: конвеєр SRD 5.2 і базовий шаблон — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** офіційний шаблон «5e SRD 5.2» збирається без мережі з закомічених файлів даних (`data/templates/srd-5.2/*.json`, конвертер Open5e → рядки імпортера 4f-0) скриптом `pnpm constructor:srd-template`, несе пресет правил 5e і атрибуцію `campaigns.credits` (копіюється в похідні кампанії, бандл і синхронізацію, видна в UI); заклинання без іконки показують значок школи в її кольорі; `pnpm assets:attach` прив'язує теку іконок до контенту кампанії.

**Architecture:** чистий конвертер у `scripts/srd/` (`lib/` — джерело, типи Open5e, завантаження з перевіркою md5, хелпери; `convert/*.ts` — рядок Open5e → рядок імпортера; `overrides/*.ts` — ручні таблиці за `slug`) → `pnpm srd:build` пише JSON у `data/templates/srd-5.2/` + `manifest.json`. Завантажувач `scripts/srd/load-template.ts` знаходить/створює шаблон через `createCampaignFromBundle`, пише пресет і `credits`, потім `importContent(..., mode: "update")` за видами (кеш Next не інвалідовує — нова залежність `ImportDeps.invalidate`). Атрибуція — колонка `campaigns.credits` (міграція лише розширює), шлях: бандл (`exportCampaign`/`BundleSchema`) → `createCampaignFromBundle` → синхронізація (`writeCampaign`). Значки шкіл — нові ключі `SPELL_GROUP_ICON_KEYS` + один компонент `SpellIcon` у всіх місцях показу заклинання. Рушій бою не змінюється.

**Tech Stack:** TypeScript strict, `tsx`-скрипти (`tsconfig.scripts.json`), Prisma 6, Zod 4, Supabase Storage (`createAdminClient`, `ensureBucket`, `staticAssetUploadOptions`), React 19, lucide-react, Vitest (+ happy-dom для компонентів).

**Spec:** `docs/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md` — розділи «## 4f. Шаблон 5e SRD: рішення», «## 4f-1. Дизайн: конвеєр і базовий шаблон», «Загальні правила етапу 4», «Ризики». **Уточнення користувача 2026-10-23 (переважає текст спеку):** жодних сторонніх іконок у 4f-1 — немає DCSS, Painterly, `pnpm srd:icons`, `sharp`, таблиць відповідності іконок; лишаються 8 запасних значків шкіл і `pnpm assets:attach … --kind units|spells|artifacts|classes|races|skills|main-skills`, який для офіційного шаблону працює лише з `--allow-official`; `credits` = атрибуція SRD 5.2 + Open5e (без рядків Painterly/DCSS). Дослідження даних: `/Users/silentfox/.claude/jobs/4ad97a0b/tmp/srd/mapping-report.md` (не комітимо; закріплений SHA той самий).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; `/Users/silentfox/Work/dnd-tracker` не чіпати. БД лише `postgresql://postgres:postgres@localhost:54322/constructor`; prod і prodcopy не чіпати.
- **Нульова зміна HOMM5 і рушія.** Жодних змін у `lib/utils/battle/**`, `lib/utils/abilities/engine/**`. 5 наявних ключів значків шкіл (`moon`, `flame`, `sparkles`, `sun`, `shell`) і їхні значки не змінюються. Наявні тести (до першого коміту плану) не редагувати — лише додавати нові `it(...)`/файли.
- Міграція одна: `prisma/migrations/20261031000000_campaign_credits/migration.sql` = `ALTER TABLE "campaigns" ADD COLUMN "credits" TEXT;` (лише розширення; таблиця вже з RLS). Застосування: `set -a; source .env.local; set +a; pnpm exec prisma migrate deploy && pnpm exec prisma generate` (**не** `migrate dev`).
- Джерело Open5e: репозиторій `open5e/open5e-api`, тека `data/v2/wizards-of-the-coast/srd-2024`, SHA `e69ac13b49dae6a9d84abf38fc674fe1db5b392b` (гілка `staging`; `main` не брати). Сирі файли — лише в tmp (`os.tmpdir()`), у репо не комітимо; перевірка md5 обов'язкова.
- Мова контенту шаблону — англійська, оригінальні тексти SRD; кожен рядок даних має унікальний `slug` (`srd-2024_…`), імпортер його не отримує (`toImportRows` прибирає). Назва шаблону — «5e SRD 5.2» (без «D&D», без логотипів).
- Порядок імпорту: `spell-groups → spells → races → classes → units → artifacts` (`SRD_KINDS`).
- Текст атрибуції (дослівно): `This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.` + порожній рядок + `Data via Open5e (open5e/open5e-api, commit e69ac13b49dae6a9d84abf38fc674fe1db5b392b).`
- `credits` у UI — лише читання; через `PATCH /campaigns/[id]` не змінюється.
- Токени Forgotten Adventures ніколи не потрапляють у репо чи офіційний шаблон; `assets:attach` без `--allow-official` відмовляє для офіційного шаблону.
- Шари й стиль: компоненти не імпортують `@/lib/api/*`; UI українською, ідентифікатори англійською; мінімум коментарів (лише неочевидне «чому»). ESLint: порожні рядки навколо `const`/`let`/`if`/`return`/блоків, `simple-import-sort`, `import/no-cycle`, `no-console` (у `scripts/` дозволено `info/warn/error`). Імпорти всередині `scripts/srd` — відносні (`../lib/...`), з `lib/` — через `@/`.
- Тести: під час роботи `pnpm test:run <files>`; повний `pnpm test:run`, `pnpm lint`, `pnpm build` — лише в задачі 14. `pnpm build` тип-перевіряє й тести та `scripts/**`, тож код тестів має бути коректним за типами (касти `as unknown as T`, як у сусідніх тестах).
- Коміти з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; `.superpowers/` не комітити.

## Review Focus

1. **Повторний запуск завантажувача** на наявному шаблоні: шаблон не дублюється, правила й `credits` переписуються, кожен рядок — `updated` (не `created`, не `error`), кількість рядків у таблицях не росте. Тест `ensureSrdTemplate` (наявний → update) у задачі 12 + крок повторного прогону там же.
2. **Заклинання HOMM без іконки / з битою іконкою / без школи**: без іконки — значок школи в кольорі школи (для 5 ключів HOMM — ті самі значки, що зараз у списку шкіл), без школи — `Sparkles`, бита URL — той самий запасний значок замість порожнього місця. Тести в задачі 4.
3. **Кампанія з шаблону без `credits`** («Heroes», «Порожня», бандл старого формату без поля): `credits` не задається (null), синхронізація з джерелом без зміни `credits` і без правил/налаштувань не оновлює кампанію. Тести в задачі 2.
4. **Імена файлів `assets:attach`**: `Adult_Red_Dragon_A1.webp`, `adult-red-dragon.png`, `srd-2024_fireball.webp` (slug), `hunters-mark.png` (лише через slug даних SRD) і `Hunter's_Mark.png` → «Hunter's Mark», назва з двокрапкою, кириличні назви, два варіанти одного монстра (береться перший, другий — у звіт), файл без пари — у звіт; офіційний шаблон без `--allow-official` — відмова. Тести в задачі 13.
5. **Вади даних Open5e**: атака без кубика («1 Piercing damage», `damage_die_count: 0`), «Melee or Ranged» лише текстом, d100 у заклинанні, рятівний кидок монстра = модифікатору (не майстерність), gargantuan (сітка максимум 3), «Choose any 3 skills», друкарські помилки «Studdied»/«Unarmoed»/«In sight»/«Na ture». Тести в задачах 6, 8, 9.

## Рішення щодо неоднозначностей спеку

- **Іконки (уточнення 2026-10-23).** Розділ 5 спеку замінено: сторонніх наборів немає; іконки офіційного шаблону користувач генерує сам і заливає `assets:attach --allow-official`. Правку тексту спеку (рядок «Іконки:» у 4f, атрибуція в 4f-1 §2, §5, §7, рядок «Ліцензії ассетів» у «Ризиках») робить контролер окремо — ця задача її не містить.
- **Ініціатива (спек: «перевірити в плані»).** Рушій сортує хід за сталим `initiative` без кидка d20; героям `create-character`/`patch-character` дозволяють лише `[heroMin, heroMax]` (за замовчуванням 10–16, HOMM), а монстри SRD мають `initiative_bonus` −5…+20. Пресет задає `initiative: { heroMin: 0, heroMax: 20 }`, щоб ДМ вводив герою бонус ініціативи 5e в тій самій шкалі, що й у монстрів. Кидок ініціативи — поза 4f-1 (рушій не змінюємо).
- **Юніт без раси (спек: «перевірити»).** `createBattleParticipantFromUnit` терпить `raceId = null` (`race: ""`), баланс `pickEnemyRoster` фільтрує за расою лише якщо її передано, баланс `xp` бере CR. Монстри SRD імпортуються без раси; тип істоти, мовлення, чуття, режими руху — у вмінні-нотатці «Statblock».
- **Розмір на мапі:** `gridSize` у схемі юніта — 1…3, тож gargantuan → 3 (спек казав 4).
- **«Рівень-тір з CR»:** `level = clamp(ceil(CR), 1, 30)` (дробові CR → 1); список юнітів групується за рівнем, тобто за CR.
- **Коло заклинання:** `size` = радіус у футах, як у SRD (Fireball 20). Рушій малює коло `areaRadiusCells(size) = ⌊size/10⌋` клітинок (20 фт → 5×5) — це поведінка HOMM, у 4f-1 не змінюємо (відкрите питання до 4f-5).
- **Стилі бою** (Archery, Defense, Two-Weapon) — у SRD 5.2 це риси на вибір (4f-4); у 4f-1 вміння «Fighting Style» лишається нотаткою. **Aura of Protection** — нотатка: формули вмінь не мають модифікаторів характеристик (`hero_level`, `lost_hp_percent`, `morale`, `cells_moved`).
- **Action Surge** = вміння-дія `grantAction extraActions: 2` (дія витрачається першою, перша додаткова повертає її, друга йде в пул) — працює, лише поки дія ще не витрачена (обмеження наявного `runAbilityUse`). **Second Wind** = бонусна дія, два ефекти `heal` («1d10» і `{ formula: "hero_level" }`), `perRest long 2`.
- **Таймові баффи** (Bless, Bane, Haste…) — пласкі наближення (`±2` замість `1d4`), бо `modifyStat.flat` не приймає кубиків; тривалість: «1 minute» = 10 раундів, довше = 99.
- **Заклинання-реакції й 1 хв+** — оболонки з `cost: "action"`, час накладання — у першому рядку опису.
- **Атаки монстра:** `damage_bonus` відкидаємо (рушій додає мод. сам); якщо бонус = мод. Спр і ≠ мод. Сил у ближній атаці — трейт `finesse`; інший бонус — примітка в `properties`. Друга шкода — `properties` («plus 2d4 fire damage»).
- **Імунітети до шкоди** — не список `immunities` (рушій розпізнає там лише вогонь/отруту/магію), а вміння з `flag resistance` (100 / 50 / −100) для кожного типу; імунітет до станів — `flag conditionImmunity`.
- **Легендарні дії** — вміння `trigger: action`, `limits.legendaryCost` з даних (усі 1), ефект — нотатка; кількість — 3 (у даних немає).
- **Унікальність артефактів.** Один артефакт тримає один персонаж (`findHolder`), тож зброя SRD («Longsword») — один примірник на кампанію; ДМ дублює рядок, якщо треба. Модель не змінюємо (відкрите питання).
- **Файлів Open5e — 17**, а не «20»: лише ті, що читає конвертер.
- **Кеш Next у скриптах.** `importContent` після запису кличе `invalidateReference` → `revalidateTag`, що поза Next кидає «static generation store missing». Додаємо необов'язкову залежність `ImportDeps.invalidate` (за замовчуванням — `invalidateReference`); скрипти передають no-op і друкують, що довідник оновиться протягом `REFERENCE_REVALIDATE_SECONDS`.
- **`credits` при синхронізації** — копіюється разом із будь-яким застосуванням змін, лише якщо відрізняється від поточного (без окремого пункту диффу).
- **Власник шаблону** — `--owner <userId>` або DM найстарішого офіційного шаблону; якщо немає ні того, ні іншого — помилка з підказкою.

---

## Карта файлів

| Файл | Відповідальність |
|---|---|
| `scripts/srd/lib/source.ts` | SHA, шляхи, 17 файлів з md5, URL, тека даних |
| `scripts/srd/lib/credits.ts`, `scripts/srd/lib/rules-preset.ts` | текст атрибуції, пресет правил шаблону |
| `scripts/srd/lib/open5e.ts` | типи фікстур Open5e, `loadOpen5e`, `slugTail`, `groupBy` |
| `scripts/srd/lib/fetch.ts` | завантаження в tmp з перевіркою md5 |
| `scripts/srd/lib/text.ts`, `scripts/srd/lib/abilities.ts`, `scripts/srd/lib/types.ts` | хелпери тексту/кубиків, конструктори вмінь, типи рядків і `SRD_KINDS` |
| `scripts/srd/extract-fixture.ts` | CLI: вирізати фікстури тестів з даних Open5e |
| `scripts/srd/convert/{spell-groups,spells,races,classes,units,artifacts}.ts` | конвертери |
| `scripts/srd/overrides/{spells,races,classes,units}.ts` | ручні таблиці за slug |
| `scripts/srd/lib/build-data.ts`, `scripts/srd/lib/data-files.ts`, `scripts/srd/build.ts` | збірка, запис/читання файлів даних, CLI `pnpm srd:build` |
| `scripts/srd/lib/load-template.ts`, `scripts/srd/load-template.ts` | логіка і CLI `pnpm constructor:srd-template` |
| `scripts/assets/attach-lib.ts`, `scripts/assets/attach-assets.ts` | логіка і CLI `pnpm assets:attach` (зіставлення за назвою й за `slug` з даних SRD) |
| `scripts/srd/__tests__/**`, `scripts/assets/__tests__/attach-lib.test.ts` | тести, фікстури |
| `data/templates/srd-5.2/{manifest,spell-groups,spells,races,classes,units,artifacts}.json` | згенеровані дані (комітимо) |
| `prisma/schema.prisma`, `prisma/migrations/20261031000000_campaign_credits/migration.sql` | колонка `credits` |
| `lib/server/templates/{bundle,export-campaign}.ts`, `lib/server/campaigns/create-campaign.ts`, `lib/server/templates/sync/{context,apply,types}.ts`, `lib/server/templates/list-templates.ts` | шлях `credits` |
| `types/campaigns.ts`, `components/campaigns/templates/{TemplateTile,TemplatePicker,CreditsText}.tsx`, `components/campaigns/settings/CampaignSettingsDialog.tsx`, `app/campaigns/[id]/page.tsx` | показ `credits` |
| `lib/constants/spell-groups.ts`, `lib/utils/spells/spell-icons.ts`, `components/spells/SpellIcon.tsx`, `components/spells/book/{SpellRow,SpellBookPages}.tsx`, `components/spells/list/{SpellCard,SpellPrintCard,SelectedSpellsList}.tsx` | значки шкіл і запасне правило |
| `lib/server/content/import/import-content.ts` | `ImportDeps.invalidate`, експорт `DEFAULT_IMPORT_DEPS` |
| `package.json` | скрипти `srd:build`, `constructor:srd-template`, `assets:attach` |
| `docs/architecture/content-api.md`, `docs/STATUS.md`, `docs/superpowers/constructor-handoff.md` | документи |

---

### Task 1: Джерело, атрибуція й пресет правил

**Files:**
- Create: `scripts/srd/lib/source.ts`, `scripts/srd/lib/credits.ts`, `scripts/srd/lib/rules-preset.ts`
- Test: `scripts/srd/__tests__/preset.test.ts`

**Interfaces:**
- Produces: `OPEN5E_SHA`, `OPEN5E_REPO`, `OPEN5E_PATH`, `OPEN5E_FILES: Record<Open5eFile, string>` (md5), `type Open5eFile`, `open5eUrl(file): string`, `SRD_DATA_DIR: string`; `SRD_ATTRIBUTION`, `SRD_CREDITS: string`; `SRD_RULES: Ruleset`.

- [ ] **Step 1: Write the failing test** — `scripts/srd/__tests__/preset.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { parseRules } from "@/lib/utils/rules/schema";

import { SRD_CREDITS } from "../lib/credits";
import { SRD_RULES } from "../lib/rules-preset";
import { OPEN5E_FILES, OPEN5E_SHA, open5eUrl } from "../lib/source";

describe("SRD rules preset", () => {
  it("matches the spec table and survives parseRules unchanged", () => {
    expect(parseRules(SRD_RULES)).toEqual(SRD_RULES);
    expect(SRD_RULES.morale.enabled).toBe(false);
    expect(SRD_RULES.criticals).toMatchObject({ critOn: 20, fumbleOn: 1, effects: false, doubleDice: true });
    expect(SRD_RULES.formulas).toEqual({ saveDcBase: 8, proficiencyBase: 2, proficiencyEvery: 4 });
    expect(SRD_RULES.saves.proficiency).toBe(true);
    expect(SRD_RULES.deathSaves).toEqual({ enabled: true, unitsDieAtZero: true });
    expect(SRD_RULES.concentration.enabled).toBe(true);
    expect(SRD_RULES.conditions).toEqual({ enabled: true, exhaustion: "2024" });
    expect(SRD_RULES.actions).toEqual({ enabled: true, opportunityAttacks: true, variant: "2024" });
    expect(SRD_RULES.classes.enabled).toBe(true);
    expect(SRD_RULES.outOfCombat).toEqual({ persistResources: true, longRestHitDice: "all", xp: true, inspiration: true });
    expect(SRD_RULES.encounters).toEqual({ balance: "xp", edition: "2024", autoXp: true });
    expect(SRD_RULES.defaultAttacks).toEqual({ meleeName: "Unarmed Strike", rangedName: "Ranged Attack" });
    expect(SRD_RULES.initiative).toEqual({ heroMin: 0, heroMax: 20 });
  });
});

describe("SRD source and credits", () => {
  it("pins 17 Open5e files with md5 and a raw URL at the SHA", () => {
    expect(Object.keys(OPEN5E_FILES)).toHaveLength(17);
    expect(Object.values(OPEN5E_FILES).every((h) => /^[0-9a-f]{32}$/.test(h))).toBe(true);
    expect(open5eUrl("Spell")).toBe(`https://raw.githubusercontent.com/open5e/open5e-api/${OPEN5E_SHA}/data/v2/wizards-of-the-coast/srd-2024/Spell.json`);
  });

  it("credits carry the CC-BY attribution and the Open5e commit, no icon packs", () => {
    expect(SRD_CREDITS.startsWith('This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC')).toBe(true);
    expect(SRD_CREDITS).toContain("https://creativecommons.org/licenses/by/4.0/legalcode.");
    expect(SRD_CREDITS).toContain(`Data via Open5e (open5e/open5e-api, commit ${OPEN5E_SHA}).`);
    expect(SRD_CREDITS).not.toMatch(/Painterly|Dungeon Crawl/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/preset.test.ts`
Expected: FAIL — `Cannot find module '../lib/credits'`.

- [ ] **Step 3: Write minimal implementation**

`scripts/srd/lib/source.ts`:

```ts
import * as path from "path";

export const OPEN5E_REPO = "open5e/open5e-api";

export const OPEN5E_SHA = "e69ac13b49dae6a9d84abf38fc674fe1db5b392b";

export const OPEN5E_PATH = "data/v2/wizards-of-the-coast/srd-2024";

export const OPEN5E_FILES = {
  Document: "1be9b6dd22edfdfcff011667582eadaa",
  CharacterClass: "96808072805a3f4fd7b481c3cc5686b1",
  ClassFeature: "0ad7eb8dfdf0a52bd3f820a08bf91b71",
  ClassFeatureItem: "7b03db59a168a39dac5a89bd96674014",
  Species: "6e4e6727222a17e7265f138d285cba09",
  SpeciesTrait: "1c72e4b25d6bd35067eb92d39df0ce9c",
  Spell: "7dc8262eed2abc9b01aa26f13c1d45c4",
  SpellCastingOption: "414ec1f52cb4ed09a7e37328e60d6f13",
  Creature: "240d057d5eb325c3b5aac355bc8ee6e1",
  CreatureAction: "9d2d30a28f96a2cb35fd5664a67b07c9",
  CreatureActionAttack: "f9b09865c7af03f6167fd802b50091a8",
  CreatureTrait: "bee89cdde4d568cbd4e1b4c3455f5cbd",
  Weapon: "76ce1580250ca8bb85ab78753e1e214f",
  WeaponProperty: "a2f1957ec73e1425b3c08be2660d9afa",
  WeaponPropertyAssignment: "4a0fb2f1821dc2a1f5b906fca5573621",
  Armor: "8e030b74c8a06cb40a3f924565dc59d6",
  Item: "4f02971a31a32db793e357d3cd0624c8",
} as const;

export type Open5eFile = keyof typeof OPEN5E_FILES;

export const open5eUrl = (file: Open5eFile) => `https://raw.githubusercontent.com/${OPEN5E_REPO}/${OPEN5E_SHA}/${OPEN5E_PATH}/${file}.json`;

export const SRD_DATA_DIR = path.join(process.cwd(), "data", "templates", "srd-5.2");
```

`scripts/srd/lib/credits.ts`:

```ts
import { OPEN5E_REPO, OPEN5E_SHA } from "./source";

export const SRD_ATTRIBUTION =
  'This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.';

export const SRD_CREDITS = `${SRD_ATTRIBUTION}\n\nData via Open5e (${OPEN5E_REPO}, commit ${OPEN5E_SHA}).`;
```

`scripts/srd/lib/rules-preset.ts`:

```ts
import { type Ruleset, RulesetSchema } from "@/lib/utils/rules/schema";

// heroMin/heroMax: turn order uses a static initiative with no d20, so heroes take the same 5e bonus scale as SRD monsters (−5…+20)
export const SRD_RULES: Ruleset = RulesetSchema.parse({
  morale: { enabled: false },
  criticals: { critOn: 20, fumbleOn: 1, effects: false, doubleDice: true },
  formulas: {},
  initiative: { heroMin: 0, heroMax: 20 },
  defaultAttacks: { meleeName: "Unarmed Strike", rangedName: "Ranged Attack" },
  saves: { proficiency: true },
  deathSaves: { enabled: true, unitsDieAtZero: true },
  concentration: { enabled: true },
  conditions: { enabled: true, exhaustion: "2024" },
  actions: { enabled: true, opportunityAttacks: true, variant: "2024" },
  classes: { enabled: true },
  outOfCombat: { persistResources: true, longRestHitDice: "all", xp: true, inspiration: true },
  encounters: { balance: "xp", edition: "2024", autoXp: true },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run scripts/srd/__tests__/preset.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/srd/lib/source.ts scripts/srd/lib/credits.ts scripts/srd/lib/rules-preset.ts scripts/srd/__tests__/preset.test.ts
git commit -m "feat(constructor): SRD 5.2 source pin, credits text and rules preset

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Колонка `campaigns.credits` і її шлях (створення, бандл, синхронізація)

**Files:**
- Modify: `prisma/schema.prisma` (модель `Campaign`, після `aiInstructions String?`)
- Create: `prisma/migrations/20261031000000_campaign_credits/migration.sql`
- Modify: `lib/server/templates/bundle.ts`, `lib/server/templates/export-campaign.ts`, `lib/server/campaigns/create-campaign.ts`, `lib/server/templates/sync/types.ts`, `lib/server/templates/sync/context.ts`, `lib/server/templates/sync/apply.ts`
- Test: `lib/server/templates/__tests__/bundle.test.ts`, `lib/server/campaigns/__tests__/create-campaign.test.ts`, `lib/server/templates/sync/__tests__/apply.test.ts` (лише нові `it`)

**Interfaces:**
- Produces: `Campaign.credits: string | null` (Prisma); `Bundle.credits?: string | null`; `BundleSchema` приймає `credits` (рядок ≤ 10 000, `null` або відсутнє); `exportCampaign` повертає `credits` (`null`, якщо немає); `createCampaignFromBundle` пише `credits`, коли поле є в бандлі; `SyncContext.target.credits?: string | null`.

- [ ] **Step 1: Write the failing tests**

У `lib/server/templates/__tests__/bundle.test.ts` додати імпорт типу `type Bundle` до наявного `import { BUNDLE_TABLES, BundleSchema } from "../bundle";` (→ `import { BUNDLE_TABLES, type Bundle, BundleSchema } from "../bundle";`) і новий блок у кінець файлу:

```ts
describe("BundleSchema credits", () => {
  it("accepts a string, null or no field; rejects a number", () => {
    expect(BundleSchema.safeParse({ ...empty, credits: "CC-BY" }).success).toBe(true);
    expect(BundleSchema.safeParse({ ...empty, credits: null }).success).toBe(true);
    expect(BundleSchema.safeParse(empty).success).toBe(true);
    expect(BundleSchema.safeParse({ ...empty, credits: 5 }).success).toBe(false);
    expect((BundleSchema.parse({ ...empty, credits: "CC-BY" }) as Bundle).credits).toBe("CC-BY");
  });
});
```

У `lib/server/campaigns/__tests__/create-campaign.test.ts` всередині `describe("createCampaignFromBundle", …)`:

```ts
  it("credits з бандла записуються в кампанію; бандл без поля credits не задає", async () => {
    m.tx.campaign.create.mockResolvedValue({ id: "c1" });

    await createCampaignFromBundle({ userId: "u1", name: "N", bundle: { ...bundle, credits: "SRD 5.2" } });
    await createCampaignFromBundle({ userId: "u1", name: "N", bundle });

    expect(m.tx.campaign.create.mock.calls[0][0].data).toMatchObject({ credits: "SRD 5.2" });
    expect(m.tx.campaign.create.mock.calls[1][0].data).not.toHaveProperty("credits");
  });
```

У `lib/server/templates/sync/__tests__/apply.test.ts` додати до імпортів `import { vi } from "vitest";` (злити з наявним `import { beforeEach, describe, expect, it } from "vitest";` → `import { beforeEach, describe, expect, it, vi } from "vitest";`) і `import { exportCampaign } from "@/lib/server/templates/export-campaign";`; новий блок у кінці файлу:

```ts
describe("credits", () => {
  it("exportCampaign віддає credits; null, коли їх немає", async () => {
    expect((await exportCampaign(f.db, SRC)).credits).toBeNull();

    f.patchCampaign(SRC, { credits: "SRD 5.2" });

    expect((await exportCampaign(f.db, SRC)).credits).toBe("SRD 5.2");
  });

  it("застосування змін копіює credits джерела", async () => {
    f.patchCampaign(SRC, { credits: "SRD 5.2" });
    f.patchRow("spell", SPELL, { name: "Bless II" });

    const [item] = await visible();

    await applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] });

    expect(f.campaign(TGT).credits).toBe("SRD 5.2");
  });

  it("без змін credits, правил і налаштувань кампанія не оновлюється", async () => {
    f.patchRow("spell", SPELL, { name: "Bless II" });

    const [item] = await visible();

    const update = vi.spyOn((f.db as unknown as { campaign: { update: (a: unknown) => Promise<unknown> } }).campaign, "update");

    await applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] });

    expect(update).not.toHaveBeenCalled();
  });
});
```

(`f.patchCampaign` уже є у `fake-sync-db.ts` — використовується в наявному тесті «applies rules per mechanic and settings».)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/server/templates/__tests__/bundle.test.ts lib/server/campaigns/__tests__/create-campaign.test.ts lib/server/templates/sync/__tests__/apply.test.ts`
Expected: FAIL — `credits` відкидається схемою / не потрапляє в `data` / `credits` undefined.

- [ ] **Step 3: Migration and schema**

`prisma/migrations/20261031000000_campaign_credits/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN "credits" TEXT;
```

У `prisma/schema.prisma`, модель `Campaign`, одразу після рядка `aiInstructions  String?`:

```prisma
  credits         String?
```

Застосувати: `pnpm exec prisma format && set -a; source .env.local; set +a; pnpm exec prisma migrate deploy && pnpm exec prisma generate`.
Expected: `1 migration found … applied`, клієнт згенеровано.

- [ ] **Step 4: Bundle and export**

`lib/server/templates/bundle.ts` — у `BundleSchema` після `rules: z.unknown(),`:

```ts
  credits: z.string().max(10_000).nullable().optional(),
```

і в типі `Bundle`:

```ts
export type Bundle = {
  formatVersion: 1;
  settings: { maxLevel: number; xpMultiplier: number; allowPlayerEdit: boolean; friendlyFire: boolean };
  rules: unknown;
  credits?: string | null;
} & Record<BundleTable, Array<Record<string, unknown> & { id: string }>>;
```

`lib/server/templates/export-campaign.ts`:

```ts
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { ...SETTINGS_SELECT, rules: true, credits: true },
  });

  if (!campaign) throw new BundleInvalidError("Кампанію не знайдено");

  const bundle: Record<string, unknown> = {
    formatVersion: 1,
    settings: settingsOf(campaign),
    rules: parseRules(campaign.rules),
    credits: campaign.credits ?? null,
  };
```

- [ ] **Step 5: Create from bundle**

`lib/server/campaigns/create-campaign.ts`, у `campaignData` після рядка з `rules`:

```ts
    ...(input.bundle?.credits !== undefined && { credits: input.bundle.credits }),
```

- [ ] **Step 6: Source sync**

`lib/server/templates/sync/types.ts` — у `SyncContext` поле `target` стає:

```ts
  target: { settings: Bundle["settings"]; rules: unknown; credits?: string | null; rows: LocalRow[] };
```

`lib/server/templates/sync/context.ts` — у `loadSyncContext`: `select: { createdFromId: true, rules: true, credits: true, ...SETTINGS_SELECT }` і `target: { settings: settingsOf(campaign), rules: campaign.rules, credits: campaign.credits ?? null, rows }`.

`lib/server/templates/sync/apply.ts` — `writeCampaign` повністю:

```ts
async function writeCampaign(db: SyncDb, ctx: SyncContext, selected: SyncItem[]) {
  const rules = selected.filter((i) => i.scope === "rules");

  const settings = selected.some((i) => i.scope === "settings");

  const credits = ctx.sourceBundle.credits ?? null;

  const creditsChanged = credits !== (ctx.target.credits ?? null);

  if (rules.length === 0 && !settings && !creditsChanged) return;

  const src = parseRules(ctx.sourceBundle.rules) as Record<string, unknown>;

  const next = { ...(parseRules(ctx.target.rules) as Record<string, unknown>) };

  for (const r of rules) next[r.key] = src[r.key];

  await db.campaign.update({
    where: { id: ctx.campaignId },
    data: {
      ...(rules.length > 0 && { rules: next as Prisma.InputJsonObject }),
      ...(settings && settingsOf(ctx.sourceBundle.settings)),
      ...(creditsChanged && { credits }),
    },
  });
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test:run lib/server/templates lib/server/campaigns`
Expected: PASS (наявні тести без змін + 5 нових).

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261031000000_campaign_credits lib/server/templates lib/server/campaigns
git commit -m "feat(constructor): campaigns.credits through bundle, create-from-template and source sync

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Показ `credits` — картка шаблону, банер, налаштування

**Files:**
- Modify: `types/campaigns.ts` (`TemplateCard`, `CampaignSettingsMeta`), `lib/server/templates/list-templates.ts`, `components/campaigns/templates/TemplateTile.tsx`, `components/campaigns/templates/TemplatePicker.tsx`, `components/campaigns/settings/CampaignSettingsDialog.tsx`, `app/campaigns/[id]/page.tsx`
- Create: `components/campaigns/templates/CreditsText.tsx`
- Test: `components/campaigns/__tests__/template-picker-credits.test.tsx` (новий), `components/campaigns/settings/__tests__/CampaignSettingsDialog.test.tsx` (новий `describe`)

**Interfaces:**
- Consumes: `Campaign.credits` (задача 2).
- Produces: `TemplateCard.credits?: string | null`, `CampaignSettingsMeta.credits?: string | null`; `CreditsText({ credits: string; className?: string })`; `TemplateTile` отримує необов'язковий `footnote?: ReactNode`.

- [ ] **Step 1: Write the failing tests**

Мок `@/lib/hooks/campaigns` — один на файл, тож для картки з атрибуцією — **новий** файл `components/campaigns/__tests__/template-picker-credits.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TemplatePicker } from "@/components/campaigns/templates/TemplatePicker";
import type { TemplateCard } from "@/types/campaigns";

const srd: TemplateCard = { id: "s1", name: "5e SRD 5.2", description: null, visibility: "official", counts: { races: 9, units: 331, spells: 339 }, credits: "This work includes material from the System Reference Document 5.2" };

const heroes: TemplateCard = { id: "h1", name: "Heroes", description: null, visibility: "official", counts: { races: 7, units: 152, spells: 90 } };

vi.mock("@/lib/hooks/campaigns", () => ({
  useTemplates: () => ({ data: { official: [srd, heroes], mine: [] } }),
  useBundleFilePicker: () => ({
    file: new File(["{}"], "c.json"),
    status: { error: null, success: null, isLoading: false },
    actions: { handleFileChange: () => undefined, handleImport: async () => undefined, reset: () => undefined },
  }),
}));

describe("TemplatePicker: credits", () => {
  afterEach(cleanup);

  it("показує атрибуцію на картці шаблону, де вона є", () => {
    render(<TemplatePicker value={{ templateId: null }} onChange={vi.fn()} />);

    const note = screen.getByText(/System Reference Document 5\.2/);

    expect(note.closest("button")?.textContent).toContain("5e SRD 5.2");
    expect(screen.getByText("Heroes").closest("button")?.textContent).not.toContain("System Reference");
  });
});
```

У `components/campaigns/settings/__tests__/CampaignSettingsDialog.test.tsx` — новий `describe` у кінці файлу:

```tsx
describe("CampaignSettingsDialog: джерела й ліцензії", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("показує credits лише для читання, коли вони є", () => {
    renderDialog({ credits: "SRD 5.2 by Wizards of the Coast LLC" });
    expect(screen.getByText("Джерела й ліцензії")).toBeInTheDocument();
    expect(screen.getByText("SRD 5.2 by Wizards of the Coast LLC")).toBeInTheDocument();
  });

  it("без credits розділу немає", () => {
    renderDialog();
    expect(screen.queryByText("Джерела й ліцензії")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run components/campaigns/__tests__/template-picker-credits.test.tsx components/campaigns/settings/__tests__/CampaignSettingsDialog.test.tsx`
Expected: FAIL — текст атрибуції / «Джерела й ліцензії» не знайдено.

- [ ] **Step 3: Types and list**

`types/campaigns.ts`:

```ts
export interface TemplateCard {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  counts: Record<string, number>;
  credits?: string | null;
}
```

```ts
export interface CampaignSettingsMeta {
  createdFromId: string | null;
  isTemplate: boolean;
  credits?: string | null;
}
```

`lib/server/templates/list-templates.ts`: у `select` додати `credits: true,` після `visibility: true,`; `toCard`:

```ts
const toCard = ({ _count, ...t }: { id: string; name: string; description: string | null; visibility: string; credits: string | null; _count: Record<string, number> }): TemplateCard => ({
  ...t,
  counts: _count,
});
```

- [ ] **Step 4: Components**

`components/campaigns/templates/CreditsText.tsx`:

```tsx
import { cn } from "@/lib/utils";

export function CreditsText({ credits, className }: { credits: string; className?: string }) {
  return <p className={cn("whitespace-pre-line break-words text-xs leading-5 text-hud-muted", className)}>{credits}</p>;
}
```

`components/campaigns/templates/TemplateTile.tsx` — додати проп `footnote?: ReactNode` у `TemplateTileProps`, у деструктуризацію `{ title, subtitle, footnote, selected = false, onClick }` і після рядка `subtitle`:

```tsx
      {footnote && <span className="line-clamp-2 block text-[11px] leading-4 text-hud-muted/80">{footnote}</span>}
```

`components/campaigns/templates/TemplatePicker.tsx` — у `renderCard` передати `footnote={t.credits ?? undefined}`.

`components/campaigns/settings/CampaignSettingsDialog.tsx` — імпорт `import { CreditsText } from "@/components/campaigns/templates/CreditsText";` і між секціями «Шаблони» та «Небезпечна зона»:

```tsx
      {meta.credits && (
        <HudSection title="Джерела й ліцензії">
          <CreditsText credits={meta.credits} />
        </HudSection>
      )}
```

`app/campaigns/[id]/page.tsx` — імпорт `CreditsText`; у банері шаблону (`HudPanel` з `Info`) після `<p …>Це шаблон: …</p>`:

```tsx
          {campaign.credits && <CreditsText credits={campaign.credits} className="basis-full" />}
```

і в `meta` кнопки налаштувань: `meta={{ createdFromId: campaign.createdFromId ?? null, isTemplate, credits: campaign.credits ?? null }}`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:run components/campaigns`
Expected: PASS (наявні + 3 нові).

- [ ] **Step 6: Commit**

```bash
git add types/campaigns.ts lib/server/templates/list-templates.ts components/campaigns app/campaigns/[id]/page.tsx
git commit -m "feat(constructor): show template credits on the picker card, template banner and settings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 8 значків шкіл і правило «немає іконки → значок школи в її кольорі»

**Files:**
- Modify: `lib/constants/spell-groups.ts`, `lib/utils/spells/spell-icons.ts`
- Create: `components/spells/SpellIcon.tsx`
- Modify: `components/spells/book/SpellRow.tsx`, `components/spells/book/SpellBookPages.tsx` (`SpellDetail`), `components/spells/list/SpellCard.tsx`, `components/spells/list/SpellPrintCard.tsx`, `components/spells/list/SelectedSpellsList.tsx`
- Test: `lib/utils/spells/__tests__/spell-icons.test.ts` (нові `it`), `components/spells/__tests__/SpellIcon.test.tsx`

**Interfaces:**
- Produces: `SPELL_GROUP_ICON_KEYS = ["moon","flame","sparkles","sun","shell","shield","portal","eye","heart","mask","skull","vortex"]` (перші 5 — без змін); `SpellIcon({ spell: { icon?: string | null; spellGroup?: SpellGroupLook | null }; size: number; className?: string; iconClassName?: string })`.

Відповідність шкіл SRD (використовує задача 6): abjuration → `shield`, conjuration → `portal`, divination → `eye`, enchantment → `heart`, evocation → `flame`, illusion → `mask`, necromancy → `skull`, transmutation → `vortex`.

- [ ] **Step 1: Write the failing tests**

У `lib/utils/spells/__tests__/spell-icons.test.ts` додати імпорти `import { DoorOpen, Eye, Flame, Heart, Moon, Shell, Shield, Skull, Sparkles, Sun, Tornado, VenetianMask } from "lucide-react";` і `import { SPELL_GROUP_ICON_KEYS } from "@/lib/constants/spell-groups";` (якщо частина вже імпортована — злити) та блок:

```ts
describe("school icon keys", () => {
  it("keeps the 5 HOMM5 keys first and unchanged, adds 7 SRD keys", () => {
    expect(SPELL_GROUP_ICON_KEYS.slice(0, 5)).toEqual(["moon", "flame", "sparkles", "sun", "shell"]);
    expect(SPELL_GROUP_ICON_KEYS.slice(5)).toEqual(["shield", "portal", "eye", "heart", "mask", "skull", "vortex"]);
  });

  it("maps every key to its lucide icon; unknown → Shell", () => {
    const expected = { moon: Moon, flame: Flame, sparkles: Sparkles, sun: Sun, shell: Shell, shield: Shield, portal: DoorOpen, eye: Eye, heart: Heart, mask: VenetianMask, skull: Skull, vortex: Tornado };

    for (const [key, icon] of Object.entries(expected)) expect(getSpellGroupIcon({ icon: key })).toBe(icon);

    expect(getSpellGroupIcon({ icon: "nope" })).toBe(Shell);
  });
});
```

`components/spells/__tests__/SpellIcon.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SpellIcon } from "@/components/spells/SpellIcon";

vi.mock("next/image", () => ({ default: ({ src, onError }: { src: string; onError?: () => void }) => <img data-testid="spell-img" src={src} onError={onError} alt="" /> }));

describe("SpellIcon", () => {
  afterEach(cleanup);

  it("без іконки — значок школи в кольорі школи", () => {
    const { container } = render(<SpellIcon spell={{ icon: null, spellGroup: { icon: "skull", color: "#5f8a3c" } }} size={30} />);

    const svg = container.querySelector("svg.lucide-skull");

    expect(svg).not.toBeNull();
    expect(svg).toHaveStyle({ color: "#5f8a3c" });
  });

  it("HOMM-ключ школи дає той самий значок, що й список шкіл", () => {
    const { container } = render(<SpellIcon spell={{ spellGroup: { icon: "moon", color: "#123456" } }} size={30} />);

    expect(container.querySelector("svg.lucide-moon")).not.toBeNull();
  });

  it("без школи — Sparkles", () => {
    const { container } = render(<SpellIcon spell={{ icon: "", spellGroup: null }} size={30} />);

    expect(container.querySelector("svg.lucide-sparkles")).not.toBeNull();
  });

  it("з іконкою — зображення; бита URL — значок школи", () => {
    const { container, getByTestId } = render(<SpellIcon spell={{ icon: "https://x.test/a.png", spellGroup: { icon: "eye", color: "#c9b458" } }} size={30} />);

    expect(getByTestId("spell-img").getAttribute("src")).toBe("https://x.test/a.png");

    fireEvent.error(getByTestId("spell-img"));

    expect(container.querySelector("svg.lucide-eye")).not.toBeNull();
  });
});
```

(Якщо `OptimizedImage` не передає `onError` у `next/image` під іменем `onError` — подивитися його реалізацію в `components/common/OptimizedImage.tsx` і змінити мок так, щоб викликав саме той проп, через який він ставить `failedSrc`; логіку `OptimizedImage` не змінювати.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/spells/__tests__/spell-icons.test.ts components/spells/__tests__/SpellIcon.test.tsx`
Expected: FAIL — нових ключів немає, `SpellIcon` не існує.

- [ ] **Step 3: Keys and lucide map**

`lib/constants/spell-groups.ts`, перший рядок:

```ts
export const SPELL_GROUP_ICON_KEYS = ["moon", "flame", "sparkles", "sun", "shell", "shield", "portal", "eye", "heart", "mask", "skull", "vortex"] as const;
```

`lib/utils/spells/spell-icons.ts`:

```ts
import { DoorOpen, Eye, Flame, Heart, LucideIcon, Moon, Shell, Shield, Skull, Sparkles, Sun, Tornado, VenetianMask } from "lucide-react";

import type { SpellGroupIconKey } from "@/lib/constants/spell-groups";

export type SpellGroupLook = { color?: string | null; icon?: string | null };

const ICONS: Record<SpellGroupIconKey, LucideIcon> = {
  moon: Moon,
  flame: Flame,
  sparkles: Sparkles,
  sun: Sun,
  shell: Shell,
  shield: Shield,
  portal: DoorOpen,
  eye: Eye,
  heart: Heart,
  mask: VenetianMask,
  skull: Skull,
  vortex: Tornado,
};

export function getSpellGroupIcon(group: SpellGroupLook | null | undefined): LucideIcon {
  return (group?.icon && Object.hasOwn(ICONS, group.icon) ? ICONS[group.icon as SpellGroupIconKey] : undefined) ?? Shell;
}
```

- [ ] **Step 4: `SpellIcon`**

`components/spells/SpellIcon.tsx`:

```tsx
"use client";

import { Sparkles } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { spellSchoolColor } from "@/lib/constants/spells";
import { getSpellGroupIcon, type SpellGroupLook } from "@/lib/utils/spells/spell-icons";

interface SpellIconProps {
  spell: { icon?: string | null; spellGroup?: SpellGroupLook | null };
  size: number;
  className?: string;
  iconClassName?: string;
}

export function SpellIcon({ spell, size, className, iconClassName = "size-5" }: SpellIconProps) {
  const School = spell.spellGroup ? getSpellGroupIcon(spell.spellGroup) : Sparkles;

  const fallback = <School className={iconClassName} style={{ color: spellSchoolColor(spell.spellGroup) }} />;

  if (!spell.icon) return fallback;

  return <OptimizedImage src={spell.icon} alt="" width={size} height={size} className={className} fallback={fallback} />;
}
```

- [ ] **Step 5: Use it everywhere a spell is shown**

`components/spells/book/SpellRow.tsx` — прибрати імпорти `Sparkles` і `OptimizedImage`, додати `import { SpellIcon } from "@/components/spells/SpellIcon";`; рядок з `spell.icon ? … : <Sparkles … />` замінити на:

```tsx
        <SpellIcon spell={{ icon: spell.icon, spellGroup: spell.spellGroup ?? school }} size={size.px} className={cn("object-contain", size.icon)} />
```

`components/spells/book/SpellBookPages.tsx` (`SpellDetail`) — `{spell.icon ? <OptimizedImage …/> : <Sparkles className="size-10" />}` → `<SpellIcon spell={spell} size={44} iconClassName="size-10" />` (прибрати імпорти, що стали невикористаними).

`components/spells/list/SpellCard.tsx` — блок `{spell.icon ? (<OptimizedImage … fallback={fallbackIcon} />) : (fallbackIcon)}` → `<SpellIcon spell={spell} size={44} className="size-full object-cover p-0.5" />`; константу `fallbackIcon` прибрати; `Sparkles` лишається (використовується в `HudPill`).

`components/spells/list/SpellPrintCard.tsx` — увесь тернарник `spell.icon ? (<OptimizedImage …/>) : (<div …><Sparkles …/></div>)` → `<SpellIcon spell={spell} size={64} className="w-full h-full object-cover" iconClassName="h-6 w-6 sm:h-8 sm:w-8" />`; `Sparkles` лишається (бейдж кола).

`components/spells/list/SelectedSpellsList.tsx` — тернарник з `OptimizedImage`/`Sparkles` → `<SpellIcon spell={spell} size={64} className="w-full h-full object-cover" iconClassName="h-6 w-6" />`; невикористані імпорти прибрати.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/spells components/spells components/battle/wizards`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/constants/spell-groups.ts lib/utils/spells components/spells
git commit -m "feat(constructor): 8 school icons and the school-icon fallback for spells without an icon

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Типи Open5e, завантаження з md5, хелпери й фікстури тестів

**Files:**
- Create: `scripts/srd/lib/open5e.ts`, `scripts/srd/lib/fetch.ts`, `scripts/srd/lib/text.ts`, `scripts/srd/lib/abilities.ts`, `scripts/srd/lib/types.ts`, `scripts/srd/extract-fixture.ts`
- Create (згенерувати): `scripts/srd/__tests__/fixtures/<File>.json` для всіх 17 файлів
- Test: `scripts/srd/__tests__/open5e.test.ts`

**Interfaces:**
- Consumes: `OPEN5E_FILES`, `open5eUrl`, `OPEN5E_SHA` (задача 1).
- Produces:
  - `open5e.ts`: `interface Fixture<F, K = string> { model: string; pk: K; fields: F }`; типи `O5Spell`, `O5CastingOption`, `O5Class`, `O5Feature`, `O5FeatureItem`, `O5Species`, `O5SpeciesTrait`, `O5Creature`, `O5CreatureAction`, `O5CreatureAttack`, `O5CreatureTrait`, `O5Weapon`, `O5WeaponProperty`, `O5WeaponAssignment`, `O5Armor`, `O5Item`, `O5Document`; `interface Open5eData`; `loadOpen5e(dir: string): Open5eData`; `slugTail(pk: string): string`; `groupBy<T>(rows: readonly T[], key: (r: T) => string): Map<string, T[]>`; `matchesAny(row, ids): boolean`; `FIXTURE_DIR`.
  - `fetch.ts`: `defaultSourceDir(): string`, `md5(buf: Buffer | string): string`, `verifyFile(file: Open5eFile, buf: Buffer): void`, `fetchOpen5e(dir?: string, fetchImpl?: typeof fetch): Promise<string>`.
  - `text.ts`: `ABILITY_BY_SHORT`, `abilityMod(score)`, `clamp(n, min, max)`, `titleCase(s)`, `capitalize(s)`, `parseDiceExpr(s): { count: number; sides: number } | null`, `NUMBER_WORDS`, `numberWord(s): number | null`, `bySlug(a, b)`.
  - `abilities.ts`: `type AbilityCore`, `noteAbility(id, name, description): Ability`, `coreAbility(id, name, description, core): Ability`, `uniqueId(seen: Set<string>, id: string): string`.
  - `types.ts`: `SRD_KINDS`, `type SrdKind`, рядки `SpellGroupRow`, `SpellRow`, `RaceRow`, `ClassFeatureGroup`, `ClassRow`, `UnitAttackRow`, `UnitRow`, `ArtifactRow`, `type SrdData`.

- [ ] **Step 1: Write the failing test** — `scripts/srd/__tests__/open5e.test.ts`:

```ts
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { noteAbility, uniqueId } from "../lib/abilities";
import { fetchOpen5e, md5, verifyFile } from "../lib/fetch";
import { FIXTURE_DIR, groupBy, loadOpen5e, matchesAny, slugTail } from "../lib/open5e";
import { abilityMod, numberWord, parseDiceExpr, titleCase } from "../lib/text";

describe("open5e helpers", () => {
  it("slugTail, groupBy, matchesAny with an underscore boundary", () => {
    expect(slugTail("srd-2024_fighter_second-wind")).toBe("second-wind");
    expect(slugTail("srd-2024_champion")).toBe("champion");
    expect(groupBy([{ p: "a" }, { p: "b" }, { p: "a" }], (r) => r.p).get("a")).toHaveLength(2);
    expect(matchesAny({ pk: "srd-2024_shield-of-faith", fields: {} }, ["srd-2024_shield"])).toBe(false);
    expect(matchesAny({ pk: 7, fields: { parent: "srd-2024_fireball" } }, ["srd-2024_fireball"])).toBe(true);
    expect(matchesAny({ pk: "x", fields: { parent: "srd-2024_adult-red-dragon_rend" } }, ["srd-2024_adult-red-dragon"])).toBe(true);
    expect(matchesAny({ pk: "x", fields: { weapon: "srd-2024_dagger" } }, ["srd-2024_dagger"])).toBe(true);
  });

  it("text helpers", () => {
    expect(abilityMod(27)).toBe(8);
    expect(abilityMod(8)).toBe(-1);
    expect(titleCase("chaotic evil")).toBe("Chaotic Evil");
    expect(parseDiceExpr("10d6 + 40")).toEqual({ count: 10, sides: 6 });
    expect(parseDiceExpr("1")).toBeNull();
    expect(numberWord("three")).toBe(3);
    expect(numberWord("12")).toBe(12);
    expect(numberWord("many")).toBeNull();
  });

  it("note abilities and unique ids", () => {
    expect(noteAbility("darkvision", "Darkvision", "You see in the dark.")).toEqual({ id: "darkvision", name: "Darkvision", description: "You see in the dark.", trigger: { event: "passive" }, effects: [{ kind: "note", text: "Darkvision" }] });

    const seen = new Set<string>();

    expect([uniqueId(seen, "bite"), uniqueId(seen, "bite"), uniqueId(seen, "bite")]).toEqual(["bite", "bite-2", "bite-3"]);
  });

  it("loads the committed fixtures as Open5eData", () => {
    const data = loadOpen5e(FIXTURE_DIR);

    expect(data.spells.some((s) => s.pk === "srd-2024_fireball")).toBe(true);
    expect(data.creatures.some((c) => c.pk === "srd-2024_adult-red-dragon")).toBe(true);
    expect(data.weaponProperties.length).toBe(17);
  });
});

describe("fetch", () => {
  it("verifyFile rejects a wrong md5", () => {
    expect(() => verifyFile("Document", Buffer.from("{}"))).toThrow(/Document\.json: md5/);
    expect(md5("abc")).toBe("900150983cd24fb0d6963f7d28e17f72");
  });

  it("fetchOpen5e fails on HTTP errors and on a body with a wrong md5, writing nothing", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "srd-fetch-"));

    await expect(fetchOpen5e(dir, (async () => new Response("nope", { status: 404 })) as typeof fetch)).rejects.toThrow(/HTTP 404/);
    await expect(fetchOpen5e(dir, (async () => new Response("{}")) as typeof fetch)).rejects.toThrow(/md5/);
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/open5e.test.ts`
Expected: FAIL — модулів немає.

- [ ] **Step 3: `open5e.ts`**

```ts
import * as fs from "fs";
import * as path from "path";

import type { Open5eFile } from "./source";

export interface Fixture<F, K = string> {
  model: string;
  pk: K;
  fields: F;
}

export interface O5Spell {
  name: string;
  desc: string;
  level: number;
  school: string;
  higher_level: string | null;
  range_text: string;
  range: number | null;
  ritual: boolean;
  casting_time: string;
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  material_specified: string | null;
  target_count: number | null;
  saving_throw_ability: string | null;
  attack_roll: boolean;
  damage_roll: string | null;
  damage_types: string[];
  duration: string;
  shape_type: string | null;
  shape_size: number | null;
  concentration: boolean;
  classes: string[];
}

export interface O5CastingOption { parent: string; type: string; damage_roll: string | null }

export interface O5Class { name: string; hit_dice: string | null; caster_type: string; saving_throws: string[]; subclass_of: string | null; desc?: string }

export interface O5Feature { name: string; desc: string; parent: string; feature_type?: string }

export interface O5FeatureItem { parent: string; level: number }

export interface O5Species { name: string }

export interface O5SpeciesTrait { name: string; desc: string; parent: string; type: string | null; order: number }

export interface O5Creature {
  name: string;
  size: string;
  type: string;
  alignment: string;
  armor_class: number;
  hit_points: number;
  initiative_bonus: number;
  walk: number | null;
  fly: number | null;
  swim: number | null;
  climb: number | null;
  burrow: number | null;
  challenge_rating: string;
  ability_score_strength: number;
  ability_score_dexterity: number;
  ability_score_constitution: number;
  ability_score_intelligence: number;
  ability_score_wisdom: number;
  ability_score_charisma: number;
  saving_throw_strength: number | null;
  saving_throw_dexterity: number | null;
  saving_throw_constitution: number | null;
  saving_throw_intelligence: number | null;
  saving_throw_wisdom: number | null;
  saving_throw_charisma: number | null;
  damage_immunities: string[];
  damage_resistances: string[];
  damage_vulnerabilities: string[];
  condition_immunities: string[];
  blindsight_range: number | null;
  darkvision_range: number | null;
  tremorsense_range: number | null;
  truesight_range: number | null;
  passive_perception: number | null;
  languages_desc: string | null;
}

export interface O5CreatureAction {
  name: string;
  desc: string;
  parent: string;
  action_type: "ACTION" | "BONUS_ACTION" | "REACTION" | "LEGENDARY_ACTION";
  uses_type: string | null;
  uses_param: number | null;
  legendary_action_cost?: number | null;
  order_in_statblock?: number;
}

export interface O5CreatureAttack {
  name: string;
  parent: string;
  to_hit_mod: number;
  reach: number | null;
  range: number | null;
  long_range: number | null;
  damage_die_count: number | null;
  damage_die_type: string | null;
  damage_bonus: number | null;
  damage_type: string | null;
  extra_damage_die_count: number | null;
  extra_damage_die_type: string | null;
  extra_damage_type: string | null;
}

export interface O5CreatureTrait { name: string; desc: string; parent: string }

export interface O5Weapon { name: string; damage_dice: string; damage_type: string; range: number; long_range: number; is_simple: boolean }

export interface O5WeaponProperty { name: string; type: string | null; desc: string }

export interface O5WeaponAssignment { weapon: string; property: string; detail: string | null }

export interface O5Armor { name: string; ac_base: number }

export interface O5Item { name: string; weapon: string | null; armor: string | null; cost: string; weight: string; desc: string }

export interface O5Document { name: string; licenses: string[] }

export interface Open5eData {
  document: Fixture<O5Document>[];
  classes: Fixture<O5Class>[];
  features: Fixture<O5Feature>[];
  featureItems: Fixture<O5FeatureItem>[];
  species: Fixture<O5Species>[];
  speciesTraits: Fixture<O5SpeciesTrait>[];
  spells: Fixture<O5Spell>[];
  castingOptions: Fixture<O5CastingOption, number>[];
  creatures: Fixture<O5Creature>[];
  creatureActions: Fixture<O5CreatureAction>[];
  creatureAttacks: Fixture<O5CreatureAttack>[];
  creatureTraits: Fixture<O5CreatureTrait>[];
  weapons: Fixture<O5Weapon>[];
  weaponProperties: Fixture<O5WeaponProperty>[];
  weaponAssignments: Fixture<O5WeaponAssignment>[];
  armor: Fixture<O5Armor>[];
  items: Fixture<O5Item>[];
}

export const OPEN5E_FILE_OF: Record<keyof Open5eData, Open5eFile> = {
  document: "Document",
  classes: "CharacterClass",
  features: "ClassFeature",
  featureItems: "ClassFeatureItem",
  species: "Species",
  speciesTraits: "SpeciesTrait",
  spells: "Spell",
  castingOptions: "SpellCastingOption",
  creatures: "Creature",
  creatureActions: "CreatureAction",
  creatureAttacks: "CreatureActionAttack",
  creatureTraits: "CreatureTrait",
  weapons: "Weapon",
  weaponProperties: "WeaponProperty",
  weaponAssignments: "WeaponPropertyAssignment",
  armor: "Armor",
  items: "Item",
};

export const FIXTURE_DIR = path.join(process.cwd(), "scripts", "srd", "__tests__", "fixtures");

export function loadOpen5e(dir: string): Open5eData {
  const read = (file: Open5eFile) => JSON.parse(fs.readFileSync(path.join(dir, `${file}.json`), "utf8")) as unknown;

  return Object.fromEntries(Object.entries(OPEN5E_FILE_OF).map(([key, file]) => [key, read(file)])) as Open5eData;
}

export const slugTail = (pk: string) => pk.slice(pk.lastIndexOf("_") + 1);

export function groupBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();

  for (const row of rows) out.set(key(row), [...(out.get(key(row)) ?? []), row]);

  return out;
}

export function matchesAny(row: { pk: unknown; fields: Record<string, unknown> }, ids: readonly string[]): boolean {
  const refs = [String(row.pk), row.fields.parent, row.fields.weapon].filter((v): v is string => typeof v === "string");

  return ids.some((id) => refs.some((ref) => ref === id || ref.startsWith(`${id}_`)));
}
```

- [ ] **Step 4: `fetch.ts`**

```ts
import { createHash } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { OPEN5E_FILES, OPEN5E_SHA, type Open5eFile, open5eUrl } from "./source";

export const defaultSourceDir = () => path.join(os.tmpdir(), `open5e-srd-2024-${OPEN5E_SHA.slice(0, 8)}`);

export const md5 = (buf: Buffer | string) => createHash("md5").update(buf).digest("hex");

export function verifyFile(file: Open5eFile, buf: Buffer): void {
  const actual = md5(buf);

  if (actual !== OPEN5E_FILES[file]) throw new Error(`${file}.json: md5 ${actual} ≠ ${OPEN5E_FILES[file]}`);
}

export async function fetchOpen5e(dir = defaultSourceDir(), fetchImpl: typeof fetch = fetch): Promise<string> {
  fs.mkdirSync(dir, { recursive: true });

  for (const file of Object.keys(OPEN5E_FILES) as Open5eFile[]) {
    const target = path.join(dir, `${file}.json`);

    if (fs.existsSync(target) && md5(fs.readFileSync(target)) === OPEN5E_FILES[file]) continue;

    const res = await fetchImpl(open5eUrl(file));

    if (!res.ok) throw new Error(`${file}.json: HTTP ${res.status}`);

    const buf = Buffer.from(await res.arrayBuffer());

    verifyFile(file, buf);
    fs.writeFileSync(target, buf);
  }

  return dir;
}
```

- [ ] **Step 5: `text.ts`, `abilities.ts`, `types.ts`**

`scripts/srd/lib/text.ts`:

```ts
import type { AbilityKey } from "@/lib/constants/abilities";

export const ABILITY_BY_SHORT: Record<string, AbilityKey> = { str: "strength", dex: "dexterity", con: "constitution", int: "intelligence", wis: "wisdom", cha: "charisma" };

export const abilityMod = (score: number) => Math.floor((score - 10) / 2);

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const titleCase = (s: string) => s.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());

export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function parseDiceExpr(s: string | null | undefined): { count: number; sides: number } | null {
  const m = /^(\d+)d(\d+)/.exec((s ?? "").trim());

  return m ? { count: Number(m[1]), sides: Number(m[2]) } : null;
}

export const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

export function numberWord(s: string): number | null {
  const lower = s.toLowerCase();

  if (lower in NUMBER_WORDS) return NUMBER_WORDS[lower];

  return /^\d+$/.test(s) ? Number(s) : null;
}

export const bySlug = (a: { slug: string }, b: { slug: string }) => a.slug.localeCompare(b.slug);
```

`scripts/srd/lib/abilities.ts`:

```ts
import type { Ability } from "@/lib/utils/abilities/schema";

export type AbilityCore = Pick<Ability, "trigger" | "effects"> & Partial<Pick<Ability, "limits" | "condition">>;

export const noteAbility = (id: string, name: string, description: string): Ability => ({ id, name, description, trigger: { event: "passive" }, effects: [{ kind: "note", text: name }] });

export const coreAbility = (id: string, name: string, description: string, core: AbilityCore): Ability => ({ id, name, description, ...core });

export function uniqueId(seen: Set<string>, id: string): string {
  let out = id;

  for (let n = 2; seen.has(out); n++) out = `${id}-${n}`;

  seen.add(out);

  return out;
}
```

`scripts/srd/lib/types.ts`:

```ts
import type { AbilityKey } from "@/lib/constants/abilities";
import type { ClassCaster } from "@/lib/constants/classes";
import type { SpellGroupIconKey } from "@/lib/constants/spell-groups";
import type { DndSkill } from "@/lib/constants/skills";
import type { WeaponTrait } from "@/lib/constants/weapon-traits";
import type { Ability, Effect } from "@/lib/utils/abilities/schema";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";
import type { SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";

export const SRD_KINDS = ["spell-groups", "spells", "races", "classes", "units", "artifacts"] as const;

export type SrdKind = (typeof SRD_KINDS)[number];

export interface SpellGroupRow { slug: string; name: string; color: string; icon: SpellGroupIconKey }

export interface SpellRow {
  slug: string;
  name: string;
  level: number;
  groupId: string;
  description: string;
  cost: "action" | "bonusAction";
  dice: number;
  dieSides?: 4 | 6 | 8 | 10 | 12;
  concentration: boolean;
  upcastDice?: number;
  upcastTargets?: number;
  addAbilityMod?: boolean;
  targeting: SpellTargeting;
  resolution: SpellResolution;
  spellEffects: Effect[];
}

export interface RaceRow { slug: string; name: string; passiveAbility: { name: string; description: string }; abilities: Ability[] }

export interface ClassFeatureGroup { level: number; abilities: Ability[] }

export interface ClassRow {
  slug: string;
  name: string;
  hitDie: 6 | 8 | 10 | 12;
  savingThrows: AbilityKey[];
  proficiencies: { armor: string[]; weapons: string[]; tools: string[] };
  skillChoices: { count: number; from: DndSkill[] };
  caster: ClassCaster;
  spellcastingAbility: AbilityKey | null;
  features: ClassFeatureGroup[];
  subclassLevel: number;
  subclasses: Array<{ id: string; name: string; features: ClassFeatureGroup[] }>;
}

export interface UnitAttackRow {
  name: string;
  type: "melee" | "ranged";
  attackBonus: number;
  damageType: string;
  damageDice: string;
  range?: string;
  properties?: string;
  traits?: WeaponTrait[];
}

export interface UnitRow {
  slug: string;
  name: string;
  level: number;
  cr: number;
  armorClass: number;
  maxHp: number;
  speed: number;
  initiative: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  gridSize: 1 | 2 | 3;
  multiattack: number;
  legendaryActions: number;
  legendaryResistances: number;
  saveProficiencies: AbilityKey[];
  attacks: UnitAttackRow[];
  abilities: Ability[];
}

export interface ArtifactRow { slug: string; name: string; description: string; rarity: "common"; slot: "weapon" | "range_weapon" | "shield"; weapon?: WeaponStats; abilities?: Ability[] }

export interface SrdData {
  "spell-groups": SpellGroupRow[];
  spells: SpellRow[];
  races: RaceRow[];
  classes: ClassRow[];
  units: UnitRow[];
  artifacts: ArtifactRow[];
}
```

- [ ] **Step 6: `extract-fixture.ts`** — CLI, що (за потреби) завантажує Open5e і пише фікстури:

```ts
#!/usr/bin/env tsx
// pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/srd/extract-fixture.ts [--source <dir>] [--out <dir>] <slug>...
import * as fs from "fs";
import * as path from "path";

import { fetchOpen5e } from "./lib/fetch";
import { FIXTURE_DIR, matchesAny, OPEN5E_FILE_OF } from "./lib/open5e";
import type { Open5eFile } from "./lib/source";

const FULL_FILES = new Set<Open5eFile>(["Document", "WeaponProperty"]);

async function main() {
  const args = process.argv.slice(2);

  const flag = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

  const source = flag("--source") ?? (await fetchOpen5e());

  const out = flag("--out") ?? FIXTURE_DIR;

  const ids = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--source" && args[i - 1] !== "--out");

  fs.mkdirSync(out, { recursive: true });

  for (const file of Object.values(OPEN5E_FILE_OF)) {
    const rows = JSON.parse(fs.readFileSync(path.join(source, `${file}.json`), "utf8")) as Array<{ pk: unknown; fields: Record<string, unknown> }>;

    const kept = FULL_FILES.has(file) ? rows : rows.filter((r) => matchesAny(r, ids));

    fs.writeFileSync(path.join(out, `${file}.json`), `${JSON.stringify(kept, null, 2)}\n`);
    console.info(`${file}: ${kept.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
```

- [ ] **Step 7: Generate the fixtures** (мережа потрібна лише вперше; файли кешуються в tmp і перевіряються md5)

Run:

```bash
pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/srd/extract-fixture.ts \
  srd-2024_fireball srd-2024_cure-wounds srd-2024_bless srd-2024_hold-person srd-2024_lightning-bolt srd-2024_fire-bolt \
  srd-2024_spirit-guardians srd-2024_hex srd-2024_magic-missile srd-2024_web srd-2024_dimension-door srd-2024_teleport \
  srd-2024_sacred-flame srd-2024_mass-cure-wounds srd-2024_shield \
  srd-2024_fighter srd-2024_champion srd-2024_wizard srd-2024_evoker srd-2024_bard srd-2024_college-of-lore srd-2024_monk srd-2024_warrior-of-the-open-hand \
  srd-2024_dwarf srd-2024_goliath srd-2024_orc srd-2024_elf \
  srd-2024_adult-red-dragon srd-2024_goblin-warrior srd-2024_ankheg srd-2024_bat srd-2024_octopus srd-2024_hydra srd-2024_archmage srd-2024_oni srd-2024_bugbear-warrior \
  srd-2024_battleaxe srd-2024_dagger srd-2024_longbow srd-2024_blowgun srd-2024_greatsword srd-2024_javelin
```

Expected: 17 рядків `<File>: N`; `Spell: 15`, `CharacterClass: 9`, `Species: 4`, `Creature: 9`, `Weapon: 6`, `Armor: 1`, `WeaponProperty: 17`, `Document: 1` (кількість інших — довільна, > 0).

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test:run scripts/srd/__tests__/open5e.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 9: Commit**

```bash
git add scripts/srd/lib scripts/srd/extract-fixture.ts scripts/srd/__tests__/open5e.test.ts scripts/srd/__tests__/fixtures
git commit -m "feat(constructor): Open5e types, md5-checked fetch, helpers and SRD test fixtures

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Конвертер шкіл і заклинань

**Files:**
- Create: `scripts/srd/convert/spell-groups.ts`, `scripts/srd/convert/spells.ts`, `scripts/srd/overrides/spells.ts`
- Test: `scripts/srd/__tests__/spells.test.ts`

**Interfaces:**
- Consumes: `Open5eData`, `O5Spell`, `O5CastingOption`, `Fixture` (задача 5); `SpellGroupRow`, `SpellRow` (задача 5); нові ключі значків (задача 4).
- Produces: `SRD_SCHOOLS`, `convertSpellGroups(): SpellGroupRow[]`; `durationRounds(text): number`, `spellRange(f): number | "self"`, `spellKind(f): "heal" | "damage" | "condition" | "none"`, `spellTargeting(f, side): SpellTargeting`, `convertSpell(row, options): SpellRow`, `convertSpells(data): SpellRow[]`; `type SpellOverride`, `SPELL_OVERRIDES: Record<string, SpellOverride>`.

- [ ] **Step 1: Write the failing test** — `scripts/srd/__tests__/spells.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { convertSpellGroups } from "../convert/spell-groups";
import { convertSpells, durationRounds } from "../convert/spells";
import { FIXTURE_DIR, loadOpen5e } from "../lib/open5e";

const spells = convertSpells(loadOpen5e(FIXTURE_DIR));

const spell = (slug: string) => {
  const s = spells.find((x) => x.slug === `srd-2024_${slug}`);

  if (!s) throw new Error(slug);

  return s;
};

describe("spell groups", () => {
  it("8 schools with the SRD icon keys and colours", () => {
    const groups = convertSpellGroups();

    expect(groups.map((g) => g.name)).toEqual(["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"]);
    expect(groups.map((g) => g.icon)).toEqual(["shield", "portal", "eye", "heart", "flame", "mask", "skull", "vortex"]);
    expect(groups.every((g) => /^#[0-9a-f]{6}$/.test(g.color) && g.slug.startsWith("srd-2024_school-"))).toBe(true);
  });
});

describe("convertSpells", () => {
  it("Fireball: circle 20 at 150 ft, Dex save half, 8d6 fire, +1d6 per slot", () => {
    expect(spell("fireball")).toMatchObject({
      name: "Fireball",
      level: 3,
      groupId: "Evocation",
      cost: "action",
      dice: 8,
      dieSides: 6,
      concentration: false,
      upcastDice: 1,
      targeting: { kind: "template", shape: "circle", size: 20, side: "enemy", maxTargets: 20, range: 150 },
      resolution: { kind: "save", ability: "dexterity", onSuccess: "half" },
      spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }],
    });
    expect(spell("fireball").description.startsWith("Level 3 Evocation · Casting Time: Action · Range: 150 feet · Components: V, S, M (a ball of bat guano and sulfur) · Duration: Instantaneous · Classes: Sorcerer, Wizard\n\n")).toBe(true);
    expect(spell("fireball").description).toContain("Using a Higher-Level Spell Slot. The damage increases by 1d6");
  });

  it("Cure Wounds: touch ally heal 2d8 + mod, +2d8 per slot", () => {
    expect(spell("cure-wounds")).toMatchObject({ targeting: { kind: "ally", range: 5 }, resolution: { kind: "auto" }, dice: 2, dieSides: 8, upcastDice: 2, addAbilityMod: true, spellEffects: [{ kind: "heal", amount: { spellRoll: 100 } }] });
  });

  it("Lightning Bolt: 100-ft line from self; Fire Bolt: spell attack 1d10 at 120 ft, no upcast", () => {
    expect(spell("lightning-bolt").targeting).toEqual({ kind: "template", shape: "line", size: 100, side: "enemy", maxTargets: 20 });
    expect(spell("fire-bolt")).toMatchObject({ targeting: { kind: "enemy", range: 120 }, resolution: { kind: "attack" }, dice: 1, dieSides: 10 });
    expect(spell("fire-bolt").upcastDice).toBeUndefined();
  });

  it("Hold Person: save condition paralyzed with save-ends, +1 target per slot", () => {
    expect(spell("hold-person")).toMatchObject({
      targeting: { kind: "enemy", range: 60 },
      resolution: { kind: "save", ability: "wisdom", onSuccess: "none" },
      spellEffects: [{ kind: "applyCondition", condition: "paralyzed", duration: { rounds: 10 }, saveEnds: { ability: "wisdom" } }],
      upcastTargets: 1,
      concentration: true,
    });
  });

  it("Spirit Guardians: 15-ft emanation from self as a circle next to the caster", () => {
    expect(spell("spirit-guardians")).toMatchObject({ targeting: { kind: "template", shape: "circle", size: 15, side: "enemy", range: 5 }, resolution: { kind: "save", ability: "wisdom", onSuccess: "half" }, dice: 3, dieSides: 8, upcastDice: 1 });
  });

  it("Hex deals no damage on cast; Teleport (d100) has no dice; Sacred Flame cantrip has no upcast", () => {
    expect(spell("hex")).toMatchObject({ dice: 0, spellEffects: [], cost: "bonusAction" });
    expect(spell("teleport")).toMatchObject({ dice: 0, spellEffects: [] });
    expect(spell("teleport").dieSides).toBeUndefined();
    expect(spell("sacred-flame")).toMatchObject({ resolution: { kind: "save", ability: "dexterity", onSuccess: "none" }, dice: 1, dieSides: 8 });
    expect(spell("sacred-flame").upcastDice).toBeUndefined();
  });

  it("overrides win: Bless, Magic Missile, Web, Dimension Door, Shield", () => {
    expect(spell("bless")).toMatchObject({ dice: 0, targeting: { kind: "area", side: "ally", maxTargets: 3, range: 30 }, resolution: { kind: "auto" }, upcastTargets: 1 });
    expect(spell("bless").spellEffects).toEqual([
      { kind: "modifyStat", stat: "attackBonus", flat: 2, duration: { rounds: 10 } },
      { kind: "modifyStat", stat: "savingThrow", flat: 2, duration: { rounds: 10 } },
    ]);
    expect(spell("magic-missile")).toMatchObject({ dice: 1, dieSides: 4, targeting: { kind: "area", side: "enemy", maxTargets: 3, range: 120 }, upcastTargets: 1 });
    expect(spell("web").spellEffects).toEqual([{ kind: "applyCondition", condition: "restrained", duration: { rounds: 10 }, saveEnds: { ability: "strength" } }]);
    expect(spell("web").dieSides).toBeUndefined();
    expect(spell("dimension-door")).toMatchObject({ dice: 0, targeting: { kind: "self" }, spellEffects: [] });
    expect(spell("shield")).toMatchObject({ targeting: { kind: "self" }, spellEffects: [{ kind: "modifyStat", stat: "armor", flat: 5, duration: { rounds: 1 } }] });
  });

  it("Mass Cure Wounds: 30-ft circle of allies, up to six", () => {
    expect(spell("mass-cure-wounds")).toMatchObject({ targeting: { kind: "template", shape: "circle", size: 30, side: "ally", maxTargets: 6, range: 60 }, addAbilityMod: true, dice: 5, dieSides: 8, upcastDice: 1 });
  });

  it("durationRounds", () => {
    expect(durationRounds("1 minute")).toBe(10);
    expect(durationRounds("1 round")).toBe(1);
    expect(durationRounds("6 rounds")).toBe(6);
    expect(durationRounds("instantaneous")).toBe(1);
    expect(durationRounds("8 hours")).toBe(99);
    expect(durationRounds("until dispelled")).toBe(99);
  });

  it("slugs are unique and sorted", () => {
    const slugs = spells.map((s) => s.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect([...slugs].sort()).toEqual(slugs);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/spells.test.ts`
Expected: FAIL — модулів немає.

- [ ] **Step 3: `convert/spell-groups.ts`**

```ts
import type { SpellGroupRow } from "../lib/types";

export const SRD_SCHOOLS = [
  { key: "abjuration", name: "Abjuration", color: "#4a7bd0", icon: "shield" },
  { key: "conjuration", name: "Conjuration", color: "#d08a2c", icon: "portal" },
  { key: "divination", name: "Divination", color: "#c9b458", icon: "eye" },
  { key: "enchantment", name: "Enchantment", color: "#d0569a", icon: "heart" },
  { key: "evocation", name: "Evocation", color: "#d0432c", icon: "flame" },
  { key: "illusion", name: "Illusion", color: "#8a5cd0", icon: "mask" },
  { key: "necromancy", name: "Necromancy", color: "#5f8a3c", icon: "skull" },
  { key: "transmutation", name: "Transmutation", color: "#2ca59a", icon: "vortex" },
] as const satisfies ReadonlyArray<{ key: string; name: string; color: string; icon: SpellGroupRow["icon"] }>;

export const convertSpellGroups = (): SpellGroupRow[] => SRD_SCHOOLS.map((s) => ({ slug: `srd-2024_school-${s.key}`, name: s.name, color: s.color, icon: s.icon }));

export function schoolName(school: string): string {
  const found = SRD_SCHOOLS.find((s) => s.key === school);

  if (!found) throw new Error(`Unknown school «${school}»`);

  return found.name;
}
```

- [ ] **Step 4: `overrides/spells.ts`**

```ts
import type { SpellRow } from "../lib/types";

export type SpellOverride = Partial<Omit<SpellRow, "slug" | "name" | "level" | "groupId" | "description">>;

const rounds = (n: number) => ({ rounds: n });

const NO_DAMAGE: SpellOverride = { dice: 0, dieSides: undefined, upcastDice: undefined, spellEffects: [] };

// sides/targets of popular spells and timed buffs (flat approximations of 1d4 bonuses), checked by hand against SRD 5.2
export const SPELL_OVERRIDES: Record<string, SpellOverride> = {
  "srd-2024_bless": {
    ...NO_DAMAGE,
    targeting: { kind: "area", side: "ally", maxTargets: 3, range: 30 },
    resolution: { kind: "auto" },
    spellEffects: [
      { kind: "modifyStat", stat: "attackBonus", flat: 2, duration: rounds(10) },
      { kind: "modifyStat", stat: "savingThrow", flat: 2, duration: rounds(10) },
    ],
    upcastTargets: 1,
  },
  "srd-2024_bane": {
    ...NO_DAMAGE,
    targeting: { kind: "area", side: "enemy", maxTargets: 3, range: 30 },
    resolution: { kind: "save", ability: "charisma", onSuccess: "none" },
    spellEffects: [
      { kind: "modifyStat", stat: "attackBonus", flat: -2, duration: rounds(10) },
      { kind: "modifyStat", stat: "savingThrow", flat: -2, duration: rounds(10) },
    ],
    upcastTargets: 1,
  },
  "srd-2024_shield": { targeting: { kind: "self" }, resolution: { kind: "auto" }, spellEffects: [{ kind: "modifyStat", stat: "armor", flat: 5, duration: rounds(1) }] },
  "srd-2024_shield-of-faith": { targeting: { kind: "ally", range: 60 }, spellEffects: [{ kind: "modifyStat", stat: "armor", flat: 2, duration: rounds(99) }] },
  "srd-2024_mage-armor": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "modifyStat", stat: "armor", flat: 3, duration: rounds(99) }] },
  "srd-2024_haste": {
    targeting: { kind: "ally", range: 30 },
    resolution: { kind: "auto" },
    spellEffects: [
      { kind: "modifyStat", stat: "armor", flat: 2, duration: rounds(10) },
      { kind: "modifyStat", stat: "actionsPerTurn", flat: 1, duration: rounds(10) },
      { kind: "flag", flag: "saveAdvantage", abilities: ["dexterity"], duration: rounds(10) },
    ],
  },
  "srd-2024_slow": {
    targeting: { kind: "template", shape: "cube", size: 40, side: "enemy", maxTargets: 6, range: 120 },
    resolution: { kind: "save", ability: "wisdom", onSuccess: "none" },
    spellEffects: [
      { kind: "modifyStat", stat: "armor", flat: -2, duration: rounds(10) },
      { kind: "modifyStat", stat: "savingThrow", flat: -2, duration: rounds(10) },
    ],
  },
  "srd-2024_faerie-fire": { resolution: { kind: "save", ability: "dexterity", onSuccess: "none" }, spellEffects: [{ kind: "flag", flag: "advantageForAttackers", duration: rounds(10) }] },
  "srd-2024_magic-missile": {
    dice: 1,
    dieSides: 4,
    targeting: { kind: "area", side: "enemy", maxTargets: 3, range: 120 },
    resolution: { kind: "auto" },
    spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "force" }],
    upcastTargets: 1,
  },
  "srd-2024_heal": { targeting: { kind: "ally", range: 60 }, resolution: { kind: "auto" }, spellEffects: [{ kind: "heal", amount: 70 }] },
  "srd-2024_prayer-of-healing": {
    dice: 2,
    dieSides: 8,
    targeting: { kind: "area", side: "ally", maxTargets: 5, range: 30 },
    resolution: { kind: "auto" },
    addAbilityMod: true,
    spellEffects: [{ kind: "heal", amount: { spellRoll: 100 } }],
    upcastDice: 1,
  },
  "srd-2024_revivify": { targeting: { kind: "allyDead", range: 5 }, resolution: { kind: "auto" }, spellEffects: [{ kind: "heal", amount: 1, revive: true }] },
  "srd-2024_web": { ...NO_DAMAGE, resolution: { kind: "save", ability: "dexterity", onSuccess: "none" }, spellEffects: [{ kind: "applyCondition", condition: "restrained", duration: rounds(10), saveEnds: { ability: "strength" } }] },
  "srd-2024_entangle": {
    targeting: { kind: "template", shape: "cube", size: 20, side: "enemy", maxTargets: 20, range: 90 },
    resolution: { kind: "save", ability: "strength", onSuccess: "none" },
    spellEffects: [{ kind: "applyCondition", condition: "restrained", duration: rounds(10), saveEnds: { ability: "strength" } }],
  },
  "srd-2024_dimension-door": { ...NO_DAMAGE, targeting: { kind: "self" }, resolution: { kind: "auto" } },
  "srd-2024_fire-shield": { ...NO_DAMAGE, targeting: { kind: "self" }, resolution: { kind: "auto" } },
  "srd-2024_wish": { ...NO_DAMAGE, targeting: { kind: "self" }, resolution: { kind: "auto" } },
  "srd-2024_spike-growth": { ...NO_DAMAGE },
  "srd-2024_longstrider": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "modifyStat", stat: "speed", flat: 10, duration: rounds(99) }], upcastTargets: 1 },
  "srd-2024_blur": { targeting: { kind: "self" }, spellEffects: [{ kind: "flag", flag: "disadvantageForAttackers", duration: rounds(10) }] },
  "srd-2024_mirror-image": { targeting: { kind: "self" }, spellEffects: [{ kind: "flag", flag: "disadvantageForAttackers", duration: rounds(10) }] },
  "srd-2024_greater-invisibility": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "applyCondition", condition: "invisible", duration: rounds(10) }] },
  "srd-2024_invisibility": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "applyCondition", condition: "invisible", duration: rounds(99) }], upcastTargets: 1 },
  "srd-2024_heroism": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "flag", flag: "conditionImmunity", conditions: ["frightened"], duration: rounds(10) }], upcastTargets: 1 },
  "srd-2024_divine-favor": { targeting: { kind: "self" }, spellEffects: [{ kind: "damageBonus", filter: { kind: "physical" }, flat: 2, duration: rounds(10) }] },
  "srd-2024_spiritual-weapon": { addAbilityMod: true },
  "srd-2024_scorching-ray": { upcastTargets: 1 },
};
```

- [ ] **Step 5: `convert/spells.ts`**

```ts
import type { AbilityKey } from "@/lib/constants/abilities";
import type { Effect } from "@/lib/utils/abilities/schema";
import type { SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";

import { type Fixture, groupBy, type O5CastingOption, type O5Spell, type Open5eData } from "../lib/open5e";
import { bySlug, capitalize, clamp, numberWord, parseDiceExpr, titleCase } from "../lib/text";
import type { SpellRow } from "../lib/types";
import { SPELL_OVERRIDES } from "../overrides/spells";

import { schoolName } from "./spell-groups";

type Side = "ally" | "enemy";

type Kind = "heal" | "damage" | "condition" | "none";

const DIE_SIDES = new Set([4, 6, 8, 10, 12]);

const SPELL_ATTACK = /\bmakes? (?:a|one) (?:ranged|melee) spell attack/i;

const IMMEDIATE_DAMAGE = /\btak(?:e|es|ing) (?:\d+d\d+|\d+)(?: \+ \d+)? \w+ damage/i;

const HEALS = /\bregains? (?:a number of )?Hit Points|\bregain Hit Points/i;

const HALF = /half as much|half damage/i;

const CONDITION = /\b(?:has|have|gains?) the (Blinded|Charmed|Deafened|Frightened|Grappled|Incapacitated|Invisible|Paralyzed|Petrified|Poisoned|Prone|Restrained|Stunned|Unconscious) condition/i;

const REPEATS_SAVE = /\brepeats? the save/i;

const AREA = /\b(\d+)-foot(?:-radius)?(?:, \d+-foot-(?:high|tall))? (Emanation|Sphere|Cylinder)\b/;

const LINE_LENGTH = /\b(\d+)-foot-long\b/;

const UP_TO = /\bup to (one|two|three|four|five|six|seven|eight|nine|ten|\d+) creatures\b/i;

const TEXT_UPCAST = /\b(?:damage|healing) increases by (\d+)d(\d+) for each (?:spell )?slot level above/i;

const EXTRA_TARGETS = /\b(?:one additional creature|target one additional|one additional target)\b/i;

const ADDS_MOD = /plus your spellcasting ability modifier/i;

const SHAPES: Record<string, "circle" | "cube" | "cone" | "line"> = { sphere: "circle", cube: "cube", cone: "cone", line: "line" };

const CASTING_TIME: Record<string, string> = { action: "Action", "bonus-action": "Bonus Action", reaction: "Reaction", "1minute": "1 minute", "10minutes": "10 minutes", "1hour": "1 hour" };

export function durationRounds(duration: string): number {
  const d = duration.trim().toLowerCase();

  const rounds = /^(\d+) rounds?$/.exec(d);

  if (rounds) return clamp(Number(rounds[1]), 1, 99);

  if (d === "1 minute") return 10;

  if (d === "instantaneous") return 1;

  return 99;
}

export function spellRange(f: O5Spell): number | "self" {
  if (f.range_text === "Self") return "self";

  if (f.range_text === "Touch") return 5;

  return f.range === null ? 600 : clamp(Math.round(f.range), 5, 600);
}

function validDice(f: O5Spell) {
  const dice = parseDiceExpr(f.damage_roll);

  return dice && DIE_SIDES.has(dice.sides) && dice.count >= 1 && dice.count <= 40 ? dice : null;
}

export function spellKind(f: O5Spell): Kind {
  const dice = validDice(f);

  if (dice && f.damage_types.length === 0 && HEALS.test(f.desc)) return "heal";

  if (dice && f.damage_types.length > 0 && (f.saving_throw_ability || SPELL_ATTACK.test(f.desc) || IMMEDIATE_DAMAGE.test(f.desc))) return "damage";

  if (f.saving_throw_ability && f.damage_types.length === 0 && CONDITION.test(f.desc)) return "condition";

  return "none";
}

const sideOf = (f: O5Spell, kind: Kind): Side => (kind === "heal" ? "ally" : kind !== "none" || f.saving_throw_ability || SPELL_ATTACK.test(f.desc) ? "enemy" : "ally");

function templateShape(f: O5Spell): { shape: "circle" | "cube" | "cone" | "line"; size: number } | null {
  const shape = f.shape_type ? SHAPES[f.shape_type] : undefined;

  if (shape) {
    const size = shape === "line" ? Number(LINE_LENGTH.exec(f.desc)?.[1] ?? f.shape_size ?? 5) : (f.shape_size ?? 5);

    return { shape, size: clamp(Math.round(size), 5, 120) };
  }

  const area = AREA.exec(f.desc);

  return area ? { shape: "circle", size: clamp(Number(area[1]), 5, 120) } : null;
}

export function spellTargeting(f: O5Spell, side: Side): SpellTargeting {
  const range = spellRange(f);

  const template = templateShape(f);

  if (template) {
    const upTo = UP_TO.exec(f.desc);

    const maxTargets = upTo ? clamp(numberWord(upTo[1]) ?? 20, 1, 20) : 20;

    const centered = template.shape === "circle" || template.shape === "cube";

    const at = range === "self" ? (centered ? 5 : undefined) : range;

    return { kind: "template", shape: template.shape, size: template.size, side, maxTargets, ...(at !== undefined && { range: at }) };
  }

  if (range === "self") return { kind: "self" };

  const count = f.target_count ?? 1;

  if (count > 1) return { kind: "area", side, maxTargets: clamp(count, 1, 20), range };

  return side === "ally" ? { kind: "ally", range } : { kind: "enemy", range };
}

function resolution(f: O5Spell, kind: Kind, targeting: SpellTargeting): SpellResolution {
  if (kind === "damage" && SPELL_ATTACK.test(f.desc) && (targeting.kind === "enemy" || targeting.kind === "area")) return { kind: "attack" };

  if (f.saving_throw_ability && (kind === "damage" || kind === "condition")) {
    return { kind: "save", ability: f.saving_throw_ability as AbilityKey, onSuccess: kind === "damage" && HALF.test(f.desc) ? "half" : "none" };
  }

  return { kind: "auto" };
}

function effects(f: O5Spell, kind: Kind): Effect[] {
  if (kind === "damage") return [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: f.damage_types[0] }];

  if (kind === "heal") return [{ kind: "heal", amount: { spellRoll: 100 } }];

  if (kind === "condition") {
    const condition = CONDITION.exec(f.desc)![1].toLowerCase() as Extract<Effect, { kind: "applyCondition" }>["condition"];

    const ability = f.saving_throw_ability as AbilityKey;

    return [{ kind: "applyCondition", condition, duration: { rounds: durationRounds(f.duration) }, ...(REPEATS_SAVE.test(f.desc) && { saveEnds: { ability } }) }];
  }

  return [];
}

function upcast(f: O5Spell, kind: Kind, options: Array<Fixture<O5CastingOption, number>>): Pick<SpellRow, "upcastDice" | "upcastTargets"> {
  if (f.level === 0) return {};

  const base = validDice(f);

  let upcastDice: number | undefined;

  if (base && (kind === "damage" || kind === "heal")) {
    const steps = options
      .filter((o) => o.fields.type.startsWith("slot_level_"))
      .map((o) => ({ level: Number(o.fields.type.slice("slot_level_".length)), dice: parseDiceExpr(o.fields.damage_roll) }))
      .filter((o): o is { level: number; dice: { count: number; sides: number } } => !!o.dice && o.dice.sides === base.sides)
      .sort((a, b) => a.level - b.level);

    if (steps.length > 0) {
      const per = (steps[0].dice.count - base.count) / (steps[0].level - f.level);

      if (Number.isInteger(per) && per > 0 && steps.every((s) => s.dice.count === base.count + per * (s.level - f.level))) upcastDice = per;
    }

    const text = upcastDice === undefined ? TEXT_UPCAST.exec(f.higher_level ?? "") : null;

    if (text && Number(text[2]) === base.sides) upcastDice = Number(text[1]);
  }

  return {
    ...(upcastDice !== undefined && { upcastDice: clamp(upcastDice, 0, 10) }),
    ...(EXTRA_TARGETS.test(f.higher_level ?? "") && { upcastTargets: 1 }),
  };
}

function description(f: O5Spell): string {
  const components = [f.verbal && "V", f.somatic && "S", f.material && `M${f.material_specified ? ` (${f.material_specified})` : ""}`].filter(Boolean).join(", ");

  const school = titleCase(f.school);

  const head = [
    f.level === 0 ? `${school} Cantrip` : `Level ${f.level} ${school}`,
    `Casting Time: ${CASTING_TIME[f.casting_time] ?? f.casting_time}${f.ritual ? " or Ritual" : ""}`,
    `Range: ${f.range_text}`,
    `Components: ${components || "—"}`,
    `Duration: ${f.concentration ? "Concentration, up to " : ""}${capitalize(f.duration)}`,
    `Classes: ${f.classes.map((c) => titleCase(c.replace(/^srd-2024_/, ""))).join(", ") || "—"}`,
  ].join(" · ");

  const higher = f.higher_level ? `${f.level === 0 ? "Cantrip Upgrade." : "Using a Higher-Level Spell Slot."} ${f.higher_level}` : null;

  return [head, f.desc.trim(), higher].filter(Boolean).join("\n\n");
}

export function convertSpell(row: Fixture<O5Spell>, options: Array<Fixture<O5CastingOption, number>>): SpellRow {
  const f = row.fields;

  const kind = spellKind(f);

  const targeting = spellTargeting(f, sideOf(f, kind));

  const dice = kind === "damage" || kind === "heal" ? validDice(f) : null;

  const base: SpellRow = {
    slug: row.pk,
    name: f.name,
    level: f.level,
    groupId: schoolName(f.school),
    description: description(f),
    cost: f.casting_time === "bonus-action" ? "bonusAction" : "action",
    dice: dice?.count ?? 0,
    ...(dice && { dieSides: dice.sides as SpellRow["dieSides"] }),
    concentration: f.concentration,
    ...upcast(f, kind, options),
    ...(kind === "heal" && ADDS_MOD.test(f.desc) && { addAbilityMod: true }),
    targeting,
    resolution: resolution(f, kind, targeting),
    spellEffects: effects(f, kind),
  };

  return { ...base, ...SPELL_OVERRIDES[row.pk] };
}

export function convertSpells(data: Open5eData): SpellRow[] {
  const options = groupBy(data.castingOptions, (o) => o.fields.parent);

  return data.spells.map((s) => convertSpell(s, options.get(s.pk) ?? [])).sort(bySlug);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test:run scripts/srd/__tests__/spells.test.ts`
Expected: PASS (11 tests). Якщо очікування не збігається через формулювання даних (напр. регулярка `UP_TO` не знайшла «six» у Mass Cure Wounds), спершу подивитися текст у фікстурі; виправити **регулярку конвертера**, а не тест. Тест змінювати лише якщо дані SRD справді кажуть інше — і записати це у звіт.

- [ ] **Step 7: Commit**

```bash
git add scripts/srd/convert/spell-groups.ts scripts/srd/convert/spells.ts scripts/srd/overrides/spells.ts scripts/srd/__tests__/spells.test.ts
git commit -m "feat(constructor): SRD 5.2 spell and school converters with hand overrides

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Конвертер рас (види SRD)

**Files:**
- Create: `scripts/srd/convert/races.ts`, `scripts/srd/overrides/races.ts`
- Test: `scripts/srd/__tests__/races.test.ts`

**Interfaces:**
- Consumes: `Open5eData`, `groupBy`, `slugTail`, `noteAbility`, `coreAbility`, `AbilityCore`, `RaceRow`, `bySlug`.
- Produces: `convertRaces(data): RaceRow[]`; `RACE_OVERRIDES: Record<string, AbilityCore>`.

- [ ] **Step 1: Write the failing test** — `scripts/srd/__tests__/races.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { convertRaces } from "../convert/races";
import { FIXTURE_DIR, loadOpen5e } from "../lib/open5e";

const races = convertRaces(loadOpen5e(FIXTURE_DIR));

const race = (name: string) => races.find((r) => r.name === name)!;

const ability = (raceName: string, id: string) => race(raceName).abilities.find((a) => a.id === id);

describe("convertRaces", () => {
  it("one race per species; size and speed go to the passive text", () => {
    expect(races.map((r) => r.name)).toEqual(["Dwarf", "Elf", "Goliath", "Orc"]);
    expect(race("Dwarf").passiveAbility.name).toBe("Size and Speed");
    expect(race("Dwarf").passiveAbility.description).toContain("Speed: 30 feet");
    expect(race("Dwarf").abilities.some((a) => a.id === "speed" || a.id === "size")).toBe(false);
  });

  it("mechanized traits", () => {
    expect(ability("Dwarf", "dwarven-toughness")).toMatchObject({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "maxHp", flat: { formula: "hero_level" } }] });
    expect(ability("Dwarf", "dwarven-resilience")).toMatchObject({ effects: [{ kind: "flag", flag: "resistance", damageType: "poison", percent: 50 }] });
    expect(ability("Goliath", "speed")).toMatchObject({ effects: [{ kind: "modifyStat", stat: "speed", flat: 5 }] });
    expect(ability("Orc", "relentless-endurance")).toMatchObject({ trigger: { event: "lethalDamage" }, limits: { perRest: { rest: "long", uses: 1 } }, effects: [{ kind: "heal", amount: 1, revive: true }] });
  });

  it("other traits are notes with the full SRD text", () => {
    const darkvision = ability("Elf", "darkvision")!;

    expect(darkvision.effects).toEqual([{ kind: "note", text: "Darkvision" }]);
    expect(darkvision.description).toContain("Darkvision with a range of 60 feet");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/races.test.ts`
Expected: FAIL — модуля немає.

- [ ] **Step 3: `overrides/races.ts`**

```ts
import type { AbilityCore } from "../lib/abilities";

export const RACE_OVERRIDES: Record<string, AbilityCore> = {
  "srd-2024_dwarf_dwarven-resilience": { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "poison", percent: 50 }] },
  "srd-2024_dwarf_dwarven-toughness": { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "maxHp", flat: { formula: "hero_level" } }] },
  "srd-2024_gnome_gnomish-cunning": { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "saveAdvantage", abilities: ["intelligence", "wisdom", "charisma"] }] },
  "srd-2024_goliath_speed": { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "speed", flat: 5 }] },
  "srd-2024_orc_relentless-endurance": { trigger: { event: "lethalDamage" }, limits: { perRest: { rest: "long", uses: 1 } }, effects: [{ kind: "heal", amount: 1, revive: true }] },
};
```

- [ ] **Step 4: `convert/races.ts`**

```ts
import type { Ability } from "@/lib/utils/abilities/schema";

import { coreAbility, noteAbility } from "../lib/abilities";
import { type Fixture, groupBy, type O5SpeciesTrait, type Open5eData, slugTail } from "../lib/open5e";
import { bySlug } from "../lib/text";
import type { RaceRow } from "../lib/types";
import { RACE_OVERRIDES } from "../overrides/races";

const BASICS = new Set(["SIZE", "SPEED"]);

function traitAbility(t: Fixture<O5SpeciesTrait>): Ability {
  const id = slugTail(t.pk);

  const desc = t.fields.desc.trim();

  const core = RACE_OVERRIDES[t.pk];

  return core ? coreAbility(id, t.fields.name, desc, core) : noteAbility(id, t.fields.name, desc);
}

export function convertRaces(data: Open5eData): RaceRow[] {
  const traits = groupBy(data.speciesTraits, (t) => t.fields.parent);

  return data.species
    .map((s) => {
      const own = [...(traits.get(s.pk) ?? [])].sort((a, b) => a.fields.order - b.fields.order);

      const basics = own.filter((t) => BASICS.has(t.fields.type ?? ""));

      const rest = own.filter((t) => !BASICS.has(t.fields.type ?? ""));

      return {
        slug: s.pk,
        name: s.fields.name,
        passiveAbility: { name: "Size and Speed", description: basics.map((t) => `${t.fields.name}: ${t.fields.desc.trim()}`).join("\n") },
        abilities: [...basics.filter((t) => RACE_OVERRIDES[t.pk]), ...rest].map(traitAbility),
      };
    })
    .sort(bySlug);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:run scripts/srd/__tests__/races.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/srd/convert/races.ts scripts/srd/overrides/races.ts scripts/srd/__tests__/races.test.ts
git commit -m "feat(constructor): SRD 5.2 species converter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Конвертер класів і підкласів

**Files:**
- Create: `scripts/srd/convert/classes.ts`, `scripts/srd/overrides/classes.ts`
- Test: `scripts/srd/__tests__/classes.test.ts`

**Interfaces:**
- Consumes: `Open5eData`, `slugTail`, `groupBy`, `noteAbility`, `coreAbility`, `AbilityCore`, `ABILITY_BY_SHORT`, `ClassRow`, `ClassFeatureGroup`, `bySlug`.
- Produces: `parseCoreTraits(desc): { skillChoices; proficiencies }`, `convertClasses(data): ClassRow[]`; `CLASS_FEATURE_OVERRIDES: Record<string, AbilityCore>`, `FEATURE_LEVELS: Record<string, number>`, `SPELLCASTING_ABILITY: Record<string, AbilityKey>`, `DROP_FEATURES: ReadonlySet<string>`, `TYPO_FIXES: Record<string, string>`.

- [ ] **Step 1: Write the failing test** — `scripts/srd/__tests__/classes.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { DND_SKILLS } from "@/lib/constants/skills";

import { convertClasses, parseCoreTraits } from "../convert/classes";
import { FIXTURE_DIR, loadOpen5e } from "../lib/open5e";

const classes = convertClasses(loadOpen5e(FIXTURE_DIR));

const cls = (name: string) => classes.find((c) => c.name === name)!;

const at = (name: string, level: number) => cls(name).features.find((f) => f.level === level)?.abilities ?? [];

describe("convertClasses", () => {
  it("only base classes as rows, subclasses nested", () => {
    expect(classes.map((c) => c.name)).toEqual(["Bard", "Fighter", "Monk", "Wizard"]);
    expect(cls("Fighter").subclasses.map((s) => ({ id: s.id, name: s.name }))).toEqual([{ id: "champion", name: "Champion" }]);
    expect(cls("Bard").subclasses[0].id).toBe("college-of-lore");
  });

  it("Fighter core traits", () => {
    expect(cls("Fighter")).toMatchObject({ hitDie: 10, savingThrows: ["strength", "constitution"], caster: "none", spellcastingAbility: null, subclassLevel: 3 });
    expect(cls("Fighter").proficiencies).toEqual({ armor: ["Light, Medium, and Heavy armor and Shields"], weapons: ["Simple and Martial weapons"], tools: [] });
    expect(cls("Fighter").skillChoices.count).toBe(2);
    expect(cls("Fighter").skillChoices.from).toEqual(["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "persuasion", "perception", "survival"]);
  });

  it("Extra Attack, Second Wind, Action Surge (2 and 17), no table columns", () => {
    expect(at("Fighter", 5).find((a) => a.name === "Extra Attack")).toMatchObject({ id: "extra-attack-5", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: 1 }] });
    expect(at("Fighter", 1).find((a) => a.name === "Second Wind")).toMatchObject({
      id: "second-wind-1",
      trigger: { event: "bonusAction" },
      limits: { perRest: { rest: "long", uses: 2 } },
      effects: [{ kind: "heal", amount: "1d10", target: "self" }, { kind: "heal", amount: { formula: "hero_level" }, target: "self" }],
    });
    expect(at("Fighter", 2).some((a) => a.id === "action-surge-2")).toBe(true);
    expect(at("Fighter", 17).find((a) => a.id === "action-surge-17")).toMatchObject({ trigger: { event: "action" }, effects: [{ kind: "grantAction", extraActions: 2 }] });

    const names = cls("Fighter").features.flatMap((f) => f.abilities.map((a) => a.name));

    expect(names).not.toContain("Proficiency Bonus");
    expect(names).not.toContain("Core Fighter Traits");
    expect(names.filter((n) => n === "Second Wind")).toHaveLength(1);
  });

  it("Champion Improved Critical at 3", () => {
    const f = cls("Fighter").subclasses[0].features.find((g) => g.level === 3)!;

    expect(f.abilities.find((a) => a.name === "Improved Critical")).toMatchObject({ effects: [{ kind: "modifyStat", stat: "critThreshold", flat: -1 }] });
  });

  it("Wizard: full caster on Intelligence, no spell-list feature", () => {
    expect(cls("Wizard")).toMatchObject({ hitDie: 6, caster: "full", spellcastingAbility: "intelligence" });
    expect(cls("Wizard").features.flatMap((f) => f.abilities).some((a) => /Spell List/i.test(a.name))).toBe(false);
  });

  it("Bard: any 3 skills; subclass marker without a level row lands at 3", () => {
    expect(cls("Bard").skillChoices).toEqual({ count: 3, from: [...DND_SKILLS] });
    expect(at("Bard", 3).some((a) => a.id === "bard-subclass-3")).toBe(true);
  });

  it("Monk: typo fixed, column-like feature keeps only its first level", () => {
    const movement = cls("Monk").features.flatMap((f) => f.abilities.map((a) => ({ level: f.level, a }))).filter((x) => x.a.name === "Unarmored Movement");

    expect(movement.map((x) => x.level)).toEqual([2]);
    expect(movement[0].a.effects).toEqual([{ kind: "modifyStat", stat: "speed", flat: 10 }]);
  });

  it("parseCoreTraits handles typos and long weapon lists", () => {
    const desc = "|||\n|---|---|\n|Skill Proficiencies|Choose 2: Arcana, History, In sight, Na ture, or Religion|\n|Weapon Proficiencies|Simple weapons and Martial weapons that have the Finesse or Light property|\n|Tool Proficiencies|Thieves' Tools|\n|Armor Training|None|";

    expect(parseCoreTraits(desc)).toEqual({
      skillChoices: { count: 2, from: ["arcana", "history", "insight", "nature", "religion"] },
      proficiencies: { armor: [], weapons: ["Simple weapons", "Martial weapons that have the Finesse or Light property"], tools: ["Thieves' Tools"] },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/classes.test.ts`
Expected: FAIL — модуля немає.

- [ ] **Step 3: `overrides/classes.ts`**

```ts
import type { AbilityKey } from "@/lib/constants/abilities";

import type { AbilityCore } from "../lib/abilities";

const EXTRA_ATTACK: AbilityCore = { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: 1 }] };

const passive = (effects: AbilityCore["effects"]): AbilityCore => ({ trigger: { event: "passive" }, effects });

// incremental: Two/Three Extra Attacks stack with Extra Attack, Superior Critical with Improved Critical
export const CLASS_FEATURE_OVERRIDES: Record<string, AbilityCore> = {
  "srd-2024_barbarian_extra-attack": EXTRA_ATTACK,
  "srd-2024_fighter_extra-attack": EXTRA_ATTACK,
  "srd-2024_paladin_extra-attack": EXTRA_ATTACK,
  "srd-2024_ranger_extra-attack": EXTRA_ATTACK,
  "srd-2024_monk_extra-attack": EXTRA_ATTACK,
  "srd-2024_fighter_two-extra-attacks": EXTRA_ATTACK,
  "srd-2024_fighter_three-extra-attacks": EXTRA_ATTACK,
  // the action is spent first: the first granted action returns it, the second goes to the pool
  "srd-2024_fighter_action-surge": { trigger: { event: "action" }, limits: { perRest: { rest: "short", uses: 1 } }, effects: [{ kind: "grantAction", extraActions: 2 }] },
  "srd-2024_fighter_second-wind": {
    trigger: { event: "bonusAction" },
    limits: { perRest: { rest: "long", uses: 2 } },
    effects: [
      { kind: "heal", amount: "1d10", target: "self" },
      { kind: "heal", amount: { formula: "hero_level" }, target: "self" },
    ],
  },
  "srd-2024_fighter_champion_improved-critical": passive([{ kind: "modifyStat", stat: "critThreshold", flat: -1 }]),
  "srd-2024_fighter_champion_superior-critical": passive([{ kind: "modifyStat", stat: "critThreshold", flat: -1 }]),
  "srd-2024_fighter_champion_remarkable-athlete": passive([{ kind: "flag", flag: "checkAdvantage", skills: ["athletics"] }]),
  "srd-2024_barbarian_danger-sense": passive([{ kind: "flag", flag: "saveAdvantage", abilities: ["dexterity"] }]),
  "srd-2024_barbarian_fast-movement": passive([{ kind: "modifyStat", stat: "speed", flat: 10 }]),
  "srd-2024_barbarian_primal-champion": passive([
    { kind: "modifyStat", stat: "strength", flat: 4 },
    { kind: "modifyStat", stat: "constitution", flat: 4 },
  ]),
  "srd-2024_barbarian_rage": {
    trigger: { event: "bonusAction" },
    limits: { perRest: { rest: "long", uses: 2 } },
    effects: [
      { kind: "flag", flag: "resistance", damageType: "bludgeoning", percent: 50, duration: { rounds: 10 } },
      { kind: "flag", flag: "resistance", damageType: "piercing", percent: 50, duration: { rounds: 10 } },
      { kind: "flag", flag: "resistance", damageType: "slashing", percent: 50, duration: { rounds: 10 } },
      { kind: "damageBonus", filter: { kind: "melee" }, flat: 2, duration: { rounds: 10 } },
    ],
  },
  "srd-2024_rogue_slippery-mind": passive([{ kind: "flag", flag: "saveProficiency", abilities: ["wisdom", "charisma"] }]),
  "srd-2024_monk_unarmored-movement": passive([{ kind: "modifyStat", stat: "speed", flat: 10 }]),
  "srd-2024_monk_disciplined-survivor": passive([{ kind: "flag", flag: "saveProficiency", abilities: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] }]),
  "srd-2024_ranger_roving": passive([{ kind: "modifyStat", stat: "speed", flat: 10 }]),
  "srd-2024_paladin_aura-of-courage": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["frightened"], target: "nearbyAllies" }]),
  "srd-2024_paladin_oath-of-devotion_aura-of-devotion": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["charmed"], target: "nearbyAllies" }]),
  "srd-2024_druid_circle-of-the-land_natures-ward": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["poisoned"] }]),
  "srd-2024_sorcerer_draconic-sorcery_draconic-resilience": passive([{ kind: "modifyStat", stat: "maxHp", flat: { formula: "hero_level" } }]),
};

// Open5e has no level rows for these
export const FEATURE_LEVELS: Record<string, number> = {
  "srd-2024_bard_bard-subclass": 3,
  "srd-2024_monk_deflect-attacks": 3,
  "srd-2024_sorcerer_metamagic-options": 2,
  "srd-2024_warlock_eldritch-invocation-options": 1,
};

// a class-table column without a feature_type
export const DROP_FEATURES: ReadonlySet<string> = new Set(["srd-2024_druid_wild-shape-uses"]);

export const SPELLCASTING_ABILITY: Record<string, AbilityKey> = {
  "srd-2024_bard": "charisma",
  "srd-2024_cleric": "wisdom",
  "srd-2024_druid": "wisdom",
  "srd-2024_paladin": "charisma",
  "srd-2024_ranger": "wisdom",
  "srd-2024_sorcerer": "charisma",
  "srd-2024_warlock": "charisma",
  "srd-2024_wizard": "intelligence",
};

export const TYPO_FIXES: Record<string, string> = { "Studdied Attacks": "Studied Attacks", "Unarmoed Movement": "Unarmored Movement" };
```

- [ ] **Step 4: `convert/classes.ts`**

```ts
import { ABILITY_KEYS } from "@/lib/constants/abilities";
import type { ClassCaster } from "@/lib/constants/classes";
import { DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import type { Ability } from "@/lib/utils/abilities/schema";

import { coreAbility, noteAbility } from "../lib/abilities";
import { type Fixture, groupBy, type O5Feature, type Open5eData, slugTail } from "../lib/open5e";
import { ABILITY_BY_SHORT, bySlug } from "../lib/text";
import type { ClassFeatureGroup, ClassRow } from "../lib/types";
import { CLASS_FEATURE_OVERRIDES, DROP_FEATURES, FEATURE_LEVELS, SPELLCASTING_ABILITY, TYPO_FIXES } from "../overrides/classes";

const DROP_TYPES = new Set(["PROFICIENCY_BONUS", "CLASS_TABLE_DATA", "SPELL_SLOTS", "CORE_TRAITS_TABLE"]);

const SPELL_LIST = /spell-list$/;

const COLUMN_LIKE_ROWS = 6;

const CASTER: Record<string, ClassCaster> = { NONE: "none", FULL: "full", HALF: "half", PACT: "pact" };

const PROF_MAX = 60;

function skillKey(name: string): DndSkill {
  const flat = name.replace(/\s+/g, "").toLowerCase();

  const key = DND_SKILLS.find((k) => k.toLowerCase() === flat);

  if (!key) throw new Error(`Unknown skill «${name}»`);

  return key;
}

function splitProficiency(text: string): string[] {
  if (!text || /^none$/i.test(text)) return [];

  if (text.length <= PROF_MAX) return [text];

  return text
    .split(/,\s*(?:and\s+)?|\s+and\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.slice(0, PROF_MAX));
}

export function parseCoreTraits(desc: string): Pick<ClassRow, "skillChoices" | "proficiencies"> {
  const cell = (label: string) => new RegExp(`\\|${label}\\|([^|]*)\\|`).exec(desc)?.[1]?.trim() ?? "";

  const skills = cell("Skill Proficiencies");

  const count = Number(/Choose (?:any )?(\d+)/i.exec(skills)?.[1] ?? 0);

  const list = skills.includes(":") ? skills.slice(skills.indexOf(":") + 1) : "";

  const from = list
    ? list
        .split(/,\s*(?:or\s+)?|\s+or\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(skillKey)
    : [...DND_SKILLS];

  return {
    skillChoices: { count, from },
    proficiencies: { armor: splitProficiency(cell("Armor Training")), weapons: splitProficiency(cell("Weapon Proficiencies")), tools: splitProficiency(cell("Tool Proficiencies")) },
  };
}

function featureAbility(f: Fixture<O5Feature>, level: number): Ability {
  const id = `${slugTail(f.pk)}-${level}`;

  const name = TYPO_FIXES[f.fields.name] ?? f.fields.name;

  const desc = f.fields.desc.trim();

  const core = CLASS_FEATURE_OVERRIDES[f.pk];

  return core ? coreAbility(id, name, desc, core) : noteAbility(id, name, desc);
}

function featureGroups(data: Open5eData, ownerPk: string, levelsOf: Map<string, number[]>): ClassFeatureGroup[] {
  const byLevel = new Map<number, Ability[]>();

  for (const f of data.features) {
    if (f.fields.parent !== ownerPk || DROP_TYPES.has(f.fields.feature_type ?? "") || DROP_FEATURES.has(f.pk) || SPELL_LIST.test(f.pk)) continue;

    let levels = levelsOf.get(f.pk) ?? (FEATURE_LEVELS[f.pk] !== undefined ? [FEATURE_LEVELS[f.pk]] : null);

    if (!levels) throw new Error(`Feature without level: ${f.pk}`);

    if (levels.length > COLUMN_LIKE_ROWS) levels = [levels[0]];

    for (const level of levels) byLevel.set(level, [...(byLevel.get(level) ?? []), featureAbility(f, level)]);
  }

  return [...byLevel].sort(([a], [b]) => a - b).map(([level, abilities]) => ({ level, abilities }));
}

export function convertClasses(data: Open5eData): ClassRow[] {
  const levelsOf = new Map([...groupBy(data.featureItems, (i) => i.fields.parent)].map(([pk, rows]) => [pk, [...new Set(rows.map((r) => r.fields.level))].sort((a, b) => a - b)]));

  return data.classes
    .filter((c) => !c.fields.subclass_of)
    .map((c) => {
      const core = data.features.find((f) => f.fields.parent === c.pk && f.fields.feature_type === "CORE_TRAITS_TABLE");

      if (!core) throw new Error(`No core traits: ${c.pk}`);

      const hitDie = Number(c.fields.hit_dice?.replace(/^D/i, ""));

      if (![6, 8, 10, 12].includes(hitDie)) throw new Error(`Bad hit die: ${c.pk}`);

      return {
        slug: c.pk,
        name: c.fields.name,
        hitDie: hitDie as ClassRow["hitDie"],
        savingThrows: ABILITY_KEYS.filter((k) => c.fields.saving_throws.some((s) => ABILITY_BY_SHORT[s] === k)),
        ...parseCoreTraits(core.fields.desc),
        caster: CASTER[c.fields.caster_type] ?? "none",
        spellcastingAbility: SPELLCASTING_ABILITY[c.pk] ?? null,
        features: featureGroups(data, c.pk, levelsOf),
        subclassLevel: 3,
        subclasses: data.classes
          .filter((s) => s.fields.subclass_of === c.pk)
          .map((s) => ({ id: slugTail(s.pk), name: s.fields.name, features: featureGroups(data, s.pk, levelsOf) })),
      };
    })
    .sort(bySlug);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:run scripts/srd/__tests__/classes.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/srd/convert/classes.ts scripts/srd/overrides/classes.ts scripts/srd/__tests__/classes.test.ts
git commit -m "feat(constructor): SRD 5.2 class and subclass converter with feature overrides

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Конвертер монстрів

**Files:**
- Create: `scripts/srd/convert/units.ts`, `scripts/srd/overrides/units.ts`
- Test: `scripts/srd/__tests__/units.test.ts`

**Interfaces:**
- Consumes: `Open5eData`, `groupBy`, `slugTail`, `noteAbility`, `coreAbility`, `uniqueId`, `abilityMod`, `clamp`, `numberWord`, `titleCase`, `UnitRow`, `UnitAttackRow`, `bySlug`.
- Produces: `parseTextAttack(name, desc): UnitAttackRow | null`, `convertUnits(data): UnitRow[]`; `UNIT_OVERRIDES: Record<string, Partial<Pick<UnitRow, "multiattack" | "legendaryActions" | "legendaryResistances">>>`.

- [ ] **Step 1: Write the failing test** — `scripts/srd/__tests__/units.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { convertUnits, parseTextAttack } from "../convert/units";
import { FIXTURE_DIR, loadOpen5e } from "../lib/open5e";

const units = convertUnits(loadOpen5e(FIXTURE_DIR));

const unit = (name: string) => units.find((u) => u.name === name)!;

const ability = (name: string, id: string) => unit(name).abilities.find((a) => a.id === id);

describe("convertUnits", () => {
  it("Adult Red Dragon: stats, saves, legendary, size", () => {
    expect(unit("Adult Red Dragon")).toMatchObject({
      slug: "srd-2024_adult-red-dragon",
      cr: 17,
      level: 17,
      armorClass: 19,
      maxHp: 256,
      speed: 40,
      initiative: 12,
      gridSize: 3,
      strength: 27,
      charisma: 23,
      saveProficiencies: ["dexterity", "wisdom"],
      multiattack: 3,
      legendaryActions: 3,
      legendaryResistances: 3,
    });
  });

  it("Adult Red Dragon: Rend without the stat bonus, reach and the fire rider in properties", () => {
    expect(unit("Adult Red Dragon").attacks).toEqual([{ name: "Rend", type: "melee", attackBonus: 14, damageDice: "1d10", damageType: "slashing", traits: ["reach"], properties: "plus 2d4 fire damage" }]);
  });

  it("Adult Red Dragon: immunity as resistance 100, legendary actions usable, breath as a note", () => {
    expect(ability("Adult Red Dragon", "damage-immunities")).toMatchObject({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 100 }] });

    const legendary = unit("Adult Red Dragon").abilities.filter((a) => a.limits?.legendaryCost);

    expect(legendary.map((a) => a.name).sort()).toEqual(["Commanding Presence", "Fiery Rays", "Pounce"]);
    expect(legendary.every((a) => a.trigger.event === "action" && a.limits?.legendaryCost === 1)).toBe(true);
    expect(unit("Adult Red Dragon").abilities.find((a) => a.name.startsWith("Fire Breath"))).toMatchObject({ name: "Fire Breath (Recharge 5–6)", effects: [{ kind: "note", text: "Fire Breath (Recharge 5–6)" }] });
    expect(unit("Adult Red Dragon").abilities.some((a) => a.name.startsWith("Legendary Resistance"))).toBe(false);
    expect(ability("Adult Red Dragon", "statblock")?.description).toContain("Huge Dragon, Chaotic Evil");
  });

  it("Goblin Warrior: finesse scimitar, ranged shortbow, CR 1/4 → level 1, small → 1 cell", () => {
    expect(unit("Goblin Warrior")).toMatchObject({ cr: 0.25, level: 1, gridSize: 1 });
    expect(unit("Goblin Warrior").attacks).toEqual([
      { name: "Scimitar", type: "melee", attackBonus: 4, damageDice: "1d6", damageType: "slashing", traits: ["finesse"] },
      { name: "Shortbow", type: "ranged", attackBonus: 4, damageDice: "1d6", damageType: "piercing", range: "80/320" },
    ]);
  });

  it("text-only attacks, flat damage and multiattack overrides", () => {
    expect(unit("Ankheg").attacks[0]).toEqual({ name: "Bite", type: "melee", attackBonus: 5, damageDice: "2d6", damageType: "slashing", properties: "plus 1d6 acid damage" });
    expect(unit("Bat").attacks[0]).toMatchObject({ damageDice: "1", damageType: "piercing" });
    expect(unit("Octopus").attacks[0]).toMatchObject({ damageDice: "1" });
    expect(unit("Hydra").multiattack).toBe(5);
    expect(unit("Bugbear Warrior").attacks.find((a) => a.name === "Light Hammer")).toEqual({ name: "Light Hammer", type: "melee", attackBonus: 4, damageDice: "3d4", damageType: "bludgeoning", range: "20/60", traits: ["reach", "thrown"] });
  });

  it("Magic Resistance and Regeneration are mechanized", () => {
    expect(ability("Archmage", "magic-resistance")).toMatchObject({ effects: [{ kind: "flag", flag: "saveAdvantage", abilities: "all", vsSpells: true }] });
    expect(ability("Oni", "regeneration")).toMatchObject({ trigger: { event: "turnStart" }, effects: [{ kind: "heal", amount: 10, target: "self" }] });
  });

  it("parseTextAttack: unparseable text → null", () => {
    expect(parseTextAttack("Tentacle", "Melee Attack Roll: +7, reach 60 ft. The target has the Grappled condition (escape DC 14).")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/units.test.ts`
Expected: FAIL — модуля немає.

- [ ] **Step 3: `overrides/units.ts`**

```ts
import type { UnitRow } from "../lib/types";

export const UNIT_OVERRIDES: Record<string, Partial<Pick<UnitRow, "multiattack" | "legendaryActions" | "legendaryResistances">>> = {
  // «as many Bite attacks as it has heads» — starts with five heads
  "srd-2024_hydra": { multiattack: 5 },
};
```

- [ ] **Step 4: `convert/units.ts`**

```ts
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import type { WeaponTrait } from "@/lib/constants/weapon-traits";
import type { Ability, Effect } from "@/lib/utils/abilities/schema";

import { coreAbility, noteAbility, uniqueId } from "../lib/abilities";
import { type Fixture, groupBy, type O5Creature, type O5CreatureAction, type O5CreatureAttack, type Open5eData, slugTail } from "../lib/open5e";
import { abilityMod, bySlug, clamp, numberWord, titleCase } from "../lib/text";
import type { UnitAttackRow, UnitRow } from "../lib/types";
import { UNIT_OVERRIDES } from "../overrides/units";

const SIZE_CELLS: Record<string, UnitRow["gridSize"]> = { tiny: 1, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 3 };

const TEXT_ATTACK = /^(Melee or Ranged|Melee|Ranged) Attack Roll: \+(\d+)(?: to hit)?(?: \([^)]*\))?, (?:reach (\d+) (?:ft\.|feet))?(?: or )?(?:range (\d+)(?:\/(\d+))? (?:ft\.|feet))?\.? (?:\d+ \((\d+)d(\d+)(?: [+−-] \d+)?\)|(\d+)) (\w+) damage(.*)$/s;

const TEXT_EXTRA = /^,? plus \d+ \((\d+d\d+)\) (\w+) damage/i;

const MULTI = /\bmakes (one|two|three|four|five|six|\d+) /i;

const LEGENDARY_RES = /^Legendary Resistance \((\d+)\/Day/i;

const REGEN = /regains (\d+) Hit Points at the start of (?:each of )?its turns?/i;

const score = (c: O5Creature, k: AbilityKey) => c[`ability_score_${k}`];

const dieOf = (count: number | null, type: string | null) => (count && type ? `${count}d${type.replace(/^D/i, "")}` : null);

function withTraits(row: UnitAttackRow, traits: WeaponTrait[]): UnitAttackRow {
  return traits.length > 0 ? { ...row, traits } : row;
}

function attackFromRecord(action: Fixture<O5CreatureAction>, a: O5CreatureAttack, c: O5Creature): UnitAttackRow {
  const melee = (a.reach ?? 0) > 0;

  const ranged = (a.range ?? 0) > 0;

  const str = abilityMod(score(c, "strength"));

  const dex = abilityMod(score(c, "dexterity"));

  const finesse = melee && a.damage_bonus === dex && dex !== str;

  const traits: WeaponTrait[] = [...(melee && (a.reach ?? 0) >= 10 ? (["reach"] as const) : []), ...(melee && ranged ? (["thrown"] as const) : []), ...(finesse ? (["finesse"] as const) : [])];

  const expected = finesse || !melee ? dex : str;

  const extra = dieOf(a.extra_damage_die_count, a.extra_damage_die_type);

  const notes = [extra && `plus ${extra} ${(a.extra_damage_type ?? "").toLowerCase()} damage`, a.damage_bonus !== null && a.damage_bonus !== expected && (dieOf(a.damage_die_count, a.damage_die_type) ? `statblock damage bonus ${a.damage_bonus >= 0 ? "+" : ""}${a.damage_bonus}` : null)].filter(Boolean);

  const row: UnitAttackRow = {
    name: action.fields.name,
    type: melee ? "melee" : "ranged",
    attackBonus: a.to_hit_mod,
    damageDice: dieOf(a.damage_die_count, a.damage_die_type) ?? String(Math.max(1, a.damage_bonus ?? 1)),
    damageType: (a.damage_type ?? "bludgeoning").toLowerCase(),
    ...(ranged && { range: a.long_range ? `${a.range}/${a.long_range}` : `${a.range}` }),
    ...(notes.length > 0 && { properties: notes.join("; ") }),
  };

  return withTraits(row, traits);
}

export function parseTextAttack(name: string, desc: string): UnitAttackRow | null {
  const m = TEXT_ATTACK.exec(desc.trim());

  if (!m) return null;

  const [, kind, bonus, reach, range, long, count, sides, flat, type, rest] = m;

  const extra = TEXT_EXTRA.exec(rest ?? "");

  const traits: WeaponTrait[] = [...(reach && Number(reach) >= 10 ? (["reach"] as const) : []), ...(kind === "Melee or Ranged" ? (["thrown"] as const) : [])];

  const row: UnitAttackRow = {
    name,
    type: kind.startsWith("Melee") ? "melee" : "ranged",
    attackBonus: Number(bonus),
    damageDice: count ? `${count}d${sides}` : flat,
    damageType: type.toLowerCase(),
    ...(range && { range: long ? `${range}/${long}` : range }),
    ...(extra && { properties: `plus ${extra[1]} ${extra[2].toLowerCase()} damage` }),
  };

  return withTraits(row, traits);
}

function usesSuffix(a: O5CreatureAction): string {
  if (a.uses_type === "RECHARGE_ON_ROLL") return ` (Recharge ${a.uses_param ?? 6}–6)`;

  if (a.uses_type === "PER_DAY") return ` (${a.uses_param ?? 1}/Day)`;

  if (a.uses_type === "RECHARGE") return " (Recharge after a Rest)";

  if (a.action_type === "BONUS_ACTION") return " (Bonus Action)";

  if (a.action_type === "REACTION") return " (Reaction)";

  return "";
}

const flagsAbility = (id: string, name: string, list: string[], effect: (t: string) => Effect): Ability | null =>
  list.length > 0 ? coreAbility(id, name, list.map(titleCase).join(", "), { trigger: { event: "passive" }, effects: list.map(effect) }) : null;

function statblock(c: O5Creature): string {
  const speeds = [c.walk && `${c.walk} ft.`, c.climb && `climb ${c.climb} ft.`, c.fly && `fly ${c.fly} ft.`, c.swim && `swim ${c.swim} ft.`, c.burrow && `burrow ${c.burrow} ft.`].filter(Boolean);

  const senses = [
    c.blindsight_range && `Blindsight ${c.blindsight_range} ft.`,
    c.darkvision_range && `Darkvision ${c.darkvision_range} ft.`,
    c.tremorsense_range && `Tremorsense ${c.tremorsense_range} ft.`,
    c.truesight_range && `Truesight ${c.truesight_range} ft.`,
    c.passive_perception !== null && `Passive Perception ${c.passive_perception}`,
  ].filter(Boolean);

  return [`${titleCase(c.size)} ${titleCase(c.type)}, ${titleCase(c.alignment)}`, `Speed: ${speeds.join(", ") || "—"}`, `Senses: ${senses.join(", ") || "—"}`, `Languages: ${c.languages_desc || "—"}`].join("\n");
}

export function convertUnits(data: Open5eData): UnitRow[] {
  const actions = groupBy(data.creatureActions, (a) => a.fields.parent);

  const attacks = groupBy(data.creatureAttacks, (a) => a.fields.parent);

  const traits = groupBy(data.creatureTraits, (t) => t.fields.parent);

  return data.creatures
    .map((row): UnitRow => {
      const c = row.fields;

      const seen = new Set<string>();

      const cr = Number(c.challenge_rating);

      const own = [...(actions.get(row.pk) ?? [])].sort((a, b) => (a.fields.order_in_statblock ?? 0) - (b.fields.order_in_statblock ?? 0));

      const unitAttacks: UnitAttackRow[] = [];

      const abilities: Ability[] = [noteAbility(uniqueId(seen, "statblock"), "Statblock", statblock(c))];

      let legendaryResistances = 0;

      for (const t of traits.get(row.pk) ?? []) {
        const res = LEGENDARY_RES.exec(t.fields.name);

        if (res) {
          legendaryResistances = Number(res[1]);
          continue;
        }

        const id = uniqueId(seen, slugTail(t.pk));

        const regen = REGEN.exec(t.fields.desc);

        if (t.fields.name.startsWith("Magic Resistance")) abilities.push(coreAbility(id, t.fields.name, t.fields.desc, { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "saveAdvantage", abilities: "all", vsSpells: true }] }));
        else if (t.fields.name.startsWith("Regeneration") && regen) abilities.push(coreAbility(id, t.fields.name, t.fields.desc, { trigger: { event: "turnStart" }, effects: [{ kind: "heal", amount: Number(regen[1]), target: "self" }] }));
        else abilities.push(noteAbility(id, t.fields.name, t.fields.desc));
      }

      const immunities = [
        flagsAbility(uniqueId(seen, "damage-immunities"), "Damage Immunities", c.damage_immunities, (t) => ({ kind: "flag", flag: "resistance", damageType: t, percent: 100 })),
        flagsAbility(uniqueId(seen, "damage-resistances"), "Damage Resistances", c.damage_resistances, (t) => ({ kind: "flag", flag: "resistance", damageType: t, percent: 50 })),
        flagsAbility(uniqueId(seen, "damage-vulnerabilities"), "Damage Vulnerabilities", c.damage_vulnerabilities, (t) => ({ kind: "flag", flag: "resistance", damageType: t, percent: -100 })),
      ];

      if (c.condition_immunities.length > 0) {
        abilities.push(
          coreAbility(uniqueId(seen, "condition-immunities"), "Condition Immunities", c.condition_immunities.map(titleCase).join(", "), {
            trigger: { event: "passive" },
            // SRD condition names match CONDITION_5E_KEYS 1:1 (checked by the integrity test)
            effects: [{ kind: "flag", flag: "conditionImmunity", conditions: c.condition_immunities as never }],
          }),
        );
      }

      abilities.push(...immunities.filter((a): a is Ability => a !== null));

      let multiattack = 1;

      let legendary = false;

      for (const a of own) {
        const f = a.fields;

        if (f.name === "Multiattack") {
          const m = MULTI.exec(f.desc);

          multiattack = m ? clamp(numberWord(m[1]) ?? 1, 1, 10) : 1;
          continue;
        }

        if (f.action_type === "LEGENDARY_ACTION") {
          legendary = true;
          abilities.push(coreAbility(uniqueId(seen, slugTail(a.pk)), f.name, f.desc, { trigger: { event: "action" }, limits: { legendaryCost: clamp(f.legendary_action_cost ?? 1, 1, 3) }, effects: [{ kind: "note", text: f.name }] }));
          continue;
        }

        const records = attacks.get(a.pk) ?? [];

        if (records.length > 0) {
          unitAttacks.push(...records.map((r) => attackFromRecord(a, r.fields, c)));
          continue;
        }

        const parsed = f.action_type === "ACTION" && !f.uses_type ? parseTextAttack(f.name, f.desc) : null;

        if (parsed) {
          unitAttacks.push(parsed);
          continue;
        }

        const name = `${f.name}${usesSuffix(f)}`;

        abilities.push(noteAbility(uniqueId(seen, slugTail(a.pk)), name, f.desc));
      }

      return {
        slug: row.pk,
        name: c.name,
        level: clamp(Math.ceil(cr), 1, 30),
        cr,
        armorClass: c.armor_class,
        maxHp: c.hit_points,
        speed: c.walk ?? c.fly ?? c.swim ?? 30,
        initiative: c.initiative_bonus,
        strength: c.ability_score_strength,
        dexterity: c.ability_score_dexterity,
        constitution: c.ability_score_constitution,
        intelligence: c.ability_score_intelligence,
        wisdom: c.ability_score_wisdom,
        charisma: c.ability_score_charisma,
        gridSize: SIZE_CELLS[c.size] ?? 1,
        multiattack,
        legendaryActions: legendary ? 3 : 0,
        legendaryResistances,
        saveProficiencies: ABILITY_KEYS.filter((k) => {
          const total = c[`saving_throw_${k}`];

          return typeof total === "number" && total > abilityMod(score(c, k));
        }),
        attacks: unitAttacks,
        abilities,
        ...UNIT_OVERRIDES[row.pk],
      };
    })
    .sort(bySlug);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:run scripts/srd/__tests__/units.test.ts`
Expected: PASS (7 tests). Порядок атак Goblin Warrior — за `order_in_statblock`; якщо в даних інший порядок, порівнювати через `toContainEqual` — але **спершу** перевірити фікстуру й записати у звіт.

- [ ] **Step 6: Commit**

```bash
git add scripts/srd/convert/units.ts scripts/srd/overrides/units.ts scripts/srd/__tests__/units.test.ts
git commit -m "feat(constructor): SRD 5.2 monster converter (stats, attacks, legendary, immunities)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Конвертер зброї і щита

**Files:**
- Create: `scripts/srd/convert/artifacts.ts`
- Test: `scripts/srd/__tests__/artifacts.test.ts`

**Interfaces:**
- Consumes: `Open5eData`, `groupBy`, `ArtifactRow`, `bySlug`; `WEAPON_TRAITS`.
- Produces: `convertArtifacts(data): ArtifactRow[]` (38 видів зброї + щит у повних даних).

- [ ] **Step 1: Write the failing test** — `scripts/srd/__tests__/artifacts.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { convertArtifacts } from "../convert/artifacts";
import { FIXTURE_DIR, loadOpen5e } from "../lib/open5e";

const items = convertArtifacts(loadOpen5e(FIXTURE_DIR));

const item = (name: string) => items.find((i) => i.name === name)!;

describe("convertArtifacts", () => {
  it("6 weapons + shield", () => {
    expect(items.map((i) => i.name).sort()).toEqual(["Battleaxe", "Blowgun", "Dagger", "Greatsword", "Javelin", "Longbow", "Shield"]);
    expect(items.every((i) => i.rarity === "common")).toBe(true);
  });

  it("Battleaxe: versatile 1d10, mastery in properties", () => {
    expect(item("Battleaxe")).toMatchObject({ slot: "weapon", weapon: { damageDice: "1d8", damageType: "slashing", attackType: "melee", traits: ["versatile"], versatileDice: "1d10", properties: "Mastery: Topple" } });
    expect(item("Battleaxe").description).toContain("Martial Melee Weapon");
    expect(item("Battleaxe").description).toContain("Cost: 10 GP");
  });

  it("Dagger is a thrown melee weapon; Longbow is ranged ammunition", () => {
    expect(item("Dagger").weapon).toMatchObject({ attackType: "melee", range: "20/60", traits: ["light", "finesse", "thrown"] });
    expect(item("Longbow")).toMatchObject({ slot: "range_weapon", weapon: { attackType: "ranged", range: "150/600", traits: ["twoHanded", "ammunition"], properties: "Heavy. Mastery: Slow" } });
    expect(item("Blowgun").weapon?.damageDice).toBe("1");
  });

  it("Shield: +2 AC passive", () => {
    expect(item("Shield")).toMatchObject({ slot: "shield", abilities: [{ id: "shield-ac", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 2 }] }] });
  });
});
```

(Порядок трейтів — порядок `WEAPON_TRAITS`: `light, finesse, twoHanded, versatile, reach, thrown, ammunition`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/artifacts.test.ts`
Expected: FAIL — модуля немає.

- [ ] **Step 3: `convert/artifacts.ts`**

```ts
import { WEAPON_TRAITS, type WeaponTrait } from "@/lib/constants/weapon-traits";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";

import { type Fixture, groupBy, type O5Weapon, type Open5eData } from "../lib/open5e";
import { bySlug } from "../lib/text";
import type { ArtifactRow } from "../lib/types";

const TRAIT_OF: Record<string, WeaponTrait> = {
  "srd-2024_finesse-wp": "finesse",
  "srd-2024_light-wp": "light",
  "srd-2024_reach-wp": "reach",
  "srd-2024_thrown-wp": "thrown",
  "srd-2024_two-handed-wp": "twoHanded",
  "srd-2024_versatile-wp": "versatile",
  "srd-2024_ammunition-wp": "ammunition",
};

const NOTE_OF: Record<string, string> = { "srd-2024_heavy-wp": "Heavy", "srd-2024_loading-wp": "Loading" };

const amount = (s: string | undefined) => (s === undefined ? "—" : String(Number(s)));

function convertWeapon(w: Fixture<O5Weapon>, data: Open5eData, assignments: Map<string, Open5eData["weaponAssignments"]>): ArtifactRow {
  const props = assignments.get(w.pk) ?? [];

  const propName = (pk: string) => data.weaponProperties.find((p) => p.pk === pk)?.fields.name ?? pk;

  const traits = WEAPON_TRAITS.filter((t) => props.some((p) => TRAIT_OF[p.fields.property] === t));

  const mastery = props.find((p) => p.fields.property.endsWith("-mastery"));

  const ranged = traits.includes("ammunition");

  const versatile = props.find((p) => p.fields.property === "srd-2024_versatile-wp")?.fields.detail ?? undefined;

  const notes = [...props.flatMap((p) => (NOTE_OF[p.fields.property] ? [NOTE_OF[p.fields.property]] : [])), mastery && `Mastery: ${propName(mastery.fields.property)}`].filter(Boolean);

  const weapon: WeaponStats = {
    damageDice: w.fields.damage_dice,
    damageType: w.fields.damage_type,
    attackType: ranged ? "ranged" : "melee",
    ...(w.fields.range > 0 && { range: `${w.fields.range}/${w.fields.long_range}` }),
    ...(traits.length > 0 && { traits }),
    ...(versatile && { versatileDice: versatile }),
    ...(notes.length > 0 && { properties: notes.join(". ").slice(0, 200) }),
  };

  const item = data.items.find((i) => i.fields.weapon === w.pk || i.pk === w.pk)?.fields;

  const propertyList = props.filter((p) => !p.fields.property.endsWith("-mastery")).map((p) => `${propName(p.fields.property)}${p.fields.detail ? ` (${p.fields.detail})` : ""}`);

  const description = [
    `${w.fields.is_simple ? "Simple" : "Martial"} ${ranged ? "Ranged" : "Melee"} Weapon.`,
    `Damage: ${w.fields.damage_dice} ${w.fields.damage_type}.`,
    `Properties: ${propertyList.join(", ") || "—"}.`,
    `Mastery: ${mastery ? propName(mastery.fields.property) : "—"}.`,
    `Cost: ${amount(item?.cost)} GP. Weight: ${amount(item?.weight)} lb.`,
  ].join(" ");

  return { slug: w.pk, name: w.fields.name, description, rarity: "common", slot: ranged ? "range_weapon" : "weapon", weapon };
}

function convertShield(data: Open5eData): ArtifactRow[] {
  const shield = data.armor.find((a) => a.pk === "srd-2024_shield");

  if (!shield) return [];

  const item = data.items.find((i) => i.pk === "srd-2024_shield")?.fields;

  return [
    {
      slug: shield.pk,
      name: shield.fields.name,
      description: `Shield. Armor Class: +${shield.fields.ac_base}. Cost: ${amount(item?.cost)} GP. Weight: ${amount(item?.weight)} lb.`,
      rarity: "common",
      slot: "shield",
      abilities: [{ id: "shield-ac", name: "Shield", description: `+${shield.fields.ac_base} Armor Class while you hold the Shield.`, trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: shield.fields.ac_base }] }],
    },
  ];
}

export function convertArtifacts(data: Open5eData): ArtifactRow[] {
  const assignments = groupBy(data.weaponAssignments, (a) => a.fields.weapon);

  return [...data.weapons.map((w) => convertWeapon(w, data, assignments)), ...convertShield(data)].sort(bySlug);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run scripts/srd/__tests__/artifacts.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/srd/convert/artifacts.ts scripts/srd/__tests__/artifacts.test.ts
git commit -m "feat(constructor): SRD 5.2 weapon and shield converter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Збірка `pnpm srd:build`, файли даних і тест цілісності

**Files:**
- Create: `scripts/srd/lib/build-data.ts`, `scripts/srd/lib/data-files.ts`, `scripts/srd/build.ts`
- Create (згенерувати): `data/templates/srd-5.2/{manifest,spell-groups,spells,races,classes,units,artifacts}.json`
- Modify: `package.json` (скрипт `srd:build`)
- Test: `scripts/srd/__tests__/build-data.test.ts`, `scripts/srd/__tests__/data-integrity.test.ts`

**Interfaces:**
- Consumes: усі конвертери й таблиці overrides (задачі 6–10), `fetchOpen5e`, `loadOpen5e`, `SRD_CREDITS`, `SRD_DATA_DIR`, `OPEN5E_*`.
- Produces: `buildSrdData(data: Open5eData): SrdData`, `assertUniqueSlugs(kind, rows)`, `assertKnown(label, keys, known)`; `interface SrdManifest`, `writeSrdData(data, dir, date): SrdManifest`, `readSrdData(dir?): SrdData`, `readSrdManifest(dir?): SrdManifest`, `toImportRows(rows): Record<string, unknown>[]`.

- [ ] **Step 1: Write the failing tests**

`scripts/srd/__tests__/build-data.test.ts`:

```ts
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { assertKnown, assertUniqueSlugs } from "../lib/build-data";
import { readSrdData, readSrdManifest, toImportRows, writeSrdData } from "../lib/data-files";
import type { SrdData } from "../lib/types";

describe("build helpers", () => {
  it("assertUniqueSlugs / assertKnown throw with the offending keys", () => {
    expect(() => assertUniqueSlugs("spells", [{ slug: "a" }, { slug: "a" }])).toThrow(/spells: duplicate slug a/);
    expect(() => assertUniqueSlugs("spells", [{ slug: "" }])).toThrow(/empty slug/);
    expect(() => assertKnown("spell overrides", ["x", "y"], new Set(["x"]))).toThrow(/spell overrides: unknown y/);
  });

  it("toImportRows drops slug only", () => {
    expect(toImportRows([{ slug: "s", name: "N", level: 1 }])).toEqual([{ name: "N", level: 1 }]);
  });

  it("writes files and a manifest, reads them back", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "srd-data-"));

    const data: SrdData = { "spell-groups": [{ slug: "g", name: "G", color: "#000000", icon: "eye" }], spells: [], races: [], classes: [], units: [], artifacts: [] };

    const manifest = writeSrdData(data, dir, "2026-10-23");

    expect(manifest.counts).toEqual({ "spell-groups": 1, spells: 0, races: 0, classes: 0, units: 0, artifacts: 0 });
    expect(readSrdManifest(dir)).toEqual(manifest);
    expect(readSrdData(dir)).toEqual(data);
  });
});
```

`scripts/srd/__tests__/data-integrity.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn() }));
vi.mock("@/lib/server/content/resources", () => ({ CONTENT_RESOURCES: {} }));

import type { ZodType } from "zod";

import { createArtifactSchema, createClassSchema, createRaceSchema, createSpellGroupSchema, createSpellSchema, patchArtifactSchema, updateClassSchema, updateRaceSchema, updateSpellGroupSchema, updateSpellSchema } from "@/lib/schemas";
import { createUnitSchema, updateUnitSchema } from "@/lib/schemas/units";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { importContent } from "@/lib/server/content/import/import-content";
import type { Actor } from "@/lib/utils/api/actor";

import { readSrdData, readSrdManifest, toImportRows } from "../lib/data-files";
import { OPEN5E_SHA } from "../lib/source";
import { SRD_KINDS, type SrdKind } from "../lib/types";

const SCHEMAS: Record<SrdKind, { create: ZodType; update: ZodType }> = {
  "spell-groups": { create: createSpellGroupSchema, update: updateSpellGroupSchema },
  spells: { create: createSpellSchema, update: updateSpellSchema },
  races: { create: createRaceSchema, update: updateRaceSchema },
  classes: { create: createClassSchema, update: updateClassSchema },
  units: { create: createUnitSchema, update: updateUnitSchema },
  artifacts: { create: createArtifactSchema, update: patchArtifactSchema },
};

const EXPECTED: Record<SrdKind, number> = { "spell-groups": 8, spells: 339, races: 9, classes: 12, units: 331, artifacts: 39 };

const actor: Actor = { campaignId: "c1", userId: "u1", isDM: true, via: "session", scopes: null };

const data = readSrdData();

const rowsOf = (kind: SrdKind) => data[kind] as ReadonlyArray<{ slug: string; name: string }>;

describe("SRD 5.2 data files", () => {
  it("manifest: counts match the files, source pinned, credits present", () => {
    const manifest = readSrdManifest();

    expect(manifest.counts).toEqual(EXPECTED);
    expect(Object.fromEntries(SRD_KINDS.map((k) => [k, data[k].length]))).toEqual(EXPECTED);
    expect(manifest.source.sha).toBe(OPEN5E_SHA);
    expect(manifest.credits).toContain("System Reference Document 5.2");
  });

  it("every row has a unique srd-2024 slug", () => {
    const slugs = SRD_KINDS.flatMap((k) => rowsOf(k).map((r) => r.slug));

    expect(slugs.every((s) => s.startsWith("srd-2024_"))).toBe(true);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(SRD_KINDS)("%s: every row passes importContent dryRun with no issues and refs resolve", async (kind) => {
    const resource = { schemas: SCHEMAS[kind], invalidates: [] } as unknown as AnyContentResource;

    const report = await importContent(actor, kind, { rows: toImportRows(data[kind]), mode: "create", dryRun: true }, {
      resource: () => resource,
      loadNames: async (_c, k) => (k !== kind && (SRD_KINDS as readonly string[]).includes(k) ? rowsOf(k as SrdKind).map((r) => ({ id: `id-${r.slug}`, name: r.name })) : []),
    });

    expect(report.results.filter((r) => r.status !== "created" || r.issues.length > 0)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run scripts/srd/__tests__/build-data.test.ts scripts/srd/__tests__/data-integrity.test.ts`
Expected: FAIL — модулів і файлів даних немає.

- [ ] **Step 3: `lib/data-files.ts`**

```ts
import * as fs from "fs";
import * as path from "path";

import { SRD_CREDITS } from "./credits";
import { OPEN5E_PATH, OPEN5E_REPO, OPEN5E_SHA, SRD_DATA_DIR } from "./source";
import { SRD_KINDS, type SrdData, type SrdKind } from "./types";

export interface SrdManifest {
  name: string;
  source: { repo: string; path: string; sha: string };
  license: "CC-BY-4.0";
  generatedAt: string;
  counts: Record<SrdKind, number>;
  credits: string;
}

const fileOf = (dir: string, name: string) => path.join(dir, `${name}.json`);

const write = (file: string, value: unknown) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

export function writeSrdData(data: SrdData, dir: string, date: string): SrdManifest {
  fs.mkdirSync(dir, { recursive: true });

  for (const kind of SRD_KINDS) write(fileOf(dir, kind), data[kind]);

  const manifest: SrdManifest = {
    name: "SRD 5.2",
    source: { repo: OPEN5E_REPO, path: OPEN5E_PATH, sha: OPEN5E_SHA },
    license: "CC-BY-4.0",
    generatedAt: date,
    counts: Object.fromEntries(SRD_KINDS.map((k) => [k, data[k].length])) as Record<SrdKind, number>,
    credits: SRD_CREDITS,
  };

  write(fileOf(dir, "manifest"), manifest);

  return manifest;
}

export const readSrdData = (dir = SRD_DATA_DIR): SrdData => Object.fromEntries(SRD_KINDS.map((k) => [k, JSON.parse(fs.readFileSync(fileOf(dir, k), "utf8"))])) as SrdData;

export const readSrdManifest = (dir = SRD_DATA_DIR): SrdManifest => JSON.parse(fs.readFileSync(fileOf(dir, "manifest"), "utf8")) as SrdManifest;

export const toImportRows = (rows: ReadonlyArray<{ slug: string }>): Record<string, unknown>[] => rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "slug")));
```

- [ ] **Step 4: `lib/build-data.ts`**

```ts
import { convertArtifacts } from "../convert/artifacts";
import { convertClasses } from "../convert/classes";
import { convertRaces } from "../convert/races";
import { convertSpellGroups } from "../convert/spell-groups";
import { convertSpells } from "../convert/spells";
import { convertUnits } from "../convert/units";
import { CLASS_FEATURE_OVERRIDES, DROP_FEATURES, FEATURE_LEVELS, SPELLCASTING_ABILITY } from "../overrides/classes";
import { RACE_OVERRIDES } from "../overrides/races";
import { SPELL_OVERRIDES } from "../overrides/spells";
import { UNIT_OVERRIDES } from "../overrides/units";

import type { Open5eData } from "./open5e";
import { SRD_KINDS, type SrdData } from "./types";

export function assertUniqueSlugs(kind: string, rows: ReadonlyArray<{ slug: string }>): void {
  const seen = new Set<string>();

  for (const { slug } of rows) {
    if (!slug) throw new Error(`${kind}: empty slug`);

    if (seen.has(slug)) throw new Error(`${kind}: duplicate slug ${slug}`);

    seen.add(slug);
  }
}

export function assertKnown(label: string, keys: readonly string[], known: ReadonlySet<string>): void {
  const unknown = keys.filter((k) => !known.has(k));

  if (unknown.length > 0) throw new Error(`${label}: unknown ${unknown.join(", ")}`);
}

export function buildSrdData(data: Open5eData): SrdData {
  const pks = (rows: ReadonlyArray<{ pk: string }>) => new Set(rows.map((r) => r.pk));

  assertKnown("spell overrides", Object.keys(SPELL_OVERRIDES), pks(data.spells));
  assertKnown("race overrides", Object.keys(RACE_OVERRIDES), pks(data.speciesTraits));
  assertKnown("class feature overrides", [...Object.keys(CLASS_FEATURE_OVERRIDES), ...Object.keys(FEATURE_LEVELS), ...DROP_FEATURES], pks(data.features));
  assertKnown("spellcasting abilities", Object.keys(SPELLCASTING_ABILITY), pks(data.classes));
  assertKnown("unit overrides", Object.keys(UNIT_OVERRIDES), pks(data.creatures));

  const out: SrdData = {
    "spell-groups": convertSpellGroups(),
    spells: convertSpells(data),
    races: convertRaces(data),
    classes: convertClasses(data),
    units: convertUnits(data),
    artifacts: convertArtifacts(data),
  };

  for (const kind of SRD_KINDS) assertUniqueSlugs(kind, out[kind]);

  return out;
}
```

- [ ] **Step 5: `build.ts` і скрипт**

`scripts/srd/build.ts`:

```ts
#!/usr/bin/env tsx
// pnpm srd:build [--source <dir>]
import { buildSrdData } from "./lib/build-data";
import { writeSrdData } from "./lib/data-files";
import { fetchOpen5e } from "./lib/fetch";
import { loadOpen5e } from "./lib/open5e";
import { SRD_DATA_DIR } from "./lib/source";

async function main() {
  const args = process.argv.slice(2);

  const source = args.includes("--source") ? args[args.indexOf("--source") + 1] : await fetchOpen5e();

  const data = buildSrdData(loadOpen5e(source));

  const manifest = writeSrdData(data, SRD_DATA_DIR, new Date().toISOString().slice(0, 10));

  console.info(`SRD 5.2 → ${SRD_DATA_DIR}`);

  for (const [kind, count] of Object.entries(manifest.counts)) console.info(`  ${kind}: ${count}`);

  const mechanizedSpells = data.spells.filter((s) => s.spellEffects.length > 0).length;

  const notes = data.classes.flatMap((c) => [...c.features, ...c.subclasses.flatMap((s) => s.features)]).flatMap((f) => f.abilities);

  console.info(`  spells with effects: ${mechanizedSpells}/${data.spells.length}`);
  console.info(`  class abilities with mechanics: ${notes.filter((a) => a.effects.some((e) => e.kind !== "note")).length}/${notes.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
```

У `package.json`, секція `scripts`, після `"constructor:backfill": …`:

```json
    "srd:build": "tsx --tsconfig tsconfig.scripts.json scripts/srd/build.ts",
```

- [ ] **Step 6: Generate the data files**

Run: `pnpm srd:build`
Expected: `spell-groups: 8`, `spells: 339`, `races: 9`, `classes: 12`, `units: 331`, `artifacts: 39`; без винятків. Виняток `… unknown …` чи `Feature without level` / `Unknown skill` — виправити конвертер/таблицю overrides (не дані), перезапустити.

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test:run scripts/srd`
Expected: PASS. Якщо тест цілісності знаходить рядки з помилками чи попередженнями — виправити конвертер (не тест), знову `pnpm srd:build`, повторити. Типові причини: значення поза межами Zod (`size` 5–120, `range` 5–600, `maxTargets` 1–20, `upcastDice` ≤ 10, `gridSize` ≤ 3, `multiattack` ≤ 10, `legendaryResistances` ≤ 10, `profList` ≤ 60 символів), ключ поля, якого немає в `IMPORT_SPECS` (попередження «Невідоме поле»), стан поза `CONDITION_5E_KEYS`.

- [ ] **Step 8: Commit**

```bash
git add scripts/srd/lib/build-data.ts scripts/srd/lib/data-files.ts scripts/srd/build.ts scripts/srd/__tests__/build-data.test.ts scripts/srd/__tests__/data-integrity.test.ts data/templates/srd-5.2 package.json
git commit -m "feat(constructor): srd:build writes SRD 5.2 data files, manifest and integrity test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Завантажувач `pnpm constructor:srd-template`

**Files:**
- Modify: `lib/server/content/import/import-content.ts`
- Create: `scripts/srd/lib/load-template.ts`, `scripts/srd/load-template.ts`
- Modify: `package.json` (скрипт `constructor:srd-template`)
- Test: `lib/server/content/__tests__/import-content.test.ts` (новий `it`), `scripts/srd/__tests__/load-template.test.ts`

**Interfaces:**
- Consumes: `readSrdData`, `toImportRows`, `SRD_KINDS`, `SrdData` (задача 11); `SRD_RULES`, `SRD_CREDITS` (задача 1); `createCampaignFromBundle`, `emptyBundle` (задача 2: бандл несе `credits`); `assertSeedTarget` (`scripts/seed/seed-library-lib.ts`).
- Produces: `ImportDeps.invalidate?: (kinds: readonly ReferenceKindValue[], campaignId: string) => void`; `DEFAULT_IMPORT_DEPS: ImportDeps`; `SRD_TEMPLATE_NAME = "5e SRD 5.2"`, `SRD_TEMPLATE_DESCRIPTION`, `interface TemplateStore`, `ensureSrdTemplate(store, opts)`, `type RunImport`, `importSrdData(data, run)`, `hasRowErrors(results)`, `formatImportSummary(results): string[]`.

- [ ] **Step 1: Write the failing tests**

У `lib/server/content/__tests__/import-content.test.ts`, всередині `describe("importContent", …)` (використовує наявні `actor`, `resource`, `names`, `invalidateReference`):

```ts
  it("deps.invalidate замінює інвалідацію кешу Next (скрипти поза Next)", async () => {
    const invalidate = vi.fn();

    await importContent(actor, "units", { rows: [{ name: "Біс" }], mode: "create", dryRun: false }, { resource: () => resource, loadNames: async (_c, kind) => names[kind] ?? [], invalidate });

    expect(invalidate).toHaveBeenCalledWith(["units"], "c1");
    expect(invalidateReference).not.toHaveBeenCalled();
  });
```

`scripts/srd/__tests__/load-template.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import type { ImportReport } from "@/types/content-import";

import { SRD_RULES } from "../lib/rules-preset";
import { ensureSrdTemplate, formatImportSummary, hasRowErrors, importSrdData, type RunImport, type TemplateStore } from "../lib/load-template";
import { SRD_KINDS, type SrdData } from "../lib/types";

const store = (over: Partial<TemplateStore> = {}): TemplateStore => ({
  findTemplate: vi.fn(async () => null),
  findOfficialOwner: vi.fn(async () => null),
  create: vi.fn(async ({ userId }: { userId: string }) => ({ id: "t-new", dmUserId: userId })),
  update: vi.fn(async () => undefined),
  ...over,
});

const opts = { rules: SRD_RULES, credits: "CREDITS" };

const report = (error = 0): ImportReport => ({ dryRun: false, results: error ? [{ row: 2, name: "Fireball", status: "error", issues: [{ level: "error", message: "bad" }] }] : [], counts: { created: 0, updated: 3, skipped: 0, error } });

describe("ensureSrdTemplate", () => {
  it("existing template: rules, credits and description are rewritten, nothing created", async () => {
    const s = store({ findTemplate: vi.fn(async () => ({ id: "t1", dmUserId: "u1" })) });

    expect(await ensureSrdTemplate(s, opts)).toEqual({ id: "t1", dmUserId: "u1", created: false });
    expect(s.update).toHaveBeenCalledWith("t1", expect.objectContaining({ rules: SRD_RULES, credits: "CREDITS" }));
    expect(s.create).not.toHaveBeenCalled();
  });

  it("new template: owner from --owner, else the owner of an official template, else an error", async () => {
    const withOwner = store();

    expect(await ensureSrdTemplate(withOwner, { ...opts, owner: "me" })).toEqual({ id: "t-new", dmUserId: "me", created: true });
    expect(withOwner.create).toHaveBeenCalledWith({ userId: "me", rules: SRD_RULES, credits: "CREDITS" });

    expect((await ensureSrdTemplate(store({ findOfficialOwner: vi.fn(async () => "homm-owner") }), opts)).dmUserId).toBe("homm-owner");
    await expect(ensureSrdTemplate(store(), opts)).rejects.toThrow(/--owner/);
  });
});

describe("importSrdData", () => {
  it("imports kinds in order with slugs stripped; errors are detected and listed", async () => {
    const data = Object.fromEntries(SRD_KINDS.map((k) => [k, [{ slug: `srd-2024_${k}`, name: k }]])) as unknown as SrdData;

    const run = vi.fn<RunImport>(async (kind) => report(kind === "spells" ? 1 : 0));

    const results = await importSrdData(data, run);

    expect(run.mock.calls.map((c) => c[0])).toEqual([...SRD_KINDS]);
    expect(run.mock.calls[0][1]).toEqual([{ name: "spell-groups" }]);
    expect(hasRowErrors(results)).toBe(true);
    expect(formatImportSummary(results)).toContain("spells: created 0, updated 3, skipped 0, error 1");
    expect(formatImportSummary(results)).toContain("  #2 Fireball: bad");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/server/content/__tests__/import-content.test.ts scripts/srd/__tests__/load-template.test.ts`
Expected: FAIL — `invalidate` ігнорується; модуля `load-template` немає.

- [ ] **Step 3: `ImportDeps.invalidate`**

`lib/server/content/import/import-content.ts`:

```ts
import { invalidateReference, type ReferenceKindValue } from "@/lib/cache/tags";
```

```ts
export interface ImportDeps {
  resource(kind: ImportKind): AnyContentResource;
  loadNames(campaignId: string, kind: ImportKind): Promise<IdName[]>;
  invalidate?(kinds: readonly ReferenceKindValue[], campaignId: string): void;
}

export const DEFAULT_IMPORT_DEPS: ImportDeps = { resource: (kind) => CONTENT_RESOURCES[kind] as AnyContentResource, loadNames, invalidate: invalidateReference };
```

(прибрати старе `const DEFAULT_DEPS…`; параметр функції — `deps: ImportDeps = DEFAULT_IMPORT_DEPS`), а рядок інвалідації:

```ts
  if (wrote && resource.invalidates.length > 0) (deps.invalidate ?? invalidateReference)(resource.invalidates, actor.campaignId);
```

- [ ] **Step 4: `scripts/srd/lib/load-template.ts`**

```ts
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { ImportReport } from "@/types/content-import";

import { toImportRows } from "./data-files";
import { SRD_KINDS, type SrdData, type SrdKind } from "./types";

export const SRD_TEMPLATE_NAME = "5e SRD 5.2";

export const SRD_TEMPLATE_DESCRIPTION = "System Reference Document 5.2 (CC-BY-4.0): заклинання, монстри, зброя, раси й класи; правила 5e";

export interface TemplateStore {
  findTemplate(): Promise<{ id: string; dmUserId: string } | null>;
  findOfficialOwner(): Promise<string | null>;
  create(input: { userId: string; rules: Ruleset; credits: string }): Promise<{ id: string; dmUserId: string }>;
  update(id: string, data: { rules: Ruleset; credits: string; description: string }): Promise<void>;
}

export async function ensureSrdTemplate(store: TemplateStore, opts: { owner?: string; rules: Ruleset; credits: string }): Promise<{ id: string; dmUserId: string; created: boolean }> {
  const existing = await store.findTemplate();

  if (existing) {
    await store.update(existing.id, { rules: opts.rules, credits: opts.credits, description: SRD_TEMPLATE_DESCRIPTION });

    return { ...existing, created: false };
  }

  const userId = opts.owner ?? (await store.findOfficialOwner());

  if (!userId) throw new Error("Немає власника шаблону: передайте --owner <userId> (офіційних шаблонів ще немає)");

  return { ...(await store.create({ userId, rules: opts.rules, credits: opts.credits })), created: true };
}

export type RunImport = (kind: SrdKind, rows: Record<string, unknown>[]) => Promise<ImportReport>;

export type SrdImportResult = { kind: SrdKind; report: ImportReport };

export async function importSrdData(data: SrdData, run: RunImport): Promise<SrdImportResult[]> {
  const results: SrdImportResult[] = [];

  for (const kind of SRD_KINDS) results.push({ kind, report: await run(kind, toImportRows(data[kind])) });

  return results;
}

export const hasRowErrors = (results: SrdImportResult[]) => results.some((r) => r.report.counts.error > 0);

export function formatImportSummary(results: SrdImportResult[]): string[] {
  return results.flatMap(({ kind, report: { counts, results: rows } }) => [
    `${kind}: created ${counts.created}, updated ${counts.updated}, skipped ${counts.skipped}, error ${counts.error}`,
    ...rows
      .filter((r) => r.status === "error")
      .slice(0, 10)
      .map((r) => `  #${r.row} ${r.name ?? "?"}: ${r.issues.filter((i) => i.level === "error").map((i) => i.message).join("; ")}`),
  ]);
}
```

- [ ] **Step 5: CLI `scripts/srd/load-template.ts`**

```ts
#!/usr/bin/env tsx
// pnpm constructor:srd-template [--owner <userId>] [--allow-remote]
import type { Prisma } from "@prisma/client";

import { REFERENCE_REVALIDATE_SECONDS } from "@/lib/cache/reference-data";
import { CampaignKind, CampaignVisibility } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";
import { DEFAULT_IMPORT_DEPS, importContent } from "@/lib/server/content/import/import-content";
import { emptyBundle } from "@/lib/server/templates/bundle";
import type { Actor } from "@/lib/utils/api/actor";

import { assertSeedTarget } from "../seed/seed-library-lib";

import { SRD_CREDITS } from "./lib/credits";
import { readSrdData } from "./lib/data-files";
import { ensureSrdTemplate, formatImportSummary, hasRowErrors, importSrdData, SRD_TEMPLATE_DESCRIPTION, SRD_TEMPLATE_NAME, type TemplateStore } from "./lib/load-template";
import { SRD_RULES } from "./lib/rules-preset";

const official = { kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.OFFICIAL };

const store: TemplateStore = {
  findTemplate: () => prisma.campaign.findFirst({ where: { name: SRD_TEMPLATE_NAME, ...official }, select: { id: true, dmUserId: true } }),
  findOfficialOwner: async () => (await prisma.campaign.findFirst({ where: official, orderBy: { createdAt: "asc" }, select: { dmUserId: true } }))?.dmUserId ?? null,
  create: async ({ userId, rules, credits }) => {
    const { campaign } = await createCampaignFromBundle({ userId, name: SRD_TEMPLATE_NAME, description: SRD_TEMPLATE_DESCRIPTION, bundle: { ...emptyBundle(), rules, credits }, ...official });

    return { id: campaign.id, dmUserId: campaign.dmUserId };
  },
  update: async (id, { rules, credits, description }) => {
    await prisma.campaign.update({ where: { id }, data: { rules: rules as Prisma.InputJsonObject, credits, description } });
  },
};

async function main() {
  const args = process.argv.slice(2);

  const owner = args.includes("--owner") ? args[args.indexOf("--owner") + 1] : undefined;

  assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  const template = await ensureSrdTemplate(store, { owner, rules: SRD_RULES, credits: SRD_CREDITS });

  console.info(`${SRD_TEMPLATE_NAME}: ${template.id}${template.created ? " (створено)" : ""}`);

  const actor: Actor = { campaignId: template.id, userId: template.dmUserId, isDM: true, via: "session", scopes: null };

  const deps = { ...DEFAULT_IMPORT_DEPS, invalidate: () => undefined };

  const results = await importSrdData(readSrdData(), (kind, rows) => importContent(actor, kind, { rows, mode: "update", dryRun: false }, deps));

  for (const line of formatImportSummary(results)) console.info(line);

  console.info(`Кеш довідника на сервері оновиться протягом ${REFERENCE_REVALIDATE_SECONDS} с`);

  if (hasRowErrors(results)) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
```

У `package.json` після `"constructor:backfill": …`:

```json
    "constructor:srd-template": "tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/srd/load-template.ts",
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test:run lib/server/content/__tests__/import-content.test.ts scripts/srd`
Expected: PASS.

- [ ] **Step 7: Local smoke run (локальна БД `constructor`)**

Run: `pnpm constructor:srd-template`
Expected: `5e SRD 5.2: <id> (створено)`, рядки `spell-groups: created 8 …`, `spells: created 339 …`, `races: created 9 …`, `classes: created 12 …`, `units: created 331 …`, `artifacts: created 39 …`, усюди `error 0`, код виходу 0. Якщо офіційних шаблонів у локальній БД немає — додати `--owner <id будь-якого користувача з таблиці users>`.

Повторний запуск: `pnpm constructor:srd-template`
Expected: без «(створено)», ті самі числа в колонці `updated`, `created 0`, `error 0`. Шаблон лишається в локальній БД для живого прогону (видаляє контролер після нього).

- [ ] **Step 8: Commit**

```bash
git add lib/server/content/import/import-content.ts lib/server/content/__tests__/import-content.test.ts scripts/srd/lib/load-template.ts scripts/srd/load-template.ts scripts/srd/__tests__/load-template.test.ts package.json
git commit -m "feat(constructor): constructor:srd-template creates/updates the official 5e SRD 5.2 template

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: `pnpm assets:attach`

**Files:**
- Create: `scripts/assets/attach-lib.ts`, `scripts/assets/attach-assets.ts`
- Modify: `package.json` (скрипт `assets:attach`)
- Test: `scripts/assets/__tests__/attach-lib.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_IMPORT_DEPS`, `importContent` (задача 12), `loadNames` (`lib/server/content/import/names.ts`), `readSrdData`, `SRD_KINDS` (задача 11), `createAdminClient`, `ensureBucket`, `staticAssetUploadOptions`, `assertSeedTarget`.
- Produces: `ATTACH_KINDS` (`units`, `spells`, `artifacts`, `classes`, `races`, `skills`, `main-skills`), `type AttachKind`, `isAttachKind`, `ICON_FIELD`, `ASSET_BUCKET`, `IMAGE_TYPES`, `assertAttachAllowed(campaign, allowOfficial)`, `assetKey(s)`, `fileKeys(fileName)`, `matchAssets(files, names, slugNames?)`, `srdSlugNames(kind, data): Map<string, string>`, `objectPath(campaignId, kind, name, content, ext)`.

Нормалізація (однакова для імені файлу без розширення, назви контенту й slug): NFKC → `toLocaleLowerCase("uk")` → кожна послідовність із `_`, `-`, `:`, `'`, `’` і пробілів → один пробіл → trim. Ключі файлу: нормалізоване ім'я, потім те саме без хвостових суфіксів варіантів (` a1`, ` b2`, ` v3`, ` 2`). Зіставлення: спершу з назвою контенту, далі зі `slug` рядка даних SRD цього виду (`data/templates/srd-5.2/<kind>.json`, якщо вид є в `SRD_KINDS`) — повним (`srd-2024_adult-red-dragon`) і без префікса `srd-2024_`; slug веде до назви, назва — до id у кампанії.

- [ ] **Step 1: Write the failing test** — `scripts/assets/__tests__/attach-lib.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { assertAttachAllowed, assetKey, fileKeys, matchAssets, objectPath, srdSlugNames } from "../attach-lib";

const names = [
  { id: "u1", name: "Adult Red Dragon" },
  { id: "s1", name: "Fireball" },
  { id: "s2", name: "Hunter's Mark" },
  { id: "u2", name: "Goblin" },
  { id: "s3", name: "Вогняна куля" },
  { id: "s4", name: "Dragon: Red Wyrm" },
];

const slugNames = new Map([
  ["srd-2024_hunters-mark", "Hunter's Mark"],
  ["srd-2024_adult-red-dragon", "Adult Red Dragon"],
]);

describe("assetKey / fileKeys", () => {
  it("punctuation-insensitive, Unicode-safe", () => {
    expect(assetKey("Hunter's  Mark")).toBe("hunter s mark");
    expect(assetKey("Hunter’s_Mark")).toBe("hunter s mark");
    expect(assetKey("Dragon: Red-Wyrm")).toBe("dragon red wyrm");
    expect(assetKey("Вогняна_Куля")).toBe("вогняна куля");
  });

  it("variant suffixes are stripped after the full key", () => {
    expect(fileKeys("Adult_Red_Dragon_A1.webp")).toEqual(["adult red dragon a1", "adult red dragon"]);
    expect(fileKeys("Goblin-b2.png")).toEqual(["goblin b2", "goblin"]);
    expect(fileKeys("srd-2024_fireball.webp")).toEqual(["srd 2024 fireball"]);
  });
});

describe("matchAssets", () => {
  it("by name, by SRD slug (with or without the prefix), variants, colon and Cyrillic; first variant wins", () => {
    const files = ["Goblin_B2.png", "Adult_Red_Dragon_A1.webp", "srd-2024_fireball.webp", "hunters-mark.png", "Goblin_A1.png", "Вогняна_куля.png", "dragon-red-wyrm.png", "Unknown.png"];

    const { matches, unmatched, duplicates } = matchAssets(files, names, new Map([...slugNames, ["srd-2024_fireball", "Fireball"]]));

    expect(Object.fromEntries(matches.map((m) => [m.file, m.name]))).toEqual({
      "Adult_Red_Dragon_A1.webp": "Adult Red Dragon",
      "Goblin_A1.png": "Goblin",
      "hunters-mark.png": "Hunter's Mark",
      "srd-2024_fireball.webp": "Fireball",
      "Вогняна_куля.png": "Вогняна куля",
      "dragon-red-wyrm.png": "Dragon: Red Wyrm",
    });
    expect(duplicates).toEqual(["Goblin_B2.png"]);
    expect(unmatched).toEqual(["Unknown.png"]);
  });

  it("without slug data hunters-mark.png stays unmatched, Hunter's_Mark.png matches by name", () => {
    expect(matchAssets(["hunters-mark.png"], names).unmatched).toEqual(["hunters-mark.png"]);
    expect(matchAssets(["Hunter's_Mark.png"], names).matches[0]?.id).toBe("s2");
    expect(matchAssets(["adult-red-dragon.png"], names).matches[0]?.id).toBe("u1");
    expect(matchAssets(["srd-2024_adult-red-dragon.png"], names, slugNames).matches[0]?.id).toBe("u1");
  });
});

describe("srdSlugNames", () => {
  it("maps slugs of an SRD kind; kinds outside the SRD data give an empty map", () => {
    const data = { units: [{ slug: "srd-2024_bat", name: "Bat" }] } as never;

    expect(srdSlugNames("units", data)).toEqual(new Map([["srd-2024_bat", "Bat"]]));
    expect(srdSlugNames("skills", data).size).toBe(0);
    expect(srdSlugNames("main-skills", data).size).toBe(0);
  });
});

describe("assertAttachAllowed", () => {
  it("refuses the official template without --allow-official", () => {
    expect(() => assertAttachAllowed({ kind: "template", visibility: "official" }, false)).toThrow(/--allow-official/);
    expect(() => assertAttachAllowed({ kind: "template", visibility: "official" }, true)).not.toThrow();
    expect(() => assertAttachAllowed({ kind: "campaign", visibility: "private" }, false)).not.toThrow();
  });
});

describe("objectPath", () => {
  it("is stable per content and safe for Cyrillic names", () => {
    const a = objectPath("c1", "spells", "Hunter's Mark", Buffer.from("x"), ".png");

    expect(a).toMatch(/^c1\/spells\/hunter-s-mark-[0-9a-f]{8}\.png$/);
    expect(objectPath("c1", "spells", "Hunter's Mark", Buffer.from("x"), ".png")).toBe(a);
    expect(objectPath("c1", "spells", "Hunter's Mark", Buffer.from("y"), ".png")).not.toBe(a);
    expect(objectPath("c1", "main-skills", "Вогняна куля", Buffer.from("x"), ".png")).toMatch(/^c1\/main-skills\/asset-[0-9a-f]{8}\.png$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run scripts/assets/__tests__/attach-lib.test.ts`
Expected: FAIL — модуля немає.

- [ ] **Step 3: `scripts/assets/attach-lib.ts`**

```ts
import { createHash } from "crypto";

import { CampaignKind, CampaignVisibility } from "@/lib/constants/campaigns";
import type { IdName } from "@/types/common";

import { SRD_KINDS, type SrdData, type SrdKind } from "../srd/lib/types";

export const ATTACH_KINDS = ["units", "spells", "artifacts", "classes", "races", "skills", "main-skills"] as const;

export type AttachKind = (typeof ATTACH_KINDS)[number];

export const isAttachKind = (v: string | undefined): v is AttachKind => !!v && (ATTACH_KINDS as readonly string[]).includes(v);

export const ICON_FIELD: Record<AttachKind, "avatar" | "icon"> = { units: "avatar", spells: "icon", artifacts: "icon", classes: "icon", races: "icon", skills: "icon", "main-skills": "icon" };

export const ASSET_BUCKET: Record<AttachKind, string> = {
  units: "unit-icons",
  spells: "spell-icons",
  artifacts: "artifact-icons",
  classes: "class-icons",
  races: "race-icons",
  skills: "skill-icons",
  "main-skills": "main-skill-icons",
};

export const IMAGE_TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

export function assertAttachAllowed(campaign: { kind: string; visibility: string }, allowOfficial: boolean): void {
  if (campaign.kind === CampaignKind.TEMPLATE && campaign.visibility === CampaignVisibility.OFFICIAL && !allowOfficial) {
    throw new Error("Це офіційний шаблон: додайте --allow-official, лише якщо іконки ваші (токени Forgotten Adventures — ніколи)");
  }
}

export const assetKey = (s: string) =>
  s
    .normalize("NFKC")
    .toLocaleLowerCase("uk")
    .replace(/[_\-:'’\s]+/g, " ")
    .trim();

const VARIANT = /\s+(?:[a-z]\d+|v\d+|\d+)$/;

export function fileKeys(fileName: string): string[] {
  const keys = [assetKey(fileName.replace(/\.[^.]+$/, ""))];

  while (VARIANT.test(keys[keys.length - 1])) keys.push(keys[keys.length - 1].replace(VARIANT, ""));

  return keys.filter(Boolean);
}

export function srdSlugNames(kind: AttachKind, data: SrdData): Map<string, string> {
  if (!(SRD_KINDS as readonly string[]).includes(kind)) return new Map();

  return new Map((data[kind as SrdKind] as ReadonlyArray<{ slug: string; name: string }>).map((r) => [r.slug, r.name]));
}

export interface AssetMatch {
  file: string;
  id: string;
  name: string;
}

export function matchAssets(files: readonly string[], names: readonly IdName[], slugNames: ReadonlyMap<string, string> = new Map()): { matches: AssetMatch[]; unmatched: string[]; duplicates: string[] } {
  const byKey = new Map<string, IdName>();

  for (const n of names) if (!byKey.has(assetKey(n.name))) byKey.set(assetKey(n.name), n);

  for (const [slug, name] of slugNames) {
    const target = byKey.get(assetKey(name));

    if (!target) continue;

    for (const key of [assetKey(slug), assetKey(slug.replace(/^srd-\d{4}_/, ""))]) if (!byKey.has(key)) byKey.set(key, target);
  }

  const taken = new Set<string>();

  const matches: AssetMatch[] = [];

  const unmatched: string[] = [];

  const duplicates: string[] = [];

  for (const file of [...files].sort((a, b) => a.localeCompare(b))) {
    const hit = fileKeys(file)
      .map((k) => byKey.get(k))
      .find((n): n is IdName => !!n);

    if (!hit) unmatched.push(file);
    else if (taken.has(hit.id)) duplicates.push(file);
    else {
      taken.add(hit.id);
      matches.push({ file, id: hit.id, name: hit.name });
    }
  }

  return { matches, unmatched, duplicates };
}

export function objectPath(campaignId: string, kind: AttachKind, name: string, content: Buffer, ext: string): string {
  const safe =
    assetKey(name)
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "asset";

  const hash = createHash("sha1").update(content).digest("hex").slice(0, 8);

  return `${campaignId}/${kind}/${safe}-${hash}${ext}`;
}
```

(`matches` порівнюються як об'єкт «файл → назва», тож порядок `localeCompare` для кирилиці не важливий; «перший варіант» — перший за `localeCompare` серед файлів одного контенту.)

- [ ] **Step 4: CLI `scripts/assets/attach-assets.ts`**

```ts
#!/usr/bin/env tsx
// pnpm assets:attach <campaignId> <dir> --kind units|spells|artifacts|classes|races|skills|main-skills [--allow-official] [--allow-remote]
import * as fs from "fs";
import * as path from "path";

import { prisma } from "@/lib/db";
import { DEFAULT_IMPORT_DEPS, importContent } from "@/lib/server/content/import/import-content";
import { loadNames } from "@/lib/server/content/import/names";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureBucket } from "@/lib/supabase/buckets";
import { staticAssetUploadOptions } from "@/lib/supabase/storage-cache";
import type { Actor } from "@/lib/utils/api/actor";

import { assertSeedTarget } from "../seed/seed-library-lib";

import { readSrdData } from "../srd/lib/data-files";

import { ASSET_BUCKET, assertAttachAllowed, ICON_FIELD, IMAGE_TYPES, isAttachKind, matchAssets, objectPath, srdSlugNames } from "./attach-lib";

const USAGE = "Використання: pnpm assets:attach <campaignId> <тека> --kind units|spells|artifacts|classes|races|skills|main-skills [--allow-official] [--allow-remote]";

async function main() {
  const args = process.argv.slice(2);

  const kind = args.includes("--kind") ? args[args.indexOf("--kind") + 1] : undefined;

  const [campaignId, dir] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--kind");

  if (!campaignId || !dir || !isAttachKind(kind)) throw new Error(USAGE);

  assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { kind: true, visibility: true, dmUserId: true } });

  assertAttachAllowed(campaign, args.includes("--allow-official"));

  const files = fs.readdirSync(dir).filter((f) => IMAGE_TYPES[path.extname(f).toLowerCase()]);

  const { matches, unmatched, duplicates } = matchAssets(files, await loadNames(campaignId, kind), srdSlugNames(kind, readSrdData()));

  const admin = createAdminClient();

  const bucket = ASSET_BUCKET[kind];

  const ensured = await ensureBucket(admin, bucket);

  if (!ensured.ok) throw new Error(ensured.message);

  const rows: Record<string, unknown>[] = [];

  for (const m of matches) {
    const ext = path.extname(m.file).toLowerCase();

    const content = fs.readFileSync(path.join(dir, m.file));

    const objectName = objectPath(campaignId, kind, m.name, content, ext);

    const { error } = await admin.storage.from(bucket).upload(objectName, content, staticAssetUploadOptions(IMAGE_TYPES[ext]));

    if (error) throw new Error(`${m.file}: ${error.message}`);

    rows.push({ name: m.name, [ICON_FIELD[kind]]: admin.storage.from(bucket).getPublicUrl(objectName).data.publicUrl });
  }

  const actor: Actor = { campaignId, userId: campaign.dmUserId, isDM: true, via: "session", scopes: null };

  const report = rows.length > 0 ? await importContent(actor, kind, { rows, mode: "update", dryRun: false }, { ...DEFAULT_IMPORT_DEPS, invalidate: () => undefined }) : null;

  console.info(`${kind}: файлів ${files.length}, прив'язано ${report?.counts.updated ?? 0}, помилок ${report?.counts.error ?? 0}`);

  for (const r of report?.results.filter((x) => x.status === "error") ?? []) console.warn(`  помилка: ${r.name}: ${r.issues.map((i) => i.message).join("; ")}`);

  for (const f of unmatched) console.warn(`  без пари: ${f}`);

  for (const f of duplicates) console.warn(`  інший варіант (пропущено): ${f}`);

  if ((report?.counts.error ?? 0) > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
```

У `package.json` після `"upload-assets-to-supabase": …`:

```json
    "assets:attach": "tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/assets/attach-assets.ts",
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:run scripts/assets/__tests__/attach-lib.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: CLI guard smoke** (без мережі й Storage)

Run: `pnpm assets:attach`
Expected: повідомлення `Використання: pnpm assets:attach …`, код виходу 1.

- [ ] **Step 7: Commit**

```bash
git add scripts/assets/attach-lib.ts scripts/assets/attach-assets.ts scripts/assets/__tests__/attach-lib.test.ts package.json
git commit -m "feat(constructor): assets:attach binds an icon folder to campaign content by name

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Документи й повна перевірка

**Files:**
- Modify: `docs/architecture/content-api.md`, `docs/STATUS.md`, `docs/superpowers/constructor-handoff.md`

- [ ] **Step 1: `content-api.md`** — новий розділ перед «## Оновлення з джерела (етап 3)»:

```markdown
## Шаблон SRD 5.2 (етап 4f-1)

Офіційний шаблон «5e SRD 5.2» збирається з файлів у репо, без мережі.

- **Конвеєр** — `scripts/srd/`: `lib/source.ts` (Open5e `open5e/open5e-api`, тека `data/v2/wizards-of-the-coast/srd-2024`, SHA `e69ac13b…`, 17 файлів з md5), `lib/fetch.ts` (завантаження в tmp з перевіркою md5), `convert/*.ts` (чисті функції: рядок Open5e → рядок імпортера 4f-0), `overrides/*.ts` (ручні таблиці за `slug`: заклинання — сторона/цілі/баффи, вміння класів, раси, монстри). `pnpm srd:build` пише `data/templates/srd-5.2/{spell-groups,spells,races,classes,units,artifacts}.json` + `manifest.json` (SHA, дата, лічильники, credits). Кожен рядок має `slug` для майбутніх мовних накладок; імпортер його не отримує. Тест цілісності (`scripts/srd/__tests__/data-integrity.test.ts`) проганяє всі файли через `importContent` з `dryRun` без помилок і попереджень.
- **Завантажувач** — `pnpm constructor:srd-template [--owner <userId>] [--allow-remote]`: знаходить або створює офіційний шаблон, пише пресет правил (`scripts/srd/lib/rules-preset.ts`: усі механіки 5e увімкнено, мораль вимкнено, `initiative 0–20`, баланс `xp` 2024) і `credits`, потім `importContent(mode: "update")` у порядку `spell-groups → spells → races → classes → units → artifacts`; exit 1, якщо є помилки рядків. Повторний запуск оновлює за назвами. Кеш Next скрипт не інвалідовує (`ImportDeps.invalidate` = no-op) — довідник оновиться протягом `REFERENCE_REVALIDATE_SECONDS`.
- **Обсяг** — 8 шкіл (значок і колір), 339 заклинань, 9 рас, 12 класів з підкласами, 331 монстр, 38 видів зброї і щит; що механізовано, а що лишається описом/нотаткою — спек §4f-1 «Контент». Монстри — без раси (тип, чуття, мови, режими руху — нотатка «Statblock»), `gridSize` gargantuan = 3, `level = ⌈CR⌉`.
- **Атрибуція** — `campaigns.credits` (текст, міграція `20261031000000_campaign_credits`): бандл (`Bundle.credits`), створення з шаблону, «оновлення з джерела» (копіюється, коли відрізняється); показ лише для читання — картка шаблону, банер шаблону, налаштування кампанії «Джерела й ліцензії».
- **Іконки** — сторонніх наборів немає. Заклинання без іконки показують значок школи в її кольорі (`SpellIcon`; ключі `shield|portal|eye|heart|flame|mask|skull|vortex` поруч із 5 ключами HOMM5). `pnpm assets:attach <campaignId> <тека> --kind units|spells|artifacts|classes|races|skills|main-skills [--allow-official]`: ім'я файлу = назва контенту або `slug` рядка даних SRD (з префіксом `srd-2024_` чи без); нормалізація без регістру й пунктуації (`_`, `-`, `:`, апострофи, повторні пробіли → пробіл), суфікси варіантів `A1`/`2`/`v3` відкидаються, із кількох варіантів — перший, завантаження в бакет виду (`<campaignId>/<kind>/<назва>-<sha1>.<ext>`, `cacheControl` рік), прив'язка через `importContent(update)` (юніт — `avatar`, решта — `icon`), звіт без пари. Офіційний шаблон — лише з `--allow-official` (власні AI-іконки; токени Forgotten Adventures — ніколи).
```

- [ ] **Step 2: `STATUS.md`** — у рядку «Конструктор кампаній» після фрагмента про 4f-0 додати: «**4f-1 «конвеєр і базовий шаблон SRD» готовий** (конвертер Open5e SRD 5.2 → `data/templates/srd-5.2/*.json`, `pnpm srd:build`, `pnpm constructor:srd-template`, `campaigns.credits` з показом у UI, значки шкіл замість порожньої іконки заклинання, `pnpm assets:attach`; сторонніх іконок немає — рішення користувача 2026-10-23; спек — розділ 4f-1 того ж файлу, план `docs/superpowers/plans/2026-10-23-constructor-4f1-srd-template.md`; опис — `docs/architecture/content-api.md` «Шаблон SRD 5.2»)» і замінити «далі 4f шаблон SRD» на «далі живий прогін 4f-1, потім 4f-2 (броня й числа класів)». Дату «_Оновлено:_» поставити `2026-10-23`.

- [ ] **Step 3: `constructor-handoff.md`** — у розділі «Стан» блоку хендофу додати рядок про 4f-1 (той самий зміст, що в STATUS, одним реченням) і в «Наступний крок» — «живий прогін 4f-1 за §7 спеку (локальна БД `constructor`, шаблон уже залитий `pnpm constructor:srd-template`), потім спек і план 4f-2».

- [ ] **Step 4: Full verification**
  - `pnpm install --frozen-lockfile` — без змін lockfile (нових залежностей немає).
  - `pnpm test:run` — усі зелені (відомий нестабільний `lib/hooks/battle/__tests__/battle-fx.test.tsx` — перезапустити окремо).
  - `pnpm lint` — 0 errors.
  - `pnpm build` — успішно (тип-перевірка охоплює `scripts/**` і тести).
  - `set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv` — без регресу HOMM (рушій не змінювався; відомий нестабільний сценарій лабіринту «ворог у полі зору прокидається»).

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/content-api.md docs/STATUS.md docs/superpowers/constructor-handoff.md
git commit -m "docs(constructor): 4f-1 SRD template architecture, status and handoff

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6:** звіт контролеру: список комітів, відхилення від плану (змінені регулярки/очікування тестів і чому), лічильники `pnpm srd:build` (заклинань з ефектами, вмінь класів з механікою), нестабільні тести.

(Фінальне рев'ю opus, `/simplify`, правка спеку під уточнення 2026-10-23, живий прогін за §7 спеку — окремий субагент: кампанія з «5e SRD 5.2» і credits; Fighter 5 — Extra Attack «1/2→2/2», Second Wind; Wizard 5 — Fireball слотом 3 кола; бій з Adult Red Dragon (легендарний опір, легендарна дія); значки шкіл у книзі, бою й друці; `assets:attach` на теці з 3 файлами; тестові кампанії видалити — робить контролер після задачі 14.)
