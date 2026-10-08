# Сети артефактів героїв — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** шість сетів артефактів HoMM5 (Айвен, Семгрун, Зехір, Годрик, Ізабель, Раїлаг) як модуль бібліотеки з механіками-здібностями, іконками з фан-вікі та сидингом у кампанію.

**Architecture:** дані в `data/library/artifacts.ts` (тип у `types.ts`, валідація в `buildLibrary`), здібності — наявна модель `Ability` (`lib/utils/abilities/schema`), у бою працюють через наявний шлях `collectCharacterAbilities` → `resolvedAbilities`. Сидинг — `scripts/seed-library.ts` (upsert за назвою, `remapRefs` для `spellIds`/`school`). Іконки — `scripts/import-artifact-icons.ts` (fandom API) → `assets/artifact-icons` → наявний `upload-assets-to-supabase` (бакет `artifact-icons` уже в `BUCKET_FOLDERS`).

**Tech Stack:** TypeScript strict, Zod, Vitest, Prisma 6, tsx-скрипти.

**Spec:** `docs/superpowers/specs/2026-10-08-artifact-sets-and-crits-design.md` (частина A).

## Global Constraints

- Жодного переписування рушію. Механіка, що не працює на наявному рушії, — точкова правка з тестом і окремою згадкою у звіті, або заміна на еквівалентну механіку (погодити в звіті).
- Відомі точкові правки рушію (з тестами): `randomOf` поважає `target` варіанта (Task 4), `applyCondition no_reaction` одразу ставить `hasUsedReaction` (Task 6). Інших змін рушію не планується.
- Бонус сету — лише за повний комплект (`lib/utils/battle/artifact-sets/`), без часткових бонусів.
- Без міграцій: лор іде в `description` артефакта / сету окремим абзацом після механіки.
- Слоти — ключі `ARTIFACT_GRID_9` (`lib/constants/artifacts.ts:82`): `ring1, helmet, necklace, range_weapon, armor, shield, weapon, boots, cape`; у межах сету не повторюються; ≥ 3 артефакти в сеті.
- Тексти українською; ідентифікатори англійською; мінімум коментарів (див. `~/.claude/CLAUDE.md`).
- Імпорти через `@/`, порядок — `simple-import-sort`, порожні рядки навколо `const`/`if`/`return` (`pnpm lint --fix`).
- Прод-БД і Storage не чіпати без явного дозволу користувача (сидинг прод-кампанії й аплоад іконок — окремий крок після мерджу, робить або підтверджує користувач).

## Review Focus

1. Сет, де один артефакт зламаний (невалідна здібність відкидається `read()` з warning) — бій мовчки грає без механіки. Тест бібліотеки має парсити кожну здібність `AbilitySchema` (Task 1) і бойові тести мають ганяти реальні дані з `LIBRARY_ARTIFACT_SETS`, а не копії (Tasks 4–6).
2. `spellIds`/`school` у здібностях артефактів не перетворені в DB id при сидингу → імунітет шолома / тригери Зехіра ніколи не спрацюють. Тест `artifactRows` з `remapRefs` (Task 3).
3. Повторний сидинг дублює артефакти або губить `setId` — upsert за назвою, тест на ідемпотентність даних (Task 3).
4. Здібності з `target: "allAllies"` (варта щита, імунітет шолома) зачіпають і власника — перевірити, що Семгрун не «вартує» сама себе (Task 4).
5. Мітки стакаються без меж (`state.ts:179`), тому бонуси «Здобичі»/«Кривдника» перевіряють наявність мітки (`hasMark`), а не кількість — тести фіксують, що після кількох влучань бонус не росте (Tasks 4–5).

---

### Task 1: Тип і валідація сетів у бібліотеці

**Files:**
- Modify: `data/library/types.ts`
- Modify: `data/library/build.ts`
- Create: `data/library/artifacts.ts` (порожній масив на цьому кроці)
- Create: `data/artifact-icons-map.ts`
- Test: `data/library/__tests__/library.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // data/library/types.ts
  export interface LibraryArtifact extends LibraryEntry { slot: ArtifactGridSlotKey; rarity: "epic" | "legendary"; abilities: Ability[]; modifiers?: Array<{ type: string; value: string }> }
  export interface LibraryArtifactSet extends LibraryEntry { heroName: string; artifacts: LibraryArtifact[]; abilities: Ability[] }
  // LibrarySource += artifactSets: LibraryArtifactSet[]
  // data/artifact-icons-map.ts
  export const ARTIFACT_ICON_FILES: Record<string, string>; // iconKey -> wiki file name
  // data/library/artifacts.ts
  export const LIBRARY_ARTIFACT_SETS: LibraryArtifactSet[];
  ```
  `appearanceDescription` (≥ 80 символів, з `LibraryEntry`) — це лор; `description` — механіка. `modifiers` — для зброї (формат `Artifact.modifiers`, типи з `ArtifactModifierType`: `damageDice`, `damageType`, `attackType`), інакше `extract-attacks.ts` дасть зброї 1d6 за замовчуванням.

- [ ] **Step 1: Failing tests** — у `library.test.ts` додати фабрики й кейси в `describe("buildLibrary validation")`:

```ts
const artifact = (key: string, over: Partial<LibraryArtifact> = {}): LibraryArtifact => ({
  key, name: `Артефакт ${key}`, description: "опис", appearanceDescription: APPEARANCE, iconKey: "unicorn-horn-bow",
  slot: "ring1", rarity: "epic", abilities: [], ...over,
});
const set = (key: string, over: Partial<LibraryArtifactSet> = {}): LibraryArtifactSet => ({
  key, name: `Сет ${key}`, description: "опис", appearanceDescription: APPEARANCE, iconKey: "unicorn-horn-bow", heroName: "Айвен",
  artifacts: [artifact(`${key}-a`, { slot: "ring1" }), artifact(`${key}-b`, { slot: "helmet" }), artifact(`${key}-c`, { slot: "cape" })],
  abilities: [], ...over,
});

it("rejects a set with fewer than 3 artifacts", () => {
  expect(() => buildLibrary(source({ artifactSets: [set("s", { artifacts: [artifact("a"), artifact("b", { slot: "helmet" })] })] }))).toThrow(/менше 3/);
});
it("rejects repeated slots inside a set", () => {
  const s = set("s", { artifacts: [artifact("a"), artifact("b"), artifact("c", { slot: "cape" })] });
  expect(() => buildLibrary(source({ artifactSets: [s] }))).toThrow(/слот «ring1» повторюється/);
});
it("rejects an unknown artifact iconKey", () => {
  const s = set("s");
  s.artifacts[0].iconKey = "nope";
  expect(() => buildLibrary(source({ artifactSets: [s] }))).toThrow(/невідомий iconKey/);
});
it("rejects an invalid artifact ability", () => {
  const s = set("s");
  s.artifacts[0].abilities = [{ id: "x", name: "x", trigger: { event: "passive" }, effects: [] } as never];
  expect(() => buildLibrary(source({ artifactSets: [s] }))).toThrow(/Артефакт «s-a»/);
});
it("rejects an unknown spell key in artifact abilities", () => {
  const s = set("s", { abilities: [{ id: "i", name: "i", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellImmunity", spellIds: ["nope"], target: "allAllies" }] }] });
  expect(() => buildLibrary(source({ artifactSets: [s] }))).toThrow(/nope/);
});
it("rejects duplicate artifact keys across sets", () => {
  expect(() => buildLibrary(source({ artifactSets: [set("s"), set("t", { artifacts: set("s").artifacts })] }))).toThrow(/дублікат key/);
});
```

`source({...})` має приймати `artifactSets` (за замовчуванням `[]`).

- [ ] **Step 2: Run** `pnpm test:run data/library/__tests__/library.test.ts` — FAIL (немає типів / полів).

- [ ] **Step 3: Implement.**
  - `types.ts`: інтерфейси вище, `LibrarySource.artifactSets`. Імпорт `ArtifactGridSlotKey` з `@/lib/constants/artifacts`.
  - `data/artifact-icons-map.ts`: мапа всіх 26 iconKey (6 сетів + 20 артефактів; назва не `ARTIFACT_ICONS`, щоб не плутати з `scripts/artifact-icon-map.ts`) (Task 2 копіює її в скрипт). Вміст:

```ts
export const ARTIFACT_ICON_FILES: Record<string, string> = {
  "archers-dream": "UnicornHornBow.png",
  "unicorn-horn-bow": "UnicornHornBow.png",
  "treeborn-quiver": "TreebornQuiver.png",
  "ring-of-celerity": "RingOfCelerity.png",
  "dwarven-kings": "ShieldOfTheDwarvenKings.png",
  "helm-of-the-dwarven-kings": "HelmOfTheDwarvenKings.png",
  "cuirass-of-the-dwarven-kings": "CuirassOfTheDwarvenKings.png",
  "shield-of-the-dwarven-kings": "ShieldOfTheDwarvenKings.png",
  "greaves-of-the-dwarven-kings": "GreavesOfTheDwarvenKings.png",
  "sar-issus": "StaffofSarIssus.png",
  "crown-of-sar-issus": "CrownofSarIssus.png",
  "robe-of-sar-issus": "RobeofSarIssus.png",
  "staff-of-sar-issus": "StaffofSarIssus.png",
  "ring-of-sar-issus": "RingofSarIssus.png",
  "lions-spirit": "LionCrown.png",
  "cape-of-the-lions-mane": "CapeOfTheLionsMane.png",
  "lion-crown": "LionCrown.png",
  "necklace-of-the-lion": "NecklaceOfTheLion.png",
  "dawn-regalia": "CrownOfLeadership.png",
  "crown-of-leadership": "CrownOfLeadership.png",
  "necklace-of-victory": "NecklaceOfVictory.png",
  "armor-of-valor": "ArmorOfValor.png",
  "yggshail-claws": "CursedRing.png",
  "moonblade": "Moonblade.png",
  "necklace-of-the-bloody-claw": "NecklaceOfTheBloodyClaw.png",
  "cursed-ring": "CursedRing.png",
};
```

  - `build.ts`: `LIBRARY_SOURCE.artifactSets = LIBRARY_ARTIFACT_SETS`; у `buildLibrary`:
    - `const artifactIcons = new Set(Object.keys(ARTIFACT_ICON_FILES));`
    - для кожного сету: `checkEntry("Сет артефактів", set, artifactIcons)`; `if (set.artifacts.length < 3) issues.push(\`Сет «${set.key}»: менше 3 артефактів\`)`; слоти — `Set`, при повторі `issues.push(\`Сет «${set.key}»: слот «${a.slot}» повторюється\`)`; слот поза `ARTIFACT_GRID_9.map((s) => s.key)` — `невідомий слот`.
    - для кожного артефакта: `checkEntry("Артефакт", a, artifactIcons)`; здібності — той самий шаблон `AbilitySchema.safeParse`, префікс `Артефакт «${a.key}» [${i}]:`; для здібностей сету — `Сет «${set.key}» [${i}]:`.
    - винести перевірку посилань `refs()` (`build.ts:~182`) у функцію `checkRefs(label: string, abilities: Ability[])` і викликати її для скілів (як було), артефактів і сетів; формат повідомлень для скілів лишити дослівно (`Скіл «k»: заклинання «x» не знайдено` — на нього матчаться `library.test.ts:145,149`).
    - `checkUnique("Артефакти", "key" | "name", allArtifacts)`, `checkUnique("Сети артефактів", "key" | "name", sets)`.
  - `artifacts.ts`: `export const LIBRARY_ARTIFACT_SETS: LibraryArtifactSet[] = [];`

- [ ] **Step 4: Run** той самий файл — PASS; `pnpm test:run data/library` — PASS.
- [ ] **Step 5: Commit** `feat(library): artifact set entries with validation`.

---

### Task 2: Іконки артефактів з фан-вікі

**Files:**
- Modify: `data/skill-icons.ts` (`IconKind`, `iconBucket`)
- Create: `scripts/import-artifact-icons.ts`
- Modify: `package.json` (script `import-artifact-icons`)
- Test: `data/__tests__/skill-icons.test.ts` (створити, якщо немає; інакше доповнити наявний тест `iconPublicUrl`)

**Interfaces:**
- Consumes: `ARTIFACT_ICON_FILES` (Task 1).
- Produces: `IconKind = "skill" | "spell" | "artifact"`; `iconPublicUrl(url, key, "artifact")` → `${url}/storage/v1/object/public/artifact-icons/${key}.webp`.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";

import { iconBucket, iconPublicUrl } from "@/data/skill-icons";

describe("artifact icons", () => {
  it("uses the artifact-icons bucket", () => {
    expect(iconBucket("moonblade", "artifact")).toBe("artifact-icons");
    expect(iconPublicUrl("https://x.supabase.co", "moonblade", "artifact")).toBe("https://x.supabase.co/storage/v1/object/public/artifact-icons/moonblade.webp");
  });
});
```

- [ ] **Step 2: Run** `pnpm test:run data/__tests__/skill-icons.test.ts` — FAIL.
- [ ] **Step 3: Implement** `IconKind` + гілка `if (kind === "artifact") return "artifact-icons";` (тип повернення розширити).
  Скрипт `scripts/import-artifact-icons.ts`:

```ts
#!/usr/bin/env tsx
import * as fs from "fs";
import * as path from "path";

import { ARTIFACT_ICON_FILES } from "../data/artifact-icons-map";

const DIR = path.join(process.cwd(), "assets", "artifact-icons");
const API = "https://mightandmagic.fandom.com/api.php";
const UA = { "User-Agent": "Mozilla/5.0" };

async function fileUrls(files: string[]): Promise<Record<string, string>> {
  const titles = files.map((f) => `File:${f}`).join("|");
  const res = await fetch(`${API}?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&format=json`, { headers: UA });
  const json = (await res.json()) as { query: { pages: Record<string, { title: string; imageinfo?: { url: string }[] }> } };
  const out: Record<string, string> = {};

  for (const page of Object.values(json.query.pages)) {
    if (page.imageinfo?.[0]) out[page.title.replace(/^File:/, "")] = page.imageinfo[0].url;
  }

  return out;
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });

  const todo = Object.entries(ARTIFACT_ICON_FILES).filter(([key]) => !fs.existsSync(path.join(DIR, `${key}.webp`)));

  if (todo.length === 0) return console.info("Усі іконки артефактів уже є");

  const urls = await fileUrls([...new Set(todo.map(([, file]) => file))]);

  for (const [key, file] of todo) {
    const url = urls[file.replace(/_/g, " ")] ?? urls[file];

    if (!url) {
      console.error(`Немає файлу на вікі: ${file}`);
      continue;
    }

    // без path-prefix CDN віддає 404; з ним — webp
    const res = await fetch(`${url.split("?")[0]}?path-prefix=en&format=webp`, { headers: UA });

    fs.writeFileSync(path.join(DIR, `${key}.webp`), Buffer.from(await res.arrayBuffer()));
    console.info(`✓ artifact-icons/${key}.webp`);
  }
}

main();
```

  `package.json`: `"import-artifact-icons": "tsx scripts/import-artifact-icons.ts"`.
- [ ] **Step 4: Run** тест — PASS. Запустити `pnpm import-artifact-icons`; перевірити `ls assets/artifact-icons | wc -l` = 26 і `file assets/artifact-icons/moonblade.webp` → `RIFF … WEBP` (якщо CDN віддав PNG — конвертувати через `sharp`, якщо він є в `node_modules`, інакше зберегти як є й зазначити у звіті). **Не** запускати `upload-assets-to-supabase` (Storage — прод; це окремий крок користувача).
- [ ] **Step 5: Commit** `feat(icons): artifact icons from the H5 wiki` (разом з `assets/artifact-icons/*.webp`).

---

### Task 3: Сидинг сетів і артефактів

**Files:**
- Modify: `scripts/seed-library-lib.ts` (чиста функція рядків)
- Modify: `scripts/seed-library.ts`
- Test: `scripts/__tests__/seed-library-lib.test.ts`

**Interfaces:**
- Consumes: `LibraryArtifactSet` (Task 1), `iconPublicUrl(..., "artifact")` (Task 2), наявні `remapRefs(abilities, maps)`, `upsert`, `json`.
- Produces:
  ```ts
  export function artifactDescription(entry: { description: string; appearanceDescription: string }): string; // `${description}\n\n${appearanceDescription}`
  export function artifactRows(set: LibraryArtifactSet, maps: Pick<IdMaps, "groups" | "spells">, icon: (key?: string) => string | undefined): {
    set: { name: string; description: string; icon?: string; abilities: Ability[] };
    artifacts: Array<{ name: string; description: string; slot: string; rarity: string; icon?: string; abilities: Ability[]; modifiers: Array<{ type: string; value: string }> }>;
  };
  ```
  (Тип мап — `Pick<IdMaps, "groups" | "spells">`, як у `remapRefs` (`seed-library-lib.ts:75`); у сигнатурі вище замість `RefMaps` писати саме його.)
  `slot` у рядку БД — **тип слоту** (`ArtifactSlot`: `ring`, `cloak`, `amulet`…), бо так його зберігає форма DM: `ARTIFACT_GRID_9.find((s) => s.key === a.slot)!.slotType`. Ключ сітки (`ring1`, `cape`, `necklace`) лишається тільки в бібліотеці й у `equipped`.

- [ ] **Step 1: Failing test**

```ts
it("artifactRows remaps spell keys and schools and joins lore", () => {
  const maps = { spells: new Map([["blindness", "sp1"], ["slow", "sp2"]]), groups: new Map([["Світло", "g1"]]) } as never;
  const set = {
    key: "s", name: "Сет", description: "Механіка сету.", appearanceDescription: "Лор сету.", iconKey: "sar-issus", heroName: "Зехір",
    abilities: [{ id: "a", name: "a", trigger: { event: "spellCast", phase: "after", role: "caster", school: "Світло" }, effects: [{ kind: "heal", amount: 1, target: "allAllies" }] }],
    artifacts: [{ key: "h", name: "Шолом", description: "Механіка.", appearanceDescription: "Лор.", iconKey: "helm-of-the-dwarven-kings", slot: "helmet", rarity: "epic",
      abilities: [{ id: "b", name: "b", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellImmunity", spellIds: ["blindness", "slow"], target: "allAllies" }] }] }],
  } as never;
  const rows = artifactRows(set, maps, (k) => (k ? `url/${k}` : undefined));

  expect(rows.set.description).toBe("Механіка сету.\n\nЛор сету.");
  expect(rows.set.abilities[0].trigger).toMatchObject({ school: "g1" });
  expect(rows.artifacts[0]).toMatchObject({ name: "Шолом", slot: "helmet", icon: "url/helm-of-the-dwarven-kings" });
  // ring1 -> ring, cape -> cloak, necklace -> amulet
  expect(artifactRows({ ...set, artifacts: [{ ...set.artifacts[0], slot: "cape" }] }, maps, () => undefined).artifacts[0].slot).toBe("cloak");
  expect(rows.artifacts[0].abilities[0].effects[0]).toMatchObject({ spellIds: ["sp1", "sp2"] });
});
```

- [ ] **Step 2: Run** `pnpm test:run scripts/__tests__/seed-library-lib.test.ts` — FAIL.
- [ ] **Step 3: Implement** `artifactDescription`, `artifactRows` у `seed-library-lib.ts`. У `seed-library.ts` — **після блоку персональних скілів (~L235), перед деревами**: `maps` визначено лише на ~L169, після заклять. Додати ключі `"сети артефактів"` і `"артефакти"` у `tallies` (~L67), інакше `upsert` впаде на `tallies[kind]`:

```ts
const setRows = await prisma.artifactSet.findMany({ where: { campaignId }, select: { id: true, name: true } });
const artifactRowsDb = await prisma.artifact.findMany({ where: { campaignId }, select: { id: true, name: true } });
const artifactIcon = (key?: string) => (key ? iconPublicUrl(supabaseUrl, key, "artifact") : undefined);

for (const librarySet of library.artifactSets) {
  const rows = artifactRows(librarySet, maps, artifactIcon);
  const setData = { name: rows.set.name, description: rows.set.description, icon: rows.set.icon, abilities: json(rows.set.abilities) };
  const setId = await upsert("сети артефактів", setRows, rows.set.name, {
    create: () => prisma.artifactSet.create({ data: { campaignId, ...setData }, select: { id: true, name: true } }),
    update: (id) => prisma.artifactSet.update({ where: { id }, data: setData, select: { id: true, name: true } }),
  });

  for (const a of rows.artifacts) {
    const data = { ...a, abilities: json(a.abilities), modifiers: json(a.modifiers), setId: dryRun ? undefined : setId };
    await upsert("артефакти", artifactRowsDb, a.name, {
      create: () => prisma.artifact.create({ data: { campaignId, ...data }, select: { id: true, name: true } }),
      update: (id) => prisma.artifact.update({ where: { id }, data, select: { id: true, name: true } }),
    });
  }
}
```

- [ ] **Step 4: Run** тест — PASS. Локально: `pnpm db:local` (якщо не запущено), `pnpm seed-library <локальна кампанія> --dry-run` — у зведенні з'являються «сети артефактів» і «артефакти» (поки 0, бо `LIBRARY_ARTIFACT_SETS` порожній).
- [ ] **Step 5: Commit** `feat(seed): seed artifact sets from the library`.

---

### Task 4: Сети Айвена й Семгрун

**Files:**
- Modify: `data/library/artifacts.ts`
- Modify: `lib/utils/abilities/registry/effects/index.ts:~115` (`randomOf.apply`: якщо в обраного варіанта є `target`, перерахувати цілі через `resolveTargetIds(option.target, i.ownerId, i.event, i.participants)`; без `target` — лишити `i.targetIds`, на це спираються касти, `cast.test.ts:325`)
- Test: `lib/utils/battle/artifact-sets/__tests__/hero-sets.test.ts` (створити), `lib/utils/abilities/registry/__tests__/` (тест `randomOf` з `target: "allAllies"` у варіанті)

**Interfaces:**
- Consumes: `LIBRARY_ARTIFACT_SETS`, `makeParticipant`, `resolved`, `seq` з `@/lib/utils/abilities/__tests__/fixtures`, `runAbilities`, `collectModifiers`, `findFlags` (`@/lib/utils/abilities/engine/collect-modifiers`), `participantImmuneToSpell(p, spellId, ps)` (`lib/utils/battle/spell/spell-immunity.ts:6`), `bakePassives` (`lib/utils/abilities/build/bake.ts:29`), `splitGuardedDamage` (`lib/utils/battle/attack/process/guard.ts:11`), `runAttackPhase` + білдери з `lib/utils/battle/attack-phase/__tests__/multi-target-roll.test.ts` (скопіювати потрібні — не імпортувати з тест-файлу). Бонуси фази `attack before` живуть лише в `extra`: `collectModifiers(ps, id, { damage: { kind, targetId } }, run.actionModifiers[id])` (`static.ts:24-29`).
- Produces: хелпер у тесті `abilitiesOf(setKey: string): { pieces: Record<string, Ability[]>; set: Ability[] }` — шукає в `LIBRARY_ARTIFACT_SETS` за `key`; Tasks 5–6 додають кейси в той самий файл.

Дані (додати в масив; `description` — механіка, `appearanceDescription` — лор):

```ts
const IVAN_PREY = "ivan-prey";

{
  key: "set-archers-dream", name: "Мрія лучника", heroName: "Айвен", iconKey: "archers-dream",
  description: "Повний комплект: дальнє влучання позначає ціль «Здобиччю» на 2 раунди; дальні атаки Айвена по «Здобичі» завдають +15 % шкоди.",
  appearanceDescription: "Сильванські лучники кажуть, що єдиноріг сам обирає, чий лук носитиме його ріг, а Деревородні — чий сагайдак ніколи не спорожніє. Коли обидва дари зустрічаються в одних руках, ліс замовкає: кожна стріла вже знає свою жертву.",
  abilities: [
    { id: "archers-dream-prey", name: "Здобич", trigger: { event: "hit", role: "attacker", attackKind: "ranged" }, effects: [{ kind: "mark", markId: IVAN_PREY, duration: { rounds: 2 }, target: "eventTarget" }] },
    { id: "archers-dream-prey-bonus", name: "Здобич: шкода", trigger: { event: "attack", phase: "before", role: "attacker", attackKind: "ranged" }, condition: { type: "hasMark", who: "eventTarget", markId: IVAN_PREY, bySelf: true }, effects: [{ kind: "damageBonus", filter: { kind: "ranged" }, percent: 15 }] },
  ],
  artifacts: [
    { key: "unicorn-horn-bow", name: "Лук з рогу єдинорога", slot: "range_weapon", rarity: "legendary", iconKey: "unicorn-horn-bow",
      description: "Дальня атака може вразити 2 цілі; для кожної — окремий кидок влучання й шкоди.",
      appearanceDescription: "Тятива сплетена з гриви єдинорога, а плечі лука вирізані з його рогу, що сам віддав його лісу. Стріла з нього не летить — вона ковзає між краплинами дощу і знаходить дві цілі там, де інший лучник бачить одну.",
      modifiers: [{ type: "damageDice", value: "1d8" }, { type: "damageType", value: "piercing" }, { type: "attackType", value: "ranged" }],
      abilities: [{ id: "unicorn-horn-bow-two-targets", name: "Подвійний постріл", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "maxTargets", flat: 1 }] }] },
    { key: "treeborn-quiver", name: "Сагайдак Деревородних", slot: "cape", rarity: "epic", iconKey: "treeborn-quiver",
      description: "Вбивство повертає бонусну дію (1 раз за раунд).",
      appearanceDescription: "Сагайдак виріс, а не був зшитий: Деревородні виплекали його з кори старого дуба, і в ньому завжди пахне живицею. Щойно ворог падає, сагайдак тихо шелестить — і рука лучника вже тягнеться по наступну стрілу.",
      abilities: [{ id: "treeborn-quiver-refresh", name: "Шелест сагайдака", trigger: { event: "kill", role: "killer" }, limits: { perRound: 1 }, effects: [{ kind: "grantAction", refreshBonusAction: true, target: "self" }] }] },
    { key: "ring-of-celerity", name: "Перстень стрімкості", slot: "ring1", rarity: "epic", iconKey: "ring-of-celerity",
      description: "+15 % шкоди по цілі з повним HP.",
      appearanceDescription: "Платинові крила Їлата, освячені ще в Соколиній імперії, обіймають камінь цього персня. Кажуть, вітри вічності дмуть у спину тому, хто його носить, — і перший удар по необережному ворогу завжди найглибший.",
      abilities: [{ id: "ring-of-celerity-fresh", name: "Перший удар", trigger: { event: "attack", phase: "before", role: "attacker" }, condition: { type: "hpAbove", who: "eventTarget", percent: 99 }, effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: 15 }] }] },
  ],
},
{
  key: "set-dwarven-kings", name: "Обладунки гномських королів", heroName: "Семгрун", iconKey: "dwarven-kings",
  description: "Повний комплект: коли Семгрун влучають, з шансом 30 % (не частіше 1 разу за раунд) союзникам на 1 раунд дістається випадкова руна: +10 % шкоди, +1 AC, +2 ініціативи або лікування 5 % max HP.",
  appearanceDescription: "Чотири частини обладунку куті в горнилах Гробниць гномських королів, і на кожній вибита руна предка, що загинув, тримаючи стрій. Поки хоч один лицар у цій броні стоїть на ногах, руни шепочуть його побратимам: «Ми з вами».",
  abilities: [
    { id: "dwarven-kings-runes", name: "Руни королів", trigger: { event: "hit", role: "target" }, limits: { chance: 30, perRound: 1 }, effects: [{ kind: "randomOf", options: [
      { kind: "damageBonus", filter: { kind: "all" }, percent: 10, duration: { rounds: 1 }, target: "allAllies" },
      { kind: "modifyStat", stat: "armor", flat: 1, duration: { rounds: 1 }, target: "allAllies" },
      { kind: "modifyStat", stat: "initiative", flat: 2, duration: { rounds: 1 }, target: "allAllies" },
      { kind: "heal", amount: { percentOf: "maxHp", value: 5 }, target: "allAllies" },
    ] }] },
  ],
  artifacts: [
    { key: "helm-of-the-dwarven-kings", name: "Шолом гномських королів", slot: "helmet", rarity: "epic", iconKey: "helm-of-the-dwarven-kings",
      description: "Союзники імунні до Сліпоти й Сповільнення.",
      appearanceDescription: "Шолом королів пам'ятає кожен погляд, що намагався його засліпити, і кожне закляття, що прагнуло скувати ноги його носія. Тепер ця пам'ять береже всіх, хто стоїть з ним в одному строю.",
      abilities: [{ id: "helm-of-the-dwarven-kings-ward", name: "Пильність королів", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellImmunity", spellIds: ["blindness", "slow"], target: "allAllies" }] }] },
    { key: "cuirass-of-the-dwarven-kings", name: "Кіраса гномських королів", slot: "armor", rarity: "epic", iconKey: "cuirass-of-the-dwarven-kings",
      description: "Коли Семгрун влучають, усі атакують кривдника з перевагою 1 раунд.",
      appearanceDescription: "Від удару по цій кірасі лунає гул, як від вечірнього дзвону в Грімгейті. Почувши його, побратими розвертаються до того, хто посмів ударити, — і стають безжальними.",
      abilities: [{ id: "cuirass-of-the-dwarven-kings-toll", name: "Дзвін кіраси", trigger: { event: "hit", role: "target" }, effects: [{ kind: "flag", flag: "advantageForAttackers", duration: { rounds: 1 }, target: "eventActor" }] }] },
    { key: "shield-of-the-dwarven-kings", name: "Щит гномських королів", slot: "shield", rarity: "legendary", iconKey: "shield-of-the-dwarven-kings",
      description: "На початку бою Семгрун бере під варту союзників: 20 % їхньої шкоди переходить на неї.",
      appearanceDescription: "Король, що носив цей щит, ні разу не відступив і ні разу не дозволив упасти побратиму поруч. Щит досі пам'ятає ту клятву й тягне на себе удари, призначені іншим.",
      abilities: [{ id: "shield-of-the-dwarven-kings-guard", name: "Клятва щита", trigger: { event: "battleStart" }, effects: [{ kind: "guard", percent: 20, duration: { rounds: 99 }, target: "allAllies" }] }] },
    { key: "greaves-of-the-dwarven-kings", name: "Поножі гномських королів", slot: "boots", rarity: "epic", iconKey: "greaves-of-the-dwarven-kings",
      description: "Смертельний удар (1 раз за бій): Семгрун лишається з 30 % HP, мораль союзників +1.",
      appearanceDescription: "Кажуть, гномські королі ніколи не падали — їх виносили з поля, ще живих і лайливих. Ці поножі вросли в камінь під ногами, і жоден удар не може збити їхнього власника з ніг з першого разу.",
      abilities: [{ id: "greaves-of-the-dwarven-kings-stand", name: "Королі не падають", trigger: { event: "lethalDamage" }, limits: { perBattle: 1 }, effects: [
        { kind: "heal", amount: { percentOf: "maxHp", value: 30 }, revive: true, target: "self" },
        { kind: "changeMorale", delta: 1, target: "allAllies" },
      ] }] },
  ],
},
```

- [ ] **Step 1: Failing tests** у `hero-sets.test.ts` (усі беруть здібності з `abilitiesOf`, обгортаючи в `resolved(a, { type: "artifact" })`):
  - **Лук:** `bakePassives(makeParticipant({ id: "ivan", abilities: [bow] }))` → `combatStats.maxTargets === 2`; далі `runAttackPhase` (шаблон `multi-target-roll.test.ts`) з дальньою атакою по двох цілях, `attackRolls: [15, 2]` → перша влучила, друга ні; два окремі записи логу.
  - **Сагайдак:** `runAbilities` з подією `{ type: "kill", actorId: "ivan", targetId: "e" }`, у Айвена `actionFlags.hasUsedBonusAction = true` → стає `false`; друга подія в тому ж раунді — лишається `true`.
  - **Перстень:** `collectModifiers` через `runAbilities` події `attack before` по цілі з `hp === maxHp` дає +15 %; по цілі з 50 % — 0.
  - **Сет «Здобич»:** `hit` ranged → мітка на `e`; `runAbilities` події `attack before` ranged по `e` → бонус 15 % в `actionModifiers`; три `hit` поспіль → бонус усе одно 15 % (не стакається); атака по цілі без мітки → 0.
  - **Шолом:** Семгрун зі здібністю, союзник `a`: `participantImmuneToSpell(a, "blindness", ps)` і `"slow"` → `true` (у тесті `spellIds` — ключі бібліотеки), `"roots"` → `false`.
  - **Кіраса:** `hit` з `targetId: "semgrun", actorId: "e"` → `findFlags(ps, "e", "advantageForAttackers")` непорожній.
  - **Щит:** `battleStart` → у союзника `a` активний ефект з `abilityKey: "guard"` і `source.participantId === "semgrun"`; `splitGuardedDamage(ps, "a", 10).guardianId === "semgrun"`; у самої Семгрун guard на себе немає (рушій уже блокує, лише пише в лог «імунітет» — прийнятний шум).
  - **Поножі:** Семгрун з 0 HP через `lethalDamage` → активна з `Math.floor(maxHp * 0.3)` HP; `combatStats.morale` союзника +1; вдруге в бою — гине.
  - **Руни:** `rng: seq(0)` (шанс пройде, перша опція) → у **союзників** (не лише Семгрун) `damageBonus` 10 %. Падає до правки `randomOf` — це очікувано; правка + тест реєстру в цій же задачі.
  - **Бібліотека:** `buildLibrary(LIBRARY_SOURCE)` не кидає (уже є в `library content`).
- [ ] **Step 2: Run** `pnpm test:run lib/utils/battle/artifact-sets/__tests__/hero-sets.test.ts` — FAIL (даних немає).
- [ ] **Step 3: Implement** — правка `randomOf.apply` (див. Files) і дані вище в `artifacts.ts`. Якщо ще якийсь тест падає через рушій — точкова правка або заміна механіки (див. Global Constraints), з тестом і згадкою у звіті.
- [ ] **Step 4: Run** той самий тест + `pnpm test:run data/library` — PASS.
- [ ] **Step 5: Commit** `feat(library): Ivan and Semgrun artifact sets`.

---

### Task 5: Сети Зехіра й Годрика

**Files:**
- Modify: `data/library/artifacts.ts`
- Test: `lib/utils/battle/artifact-sets/__tests__/hero-sets.test.ts`

**Interfaces:**
- Consumes: хелпер `abilitiesOf` (Task 4); подія `spellCast` (`{ type: "spellCast", phase: "after", actorId, targetIds, spellId, school, level }` — точну форму взяти з `lib/utils/abilities/engine/types.ts`).

Дані:

```ts
const GODRIC_OFFENDER = "godric-offender";

{
  key: "set-sar-issus", name: "Регалії Сар-Іссуса", heroName: "Зехір", iconKey: "sar-issus",
  description: "Повний комплект: закляття 1–2 рівня б'ють до 2 цілей.",
  appearanceDescription: "Архімаг Сар-Іссус залишив Срібній лізі не книги, а речі: корону, мантію, посох і перстень, кожен напоєний однією з шкіл. Хто збере всі чотири, почує, як вони гудуть в унісон, і найпростіше закляття розщепиться надвоє.",
  abilities: [{ id: "sar-issus-split", name: "Розщеплення чар", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellTargeting", mode: "area", maxTargets: 2, maxLevel: 2 }] }],
  artifacts: [
    { key: "crown-of-sar-issus", name: "Корона Сар-Іссуса", slot: "helmet", rarity: "epic", iconKey: "crown-of-sar-issus",
      description: "Закляття Світла лікують усіх союзників на 5 % max HP (2 рази за бій).",
      appearanceDescription: "Тонкий срібний обруч світиться м'яким ранковим світлом, коли власник торкається магії Світла. Це світло не сліпить — воно лягає на плечі союзників, як тепла долоня.",
      abilities: [{ id: "crown-of-sar-issus-light", name: "Світло корони", trigger: { event: "spellCast", phase: "after", role: "caster", school: "Світло" }, limits: { perBattle: 2 }, effects: [{ kind: "heal", amount: { percentOf: "maxHp", value: 5 }, target: "allAllies" }] }] },
    { key: "robe-of-sar-issus", name: "Мантія Сар-Іссуса", slot: "armor", rarity: "epic", iconKey: "robe-of-sar-issus",
      description: "Закляття Темряви знижують мораль усіх ворогів на 1 (1 раз за бій).",
      appearanceDescription: "Синьо-золотий шовк мантії архімага ховає в собі частку його сили. Коли з вуст власника злітає темне слово, тінь мантії розповзається полем, і вороги раптом відчувають себе дуже малими.",
      abilities: [{ id: "robe-of-sar-issus-dark", name: "Тінь мантії", trigger: { event: "spellCast", phase: "after", role: "caster", school: "Темрява" }, limits: { perBattle: 1 }, effects: [{ kind: "changeMorale", delta: -1, target: "allEnemies" }] }] },
    { key: "staff-of-sar-issus", name: "Посох Сар-Іссуса", slot: "weapon", rarity: "legendary", iconKey: "staff-of-sar-issus",
      description: "Закляття Хаосу підпалюють усіх ворогів: 1d6 вогнем щораунду, 2 раунди (1 раз за раунд).",
      appearanceDescription: "Навершя посоху — кристал, у якому застигла іскра первісного вогню. Кожне закляття Хаосу розбурхує її, і тоді полум'я зісковзує з кристала й шукає ворогів саме.",
      modifiers: [{ type: "damageDice", value: "1d6" }, { type: "damageType", value: "bludgeoning" }, { type: "attackType", value: "melee" }],
      abilities: [{ id: "staff-of-sar-issus-chaos", name: "Іскра Хаосу", trigger: { event: "spellCast", phase: "after", role: "caster", school: "Хаос" }, limits: { perRound: 1 }, effects: [{ kind: "dot", damagePerRound: "1d6", damageType: "fire", duration: { rounds: 2 }, target: "allEnemies" }] }] },
    { key: "ring-of-sar-issus", name: "Перстень Сар-Іссуса", slot: "ring1", rarity: "epic", iconKey: "ring-of-sar-issus",
      description: "Закляття Природи повертає 1 слот закляття (1 раз за бій).",
      appearanceDescription: "Перстень обвитий живим пагоном, що не в'яне вже кілька століть. Магія Природи не витрачається з ним — вона повертається, як вода в річку після дощу.",
      abilities: [{ id: "ring-of-sar-issus-nature", name: "Кругообіг", trigger: { event: "spellCast", phase: "after", role: "caster", school: "Природа" }, limits: { perBattle: 1 }, effects: [{ kind: "restoreSpellSlot", count: 1, target: "self" }] }] },
  ],
},
{
  key: "set-lions-spirit", name: "Дух лева", heroName: "Годрик", iconKey: "lions-spirit",
  description: "Повний комплект: влучання знижує мораль цілі на 1 (1 раз за раунд).",
  appearanceDescription: "Регалії Ордену Лева носили лише ті лицарі Грифонової імперії, що жодного разу не показали ворогові спину. Коли такий лицар б'є, ворог чує не дзвін сталі, а лев'ячий рик — і відчуває, як слабнуть його коліна.",
  abilities: [{ id: "lions-spirit-roar", name: "Лев'ячий рик", trigger: { event: "hit", role: "attacker" }, limits: { perRound: 1 }, effects: [{ kind: "changeMorale", delta: -1, target: "eventTarget" }] }],
  artifacts: [
    { key: "cape-of-the-lions-mane", name: "Плащ левової гриви", slot: "cape", rarity: "epic", iconKey: "cape-of-the-lions-mane",
      description: "Хто влучив союзника, стає «Кривдником» на 2 раунди; атаки Годрика по «Кривднику» завдають +15 % шкоди.",
      appearanceDescription: "Плащ пошитий з гриви лева, що загинув, захищаючи свій прайд. Кожного разу, коли когось із побратимів поранено, грива на плечах власника настовбурчується — і він уже знає, кого карати.",
      abilities: [
        { id: "cape-of-the-lions-mane-mark", name: "Кривдник", trigger: { event: "hit", role: "target", whose: "ally" }, effects: [{ kind: "mark", markId: GODRIC_OFFENDER, duration: { rounds: 2 }, target: "eventActor" }] },
        { id: "cape-of-the-lions-mane-bonus", name: "Кривдник: шкода", trigger: { event: "attack", phase: "before", role: "attacker" }, condition: { type: "hasMark", who: "eventTarget", markId: GODRIC_OFFENDER, bySelf: true }, effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: 15 }] },
      ] },
    { key: "lion-crown", name: "Левова корона", slot: "helmet", rarity: "epic", iconKey: "lion-crown",
      description: "+10 % до шансу додаткового ходу від моралі.",
      appearanceDescription: "Золота корона з левовою пащею на чолі не прикрашає — вона надихає. Лицар у ній відчуває, як у грудях прокидається лев, і кидається в бій раніше, ніж ворог устигає підняти щит.",
      abilities: [{ id: "lion-crown-courage", name: "Відвага лева", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "moraleChance", percent: 10 }] }] },
    { key: "necklace-of-the-lion", name: "Намисто лева", slot: "necklace", rarity: "epic", iconKey: "necklace-of-the-lion",
      description: "Смертельний удар (1 раз за бій): Годрик встає з 25 % HP, мораль союзників +1.",
      appearanceDescription: "Ікло лева на важкому ланцюзі гріє груди, як друге серце. Коли перше серце вже готове зупинитися, друге б'є за нього — і лицар підводиться, на подив і жах ворогів.",
      abilities: [{ id: "necklace-of-the-lion-rise", name: "Друге серце", trigger: { event: "lethalDamage" }, limits: { perBattle: 1 }, effects: [
        { kind: "heal", amount: { percentOf: "maxHp", value: 25 }, revive: true, target: "self" },
        { kind: "changeMorale", delta: 1, target: "allAllies" },
      ] }] },
  ],
},
```

- [ ] **Step 1: Failing tests:**
  - **Корона:** `spellCast` школи `"Світло"` (у тесті — назва, бо `remapRefs` не застосовано) → союзник з 50/100 HP має 55; третій каст — без лікування.
  - **Мантія:** `spellCast` `"Темрява"` → `combatStats.morale` ворога −1; вдруге — без змін.
  - **Посох:** `spellCast` `"Хаос"` → у ворогів активний ефект з `dotDamage`.
  - **Перстень:** `spellCast` `"Природа"` → слот повертається (поле, яке міняє `restoreSpellSlot`).
  - **Сет Зехіра:** `spellTargetingFor(ps, "zehir", { id, groupId, level: 2 })` (`lib/utils/battle/spell/spell-targeting.ts:18`) → режим `area`, до 2 цілей; для `level: 3` — без зміни.
  - **Плащ:** `hit` з `targetId: "ally", actorId: "e"` → мітка на `e` від Годрика; `attack before` Годрика по `e` → +15 % в `actionModifiers`; після трьох влучань по союзниках — усе одно +15 %; `hit` по самому Годрику мітки **не** ставить (`whose: "ally"`).
  - **Корона лева:** `findFlags(ps, "godric", "moraleChance")` дає 10.
  - **Намисто лева:** як поножі, 25 %.
  - **Сет Годрика:** два `hit` в одному раунді → `combatStats.morale` цілі −1 один раз.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** дані.
- [ ] **Step 4: Run** тест + `pnpm test:run data/library` — PASS.
- [ ] **Step 5: Commit** `feat(library): Zehir and Godric artifact sets`.

---

### Task 6: Сети Ізабель і Раїлага

**Files:**
- Modify: `data/library/artifacts.ts`
- Modify: `lib/utils/abilities/registry/effects/state.ts:~56` (`applyCondition`: для `no_reaction` одразу `actionFlags.hasUsedReaction = true`, бо відсіч перевіряє лише цей прапорець, `retaliation.ts:64`, а умова інакше діє тільки з наступного ходу цілі)
- Test: `lib/utils/battle/artifact-sets/__tests__/hero-sets.test.ts`

Дані:

```ts
{
  key: "set-dawn-regalia", name: "Регалії світанку", heroName: "Ізабель", iconKey: "dawn-regalia",
  description: "Повний комплект: коли будь-який союзник падає нижче 50 % HP, «Сурми світанку» звучать удруге — усі союзники +2 ініціативи і +10 % шкоди на 2 раунди та +1 моралі (1 раз за бій).",
  appearanceDescription: "Корона, намисто й обладунок належали полководцям Грифонової імперії, що вели війська на світанку. Зібрані разом, вони пам'ятають той ранковий клич — і повторюють його саме тоді, коли стрій починає хитатися.",
  abilities: [{ id: "dawn-regalia-second-call", name: "Другий поклик сурм", trigger: { event: "roundStart" }, condition: { type: "any", conditions: [{ type: "hpBelow", who: "self", percent: 50 }, { type: "hpBelow", who: "anyAlly", percent: 50 }] }, limits: { perBattle: 1 }, effects: [
    { kind: "modifyStat", stat: "initiative", flat: 2, duration: { rounds: 2 }, target: "allAllies" },
    { kind: "damageBonus", filter: { kind: "all" }, percent: 10, duration: { rounds: 2 }, target: "allAllies" },
    { kind: "changeMorale", delta: 1, target: "allAllies" },
  ] }],
  artifacts: [
    { key: "crown-of-leadership", name: "Корона лідерства", slot: "helmet", rarity: "epic", iconKey: "crown-of-leadership",
      description: "Усі союзники отримують +5 % до шансу додаткового ходу від моралі.",
      appearanceDescription: "Скромний золотий обруч без жодного каменя — справжній полководець не потребує прикрас. Досить того, що його бачать над строєм: воїни поруч стають сміливішими й частіше кидаються вперед, не чекаючи наказу.",
      abilities: [{ id: "crown-of-leadership-spark", name: "Іскра відваги", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "moraleChance", percent: 5, target: "allAllies" }] }] },
    { key: "necklace-of-victory", name: "Намисто перемоги", slot: "necklace", rarity: "epic", iconKey: "necklace-of-victory",
      description: "Вбивство ворога будь-ким із партії дає союзникам +1 моралі (1 раз за раунд).",
      appearanceDescription: "Цим орденом Айвен Грифон нагороджував Маршалів Перемоги у війні Четвертого затемнення. Кожна здобута перемога відбивається в його золоті, і військо поруч з ним стає трохи сміливішим.",
      abilities: [{ id: "necklace-of-victory-glory", name: "Слава", trigger: { event: "kill", role: "killerSide" }, limits: { perRound: 1 }, effects: [{ kind: "changeMorale", delta: 1, target: "allAllies" }] }] },
    { key: "armor-of-valor", name: "Обладунок звитяги", slot: "armor", rarity: "epic", iconKey: "armor-of-valor",
      description: "Коли союзник падає нижче 30 % HP, усі союзники лікуються на 5 % max HP щораунду 2 раунди (1 раз за бій).",
      appearanceDescription: "Обладунок освячений у соборі Ельрата, і на нагруднику викарбувано грифона, що закриває крилами пташенят. Коли хтось із побратимів стікає кров'ю, крила наче розгортаються над усім загоном.",
      abilities: [{ id: "armor-of-valor-wings", name: "Крила грифона", trigger: { event: "roundStart" }, condition: { type: "any", conditions: [{ type: "hpBelow", who: "self", percent: 30 }, { type: "hpBelow", who: "anyAlly", percent: 30 }] }, limits: { perBattle: 1 }, effects: [{ kind: "hot", healPerRound: { percentOf: "maxHp", value: 5 }, duration: { rounds: 2 }, target: "allAllies" }] }] },
  ],
},
{
  key: "set-yggshail-claws", name: "Кігті Ігг-Шайла", heroName: "Раїлаг", iconKey: "yggshail-claws",
  description: "Повний комплект: влучання з шансом 25 % паралізує ціль — вона втрачає реакцію на 1 раунд і не може відповісти відсіччю.",
  appearanceDescription: "Жерці Малассы кажуть, що Ігг-Шайл, отруйна прадраконеса глибин, лишила по собі три кігті. З них викували клинок, намисто й перстень — і кожна рана від їхнього власника ще довго пам'ятає дотик отрути.",
  abilities: [{ id: "yggshail-claws-paralysis", name: "Паралізуюча отрута", trigger: { event: "hit", role: "attacker" }, limits: { chance: 25 }, effects: [{ kind: "applyCondition", condition: "no_reaction", duration: { rounds: 1 }, target: "eventTarget" }] }],
  artifacts: [
    { key: "moonblade", name: "Місячний клинок", slot: "shield", rarity: "legendary", iconKey: "moonblade",
      description: "+15 % шкоди по цілі, у якої менше 50 % HP.",
      appearanceDescription: "Тонке, як серп молодого місяця, лезо для другої руки. Воно майже не блищить у темряві Підземелля, зате безпомильно знаходить уже поранену плоть — так хижак добиває ослаблу здобич.",
      abilities: [{ id: "moonblade-finisher", name: "Добивання", trigger: { event: "attack", phase: "before", role: "attacker" }, condition: { type: "hpBelow", who: "eventTarget", percent: 50 }, effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: 15 }] }] },
    { key: "necklace-of-the-bloody-claw", name: "Намисто кривавого кігтя", slot: "necklace", rarity: "epic", iconKey: "necklace-of-the-bloody-claw",
      description: "Вбивство лікує Раїлага на 15 % max HP.",
      appearanceDescription: "Ікла перевертня Кривавого Кігтя, що спустошував села біля Талонгарда, доки його не зарубав Лицар Дракона. Звірина спрага досі живе в них і віддає власнику силу кожного поваленого ворога.",
      abilities: [{ id: "necklace-of-the-bloody-claw-feast", name: "Кривава спрага", trigger: { event: "kill", role: "killer" }, effects: [{ kind: "heal", amount: { percentOf: "maxHp", value: 15 }, target: "self" }] }] },
    { key: "cursed-ring", name: "Проклятий перстень", slot: "ring1", rarity: "epic", iconKey: "cursed-ring",
      description: "Вбивство вивільняє отруйну хмару: усі вороги отруєні на 15 % шкоди атаки Раїлага щораунду, 2 раунди (1 раз за раунд).",
      appearanceDescription: "Злодії виколупали діамант з персня вбитого некроманта Фанка — і прокляття все одно їх знайшло. Тепер перстень видихає отруйний туман щоразу, коли поруч обривається чиєсь життя.",
      abilities: [{ id: "cursed-ring-cloud", name: "Отруйна хмара", trigger: { event: "kill", role: "killer" }, limits: { perRound: 1 }, effects: [{ kind: "dot", damagePerRound: { percentOf: "ownerAttack", value: 15 }, damageType: "poison", duration: { rounds: 2 }, target: "allEnemies" }] }] },
  ],
},
```

- [ ] **Step 1: Failing tests:**
  - **Корона лідерства:** `findFlags(ps, "ally", "moraleChance")` і `findFlags(ps, "isabel", "moraleChance")` дають 5.
  - **Намисто перемоги:** `kill` союзником → `combatStats.morale` усіх союзників +1; друге вбивство в раунді — без змін.
  - **Обладунок звитяги:** `roundStart`, союзник 20/100 → у всіх союзників активний `hotHeal`; наступний `roundStart` — без нового; окремо: сама Ізабель 20/100 при здорових союзниках → теж спрацьовує.
  - **Сет Ізабель:** `roundStart` союзник 40/100 → `collectModifiers` ініціатива +2 і шкода +10 %; повтор — не спрацьовує.
  - **Місячний клинок:** `attack before` по цілі 40/100 → +15 %; по 60/100 — 0.
  - **Намисто кривавого кігтя:** `kill` → Раїлаг +15 % max HP.
  - **Проклятий перстень:** `kill`, атака власника в середньому ≥ 20 → у всіх живих ворогів `dotDamage` ≥ 3 (15 % з округленням вниз; 5 % давало б 0, `amount.ts:55`, `hp.ts:111`).
  - **Сет Раїлага:** `hit`, `rng: seq(0)` → у цілі умова `no_reaction` і `actionFlags.hasUsedReaction === true`; `rng: seq(0.99)` → немає. Плюс `runAttackPhase`: Раїлаг б'є ціль з `counterAttack`, сет спрацьовує (`seq(0)`) → відсічі немає.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** правка `applyCondition` і дані.
- [ ] **Step 4: Run** `pnpm test:run lib/utils/battle lib/utils/abilities data/library` — PASS.
- [ ] **Step 5: Commit** `feat(library): Isabel and Raelag artifact sets`.

---

### Task 7: Симуляція балансу і звіт

**Files:**
- Modify: `scripts/balance-library.ts`
- Create: `docs/reports/2026-10-08-artifact-sets-balance.md`

**Interfaces:**
- Consumes: засіяні сети в SIM-кампанії (seed-library з Task 3 уже викликається в `setupCampaign`).

- [ ] **Step 1:** додати прапорець `--sets` у `balance-library.ts`. Коли він увімкнений, `createParty` після створення персонажа знаходить сет за `heroName`-мапою білдів і екіпірує всі його артефакти в `equipped` під їхні слоти (поруч із наявним `mainHand`):
  - `martial` → «Дух лева»; `caster` → «Регалії Сар-Іссуса»; `leader` → «Мрія лучника».
  ```ts
  const BUILD_SET: Record<string, string> = { martial: "Дух лева", caster: "Регалії Сар-Іссуса", leader: "Мрія лучника" };
  const librarySet = LIBRARY_ARTIFACT_SETS.find((s) => s.name === BUILD_SET[b.key])!;
  const rows = await prisma.artifact.findMany({ where: { campaignId, name: { in: librarySet.artifacts.map((a) => a.name) } }, select: { id: true, name: true } });
  const idByName = new Map(rows.map((r) => [r.name, r.id]));
  const equipped = { mainHand: weapons[b.weapon], ...Object.fromEntries(librarySet.artifacts.map((a) => [a.slot, idByName.get(a.name)!])) };
  ```
  Ключі `equipped` — ключі сітки з бібліотеки (`ring1`, `cape`…), як їх читає `extract-artifacts.ts:16`. Для білду `leader` з `--sets` **не** класти `mainHand` (лук єдинорога — його зброя; інакше `attacks[0]` залежить від порядку в БД). Перед прогоном переконатися на одному персонажі (`--debug`), що `findCompletedSets` бачить сет повним.
  Ще дві правки автоплею, без яких сет Айвена й Зехіра не виміряти:
  - дальня атака: `targetIds` / `attackRolls` — до `actor.combatStats.maxTargets` найслабших ворогів (зараз один `targetId`, `balance-library.ts:263`);
  - закляття `kind: "enemy"`: брати кількість цілей з `spellTargetingFor(...)` (`pickSpell`, `balance-library.ts:193`).
- [ ] **Step 2:** прогнати локально (Docker-БД):
  `pnpm balance-library --runs=12 --levels=3,6,10 --parties=mixed,martial,caster,leader` і те саме з `--sets` (без `--reuse`, щоб засіялися актуальні здібності; після правок цифр — так само без `--reuse`). Зберегти обидві таблиці.
- [ ] **Step 3:** порівняти: сер. раунди, перемоги, HP лишилось, шкода за хід на роль. Ціль — приріст ефективності героя з сетом ≤ ~15–20 %. Якщо сет вище — урізати відсотки / шанси / ліміти в `artifacts.ts` (оновити описи й тести), прогнати знову.
- [ ] **Step 4:** записати `docs/reports/2026-10-08-artifact-sets-balance.md`: обидві таблиці, висновки по кожному з трьох змодельованих сетів, аргументований висновок для трьох незмодельованих (Семгрун, Ізабель, Раїлаг — немає відповідних білдів у симуляторі), зміни цифр, якщо були, і відоме обмеження: майстер атаки дозволяє вибрати кілька цілей і для ближньої атаки, сервер таку відхиляє (`useAttackWizard.ts:78`, `run-attack-phase.ts:149`) — з луком помітніше.
- [ ] **Step 5:** `pnpm lint` і `pnpm test:run` — чисто. Commit `chore(balance): artifact sets simulation report`.

---

### Task 8: Документація

**Files:**
- Modify: `docs/ARTIFACT-SETS.md`

- [ ] **Step 1:** додати розділ «Бібліотечні сети героїв»: де дані (`data/library/artifacts.ts`), як сидяться (`pnpm seed-library <id>`), іконки (`pnpm import-artifact-icons` → `pnpm upload-assets-to-supabase`), що сетові бонуси — `abilities` (не `setBonus`), таблиця «сет → герой».
- [ ] **Step 2:** Commit `docs: library artifact sets`.

Після мерджу (за підтвердженням користувача, не в рамках плану): `pnpm upload-assets-to-supabase` (іконки в Storage) і `pnpm seed-library cmuylhk0c0001ia06lg5eommv --allow-remote` з `.env.production-db.local`.
