# D&D Combat Tracker

Веб-додаток для відстеження боїв у настільній ролійній грі Dungeons & Dragons 5e з real-time синхронізацією та мобільною оптимізацією.

## Документація

- **[docs/README.md](docs/README.md)** — загальний опис, можливості, стек, швидкий старт, змінні середовища, деплой, troubleshooting.
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — детальна архітектура: структура папок (`app/`, `components/`, `lib/`, `types/`), призначення директорій, API routes, хуки, утиліти, конвенції та потоки даних для швидкого розуміння коду.

## Швидкий старт

```bash
pnpm install
cp .env.example .env.local   # налаштувати змінні
pnpm run dev
```

Змінні середовища та кроки налаштування БД — у [docs/README.md](docs/README.md).

## Скрипти

| Команда | Опис |
|--------|------|
| `pnpm run dev` | Dev-сервер |
| `pnpm run build` | Production build |
| `pnpm test` | Запуск тестів (Vitest) |
| `pnpm run lint` | ESLint |

Імпорт даних, міграції іконок, seed — див. [docs/README.md](docs/README.md#-скрипти).
