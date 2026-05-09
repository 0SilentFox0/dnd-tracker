// Централізовані Zod-схеми API (CODE_AUDIT 2.3).
//
// Замість inline-схем у app/api route handlers тримаємо їх тут, щоб:
//  - один контракт між сервером і клієнтськими формами,
//  - легко знайти/перевикористати схему,
//  - зменшити шум у route.ts.

export * from "./battles";
export * from "./campaigns";
export * from "./main-skills";
export * from "./prisma-json";
export * from "./races";
export * from "./spells";
export * from "./units";
