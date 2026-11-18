# S7 — якість коду core (lib/, app/, types/, components/), main d871500da

## 1. Оцінка
**Якість коду: 7.5 (було 7; ціль 9) → поточно 8.0.** Дві з чотирьох вимірних цілей виконано, дві провалено; типова дисципліна (any/ts-ignore/TODO = 0) відмінна.

| Метрика | Ціль | Факт | Статус |
|---|---|---|---|
| `as unknown as` у `lib` (без тестів) | ≤ 25 | **25** (рівно; +6 в app/components, разом 31 у не-тестах; у тестах ще ~471) | ціль виконана на межі |
| Функцій >150 рядків у `lib/server` | 0 | **0** (AST-скрипт, не-тести) | виконано |
| Файлів >700 рядків (не-тести, не дані) | 0 | **9** (+ `lib/constants/import-aliases.ts` 771 — дані, виключено) | НЕ виконано |
| Zod на читанні JSON snapshot | є | `participantSnapshotSchema` лише `z.custom(isRecord)` — перевірка контейнера, не форми | частково |
| `as any` / `@ts-ignore` / `@ts-expect-error` | — | 0 / 0 / 0 | відмінно |
| явний `any` у не-тестах | — | 2 (`lib/db/layer/shared.ts:Query`, `lib/server/content/define-resource.ts` `AnyContentResource`) | ок |
| `eslint-disable` у не-тестах | — | 10 (усі з причиною або обґрунтовані; 4 `exhaustive-deps`) | ок |
| TODO/FIXME/HACK | — | 0 | відмінно |

## 2. Що змінилося з 17.11 (докази)
- `as unknown as` у lib 123 → 76 → 25: введено `lib/utils/common/json.ts#fromJson`, `common/cast.ts#unsafeCast`, `toInputJson*` (лог L9b/хвиля 2b підтверджено кодом: залишки перелічені нижче).
- 0 функцій >150 у `lib/server` — підтверджено AST-скриптом (`tmp/audit/fnlen.cjs`); 23 функції розбито.
- Файли розбито: `content-layer.ts` → `lib/db/layer/{shared,read,write}.ts`, `compendium-import/plan*.ts`.
- Коментарі: L12-1 прибрав самопосилальні; вибірка JSDoc у lib/server, lib/hooks добра — один рядок, "чому", без переказу коду. Серйозного шуму не знайдено (рядкових `//` у не-тестах лише ~800 на всю кодову базу).
- knip: `knip.json` оновлено 09e81289a (5 мертвих файлів видалено, exports/types як warn, entries розширено).

## 3. Відкриті дефекти
- **I** Файли >700 (не-тести): `lib/server/assistant/actions/world-service.ts` 1255; `lib/server/battles/mutations/spell/spell-mutation.ts` 1008; `lib/server/content/import/import-content.ts` 815; `lib/server/compendium-import/adapters/content.ts` 788; `.../repository.ts` 745; `lib/server/templates/sync/apply.ts` 738; `lib/server/battles/participant/from-character.ts` 722; `lib/server/compendium-import/service.ts` 713; `.../adapters/spell-derive.ts` 712. Ще 8 файлів 600–700 (map-scene.ts 694, run-battle-mutation.ts 693…). Виправлення: розбити на 2–3 модулі за фазами; world-service і spell-mutation — першочергово.
- **I** `participantSnapshotSchema` (`lib/utils/battle/store/snapshot-schema.ts:8`) — `z.custom(isRecord)`; `joinParticipant` (`lib/utils/battle/store/split-participant.ts:143`) усе одно робить `stored.snapshot as {…}` з внутрішньою формою. Це не "Zod на читанні snapshot" у повному сенсі (комент визнає: тільки контейнер). Виправлення: loose-Zod `z.looseObject` для basicInfo/abilities/combatStats/spellcasting/battleData із зберіганням `ext`.
- **M** Функції >150 поза lib/server: `lib/utils/battle/spell/cast/index.ts:60 castSpell` 468 рядків; `lib/utils/characters/choices/selections.ts:137` 354; усього 59 у `lib` без server? (рахунок по lib загалом 59, server 0); `app/campaigns/[id]/dm/world/page-client.tsx:43` 356 (порушує "page тонкий"); `app/campaigns/page.tsx:30` 255; у `components/` 149 функцій >150 (компоненти-форми, FX-анімації `components/fx/animations/*` — анімації прийнятні).
- **M** Залишок кастів: `lib/db.ts` (2), `lib/utils/abilities/schema/effects.ts` (3, Zod-типізація), `app/api/campaigns/[id]/characters/draft/{create-draft,update-draft,draft-class,draft-data}.ts` (4 касти `classes`/`InputJsonValue` — природні кандидати на `toInputJson`/Zod), `components/ai/AssistantIntentCard.tsx` (`change.after as unknown as ScenarioAiOp[]`), `app/campaigns/[id]/dm/print/spells/page.tsx`, `lib/server/battles/pipeline-deps.ts`, `lib/utils/battle/store/participant-patch.ts` (2). Ліміт ≤25 у lib досягнуто без запасу — наступний коміт може його порушити; ratchet-тесту на лічильник у lib не знайдено (не перевіряв глибоко).
- **M** `lib/constants/ai.ts` eslint-disable "remove after … --apply on prod" — відкладена задача (відомо з пам'яті).

## 4. Не перевірено
- `knip` не запускався (важкий), тож реального переліку мертвого коду/невикористаних експортів немає; відомо лише що конфіг оновлено.
- Лічильник функцій >150 — AST-евристика (arrow/function/method, включно з вкладеними closure → дублікати в компонентів, наприклад `slow`/`<anon>`); для lib/server 0 надійно.
- Вибірка коментарів ~15 JSDoc + regex; не повний огляд.
- systems/ не входило у слайс.
