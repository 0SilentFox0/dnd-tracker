"use client";

import { createContext, useContext } from "react";

export interface AbilityEditorContextValue {
  campaignId: string;
  errorsByPath: Record<string, string[]>;
}

const Ctx = createContext<AbilityEditorContextValue>({ campaignId: "", errorsByPath: {} });

export const AbilityEditorProvider = Ctx.Provider;

export const useAbilityEditor = () => useContext(Ctx);

export function useFieldErrors(path: string): string[] {
  return useAbilityEditor().errorsByPath[path] ?? [];
}

/** Errors at `path` and anything nested under it (e.g. `duration` also catches `duration.rounds`). */
export function useErrorsUnder(path: string): string[] {
  const { errorsByPath } = useAbilityEditor();

  return Object.entries(errorsByPath).flatMap(([key, list]) => (key === path || key.startsWith(`${path}.`) ? list : []));
}
