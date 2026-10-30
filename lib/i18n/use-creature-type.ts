"use client";

import { useTranslator } from "./use-translator";

export function useCreatureTypeLabel(): (type: string) => string {
  const tg = useTranslator("gameTerms");

  return (type) => {
    const key = `creatureTypes.${type.trim().toLowerCase()}`;

    return tg.has(key) ? tg(key) : type;
  };
}
