import type { WeatherKind } from "@/types/battle";

export const WEATHER_KINDS = ["rain", "storm", "snow", "blizzard", "fog", "embers", "crypt"] as const satisfies readonly WeatherKind[];

export const WEATHER_LABELS: Record<WeatherKind, string> = {
  rain: "Дощ",
  storm: "Гроза",
  snow: "Сніг",
  blizzard: "Хуртовина",
  fog: "Туман",
  embers: "Вогонь",
  crypt: "Гробниця",
};

export const CLEAR_WEATHER_LABEL = "Ясно";
