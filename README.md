# D&D Combat Tracker

Веб-додаток для відстеження боїв у настільній ролійній грі Dungeons & Dragons 5e з real-time синхронізацією та мобільною оптимізацією.

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — детальна архітектура: структура папок (`app/`, `components/`, `lib/`, `types/`), призначення директорій, API routes,

# D&D Combat Tracker

Веб-додаток для відстеження боїв у настільній ролійній грі Dungeons & Dragons 5e з підтримкою реального часу та мобільною оптимізацією.

## 🎯 Основні можливості

### Для Dungeon Master (DM)

- **Управління кампаніями**: Створення та налаштування кампаній з унікальними кодами запрошення
- **Управління персонажами**: Створення та редагування персонажів гравців та NPC героїв з повною формою (7 етапів)
- **Управління інвентарем**: Повне управління інвентарем персонажів (валюта, екіпіровані предмети, рюкзак)
- **Управління юнітами**: Створення груп NPC юнітів для боїв
- **База заклинань**: Створення та управління заклинаннями кампанії
- **Артефакти та сети**: Створення артефактів та наборів артефактів
- **Дерева прокачки**: Налаштування дерев прокачки для рас
- **Сцени боїв**: Створення та управління боями з реальним часом синхронізацією
- **Ініціатива та черга**: Автоматичне відстеження черги ходів
- **Атаки та ушкодження**: Обробка атак з врахуванням модифікаторів з артефактів та дерева скілів

### Для Гравців

- **Перегляд персонажа**: Перегляд та редагування власного персонажа
- **Участь у боях**: Реальний час синхронізація під час боїв
- **Відстеження HP**: Моніторинг здоров'я та тимчасових HP
- **Заклинання**: Перегляд та використання відомих заклинань

## 🛠 Технологічний стек

### Frontend

- **Next.js 16.1.1** (App Router) - React фреймворк
- **React 19.2.3** - UI бібліотека
- **TypeScript** - Строга типізація без `any`
- **Tailwind CSS 4** - Стилізація
- **shadcn/ui** - UI компоненти
- **Radix UI** - Доступні UI примітиви

### Backend

- **Next.js API Routes** - Serverless API
- **Prisma 5.20.0** - ORM для роботи з базою даних
- **PostgreSQL (Supabase)** - База даних
- **Zod 4.3.5** - Валідація даних

### Authentication & Real-time

- **Supabase Auth** - Аутентифікація (OAuth підтримка)
- **Pusher** - Real-time синхронізація через WebSockets

### Deployment

- **Vercel** - Хостинг та CI/CD

## 📋 Вимоги

- Node.js 20+
- npm або yarn
- Supabase проект з PostgreSQL базою даних
- Pusher аккаунт (для real-time функціоналу)

## 🚀 Швидкий старт

### 1. Клонування репозиторію

```bash
git clone <repository-url>
cd dnd-combat-tracker
```

### 2. Встановлення залежностей

```bash
npm install
```

### 3. Налаштування змінних середовища

Створіть файл `.env.local` в корені проекту:

```env
# База даних Supabase — Transaction pooler (порт 6543, рекомендовано для serverless і локально)
# Замініть [PROJECT_REF] та [PASSWORD] на значення з Supabase → Connect → Transaction pooler
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"

# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Pusher (для real-time)
PUSHER_APP_ID="your-app-id"
PUSHER_SECRET="your-secret"
NEXT_PUBLIC_PUSHER_KEY="your-key"
NEXT_PUBLIC_PUSHER_CLUSTER="your-cluster"
```

### 4. Налаштування бази даних

```bash
# Генерація Prisma Client
npx prisma generate

# Застосування міграцій (якщо потрібно)
npx prisma migrate deploy
```

### 5. Запуск проекту

```bash
# Development режим
npm run dev

# Production build
npm run build
npm start
```

Відкрийте [http://localhost:3000](http://localhost:3000) у браузері.

## 📁 Структура проекту

```
dnd-combat-tracker/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Авторизація
│   │   ├── sign-in/              # Сторінка входу
│   │   └── sign-up/              # Сторінка реєстрації
│   ├── api/                      # API Routes
│   │   └── campaigns/            # API для кампаній
│   │       └── [id]/
│   │           ├── characters/   # API для персонажів
│   │           │   └── [characterId]/
│   │           │       └── inventory/  # API для інвентаря
│   │           ├── battles/      # API для боїв
│   │           ├── spells/       # API для заклинань
│   │           ├── units/        # API для юнітів
│   │           └── artifacts/    # API для артефактів
│   ├── campaigns/                # Сторінки кампаній
│   │   └── [id]/
│   │       ├── dm/               # DM панель
│   │       │   ├── characters/   # Управління персонажами
│   │       │   │   ├── new/      # Створення персонажа
│   │       │   │   └── [characterId]/  # Редагування персонажа
│   │       │   │       └── inventory/  # Управління інвентарем
│   │       │   ├── battles/      # Управління боями
│   │       │   ├── spells/       # Управління заклинаннями
│   │       │   ├── units/        # Управління юнітами
│   │       │   ├── artifacts/    # Управління артефактами
│   │       │   └── npc-heroes/   # Управління NPC героями
│   │       ├── battles/          # Сторінка бою
│   │       │   └── [battleId]/
│   │       └── character/        # Сторінка персонажа гравця
│   └── auth/                     # OAuth callback
├── components/                   # React компоненти
│   ├── ui/                      # UI компоненти (shadcn/ui)
│   ├── characters/              # Компоненти форми персонажа
│   │   ├── CharacterBasicInfo.tsx
│   │   ├── CharacterAbilityScores.tsx
│   │   ├── CharacterCombatParams.tsx
│   │   ├── CharacterSkillsSection.tsx
│   │   ├── CharacterSpellsSection.tsx
│   │   ├── CharacterLanguagesSection.tsx
│   │   └── CharacterRoleplaySection.tsx
│   └── inventory/               # Компоненти інвентаря
│       ├── CurrencySection.tsx
│       ├── EquippedItemsSection.tsx
│       └── ItemListSection.tsx
├── lib/                         # Утиліти та хелпери
│   ├── api/                     # API сервіси
│   │   ├── campaigns.ts         # API для кампаній
│   │   ├── characters.ts        # API для персонажів
│   │   └── inventory.ts         # API для інвентаря
│   ├── hooks/                   # Кастомні React хуки
│   │   ├── useCharacterForm.ts  # Хук для форми персонажа
│   │   ├── useCampaignMembers.ts # Хук для учасників кампанії
│   │   └── useInventory.ts      # Хук для інвентаря
│   ├── constants/               # Константи D&D 5e
│   │   ├── skills.ts            # Навички та збереження
│   │   ├── alignment.ts         # Світогляди
│   │   ├── spellcasting.ts     # Заклинання
│   │   ├── equipment.ts        # Обладнання
│   │   ├── abilities.ts        # Характеристики
│   │   └── index.ts            # Центральний експорт
│   ├── types/                   # TypeScript типи
│   │   ├── inventory.ts        # Типи для інвентаря
│   │   ├── artifacts.ts        # Типи для артефактів
│   │   └── skills.ts           # Типи для дерева скілів
│   ├── auth.ts                  # Аутентифікація
│   ├── db.ts                    # Prisma Client
│   ├── pusher.ts                # Pusher конфігурація
│   ├── supabase/                # Supabase клієнти
│   │   ├── client.ts            # Клієнтський клієнт
│   │   ├── server.ts            # Серверний клієнт
│   │   └── middleware.ts       # Middleware для сесій
│   └── utils/                   # Допоміжні функції
│       └── calculations.ts      # D&D розрахунки
├── prisma/                      # Prisma схема та міграції
│   ├── schema.prisma            # Схема бази даних
│   └── migrations/              # Міграції
├── docs/                        # Документація
│   └── TECHNICAL_SPECIFICATION.md # Технічне завдання
└── public/                      # Статичні файли
    └── tavern.png               # Фонове зображення
```

## 🏗️ Архітектура

### Компонентна структура

Проект використовує модульну архітектуру з чітким розділенням відповідальностей:

- **API сервіси** (`lib/api/`) - Інкапсулюють всі HTTP запити до API
- **Хуки** (`lib/hooks/`) - Переіспользувана логіка управління станом
- **Компоненти** (`components/`) - Переіспользувані UI компоненти
- **Типи** (`lib/types/`) - TypeScript типи для типобезпеки
- **Константи** (`lib/constants/`) - Константи D&D 5e розділені за категоріями

### Приклад використання

```typescript
// Замість прямого fetch
const character = await getCharacter(campaignId, characterId);

// Замість ручного управління станом
const { formData, updateField, handleSubmit } = useCharacterForm({
  onSubmit: async (data) => {
    await createCharacter(campaignId, data);
  },
});

// Використання компонентів
<CharacterBasicInfo
  formData={formData}
  onUpdate={updateField}
  campaignMembers={members}
/>;
```

## 🗄️ Модель даних

### Основні сутності

- **User** - Користувач системи
- **Campaign** - Кампанія D&D
- **CampaignMember** - Учасник кампанії (DM або Player)
- **Character** - Персонаж (гравець або NPC герой)
- **CharacterInventory** - Інвентар персонажа
- **Unit** - NPC юніт для боїв
- **UnitGroup** - Група юнітів
- **Spell** - Заклинання
- **SpellGroup** - Група заклинань
- **Artifact** - Артефакт
- **ArtifactSet** - Набір артефактів
- **BattleScene** - Сцена бою
- **SkillTree** - Дерево прокачки для раси
- **CharacterSkills** - Прогрес персонажа по дереву скілів
- **RacialAbility** - Расові здібності

## 🔐 Аутентифікація

Проект використовує **Supabase Auth** для аутентифікації з підтримкою OAuth провайдерів (Google, GitHub тощо).

### Налаштування OAuth

1. Перейдіть в [Supabase Dashboard](https://app.supabase.com)
2. Виберіть ваш проект
3. Перейдіть в **Authentication** → **Providers**
4. Увімкніть потрібні провайдери
5. Налаштуйте Redirect URLs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.vercel.app/auth/callback` (production)

## 🔄 Real-time синхронізація

Проект використовує **Pusher** для real-time синхронізації під час боїв. Всі зміни в бою автоматично синхронізуються між усіма учасниками.

### Налаштування Pusher

1. Створіть аккаунт на [Pusher](https://pusher.com)
2. Створіть новий канал (Channel)
3. Отримайте credentials (App ID, Key, Secret, Cluster)
4. Додайте їх до `.env.local`

## 📦 Скрипти

```bash
# Development
npm run dev              # Запуск dev сервера

# Build
npm run build            # Production build з Prisma generate (без міграцій)
npm run build:local      # Local build з Prisma generate
npm run build:with-migrations  # Build з застосуванням міграцій

# Deployment
npm run deploy           # Deploy на Vercel (production) - міграції застосовуються автоматично
npm run deploy:preview   # Deploy preview - міграції застосовуються автоматично
npm run deploy:dev       # Deploy development - міграції застосовуються автоматично

# Database
npx prisma generate      # Генерація Prisma Client
npx prisma migrate dev   # Створення нової міграції (тільки локально)
npx prisma migrate deploy # Застосування міграцій (використовується на Vercel автоматично)
npx prisma studio        # Відкриття Prisma Studio

# Icons in Supabase Storage (потрібен SUPABASE_SERVICE_ROLE_KEY)
pnpm run migrate-spell-icons-to-supabase [campaignId]   # Іконки заклинань → bucket spell-icons
pnpm run migrate-skill-icons-to-supabase [campaignId] # Іконки скілів і main skills → bucket skill-icons
pnpm run migrate-unit-icons-to-supabase [campaignId]  # Аватари юнітів → bucket unit-icons
```

**Примітка**: На Vercel міграції застосовуються автоматично під час кожного деплою через `vercel.json`. Для локальної розробки використовуйте `npx prisma migrate dev`.

## 🎨 UI/UX

- **Mobile-first дизайн** - Оптимізовано для мобільних пристроїв
- **Темна тема** - Темна тема за замовчуванням з D&D атмосферою
- **Responsive** - Адаптивний дизайн для всіх розмірів екранів
- **Accessibility** - Підтримка доступності через Radix UI
- **D&D атмосфера** - Фонове зображення та затемнення для створення атмосфери
- **Accordion форми** - Форми розділені на етапи з використанням accordion компонентів

## 🧮 D&D 5e Розрахунки

Проект включає автоматичні розрахунки для D&D 5e:

- **Proficiency Bonus** - Бонус майстерності залежно від рівня
- **Ability Modifiers** - Модифікатори характеристик
- **Passive Scores** - Пасивні значення (Perception, Investigation, Insight)
- **Spell Save DC** - Складність збереження від заклинань
- **Spell Attack Bonus** - Бонус атаки заклинань
- **Attack Damage Modifiers** - Модифікатори урону з характеристик (STR для ближньої, DEX для дальньої)
- **Artifact Bonuses** - Бонуси з артефактів (damage, attack)
- **Skill Tree Bonuses** - Бонуси з дерева скілів

## 🚢 Deployment

### Vercel

Проект налаштований для автоматичного деплою на Vercel:

1. Підключіть репозиторій до Vercel
2. Додайте змінні середовища в Vercel Dashboard
3. Push до `main` гілки автоматично запускає деплой

### Environment Variables на Vercel

У Vercel Dashboard (**Settings** → **Environment Variables**) додайте для **Production**, **Preview** та **Development**:

| Змінна                          | Опис                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                  | **Обов'язково** — Transaction pooler (порт 6543). Формат: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[REGION].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true` |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL проекту Supabase                                                                                                                                                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key з Supabase                                                                                                                                                                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (серверні API)                                                                                                                                                      |
| `SUPABASE_JWT_SECRET`           | JWT secret (для перевірки сесій)                                                                                                                                                     |
| `PUSHER_APP_ID`                 | Pusher App ID (real-time)                                                                                                                                                            |
| `PUSHER_SECRET`                 | Pusher secret                                                                                                                                                                        |
| `NEXT_PUBLIC_PUSHER_KEY`        | Pusher key (публічний)                                                                                                                                                               |
| `NEXT_PUBLIC_PUSHER_CLUSTER`    | Pusher cluster (наприклад `eu`)                                                                                                                                                      |

**Важливо**: для Vercel завжди використовуйте **Transaction pooler** (порт **6543**, `?pgbouncer=true`) у `DATABASE_URL` — це потрібно для serverless і стабільної продуктивності.

### Автоматичні міграції

Міграції Prisma **автоматично застосовуються** під час деплою на Vercel через `vercel.json`:

```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && next build"
}
```

Це означає що:

- ✅ Кожен деплой автоматично застосовує нові міграції
- ✅ Міграції виконуються перед білдом
- ✅ Якщо міграція не вдається, білд не пройде

**Примітка**: Переконайтеся що `DATABASE_URL` правильно налаштований в Vercel Environment Variables перед першим деплоєм.

## 🐛 Troubleshooting

### Помилка підключення до бази даних

Переконайтеся що:

- `DATABASE_URL` використовує Transaction pooler (порт 6543, `pgbouncer=true`)
- Пароль не містить спецсимволів які потребують URL encoding
- Supabase проект активний

### Помилка авторизації / редірект на localhost після логіну з продакшену

- **Supabase → Authentication → URL Configuration**: додайте production URL у **Redirect URLs**, наприклад `https://your-app.vercel.app/auth/callback`. Якщо там лише `http://localhost:3000/auth/callback`, після OAuth браузер перенаправить на localhost. Додайте обидва (localhost для розробки та production URL для проду).
- Перевірте чи OAuth провайдер увімкнений в Supabase.
- Перевірте логи в Supabase Dashboard → Logs.

### Prisma помилки

```bash
# Очистка та регенерація
npx prisma generate
npx prisma migrate reset  # УВАГА: видаляє всі дані
```

### TypeScript помилки

Проект використовує строгу типізацію без `any`. Якщо виникають помилки типізації:

- Перевірте чи всі типи правильно імпортовані з `lib/types/`
- Використовуйте generic типи для форм: `<K extends keyof FormData>`

## 📚 Додаткова документація

- [Технічне завдання](./docs/TECHNICAL_SPECIFICATION.md) - Детальна технічна специфікація

## 📝 Ліцензія

Приватний проект.

## 👥 Автори

Розроблено для управління D&D кампаніями та боями.

---

**Примітка**: Цей проект знаходиться в активній розробці. Функціонал може змінюватися.
