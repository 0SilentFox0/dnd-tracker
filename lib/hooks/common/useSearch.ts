"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { matchesQuery } from "@/lib/utils/common/text-search";

export interface SearchState<T> {
  query: { value: string; set: (value: string) => void };
  items: T[];
  isActive: boolean;
}

export function useSearch<T>(items: T[], fieldsOf: (item: T) => (string | null | undefined)[]): SearchState<T> {
  const [value, set] = useState("");

  const deferred = useDeferredValue(value);

  const isActive = deferred.trim() !== "";

  const filtered = useMemo(() => (isActive ? items.filter((item) => matchesQuery(fieldsOf(item), deferred)) : items), [items, deferred, isActive, fieldsOf]);

  return { query: { value, set }, items: filtered, isActive };
}
