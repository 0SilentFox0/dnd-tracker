# Ч5. Лист персонажа в стилі Game: спека

Частина епіку [game-style UI](2026-11-21-game-style-ui-approved-design.md) (розділ «Лист персонажа»). Токени: `2026-11-21-game-style-tokens.md`. Референс-скрін — чужий продукт: беремо принципи, не арт.

## Мета й межі

Перевести лист (`/campaigns/[id]/character`, `/campaigns/[id]/dm/characters/[characterId]`) у `GameShell` і зібрати за затвердженим макетом: ліва закріплена колонка-ідентичність, праворуч блок HP, плитки, характеристики, навички, вкладки. Доменна поведінка не змінюється (відпочинок, level-up, stash, path, інвентар, редагування, права гравця/ДМ). Створення персонажа (`components/characters`) і бій (Ч6) поза межами.

## Що перевикористовуємо (reuse)

| Потреба | Є | Рішення |
|---|---|---|
| Оболонка | `CampaignGameShell`, `shouldUseGameShell`, `campaignGameNavigation` (пункт `character`) | розширити `Section` до `'character'`, додати 2 маршрути |
| Портрет | `hero/HeroPortrait` (завантаження для DM) | лишається, обгортається рамкою з кутовими дужками (перевірити наявний кутовий примітив у `components/hud` перед створенням нового) |
| Плитки | `HudStatChip`, `HudTile`, `HudPanel`, `HudSection` (`components/hud/page`, `form`) | плитки КЗ/ініціатива/швидкість/майстерність/КХП = `Ui.HeroStats` системи; лише рестайл |
| Вкладки | `HudTabs` | рестайл (заокруглений квадрат, золото = активна), липкі на phone |
| Зміна HP | `useEditResources` (`hp`, `tempHp`), `ResourcesDialog`, `RestBadges`, `HitDicePanel` | блок HP викликає той самий хук; нових роутів немає |
| Кидки | `SheetRollDialog`, `RollableCell` | без змін; стан кидка піднімається з `CombatTab` у спільний хук |
| Натхнення | модуль `systems/inspiration` (stored column) | показ через слот системи в лівій колонці, не з ядра |
| XP | `lib/constants/experience`, `Character.experience` | у лист додається похідне поле (нижче) |
| Контекст | `ProfileContext` | без prop-drilling, нових контекстів немає |

Нового пишемо лише те, чого немає: `SheetIdentityPanel`, `SheetVitals`, `SheetStatsPanel`, чисті функції `applyHpChange` і `xpProgress`.

## Композиція

`CharacterProfile.tsx` (384 рядки) розбивається: `CharacterProfileView` лишає дані/вкладку/режим редагування, макет виносимо в `sheet/SheetLayout.tsx`.

```
lg:  [ SheetIdentityPanel (sticky) ] [ SheetVitals ] [ Ui.HeroStats плитки ]
                                      [ SheetStatsPanel: 6 характеристик + 18 навичок ]
                                      [ ProfileTabs: Бій · Закляття · Спорядження · Риси й мови · Історія (+ системні) ]
phone: компактна шапка (імʼя, рівень, HP, КЗ) → вкладки, що липнуть: Навички · Бій · Закляття · Спорядження · Риси й мови · Історія; одна панель за раз
```

- **SheetIdentityPanel**: портрет у рамці, рівень, імʼя, раса · клас (підклас), смуга XP (`xpProgress`), світогляд/передісторія, слот `Ui.sheet.identityExtras` (натхнення тощо), кнопки ДМ (Редагувати, `DmRestActions`), `LevelUpBadge`/`PendingChoicesBadge`. Системи без прогресії (`hideProgression`) ховають рівень/XP, як зараз.
- **SheetVitals**: поточне/макс, тимчасові, смуга (червоний лише тут), «− Шкода», «+ Лікування», «Тимчасові» (поле кількості + дія). Кнопки зміни лише ДМ (маршрут `/resources` dmOnly, права не послаблюємо); гравець бачить ті самі числа й смугу лише на читання. Шкода спершу з'їдає тимчасові (`applyHpChange`, чиста функція, один мутаційний виклик `{hp,tempHp}`). Розбивка HP (`Breakdown`) лишається за кліком.
- **SheetStatsPanel**: `Ui.StatsTab` (`top`/`bottom`) переїжджає з `CombatTab` сюди; характеристика = модифікатор, значення, рятунок, володіння — золотий обвід; навичка — ромб володіння, пасивна уважність. На phone ця панель = вкладка «Навички». Контракт слота `StatsTabProps` не змінюється; d20 просто змінює подання (`systems/d20/ui/StatsTab.tsx`).
- **Вкладки**: `combat` лишає атаки, захист, `combatRows` системи; `skills` (path) показується як «Риси й мови» (рис, раси, мови, володіння, path, заряди); решта (`magic`, `items`, `story`, `log`, системні `advancement`/`downtime`) без змін логіки. `?tab=` і `stash`→`items` сумісні.

## Дані (змін у читанні немає)

XP беремо з наявного `sheet.rest.xp` (`value`, `next`, `levelUp`; є лише при `outOfCombat.xp`), смуга = `xpProgress(value, level)`. Натхнення = наявне `sheet.rest.inspiration` (`boolean | null`). Слот `identityExtras` і нове поле в `CharacterSheet` не потрібні. Міграцій немає.

## Принципи

- Форми — заокруглений квадрат, без гексів; золото = володіння/вибране/основна дія; червоний лише HP.
- Системно-нейтральний каркас: жодних умов по id системи; `hideProgression` і слоти як є.
- ≤ 7 props на компонент (`props-budget`), домен-обʼєкти замість полів, `ProfileContext`.
- i18n: namespace `characterProfile` уже в scope листа; нові ключі uk/en, без кирилиці в коді; scope-size не розширюємо без перевірки; запис у `whats-new`.
- Egress: жодних нових запитів, лише наявна мутація й дельта-інвалідація листа.
- Touch ≥ 40 px, паритет desktop/phone, тема: темна і світла палітри.

## Ризики

- Подвійна шапка, якщо маршрут не доданий у `shouldUseGameShell` (тест).
- Підняття стану кидка з `CombatTab` не має зламати кидки з навичок (тести `profile-view`, `profile-tabs`).
- Права: HP-кнопки не показувати без `sheet.rest`; сервер лишається джерелом істини (перевірити, що гравець-власник уже може `useEditResources`).
- 42+ давніх падінь api-auth/WorldPlayClient: порівнювати з базовим прогоном до змін.
