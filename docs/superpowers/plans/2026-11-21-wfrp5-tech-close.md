# WFRP 5e канон (Grim d100): закриття технічної частини епіку

Гілка `feat/wfrp5-tech` (від main ce7120aa8), worktree `../dnd-tracker-wfrp-tech`. Обсяг — усе технічне з [open-mechanics](2026-11-20-wfrp5-open-mechanics-after-content-wave.md) (10 пунктів + контентні хвости), крім генерації іконок. Джерела: аудит `docs/superpowers/research/2026-11-19-wfrp5-canon-audit.md`, [mechanics](2026-11-19-wfrp5-canon-mechanics.md), [w7-tails](2026-11-20-wfrp5-handoff-w7-tails.md), `docs/architecture/rule-systems.md` (розділи «Wfrp: …»), абзаци «WFRP 5e канон» у `docs/STATUS.md`. Канон: `~/Work/wfrp-extract/out/wfrp5/pages/pNNN.md` (±1 сторінка; таблиці з OCR — сумнівні числа звіряти з PDF `~/Downloads/WFRP5_Core_Rulebook_06_10_26.pdf`). У репо — лише числа, структура й перефраз; текст книги не копіювати, назви — оригінальні (`forbidden-terms.ts`).

## Правила для всіх пакетів

- Усе нове — під гейтом профілю редакції; `legacy` байт-у-байт. Нові поля профілю (`systems/wfrp/rules/edition/profiles.ts`) додає **P1 одразу для всіх пакетів**: `sizeModel`, `combatModsModel`, `actionsModel`, `traitModel` (`'legacy' | 'canon'`; `canon5e` → `canon`). Магія лишається на `magicModel`, спорядження — на `gearModel`.
- Канон-тести — `systems/wfrp/__tests__/canon/<тема>.test.ts` через `bookExample(page, title, run)` з `book-example.ts`; у назві сторінка книги. Виконавці (Sonnet) **пишуть тести, але не запускають їх**; повний прогін — один раз наприкінці (див. «Верифікація»).
- Ядро не називає систему: нові шви ядра — необов'язкові хуки `RuleSystem*` з дефолтом «нічого не змінюється» для d20/d6pool.
- Не чіпати `props-budget` і `assistant/coverage` (`world/*`). Прод не чіпати. Бюджети i18n wfrp member/dm (не props-budget) піднімати лише за потреби, з рядком у звіті.
- Перед кожним пакетом — reuse-пошук у `systems/wfrp/rules`, `lib/utils/battle` (особливо `grid/line-of-fire.ts`, `grid/geometry.ts` `footprintDistance`, `grid/terrain.ts`, `conditions/grapple-links.ts`, `turn/reorder-initiative.ts`). Lint — `pnpm exec eslint --fix <файли>`; `pnpm cycles` наприкінці пакета (секунда, не тест).
- JSON i18n (`messages/*/battleWfrp.json`, `data/templates/grim-d100/i18n/*.json`) редагувати лише `Edit` (не `Write`); при помилці «файл змінено» — перечитати. Кожен пакет пише ключі у свою підгрупу.
- Пакет закінчується: коміт на гілці + короткий звіт (файли, рішення, відкрите). Нічого не пушити.

## Як уникаємо гонок (головне)

Гарячі файли: `combat/resolve-attack.ts`, `combat/defence.ts`, `combat/engagement.ts`, `combat/mitigate.ts`, `slots.ts`, `edition/profiles.ts`, `server/attack-input.ts`, `turn/index.ts`, `ability-effects.ts` + `trait-kinds.ts` + `traits/recipes.ts`, `lib/utils/battle/spell/cast/*`. Тому:

1. **P1 робить «заготовки»** для всіх наступних пакетів: поля профілю; усі нові поля `WfrpParticipantState` (`slots.ts` + парсер); усі нові поля входу атаки/касту (`server/attack-input.ts`, `FORTUNE_INPUT`); реєстр SL-модифікаторів атаки з порожніми файлами-джерелами; порожні хуки в `turn/index.ts`; нові kind ефектів у схемі. Далі пакети лише **заповнюють свої файли**.
2. Пакети йдуть **трьома смугами**; всередині смуги — послідовно, смуги між собою — паралельно (спільних файлів немає, крім JSON i18n).

| Смуга | Пакети (послідовно) | Що тримає |
|---|---|---|
| Бій | P1 → P2 → P4 → P5 → P7 | `combat/*`, `traits/*`, `equipment/*`, `turn/*` |
| Магія | (після P1) P3 → P6 | `magic/*`, `lib/utils/battle/spell/cast/*`, `types-magic.ts`, `spells.json` |
| Дані/створення | (після P1) P8 → P9 | `creation/*`, `advancement/*`, `tables/*`, `combat/fumble.ts`, `rules.json` tables |
| Фінал | P10 → P11 → P12 (після всіх смуг) | константи всіх папок, контент, іконні суб'єкти |

Паралельні групи: **[P1]** → **[P2 ‖ P3 ‖ P8]** → **[P4 ‖ P6 ‖ P9]** → **[P5]** → **[P7]** → **[P10]** → **[P11]** → **[P12]**. (P5 і P7 не паралелити з P4: `defence.ts`, `engagement.ts`, `resolve-attack.ts`.)

---

## P1 — Розмір (M14, C/B-01, C/B-02) + заготовки. ПЕРШИЙ, Critical

**Канон (p360–361, p166):** шкода в ближньому бою: Small/Average +0, Large +SB, Enormous +SB, Monstrous +2×SB — не для дальніх, Free Attack і додаткових атак; стрільба: ціль більша за стрільця +1 SL (Monstrous +2), менша −1 SL; захист Melee-навичкою від більшого −2 SL (Dodge — без штрафу); outnumbering-ваги Small/Average 1, Large 2, Enormous 3, Monstrous 4, але більші не рахуються кратно, коли самі оточують менших (2 огри проти людини = 2:1, не 4:1); великі ігнорують Disengage від менших; Opposed Strength: більший на ≥2 ступені виграє автоматично, на 1 — менший має кинути Critical. Wounds: Small = 2×TB. Outnumbered +1 SL / Surrounded +2 SL — лише тест атаки (p166), не сумуються.

**Рішення Tiny/Little:** у каноні 5 ступенів (Small…Monstrous). Під `sizeModel: 'canon'` `tiny`/`little` читаються як `small` (`canonSizeOf`); enum у схемі лишається (expand-only, старі рядки й легасі-кампанії парсяться), валідатор шаблону `grim-d100` їх відхиляє; 2 юніти `little` у `units.json` → `small`, `maxHp` усіх 6 small/little перерахувати за 2×TB; `scripts/templates/systems/wfrp/units.ts` (`tiny`/`little`-гілка формули) — лише легасі.

**Рішення «профіль уже містить розмір»:** книга каже, що її NPC-профілі вже мають бонус, але юніти Grim мають власні числа рівневих смуг (`UNIT_LEVEL_BANDS`, атака = рейтинг зброї без SB/розміру). Тому рушій додає +SB/+2×SB сам; у звіті P1 — перевірка, що жоден `wfrpAttack.damage` у `units.json` не має запеченого розміру (якщо є — зменшити дані, а не рушій).

**Файли:** `traits/size.ts` (переписати під канон, легасі-функції лишити), `traits/constants.ts`, `traits/read.ts` (`canonSizeOf`), `combat/engagement.ts` (ваги), `combat/mitigate.ts` (крок `size`), `combat/defence.ts` (−2 SL parry), `combat/hit-model.ts` (баланс: та сама формула, легасі незмінне), `turn/move-end.ts` (Disengage ігнорує менших), `units.json`, `scripts/templates/systems/wfrp/{units,validate}.ts`.

**Сигнатури:**
```ts
// traits/size.ts
export const canonSizeOf: (s: TraitSize | undefined) => CanonSize; // tiny/little -> small
export function sizeMeleeDamage(attacker, attack, sb: number): number; // 0 | sb | 2*sb; 0 for ranged, free/extra (momentumAttack, trait attack `free`)
export function sizeRangedSl(attacker, target): number;               // +1 | +2 | -1 | 0
export function parryVsBiggerSl(defender, attacker): number;          // -2 | 0
export const outnumberWeight: (p) => 1 | 2 | 3 | 4;
export function sizeOpposedStrength(a, b): 'auto' | 'critOnly' | 'normal'; // для Grapple (P4)
// engagement.ts: attackers = Σ min(weight(a), weight(target)) по engagedFoes(target); defenders = Σ weight(d) по engagedFoes(attacker); outnumber ⇔ attackers ≥ 2·defenders
```

**Заготовки для інших пакетів (без логіки):**
- `combat/attack-mods/index.ts`: `interface AttackModCtx { ctx: ResolveAttackCtx; edition; kind: 'melee'|'ranged'; input?: WfrpAttackMods; distanceYd?: number }`, `interface AttackMod { key: string; sl: number; advantage?: number; disadvantage?: number }`, `collectAttackMods(c) → { sl, advantage, disadvantage, mods: AttackMod[] }`; джерела-файли `size.ts` (заповнює P1: size ranged, outnumbered/surrounded як SL), `ranged.ts`, `melee.ts`, `helpless.ts` (P2), `traits.ts` (P5), `talents.ts` (P4) — порожні `() => []`. `resolve-attack.ts` викликає `collectAttackMods` в обох гілках замість `sizeHitMod` і `OUTNUMBERING_BONUS` (під `combatModsModel: 'canon'`; легасі — старі +10). `PercentileAttackDetails.mods?: {key, sl}[]` для логу/розбивки.
- `slots.ts` `WfrpParticipantState`: `aim?: { targetId: string }`, `actLastRound?: number`, `defensive?: { skill: string }`, `engagedWith?: Record<string, number>`, `grapple?: { with: string; holder: boolean }`, `fireWounds?: number`, `weaponWear?: Record<string, number>`, `mounted?: { mountId: string }` + парсер; `moveMode` += `'flee'`.
- `server/attack-input.ts`: `mods?: { calledShot?: HitSpot; cover?: boolean; highGround?: 'attacker'|'defender'; enclosed?: boolean; helplessRoll?: number; grapple?: boolean }`, `overcast?: Partial<Record<'damage'|'targets'|'range'|'aoe'|'duration', number>>` → `FORTUNE_INPUT`.
- `ability-effects.ts` + `trait-kinds.ts`: kind `wfrpTalent { talent: 'ambidextrous'|'dualWielder' }`, `wfrpCreature { trait: 'swarm'|'fly'|'painless'|'undead'; rating?: number }`, `wfrpRegenerate {}`, `wfrpAttack.breath?: 'acid'|'cold'|'electricity'|'fire'|'poison'|'smoke'`, `wfrpAttack.free?: true` (схема + `WFRP_EFFECT_KINDS`; рецепти й логіка — P4/P5).
- `turn/index.ts`: порожні `wfrpRoundOrder`, `wfrpSwarmRoundEnd`, `wfrpRegenerate`, `wfrpEngagementExpiry` у відповідних списках хуків.

**Тест-кейси (`canon/size.test.ts`, `canon/outnumbering.test.ts`):**
- [p360] Large SB 5, зброя +4, netSl 2, ціль TB 3 AP 1 → 4+5+2+5−3−1 = 12; Monstrous SB 8 → +16 до кроку `size`; Average → крок відсутній.
- Друга атака (`momentumAttack`), дальня, trait `free` → без бонусу розміру.
- [p166] стрілець Average → ціль Large +1 SL, Monstrous +2, Small −1, Average 0; ближня атака — 0.
- [p360] Average парирує Large: parry −2 SL, dodge 0; Large парирує Average: 0.
- [p360] 2 Large проти Average → outnumbering; 3 Average проти Large → ні; 4 Average проти Large → так; 4 Large проти Monstrous → так.
- [p166] Surrounded (≥3 суміжних ворогів) → +2 SL, не +3; лише атакуючий тест (SL захисника не змінюється).
- Large виходить з контакту з Average без Disengage; Average з Large — ні.
- `little`/`tiny` під canon = `small`; Small TB 3 → Wounds 6.
- Легасі: `sizeHitMod` +10/крок і множник шкоди — без змін.

**Ризики:** `hit-model.ts`/`win-chance` міняють баланс (`computeFairScaling`) — лише під canon; перевірити `systems/wfrp/__tests__/rules/combat/*` на легасі-снапшоти. `rules-data.test.ts` вимагає round-trip `rules.json` ↔ `WFRP_RULES` — нові поля профілю не в `rules.json` (профіль виводиться з `edition.preset`).

---

## P2 — Модифікатори бою M13 (L; після P1)

**Канон (p165–167, p302):** смуги дальності від Range (Medium, ярди): Point Blank ≤ 4 yd +2 SL; Short ≤ R/2 +1; Medium ≤ R 0; Long ≤ 2R −1; Extreme ≤ 3R −2; далі — не можна. Ціль у укритті або Prone −1 SL (дальні); ціль Surprised +1 SL (дальні; ближні лишаються +2 за p187); Aim (Action на ціль, зброя в руці) +1 SL на наступний постріл по ній, втрачається будь-якою іншою дією, рухом чи захистом; стрілець рухався цього ходу −1 SL; стрільба в ціль, що Engaged з іншими, — Disadvantage; на Point Blank ціль може протиставити Dodge; ціль, з якою стрілець Engaged (Pistol), протиставляє Melee. Ближні: high ground ±1; атакуючий у багні/воді/важкому рельєфі −1; атакуючий Prone −1; ціль Entangled +1; тісний простір з Average −1 / довшою −2. Called shot −2 SL, при успіху — обрана локація. Helpless (сон, непритомність): ближня атака або дальня на Point Blank — автовлучання, атакуючий обирає результат кидка; при криті обирає локацію; опція «смертельної гри» — вбиває.

**Рішення:** укриття — автоматично `lineOfFire(map, …).blocked` + ручний `mods.cover` (ДМ); high ground і тісний простір — ручні прапорці (у мапах немає висоти); важкий рельєф — `difficultSet(map)` під клітинкою атакуючого; Helpless = статус UNCONSCIOUS або стан Unconscious; `helplessRoll` за замовчуванням 01 (макс. SL, без криту), будь-який інший — вибір гравця; правило `combat.helplessKills` (секція правил wfrp, дефолт false). Дальність кидкової зброї `SB × N` (Rock SB×3) — поле профілю `rangeSb?: number`, рахується при побудові учасника. `extract-attacks.ts` під canon пише `range: "<R>/<3R> ft"`, щоб core reach-check пускав до Extreme. Шум «Shooting into Melee» з перенаправленням на випадкового учасника — **лише лог** (див. відкриті питання). Погода (туман/дощ) — поза обсягом.

**Файли:** `combat/attack-mods/{ranged,melee,helpless}.ts`, `combat/range-band.ts` (новий), `resolve-attack.ts` (ранжова гілка стає протиборчою при `rangedOpposition`, called shot → локація, Helpless-шлях), `combat/opposed.ts` (за потреби), `extract-attacks.ts`, `equipment/weapon-profile.ts` (`rangeSb`), `server/battle/aim-mutation.ts` + реєстрація операції, `turn/move-end.ts` (рух скидає `aim`), `conditions/test-mod.ts` (Surprised/Prone для дальніх — перевірити, щоб не дублювати з `selfSlMod`), UI: перемикачі в діалозі атаки wfrp (called shot = наявний пікер локації, cover, high ground, enclosed, helpless roll), кнопка Aim; i18n.

**Сигнатури:**
```ts
export type RangeBand = 'pointBlank' | 'short' | 'medium' | 'long' | 'extreme';
export function rangeBandOf(distanceYd: number, rangeYd: number): RangeBand | null; // null = поза Extreme
export const RANGE_BAND_SL: Record<RangeBand, number>; // +2 +1 0 -1 -2
export function rangedOpposition(ctx): { kind: 'dodge' | 'parry'; target: number }[]; // [] = неопонований
export const isHelpless: (p) => boolean;
```

**Тест-кейси (`canon/attack-modifiers.test.ts`, `canon/helpless.test.ts`):**
- Лук R 50: 4 yd → +2; 20 → +1; 50 → 0; 100 → −1; 150 → −2; 152 → атака відхилена. Пістоль R 20: 10 → +1. Rock при SB 4 → R 12.
- Aim по A, постріл по A → +1 SL і `aim` знято; Aim → рух → 0; Aim по A, постріл по B → 0.
- `movementUsed > 0` → −1 SL. `lineOfFire.blocked` → −1; ціль Prone → −1 дальня; Surprised → +1 дальня, +2 ближня.
- Ціль Engaged з іншим → Disadvantage; на 4 yd ціль кидає Dodge (протиборчий, вищий SL).
- Called shot `leftLeg`: −2 SL; влучання → `location: 'leftLeg'`.
- High ground атакуючого +1 / захисника −1; атакуючий у `difficult` клітинці −1; ціль Entangled +1; Outnumbered + high ground = +2 (сума).
- Helpless ближня: `helplessRoll` 01, ціль 45 → влучання, SL 4; 33 при цілі 45 → крит, локація з входу; `helplessKills` → `kill`. Дальня Helpless на 20 yd → звичайний тест.
- Легасі: жоден з модифікаторів не діє.

**Ризики:** core `rangeDisadvantageReasons` для другого числа range може показувати d20-підказку «далеко» в UI — перевірити `map-scene`/hint і за потреби вимкнути для систем без `roll` (чи пускати через `reach` хук). Ранжова гілка з протиборством змінює `applyFortune`-повтор (передати `defenderRaw` як у ближній).

---

## P3 — Шкода заклять C/M-07 (L; смуга магії, після P1)

**Канон (p235):** magic missile: шкода = заявлена Damage закляття + WPB кастера, мінус TB і AP цілі в локації; локація — розвернутий кидок касту (p164). Інші пошкоджувальні закляття — та сама формула, локація Body. Мінімум 1 Wound (p164). Critical Damage (крит-каст) — Critical Wound у вражену локацію (або Body). Overcast додає шкоду (вже є `overcastDamage`).

**Рішення native vs manual (рекомендація):** native — закляття, ефект яких рушій виражає повністю: шкода (missile/AoE), лікування, один стан/атрибут; усе інше (тривалі бафи, утиліти, телепорти, закляття з таблицями) — `executionMode: 'manual'`. Обґрунтування: під canon шкода має йти формулою p235, ручний режим її обходить; наративні закляття без формули рушій не змоделює коректно. Валідатор: кожне закляття з книжковою Damage — native з `damage`; native без `dealDamage`/heal/attribute — помилка.

**Ядро (нові необов'язкові хуки, `lib/utils/rules/systems/types-magic.ts`):**
```ts
interface RuleSystemMagic {
  /** Flat power of a damaging/healing spell, replacing dice; undefined = dice model */
  spellPower?(c: { caster; spell: CastableSpell; overcastDamage: number; rules }): SpellPower | undefined;
  /** Per-target soak of spell damage; location from the cast roll for missiles */
  soakSpellDamage?(c: { caster; target; amount: number; spell: CastableSpell; castRoll?: number; critBonus?: string; rules; rng }): { amount: number; rows: DamageRow[]; afterHit?: (p, round) => {...} };
}
```
Виклики: `computeSpellPower` (`lib/utils/battle/spell/power.ts`) — на початку, якщо хук повертає значення; `applyTo`/`dealDamage` у `spell/cast/effects.ts` — перед застосуванням шкоди цілі. d20/d6pool не задають хуків → без змін.

**wfrp:** `magic/spell-damage.ts` (`wfrpSpellPower`, `wfrpSoakSpellDamage`; переиспользувати `computeWfrpDamage` з `combat/damage.ts`, `apAt`, `hitLocation(reverse(roll))`, `rollCrit` для Critical Damage). Схема: `SpellMagic.missile?: boolean`; шкода — `spell.definition.damageBonus` (уже є) при `dice: 0`. Дані: 28 пошкоджувальних заклять `spells.json` → `dice: 0`, `damageBonus` = книжкове Damage відповідника (зіставлення — за джерелом інжесту C4, `scripts/templates/systems/wfrp/spells.ts`), `missile` де книга так позначає; ручні закляття з книжковою Damage → native. `validate.ts` — правила вище. i18n рядки розбивки (`wpb`, `spellSoak`).

**Тест-кейси (`canon/spell-damage.test.ts`):**
- [p235] Damage +4, WPB 4, кидок касту 34 → локація 43 (Body), TB 3, AP Body 2 → 4+4−3−2 = 3; overcast +2 → 5.
- AoE не-missile → локація Body для всіх цілей; кожна ціль зі своїм TB/AP.
- TB 6 AP 5 проти шкоди 5 → 1 (мінімум).
- `critBonus: 'criticalDamage'` → крит-кидок у вражену локацію.
- Лікування native: плоске значення без кубиків.
- Легасі (`magicModel: 'legacy'`) → кубики `spellRoll`, як раніше.
- Валідатор: native без формули → помилка; книжкова Damage у manual → помилка.

**Ризики:** зіставлення 252 заклять із книгою — найбільша ручна частина; зміна `executionMode` для частини manual-заклять змінює їхню поведінку в бою (оглянути список у звіті). `effects.ts` використовують усі системи — хук лише опційний.

---

## P4 — Залишок M12 (M–L; після P2)

**Канон:** On the Defensive (p162) — Action: обрана навичка +2 SL на захисні тести до початку свого наступного ходу (Parry/Dodge/Language (Magick) для Dispel). Flee (p163) — як Move, навіть Surrounded; кожен Engaged-ворог отримує Momentum (може витратити на одну вільну ближню атаку); втікач +1 Broken за кожного Engaged-ворога. Engaged (p163) — виникає від ближньої атаки (обидва), зникає, якщо цілий раунд ніхто з пари не атакував іншого. Grapple (p167) — оголошується до кидка Melee (Brawling); перемога → обидва в Grapple, ціль +1 Entangled; на початку ходу в Grapple дія = Opposed Strength (розмір: P1 `sizeOpposedStrength`) з вибором: шкода SB+SL без AP (локація з кидка), +Entangled (1 + SL після першого), зняти свої Entangled. Ambidextrous (p114) — без −2 SL лівої руки (атака й захист). Dual Wielder (p119) — друга атака без витрати Momentum; Dagger/Knife отримують Parry при двох зброях. Reach (p166, p300) — W8 закрив довжину й +1 SL; лишився тісний простір (`mods.enclosed` з P2). Mounted (p168) — див. рішення.

**Рішення:** Engaged під `actionsModel: 'canon'` = ворожий ∧ активний ∧ суміжний ∧ є запис `engagedWith[id]` з раунду ≥ поточний−1 (оновлюють ближні атаки через `attackerUpdate`/`targetUpdate`; `wfrpEngagementExpiry` на старті раунду чистить старі); легасі — суміжність. Flee: операція ставить `moveMode: 'flee'`, `onMoveEnd` пропускає перевірку Disengage; вільні атаки — через ядровий off-turn strike, якщо він доступний системі (`ResolveAttackCtx.offTurn`), інакше ворогам лишається Momentum + рядок логу. Таланти — kind `wfrpTalent` на рядках `both-handed`, `twin-blades` у `feats.json`, читання як у трейтів (`traitEntries`). Mounted — **мінімальний ДМ-перемикач** `mounted: { mountId }` (Advantage Cavalry проти менших за коня, Disadvantage атакуючим вершника меншим за коня без Long+, Dodge з Disadvantage без Trick Rider, SB коня при Charge) без синхронізації руху токенів; або відкласти (питання власнику).

**Файли:** `server/battle/{defensive,flee,grapple}-mutation.ts` + реєстрація, `combat/defence.ts` (Defensive, Ambidextrous, Dual Wielder Parry), `combat/engagement.ts`, `turn/move-end.ts`, `turn/index.ts` (expiry), `combat/attack-mods/talents.ts`, `combat/second-attack` логіка (де `secondAttackBlocker`/`grantSecondAttack`), `magic/dispel.ts` (+2 SL Defensive на Language (Magick)), `feats.json`, UI-панелі дій (як `MomentumPanel`), i18n.

**Тест-кейси (`canon/defensive-flee.test.ts`, `canon/engaged.test.ts`, `canon/grapple.test.ts`, `canon/two-weapon-talents.test.ts`):**
- Defensive(dodge): +2 SL на Dodge до початку свого ходу, Parry — 0; знято в `wfrpResetState`.
- Flee з 3 Engaged-ворогами (Surrounded) → дозволено, +3 Broken, у ворогів Momentum.
- Двоє суміжних без атак → не Engaged; після атаки → Engaged обидва; раунд без атак між ними → ні. Disengage/Outnumbered/Surrounded рахують лише Engaged.
- Grapple: перемога → Entangled 1; наступний хід Opposed S, SL 2 → шкода SB+2 без AP; ціль на 2 ступені більша → автоперемога цілі.
- Ambidextrous: off-hand атака без −2 SL, парирування лівою без −2. Dual Wielder: друга атака без витрати Momentum; кинджал отримує Parry лише при двох зброях.

**Ризики:** перехід Engaged з суміжності на журнал змінює Disengage-примус і `useMomentumPanel`; одночасно оновити UI-хук. Вільні атаки Flee можуть потребувати шва ядра — якщо так, зупинитись і описати в звіті (не робити самостійно).

---

## P5 — Трейти істот C/B-04, C/B-03 (L; після P4)

**Канон (p356–363):** Swarm — ігнорує психологію й Engaged при русі, Engaged-вороги втрачають 1 Wound наприкінці кожного раунду, по ньому дальні +4 SL, ігнорує правила Size, Wounds ×5, WS +10 (дані вже). Fly (Rating) — рух на Rating ярдів, ігнорує рельєф/перешкоди/істот; по летючій цілі смуга дальності +1 крок (з Extreme — не можна стріляти); летючий стрілець −2 SL. Painless — ігнорує не-ампутаційні штрафи Critical Wound, стани діють. Undead — тег для заклять/чудес «лише проти нежиті». Regeneration — на початку раунду: >0 Wounds → +1d10; 0 Wounds → +1 при 8+ на d10; 10 → повністю знімає одну Critical Wound; рани від вогню не регенеруються. Breath — дальня Free Attack: 1 ціль у 20+TB ярдів і всі в SB ярдах від неї, один кидок BS проти Dodge кожної цілі (без BS — 30), Magical, імунітет до свого; типи: Acid TB+4 і 1 пошкодження зброї/броні, Cold SB+2 + Fatigued, Electricity SB+2 ігнорує металеву броню + Stunned, Fire SB+3 + Ablaze, Poison TB+2 + Poisoned, Smoke — затулення лінії зору на TB раундів.

**Рішення:** `note('swarm'|'flier'|'undead')` → механічні рецепти `wfrpCreature` (рецепти `traits/recipes.ts`, читання `traits/read.ts`); легасі-нотатки лишаються читабельними. Fly — використати ядровий `battleData.airborne`, якщо шлях руху його враховує; якщо ні — політ = рух без перевірки рельєфу через `onMoveEnd`-дозвіл, решта (ціль/стрілець) — у `attack-mods/traits.ts`. Regeneration — новий рецепт `wfrpRegenerate` під `traitModel: 'canon'` (легасі `turnStart heal 1d10` без змін); `fireWounds` росте від Ablaze-тіку, Breath Fire і заклять з `damageType` вогню; регенерація не піднімає HP вище `maxHp − fireWounds`; «10» знімає `critWounds − 1` і маркери останнього криту. Swarm-шкода наприкінці раунду — хук `wfrpSwarmRoundEnd`; якщо `onRoundStart` не має `applyDamage` — додати його в `TurnHookCtx` ядра як необов'язкове поле (мінімальний шов, d20 не змінюється). Метал у броні — прапорець `metal` у stats броні (mail/plate), дані `artifacts.json`.

**Файли:** `traits/{recipes,read,size}.ts` (Swarm ігнорує Size), `combat/attack-mods/traits.ts`, `combat/crit-effect.ts` (Painless), `combat/mitigate.ts` (Electricity без металу), `turn/*` (regen, swarm), `conditions/tick.ts` (`fireWounds`), `traits/psychology.ts`/`passions.ts` (`isPsychImmune` для Swarm), breath у `extract-attacks.ts`/`unit-build.ts` (дальність 20+TB, площа SB), `units.json` (типи дихання, Swarm/Fly/Undead на відповідних юнітах), спільний ядровий фільтр цілей заклять для Undead — лише якщо вже є тег-фільтр (`lib/utils/battle/spell/target-filter.ts`), інакше відкладено.

**Тест-кейси (`canon/creature-traits.test.ts`, `canon/regeneration.test.ts`, `canon/breath.test.ts`):**
- Swarm: 2 Engaged-ворогів −1 Wound кожен в кінці раунду; дальня атака по ньому +4 SL; Fear не діє; Size(Large) у Swarm не дає бонусів.
- Fly: лук R 50, ціль летить на 100 yd → Extreme (−2); на 150 → постріл відхилено; летючий стрілець −2 SL.
- Painless: рядок криту з маркером `crippled` → маркер не діє, Bleeding діє.
- Regeneration: 5 Wounds, d10=6 → +6 (до max); 0 Wounds: 8 → +1, 7 → 0; 10 → `critWounds` −1; `fireWounds` 4 при max 20 → стеля 16.
- Breath Fire, SB 5 → шкода 8 − TB − AP, Ablaze; Cold → Fatigued; Electricity з mail AP 2 → AP 0; Poison TB 4 → 6 + Poisoned; без BS → ціль 30; дальність TB 4 → 24 yd.

**Ризики:** один кидок атакуючого на всі цілі Breath — ядро розв'язує AoE-атаку по цілях окремо; зафіксувати кидок атакуючого через `presetRolls.attacker` першої цілі (перевірити в `run-attack-phase`). Fly без підтримки шляху в ядрі — частковий (лише атакові модифікатори) — записати як хвіст.

---

## P6 — Overcast за напрямами M19 (M–L; після P3)

**Канон (p236):** надлишок SL понад CN витрачається до IB+WPB; кожен напрям — окрема колонка таблиці, ціна — SL, вкладені в цей напрям: Damage 1→+1, 2→+2, 3→+3, 5→+4, 8→+5, 13→+6, 18→+7 (лише missile); Targets 2→+1, 8→+2, 18→+3; Range 2→×2, 8→×3, 18→×4; AoE 5→×2, 18→×3 (рядок 8 у OCR неоднозначний — звірити з PDF); Duration 3→×2, 13→×3. Petty — ні; Range «You»/«Touch», Duration «Instant»/«Special» — не розширюються; без AoE — площа не росте.

**Рішення:** `OVERCAST_TABLE` переписати в колонкову форму (`OVERCAST_COLUMNS: Record<Dim, {sl, value}[]>`), `overcastValue(dim, spent)`. Розподіл оголошується в запиті касту (`mods.overcast` з P1); сервер валідує цілі/дальність/площу за **оголошеними** множниками; після кидку, якщо доступних SL (кап IB+WPB, Total Power додає десятки) менше оголошених — розподіл урізається в порядку damage → duration → aoe → range → targets, а цілі поза фактичною дальністю/кількістю відкидаються з рядком логу. Без оголошення — як зараз (усе в шкоду для missile). Duration множить тривалість ефектів native-заклять; manual — лише лог.

**Ядро:** `CastTestResult.extension?: { rangeMul?: number; extraTargets?: number; areaMul?: number; durationMul?: number }`; `RuleSystemMagic.tested.declaredExtension?(castInput) → той самий тип` — для попередньої валідації цілей. Застосування в `spell/cast/index.ts` (валидація цілей/шаблону) і в тривалостях ефектів. d20 не задає → без змін.

**Файли:** `magic/constants.ts`, `magic/cast-test.ts`, `magic/overcast.ts` (новий), `lib/utils/rules/systems/types-magic.ts`, `lib/utils/battle/spell/cast/{index,effects}.ts`, UI діалогу касту (розподіл SL із підказкою капу), i18n.

**Тест-кейси (`canon/overcast-directions.test.ts`):**
- SL 3 понад CN, IB+WPB 6: `{damage:1, targets:2}` → +1 шкоди, +1 ціль.
- `{range:2}` → дальність ×2; `{duration:3}` → ×2; `{aoe:5}` → ×2; `{damage:4}` → +3 (поріг 3), не +4.
- Оголошено 5 SL, вийшло 2 → урізано за порядком; зайва ціль відкинута з логом.
- IB+WPB 3, SL 8 → лише 3 SL доступно; Total Power додає десятки кидка.
- Petty → без overcast; Touch → range не росте; Instant → duration не росте.

**Ризики:** відкидання цілей після кидка змінює поведінку вікна Dispel (`lastCast.targets`) — брати фактичні цілі. Оголошення до кидка — відступ від буквального порядку книги (питання власнику).

---

## P7 — Хвости W8 (M; після P5)

**Канон (p298–306):** Practical — проваленому тесту з предметом +1 SL; штрафи броні на рівень менші. Repeater (Rating) — Rating пострілів без перезарядки, потім звичайна; з непострілянимі зарядами Reload на 1 менше. Trap Blade — Critical при захисті від клинкової зброї: замість криту зловити клинок (той самий розмір або більший); суперник випускає зброю; можна Very Hard (−3 SL) Strength + SL Melee-тесту → зламати, якщо не Unbreakable. Unbreakable — не ламається (Trap Blade, знос зброї з Oops). Distract і Spread — у каноні 5e відсутні.

**Рішення:** Distract/Spread — `canon: false` у `QUALITY_REGISTRY` (редактор canon їх не показує, рушій ігнорує; легасі без змін); прибрати з рядків `grim-d100`, якщо є. Trap Blade: вибір через ядровий crit-пікер (`ctx.crit`), без пікера — звичайний контр-крит. Клинковість — прапорець `bladed` у stats зброї (дані для груп basic/fencing/two-handed клинків). Штраф броні: поле `penalty?: { skill: string; sl: number }[]` у stats броні (потрібне й для quick armour у P11). `useEquippedAp` → `equippedApOf(artifacts, rules)` через `armourAp(equipped, rules)` (один найкращий щит; штраф касту — максимум по всіх локаціях під canon). Навантаження посеред бою — знайти шлях синхронізації інвентарю в учасника (`participant-patch`/оновлення снапшота); перерахувати `burden`/Move/Ag при зміні; якщо такого шляху немає — зупинитись і описати. Hack у `hit-model.ts` — очікуваний знос як −0.5 AP ефективно (лише баланс).

**Файли:** `equipment/{qualities,quality-effects,stats,armour,encumbrance}.ts`, `combat/{defence,resolve-attack}.ts` (trap), `combat/hit-model.ts`, `hooks/useEquippedAp.ts`, `ui/equipment/*`, `server` операція `reload` (часткова), `artifacts.json` (`bladed`, `metal` якщо P5 не додав, penalty), i18n.

**Тест-кейси (`canon/w8-final-tails.test.ts`):** Practical: провалений тест атаки −1 SL → 0 SL (сприйнятливість через `slModel: 'final'`); броня з penalty −2 SL Stealth + Practical → −1. Repeater 3: три постріли без reload, четвертий вимагає reload; reload з 1 зарядом — Reload−1. Trap Blade: парирування дублем проти меча → суперник без зброї; Strength −3 SL + SL парирування > 0 → зброя зламана, Unbreakable → ні. Distract/Spread під canon — 0 ефекту. `equippedApOf` canon: два щити → AP найкращого; штраф касту з AP ніг. Скидання важкої речі в бою → `burden` 0, Move відновлено.

**Ризики:** часткова перезарядка залежить від ядрової моделі `ammo` — лише якщо ядро дозволяє дію reload при неповному магазині.

---

## P8 — Створення й просування B/N-02, B/N-06 (S; смуга даних, після P1)

**Канон:** p36 — перший кидок кар'єри; відмова → ще два кидки, вибір з трьох. p44, p197, p199 — поза кар'єрою за 2× лише характеристики й basic-навички; advanced-навички й таланти поза кар'єрою — лише через Training/Unusual Learning (простій).

**Рішення:** `creation/roll.ts` режим choice — 3 кидки (Fate +1 лише за прийнятий перший, як зараз); UI кроку кар'єри — три картки. `planPurchase` під `xpTables: 'canon5e'`: не-кар'єрні advanced-навички й таланти → помилка `ADVANCE_OUT_OF_CAREER` (новий ключ `api-errors` + i18n); ДМ-оверрайд — наявний прапорець примусу, якщо він є в операції (інакше не додавати); характеристики й basic — ×2 як зараз. Training-ендевори — поза обсягом.

**Файли:** `creation/roll.ts`, `creation/canon.ts` (якщо перевіряє кількість), UI кроку кар'єри (`systems/wfrp/ui/…`), `advancement/{plan,career}.ts`, `lib/constants/api-errors.ts`, `messages/*`.

**Тест-кейси (`canon/creation-careers.test.ts`):** choice → 3 різні кар'єри з таблиці виду; rolled → 1. Advanced-навичка поза кар'єрою → відхилено; та сама в кар'єрі → ціна 1×; basic поза кар'єрою → 2×; талант поза кар'єрою → відхилено. Легасі: 2 кидки, ×2 для всього.

---

## P9 — Дані таблиць і Oops (S–M; після P8)

**Канон:** крит-таблиці p173–176 — по 20 рядків на зону (голова 01–03…00+, рука ≤10…136+, тіло ≤10…116+, нога ≤10…126+), колонка Wounds 0–5 і рядок смерті; тимчасові: Jarred Arm `1d10 − TB` (мін. 1), Wrenched Arm `1d10`, Twisted Knee/Ankle — штраф на `1d10`. Oops p165: 1–2 −1 Wound без TB/AP; 3–4 зброя −1 пошкодження і наступного раунду дієш останнім; 5–6 наступного раунду дія −1 SL (будь-яка дія, не лише атака); 7 втрата Move; 8 втрата Action; 9 нога −1 SL 1d10 раундів (як Critical Wound); 10 влучання по випадковому союзнику (SL = одиниці) або сам собі Stunned. Miscast Minor p238 і Major p239 — по 20 рядків; Wrath p218 — 20 рядків кроком 5, +10 за Sin.

**Рішення:** рядки — власний текст (en/uk), числа/структура/ефекти — канон, у `data/templates/grim-d100/rules.json` (`tables.critHead|Arm|Body|Leg`, `oops`, `misfire`, `miscastMinor`, `miscastMajor`, `wrath`); Injuries (Torn Muscle, Broken Bone, Amputation) — лише текст (нового типу ефекту немає). `actLast`: `actLastRound = round + 1`, хук `wfrpRoundOrder` на старті раунду переносить таких у кінець (`reorderParticipants`); якщо ядро не зберігає порядок, повернутий `onRoundStart`, — мінімальний шов `RuleSystemTurn.roundOrder?` (описати в звіті перед реалізацією). `weaponDamage`: `combat/weapon-wear.ts` (окремий файл, не `participant.ts`), `weaponWear[attackId] += 1`, зменшення шкоди за правилом Damaged Weapons (p164 — звірити), Unbreakable ігнорує; Misfire-вибух лишається від шкоди зброї. `slPenalty` — до всіх тестів наступного раунду (sheet, cast). Oops 10 — лог із випадковим кандидатом (див. відкриті питання). `rules-data.test.ts`: оновити `WFRP_RULES`/`grim-rules-patch.json` разом із `rules.json` (прочитати тест першим).

**Файли:** `rules.json`, `i18n/{en,uk}.json` шаблону, `tables/schema.ts` (якщо треба `roundsFormula` з мінімумом), `combat/fumble.ts`, `combat/weapon-wear.ts`, `turn/index.ts` (тіло `wfrpRoundOrder`), `conditions/test-mod.ts` або `percentile` (−1 SL Oops для всіх тестів), `scripts/templates/systems/wfrp/validate.ts` (20 рядків, суцільні діапазони).

**Тест-кейси (`canon/crit-tables-data.test.ts`, `canon/oops.test.ts`, `canon/miscast-tables.test.ts`):** 20 рядків на зону, діапазони суцільні, death з 100/136/116/126; Jarred Arm: TB 3, d10=2 → 1 раунд (мінімум); Oops 3–4 → наступного раунду учасник останній, `weaponWear` +1, Unbreakable — 0; Oops 5–6 → касту наступного раунду −1 SL; Minor/Major по 20 рядків, Wrath 20 рядків кроком 5, кидок +10 за Sin.

---

## P10 — Прибирання «verify against 5e book» (S; після всіх смуг)

26 коментарів: `magic/constants.ts` 9, `advancement/rules.ts` 3, `constants/mutations.ts` 2, `tables/defaults.ts` 2, по 1 — `combat/constants.ts`, `combat/extract-attacks.ts`, `conditions/catalog.ts`, `corruption/constants.ts`, `downtime/constants.ts`, `equipment/{constants,qualities,quality-effects,weapon-profile}.ts`, `traits/constants.ts`. Для кожної константи: звірити з книгою → коментар `// pNNN` (англ., одним рядком) або виправити число (з канон-тестом), або позначити `// legacy only` якщо використовується лише під `legacy`. Мертві константи (наприклад `OUTNUMBERING_BONUS`, `SIZE_*_PER_STEP` після P1 — лише легасі) — лишити з позначкою. Тест: `grep -ri "verify against 5e book" systems/wfrp` порожній (додати в `canon/w9-cleanup` або наявний тест-ратчет).

---

## P11 — Контентні хвости (M; після P7, P8)

- **Пари вибору талантів видів (p29, p32, p34):** `SpeciesProfile.talentChoices?: string[][]` (кожна група — обрати один), `planCanon` перевіряє вибір у чернетці, UI-пікер на кроці виду, валідатор (кожна опція існує у `feats.json`); дані — дварф, високий і лісовий ельф.
- **Deep Scholar (Lore)** → рядок на кожну Lore-спеціалізацію, що зустрічається в кар'єрах шаблону (`lore:*` з `careers.json`); **Terrain Strider (Terrain)** → 6 рядків: Coastal, Desert, Rocky, Tundra, Wetland, Woodland (власні назви, p124-подібна секція). Кар'єри, що посилаються на узагальнений рядок, — на конкретні або на групу (як у `talent-groups.ts`).
- **Quick armour (p307):** Light 8 GC, Enc 0, AP 1 на всі локації; Medium 44 GC, Enc 4, AP 3, Flexible, −1 SL Stealth; Heavy 88 GC, Enc 10, AP 5, Impenetrable + Weakpoints, −2 SL Perception і Stealth (поле `penalty` з P7; слот «усе тіло» — перевірити `AP_CAP` і схему слотів).
- **Entangling (p303):** група `entangling` у `GRIM_WEAPON_GROUPS` (навичка Ranged (Entangling) уже є); Bolas (Rare, SB×3, +SB, Inflict Entangled, Inflict Prone (ноги), Undamaging), Lasso (2H, SB×2, Inflict Entangled), Net (SB, Inflict Entangled); числа поруч з Entangled (35/45/50) — звірити з PDF і p186 (сила стану?).
- **Unarmed (+SB, Personal, Undamaging, Brawling), Improvised Weapon (+SB+1, Unbalanced, Undamaging), Thrown Rock (SB×3, +SB+1, Undamaging, Throwing)** (p301, p303): рядки в `artifacts.json`; під canon учасник без ближньої зброї отримує неявну атаку Unarmed (`extract-attacks.ts`).
- i18n en/uk для всього; `pnpm template` валідація (`scripts/templates/grim-d100/validate.ts`) — це скрипт-валідатор, не тест; запускати можна.

---

## P12 — Іконні суб'єкти й інвентар (S; після P11)

Оновити `scripts/assets/icon-subjects/grim-{identity,artifacts,spells,units}.json` для нових/перейменованих рядків (спеціалізації Deep Scholar/Terrain Strider, quick armour, entangling, unarmed/improvised/rock, змінені юніти), звірити з `docs/superpowers/plans/wfrp5-icons/subjects-*.json`; прогнати `scripts/assets/grim-icons/inventory.ts` (через `pnpm assets:grim-icons` або `tsx`, без генерації) і записати підсумок «потрібно іконок по kind» у STATUS. Генерацію не запускати.

---

## Верифікація (наприкінці всього, не по пакетах)

1. `pnpm exec tsc --noEmit` (або `pnpm typecheck`), `pnpm cycles`, `pnpm lint:dirs --changed main`.
2. **Один** повний `pnpm test:run` на гілці після P12; червоні — фікс-пакет (Sonnet), повтор лише зачеплених через `pnpm test:related`.
3. `/simplify` (1–2 агенти) по діфу гілки; Opus-рев'ю всієї гілки.
4. За «так» власника: battle-sweep homm/dnd5e на `prodcopy_*`; живий WFRP-бій у браузері на стенді гілки (розмір, дальність, Helpless, закляття-шкода, overcast, Flee/Grapple, дихання). Без стенду — сказати прямо.
5. Документація: `docs/architecture/rule-systems.md` (нові розділи «Wfrp: розмір і модифікатори», «шкода заклять», «трейти істот»), `docs/STATUS.md`; плани епіку — у `docs/archive/superpowers/` при злитті.
6. Прод (перепублікація шаблону `grim-d100`, міграції героїв W6) — окремо, лише за «так».

Орієнтовна вартість: 12 пакетів Sonnet (P2, P3, P5 — великі) + Opus-рев'ю; варто глянути `/usage` перед стартом.

## Відкриті питання власнику

1. **Шкода розміру юнітів:** рушій додає +SB/+2×SB до власних чисел юнітів Grim (рекомендація) чи вважати, що числа вже містять розмір, як у книжкових профілях?
2. **Tiny/Little:** під canon читати як Small і прибрати з шаблону (рекомендація) — ок?
3. **Перенаправлені влучання** (стрільба в ближній бій/групу, Oops 10): лише лог із випадковим кандидатом (рекомендація, S) чи шов ядра `ResolvedAttack.redirect` (M–L)?
4. **Mounted:** мінімальний ДМ-перемикач без синхронізації руху чи відкласти?
5. **Overcast:** оголошення розподілу SL до кидка з урізанням після — прийнятно?
6. **Injuries** з крит-таблиць (Torn Muscle, Broken Bone, Amputation) — лише текст у цьому епіку?
7. **Погодні модифікатори** (туман −1, дощ −2, буря −3 для дальніх) з погоди мапи — додати чи поза обсягом?
8. **Distract/Spread** — прибрати з канонічного шаблону (рекомендація)?
