"use client";

import type { ReactNode } from "react";

import { MAP_MODE_UI } from "./registry";

const PROVIDERS = Object.values(MAP_MODE_UI).flatMap((ui) => (ui.SceneProvider ? [ui.SceneProvider] : []));

/** Фіксований порядок: режим бою може змінитися без перемонтування сцени. */
export function ModeSceneProvider({ children }: { children: ReactNode }) {
  return PROVIDERS.reduceRight((acc, Provider) => <Provider>{acc}</Provider>, children);
}
