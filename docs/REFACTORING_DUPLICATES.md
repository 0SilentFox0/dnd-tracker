# Аналіз дублікатів та рефакторинг

Документ фіксує знайдені дублікати функціоналу, типів і компонентів та зроблені зміни.

## 1. Тригери (battle-triggers vs skill-triggers)

**Було:** Два модулі з подібною роллю:
- `lib/utils/battle/battle-triggers.ts` — перевірка тригерів **пасивних здібностей** (PassiveAbility)
- `lib/utils/skills/skill-triggers.ts` — перевірка тригерів **скілів** (ActiveSkill.skillTriggers)

Контекст для перевірки умов (participant, target, allParticipants, currentRound) задавався окремо в кожному модулі.

**Зроблено:**
- Додано спільний контекст у `lib/utils/battle/trigger-context.ts`:
  - `TriggerContextBase` — target, allParticipants, currentRound, damage
  - `SkillTriggerContext` — розширює базовий полем `isOwnerAction`
- `battle-triggers` і `skill-triggers` використовують ці типи; логіка розділена: пасивки — у battle-triggers, скіли — у skill-triggers.

**Рекомендація:** Не об’єднувати обидва модулі в один: різні типи тригерів (PassiveAbility.trigger vs SkillTrigger) та різні джерела даних (passiveAbilities vs activeSkills).

---

## 2. Типи даних атаки та заклинань

**Дублювання:**
- `types/battle-ui.ts`: `AttackData`, `SpellCastData` — для UI-колбеків (onAttack, onSpell).
- `types/api.ts`: `AttackData`, `SpellCastData` — для API (attack, castSpell).

Поля майже однакові; у api є додаткові опціональні поля (`attackerType`, `targetType`).

**Рекомендація:** Залишити один визначення в `types/api.ts` і в `types/battle-ui.ts` реекспортувати або розширити їх, щоб уникнути розбіжностей у майбутньому.

---

## 3. Учасники бою (Participant-типи)

**Було:**
- На сторінці редагування бою (`dm/battles/[battleId]/page.tsx`) — локальний інтерфейс `Participant` з полями `id`, `type`, `side: "ally" | "enemy"`, `quantity?`.
- У типах — `BattlePreparationParticipant` (types/battle.ts) з тим самим змістом, але `side: ParticipantSide`.

**Зроблено:** Локальний `Participant` прибрано; форма та мутація використовують `BattlePreparationParticipant[]` і `ParticipantSide` з `lib/constants/battle.ts`.

---

## 4. Константи замість рядкових літералів

**Було:** У коді використовувалися рядки `"ally"`, `"enemy"`, `"active"`, `"unconscious"`, `"dead"`, `"human"`, `"necromancer"`.

**Зроблено:**
- У `lib/constants/battle.ts` додано:
  - `CombatStatus` (ACTIVE, UNCONSCIOUS, DEAD) — для combatStats.status
  - `BATTLE_RACE` (HUMAN, NECROMANCER) — для логіки моралі/перевірок
- У відповідних місцях (PlayerTurnView, InitiativeTimeline, battle-attack-process тощо) використовуються ці константи замість рядків.
- `ParticipantSide` (ALLY, ENEMY) вже існував; використання на сторінці редагування бою приведено до нього.

---

## 5. Компоненти бою

**Зроблено:**
- З `PlayerTurnView` винесено екран початку ходу в окремий компонент `TurnStartScreen` (`components/battle/views/TurnStartScreen.tsx`), щоб зменшити розмір основного компонента та виділити окремий екран "Приготуватись / Почати бій".

**Рекомендація:** При подальшому зростанні логіки ходу гравця варто винести стан і обробники атаки/заклинань у хук `usePlayerTurnState`, який повертає стан діалогів, обрану атаку/ціль та обробники.

---

## 6. Типізація (any, non-null assertions)

**Зроблено:**
- `lib/hooks/useSkillForm.ts`: замість `return data as any` — приведення до нормалізованого типу (NormalizedSkillData).
- `lib/hooks/battle/useBattleSceneLogic.ts`: замість `(skill: any)` та `(e: any)` — явний тип об’єкта з полями `name`, `effects`.
- `app/campaigns/[id]/dm/battles/[battleId]/page.tsx`: прибрано `participants as any`; використовується `BattlePreparationParticipant[]`.
- `scripts/import-units.ts`: замість `as any` для JSON-полів — `as Prisma.InputJsonValue`.

---

## 7. Тести

**Зроблено:**
- Додано unit-тести для `lib/utils/skills/skill-triggers.ts` у файлі `lib/utils/skills/__tests__/skill-triggers.test.ts`:
  - перевірка простих тригерів (startRound, bonusAction, afterOwnerAttack);
  - перевірка `getSkillsByTrigger` (фільтрація скілів за типом тригера).

Існуючі тести в `lib/utils/battle/__tests__/` (trigger-evaluator, formula-evaluator, attack-targets) залишено без змін.

---

## Підсумок

| Область              | Стан | Дія |
|----------------------|------|-----|
| Тригери              | ✅   | Спільний контекст у trigger-context.ts |
| AttackData/SpellCastData | ⚠️ | Рекомендовано: один визначник у api, реекспорт у battle-ui |
| Participant-типи    | ✅   | Єдиний BattlePreparationParticipant + ParticipantSide |
| Константи статусу/раси | ✅ | CombatStatus, BATTLE_RACE, ParticipantSide |
| Компоненти бою      | ✅   | TurnStartScreen винесено з PlayerTurnView |
| Типізація any        | ✅   | Усі зазначені місця виправлено |
| Тести скілів/бою     | ✅   | Додано skill-triggers.test.ts |
