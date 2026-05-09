// Централізовані Zod-схеми API (CODE_AUDIT 2.3).
//
// Замість inline-схем у app/api route handlers тримаємо їх тут, щоб:
//  - один контракт між сервером і клієнтськими формами,
//  - легко знайти/перевикористати схему,
//  - зменшити шум у route.ts.
//
// Старт: campaigns/main-skills/races. Решта (units/spells/skills/тощо)
// залишаються inline — мігруються поступово, коли торкаємось відповідних
// route handlers (in-place refactor).

export * from "./campaigns";
export * from "./main-skills";
export * from "./races";
