# Спільні UI-примітиви — дизайн (пункт 4 роадмапу)

## Мета

На телефоні діалоги відкриваються знизу (bottom sheet зі свайпом), на десктопі лишаються модалками — з одним API для обох. Підтвердження, стани сторінок і панель дій форм стають спільними компонентами. На цих примітивах будуються наступні пункти: шари api → хуки → компоненти (5), мобільний бій (6) і мобільний профіль (7).

**Готово, коли:**

- усі наявні діалоги, підтвердження й рядки кнопок форм зі списку міграції працюють через примітиви;
- ESLint забороняє обхід примітивів (прямий Radix `Dialog`, нативні `confirm`/`alert`);
- поведінку на телефоні й десктопі покрито тестами (happy-dom зі стабом `matchMedia`).

## Рішення

- **Bottom sheet: `vaul` 1.1.x** (peer React 19 підтримується). Свайп униз, snap-точки, iOS-клавіатура й блокування прокрутки — з бібліотеки, не власні.
- **Перемикання модалка/шторка — у JS** через `useIsMobile()` (`matchMedia("(max-width: 639px)")` + `useSyncExternalStore`). На сервері — десктоп, тож гідрація без розбіжностей. Брейкпоінт збігається з Tailwind `sm` (640px).
- Усі примітиви — у `components/ui` (низькорівневі) і `components/common` (складені), без нових доменних залежностей.

## 1. `ResponsiveDialog` — `components/ui/responsive-dialog.tsx`

```tsx
<ResponsiveDialog
  open={open}
  onOpenChange={setOpen}
  title="Додати вміння"
  description="Шаблон або копія з іншої сутності"
  footer={<Button>Зберегти</Button>}
  size="md"
  dismissible={!isSaving}
>
  …
</ResponsiveDialog>
```

| Проп | Тип | Призначення |
|---|---|---|
| `open`, `onOpenChange` | `boolean`, `(open: boolean) => void` | керований стан |
| `title` | `ReactNode` | заголовок (обов'язковий — для доступності) |
| `description` | `ReactNode?` | підзаголовок |
| `footer` | `ReactNode?` | кнопки; завжди видно, не прокручуються |
| `size` | `"sm" \| "md" \| "lg"` (за замовчуванням `md`) | ширина на десктопі: `max-w-sm` / `max-w-lg` / `max-w-2xl` |
| `dismissible` | `boolean` (за замовчуванням `true`) | `false` — не закривати свайпом, тапом по фону й Escape |
| `children` | `ReactNode` | вміст, прокручується |

- **Десктоп (≥ 640px):** наявний Radix `Dialog` з `dialog.tsx`. Заголовок, прокручуваний вміст, футер прибитий донизу. Кнопка ✕ лишається.
- **Телефон:** `vaul` `Drawer` знизу з «ручкою». `max-h-[90dvh]`, вміст прокручується, футер прилиплий з `pb-[env(safe-area-inset-bottom)]`. Закриття свайпом униз і тапом по фону; `dismissible={false}` вимикає обидва.
- **Вкладеність:** `ResponsiveDialog` усередині іншого відкритого `ResponsiveDialog` на телефоні рендериться як `Drawer.NestedRoot`. Батьківський контекст передається через React context (`NestedSheetContext`). На десктопі — звичайна модалка поверх.
- `BattleDialog` (`components/battle/dialogs/shared/BattleDialog.tsx`) стає тонкою обгорткою над `ResponsiveDialog` з тим самим API (`title`, `description`, `contentClassName` → `className` вмісту). 12 бойових діалогів отримують шторку без змін у них.

## 2. Підтвердження — `useConfirm()`

Файли: `components/ui/confirm-dialog.tsx` (`ConfirmProvider` + рендер), `lib/hooks/common/useConfirm.ts`.

```tsx
const confirm = useConfirm();

if (!(await confirm({ title: "Видалити артефакт?", description: "…", confirmLabel: "Видалити", destructive: true }))) return;
```

```ts
interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;   // за замовчуванням «Підтвердити»
  cancelLabel?: string;    // за замовчуванням «Скасувати»
  destructive?: boolean;   // червона кнопка
  onConfirm?: () => Promise<unknown>;
}
```

- `ConfirmProvider` підключається в `app/layout.tsx` поруч із `QueryProvider` і рендерить один `ResponsiveDialog` (`size="sm"`, кнопки у `footer`).
- `confirm()` повертає `Promise<boolean>`: «підтвердити» — `true`; «скасувати», Escape, тап по фону, свайп — `false`.
- Новий виклик, поки відкрите попереднє підтвердження, закриває попереднє з `false`.
- З `onConfirm`: кнопка показує «…», діалог не закривається до завершення (`dismissible={false}`), успіх — `true`; помилка показується в діалозі (`ApiError.message` або «Не вдалося виконати дію»), діалог лишається відкритим, проміс ще не вирішено (вирішиться при наступному підтвердженні чи скасуванні).
- `useConfirm()` поза `ConfirmProvider` кидає помилку з поясненням (у тестах компонентів — обгортка-хелпер `renderWithConfirm`).

## 3. Стани сторінки — `components/common/states/`

```tsx
<EmptyState icon={Swords} title="Ще немає боїв" description="Створіть перший бій" action={<Button>Новий бій</Button>} />
<LoadingState rows={3} label="Завантаження скілів…" />
<ErrorState error={error} onRetry={refetch} />

<QueryState query={skillsQuery} empty={<EmptyState … />} loading={<LoadingState rows={6} />}>
  {(skills) => <SkillList skills={skills} />}
</QueryState>
```

- `EmptyState`: іконка (lucide), заголовок, опис, необов'язкова дія; на телефоні кнопка на всю ширину.
- `LoadingState`: `rows` скелетон-рядків (`animate-pulse`) висотою як справжні рядки; `label` — лише для скрінрідерів (`sr-only`) і `aria-busy`.
- `ErrorState`: повідомлення з `ApiError`/`Error` або «Щось пішло не так»; кнопка «Спробувати ще раз», якщо є `onRetry`.
- `QueryState<T>`: приймає `{ data, isPending, isError, error, refetch }` (TanStack `UseQueryResult<T>`). Порядок: `isPending` → `loading` (або `LoadingState`), `isError` → `ErrorState` з `refetch`, порожній масив → `empty` (якщо передано), інакше `children(data)`.
- **Міграція в межах пункту 4:** списки сторінок DM (скіли, заклинання, юніти, артефакти, сети, раси, персонажі, бої) і список кампаній — їхні власні «Завантаження…», порожні стани й `isLoading`-гілки. `loading.tsx` маршрутів отримують `LoadingState`. Компоненти, що самі тягнуть дані, — пункт 5.

## 4. Панель дій — `components/common/ActionBar.tsx`

```tsx
<ActionBar>
  <Button variant="outline" onClick={onCancel}>Скасувати</Button>
  <Button type="submit" disabled={!valid}>Зберегти</Button>
</ActionBar>
```

- **Телефон:** `sticky bottom-0` з фоном, верхньою рамкою, `pb-[env(safe-area-inset-bottom)]`; кнопки рівної ширини, головна дія — остання (праворуч).
- **Десктоп:** рядок кнопок (`flex gap-2`), як зараз.
- Усередині `ResponsiveDialog` не використовується — там є `footer`.
- `FormCard` використовує `ActionBar` і отримує проп `submitDisabled`, окремий від `isSubmitting`. Виправляє баг 3b: невалідні вміння раси показували «Збереження...».
- **Міграція:** `FormCard` (раса, основний скіл) і форми з власним рядком кнопок: скіл, артефакт, сет, юніт, персонаж (DM), нова кампанія, новий бій. Дії ходу в бою — пункт 6.

## Міграція й захист від обходу

| Що | Де | Стає |
|---|---|---|
| Radix `Dialog` напряму | 22 файли з `@/components/ui/dialog` (крім `components/ui`) | `ResponsiveDialog` |
| `BattleDialog` | `components/battle/dialogs/shared/BattleDialog.tsx` | обгортка над `ResponsiveDialog` |
| `AlertDialog` | 8 файлів з `@/components/ui/alert-dialog` | `useConfirm` або `ResponsiveDialog` (якщо це не підтвердження, як `CounterAttackResultDialog`) |
| нативний `confirm()` | 15 файлів | `useConfirm` |
| рядки кнопок форм | `FormCard` + 7 форм | `ActionBar` |
| завантаження / порожньо / помилка | списки DM, список кампаній, `loading.tsx` | `LoadingState` / `EmptyState` / `ErrorState` / `QueryState` |

ESLint (`eslint.config.mjs`), поза `components/ui/**`:

- `no-restricted-imports`: `@/components/ui/dialog`, `@/components/ui/alert-dialog`, `vaul` — з підказкою «використайте ResponsiveDialog / useConfirm»;
- `no-restricted-globals`: `confirm`, `alert` — «використайте useConfirm».

`alert-dialog.tsx` видаляється, якщо після міграції ним ніхто не користується.

## Тестування

- `useIsMobile`: стаб `matchMedia` → `true`/`false`, підписка на зміну.
- `ResponsiveDialog`: десктоп — Radix-модалка (`role="dialog"`, ✕); телефон — шторка `vaul` (ручка, футер); `dismissible={false}` не закривається Escape і тапом по фону; вкладений діалог на телефоні відкривається поверх батьківського.
- `useConfirm`: `true`/`false`, Escape → `false`, другий виклик скасовує перший, `onConfirm` з помилкою лишає діалог відкритим з текстом, з успіхом — `true`.
- Стани: кожна гілка `QueryState`; `ErrorState` з `ApiError` і `onRetry`.
- `ActionBar` / `FormCard`: класи телефону vs десктопу; `submitDisabled` з власним підписом.
- Наявні тести діалогів (`components/ui/__tests__/dialog.test.tsx`, бойові діалоги) лишаються зеленими.
- Наприкінці — ручна перевірка в браузері на ширині 375px (якщо доступна сесія) і `pnpm simulate-battle`.

## Поза обсягом

- Дії ходу в бою, мобільна розкладка бою — пункт 6. Профіль персонажа — пункт 7.
- Перенесення запитів із компонентів у хуки — пункт 5 (тут лише `QueryState` як основа).
- Теми, анімації понад стандартні `vaul`/Radix.
