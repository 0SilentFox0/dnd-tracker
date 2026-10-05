const TRANSLATIONS: Array<[string, string]> = [
  ["Campaign not found", "Кампанію не знайдено. Перевірте код запрошення."],
  ["Already a member", "Ви вже є учасником цієї кампанії."],
  ["not active", "Кампанія неактивна."],
];

export function joinErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Помилка приєднання до кампанії";

  return TRANSLATIONS.find(([needle]) => err.message.includes(needle))?.[1] ?? err.message;
}
