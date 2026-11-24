# Ч5. Лист персонажа: план виконання

Спека: [2026-11-24-game-ui-ch5-character-sheet-design.md](../specs/2026-11-24-game-ui-ch5-character-sheet-design.md). Гілка `feat/game-ui-ch5` від main 725f3c450. Виконавці Sonnet, агенти тести не запускають (один повний `pnpm test:run` наприкінці). Коміти в гілку дозволені; push/merge лише за «так».

## Т0. База (контролер)
- `pnpm test:related` по `components/character-profile`, `components/layout`, `systems/d20/ui`, `app/campaigns/[id]/character`: зафіксувати давні падіння.
- Перевірити: право гравця-власника на `useEditResources`/`/resources`; де натхнення потрапляє в лист; є чи кутовий примітив у `components/hud`.

## Т1. Оболонка (1 виконавець)
- `game-shell-route.ts`: `/campaigns/:id/character` (не `new|edit|draft`) і `/campaigns/:id/dm/characters/:characterId`; тест `components/layout/__tests__`.
- `campaign-game-shell.tsx`: `Section = 'world'|'journal'|'character'`, `fit` лише для `world`.
- Обидві сторінки листа обгорнути в `CampaignGameShell` (`active='character'`); `ProfileShell` без `max-w`/`min-h-dvh`, фон від оболонки.
- Ключ `gameNavigation.character` перевірити в `messages/*/common.json`.

## Т2. Чиста логіка й дані (1 виконавець)
- `lib/utils/characters/hp.ts`: `applyHpChange({hp,max,temp}, {kind:'damage'|'heal'|'temp', amount}) → {hp,tempHp}` (шкода спершу тимчасові; лікування ≤ max; не нижче 0). Тести в `__tests__`.
- `lib/utils/characters/xp.ts`: `xpProgress(experience, level) → {current,next|null,ratio}` на `lib/constants/experience`. Тести.
- (скасовано) `identity.xp` дублював `sheet.rest.xp`; T2 виконано: `hp.ts`, `xp.ts` + тести.

## Т3. Ліва колонка (1 виконавець)
- `components/character-profile/sheet/SheetIdentityPanel.tsx` (+ рамка з кутовими дужками на `HeroPortrait`); XP з `sheet.rest.xp`, натхнення з `sheet.rest.inspiration` (слота не додаємо); sticky на lg; на phone стає компактною шапкою (`CompactHero` розширюється).
- Переносить `ProfileHero` (ідентичність, бейджі, дії ДМ, `RestBadges`, `HitDicePanel`, `ArcaneRecoveryPanel`); `ProfileHero` видалити, тест `profile-hero.en.test` перенести.

## Т4. Блок HP і плитки (1 виконавець)
- `sheet/SheetVitals.tsx`: числа, смуга, «− Шкода»/«+ Лікування»/«Тимчасові» у `ResponsiveDialog` або inline-полі; `useEditResources`; кнопки лише ДМ (`/resources` dmOnly), інші бачать читання; `Breakdown` за кліком.
- Плитки: `Ui.HeroStats` (d20 `HeroStats.tsx`) на `HudTile`; додати кістки ХП (`sheet.hitDice`) і пасивну уважність; wfrp/інші системи не ламати.

## Т5. Характеристики й навички (1 виконавець)
- `sheet/SheetStatsPanel.tsx` + `useSheetRoll` (стан `SheetRollDialog`), прибрати `Ui.StatsTab` з `CombatTab`.
- `systems/d20/ui/StatsTab.tsx`: ability-плитка (мод, значення, рятунок, золотий обвід володіння), навичка з ромбом, пасивні. Контракт слота не змінювати; перевірити wfrp/homm `StatsTab`.

## Т6. Вкладки й макет (1 виконавець)
- `tabs/ProfileTabs` + `HudTabs` рестайл (заокруглений квадрат, золото активна, липкі на phone); вкладка `stats` («Навички») лише на phone; ярлики: Бій, Закляття, Спорядження, Риси й мови, Історія.
- `CharacterProfile.tsx` ≤ ~150 рядків: макет у `sheet/SheetLayout.tsx`; `?tab=` і `stash` сумісні; `PlayerSheetHint`, `DraftBanner`, `ReviewActions`, оверлеї системи збережені.

## Т7. i18n, onboarding, props-budget (1 виконавець)
- Ключі uk/en (`characterProfile`), `whats-new` + `whatsNew.<id>`; `scope-size` тест; `props-budget`; `pnpm cycles`.

## Т8. Ворота (контролер)
- `pnpm exec tsc --noEmit`, `pnpm lint:dirs --changed`, один повний `pnpm test:run` (порівняти з базою Т0).

## Т9. Живий прогін (Sonnet-субагент)
- Коміт у гілку; користувач логіниться на `dnd-tracker-git-feat-game-ui-ch5-silentfoxs-projects.vercel.app`. Сценарії: гравець і ДМ; шкода/лікування/тимчасові; вкладки Закляття (книга) і Спорядження (інвентар); відпочинок; level-up; кидок навички; desktop 1440 + phone 390; темна й світла палітри. Недоступний стенд = прямо сказати.

## Т10. Закриття
- `/simplify` (1–2 Sonnet), `docs/architecture` (character-profile/ui-layers за потреби), `docs/STATUS.md` (зроблено + хвости, у т.ч. фог і phone 390 із Ч0–Ч4, прод-деплой 725f3c450), звіт, зупинка перед Ч6.
