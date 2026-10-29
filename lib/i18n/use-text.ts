"use client";

import { useCallback } from "react";

import { formatText } from "./text-ref";
import { useTranslator } from "./use-translator";

import type { LogLine } from "@/types/text";

export function useText(): (line: LogLine) => string {
  const t = useTranslator();

  return useCallback((line) => formatText(t, line), [t]);
}
