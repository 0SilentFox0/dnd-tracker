# D&D Combat Tracker

Веб-додаток для спрощення розрахунків та управління бойовими сесіями в D&D 5e. Mobile-first підхід з real-time синхронізацією між DM та гравцями.

## Tech Stack

- **Next.js 16** (App Router)
- **Vercel** (хостинг)
- **Supabase PostgreSQL** (база даних)
- **Prisma** (ORM)
- **shadcn/ui** (UI компоненти)
- **Clerk** (авторизація через Google OAuth)
- **Pusher** (real-time синхронізація)

## Налаштування

### 1. Встановлення залежностей

```bash
npm install
```

### 2. Налаштування змінних середовища

Створіть файл `.env.local` в корені проекту:

```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Pusher (для real-time синхронізації)
PUSHER_APP_ID=your_pusher_app_id
PUSHER_SECRET=your_pusher_secret
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=mt1
```

### 3. Налаштування бази даних

```bash
# Генерує Prisma Client
npx prisma generate

# Застосовує міграції
npx prisma migrate dev

# Або якщо база вже існує
npx prisma db push
```

### 4. Запуск проекту

```bash
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000) у браузері.

## Структура проекту

```
/app
  /(auth)          # Сторінки авторизації
  /api             # API routes
  /campaigns       # Сторінки кампаній
    /[id]
      /dm          # Сторінки для DM
        /characters
        /npc-heroes
        /units
        /spells
        /artifacts
        /skill-trees
        /battles
      /battles     # Інтерфейс бою
      /character   # Сторінка персонажа для гравця
/components        # React компоненти
/lib               # Утиліти та конфігурація
/prisma            # Prisma schema
```

## Основні функції

### Для DM (Dungeon Master)

- ✅ Управління персонажами гравців
- ✅ Управління NPC героями та юнітами
- ✅ База заклинань та артефактів
- ✅ Створення та управління сценами боїв
- ✅ Інтерфейс бою з real-time синхронізацією
- ✅ Автоматичні розрахунки урону та ефектів

### Для Гравців

- ✅ Перегляд та редагування персонажа (якщо дозволено DM)
- ✅ Участь в боях з real-time оновленнями
- ✅ Перегляд інвентаря та характеристик

## API Routes

- `/api/campaigns` - CRUD операції для кампаній
- `/api/campaigns/[id]/characters` - Управління персонажами
- `/api/campaigns/[id]/units` - Управління юнітами
- `/api/campaigns/[id]/spells` - Управління заклинаннями
- `/api/campaigns/[id]/artifacts` - Управління артефактами
- `/api/campaigns/[id]/battles` - Управління боями
- `/api/campaigns/[id]/battles/[battleId]/start` - Запуск бою
- `/api/campaigns/[id]/battles/[battleId]/attack` - Обробка атаки
- `/api/campaigns/[id]/battles/[battleId]/next-turn` - Наступний хід

## Розгортання

### Vercel

1. Підключіть репозиторій до Vercel
2. Додайте змінні середовища в налаштуваннях проекту
3. Запустіть деплой

### База даних

Проект використовує Supabase PostgreSQL. Створіть базу даних на [supabase.com](https://supabase.com) та додайте `DATABASE_URL` в змінні середовища.

**Важливо для Supabase:**
- Для production рекомендовано використовувати **Connection Pooling** URI замість прямого підключення
- Connection Pooling URI знаходиться в **Settings** → **Database** → **Connection string** → **Connection pooling**
- Це покращує продуктивність та дозволяє більше одночасних підключень

## Ліцензія

MIT
