/**
 * Єдиний точний вхід для клієнтських запитів до API.
 * Усі виклики до API мають йти через функції з lib/api/* (campaigns, battles, spells, …),
 * які використовують request() з client.ts.
 *
 * Глобальний обробник помилок налаштовується через setGlobalApiErrorHandler
 * (наприклад, у QueryProvider або layout).
 */

export type { ApiErrorPayload } from "./client";
export { setGlobalApiErrorHandler } from "./client";
