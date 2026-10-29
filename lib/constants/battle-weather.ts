/* eslint-disable no-restricted-syntax -- TODO(i18n-part6 task 11): uk labels stay until their consumers in tasks 2-9 read keys */
export const WEATHER_KINDS = ["rain", "storm", "snow", "blizzard", "fog", "embers", "crypt"] as const;

export const WEATHER_LABELS: Record<(typeof WEATHER_KINDS)[number], string> = {
  rain: "Дощ",
  storm: "Гроза",
  snow: "Сніг",
  blizzard: "Хуртовина",
  fog: "Туман",
  embers: "Вогонь",
  crypt: "Гробниця",
};

export const CLEAR_WEATHER_LABEL = "Ясно";
