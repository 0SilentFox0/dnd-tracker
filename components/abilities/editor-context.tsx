"use client";

import { createContext, useContext } from "react";

import type { AbilityError } from "@/lib/utils/abilities/editor";
import type { ClassColumn } from "@/types/classes";

export interface AbilityEditorContextValue {
  campaignId: string;
  errorsByPath: Record<string, AbilityError[]>;
  classColumns?: readonly ClassColumn[];
  itemCharges?: boolean;
  performChoices?: { attacks: readonly { name: string }[]; spells: readonly { id: string; name: string }[] };
}

const Ctx = createContext<AbilityEditorContextValue>({ campaignId: "", errorsByPath: {} });

export const AbilityEditorProvider = Ctx.Provider;

export const useAbilityEditor = () => useContext(Ctx);

export function useFieldErrors(path: string): AbilityError[] {
  return useAbilityEditor().errorsByPath[path] ?? [];
}

/** Errors at `path` and anything nested under it (e.g. `duration` also catches `duration.rounds`). */
export function useErrorsUnder(path: string): AbilityError[] {
  const { errorsByPath } = useAbilityEditor();

  return Object.entries(errorsByPath).flatMap(([key, list]) => (key === path || key.startsWith(`${path}.`) ? list : []));
}
