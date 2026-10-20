import { crypt } from "./crypt";
import { embers } from "./embers";
import { fog } from "./fog";
import { rain } from "./rain";
import { blizzard, snow } from "./snow";
import { storm } from "./storm";
import type { WeatherEffect } from "./types";

import type { WeatherKind } from "@/types/battle";

export const WEATHER_EFFECTS: Record<WeatherKind, WeatherEffect> = { rain, storm, snow, blizzard, fog, embers, crypt };
