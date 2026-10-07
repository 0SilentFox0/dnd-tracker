import { API_ERRORS } from "@/lib/constants/api-errors";

const TRANSLATIONS: Array<[string, string]> = [
  [API_ERRORS.CAMPAIGN_NOT_FOUND, "Кампанію не знайдено. Перевірте код запрошення."],
  [API_ERRORS.ALREADY_MEMBER, "Ви вже є учасником цієї кампанії."],
  [API_ERRORS.CAMPAIGN_NOT_ACTIVE, "Кампанія неактивна."],
];

export function joinErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Помилка приєднання до кампанії";

  return TRANSLATIONS.find(([needle]) => err.message.includes(needle))?.[1] ?? err.message;
}
