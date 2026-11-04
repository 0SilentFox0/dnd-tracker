"use client";

import { useSyncExternalStore } from "react";

import type { DemoTourId } from "@/lib/onboarding/flag-keys";

let active: DemoTourId | null = null;

const listeners = new Set<() => void>();

export function setActiveDemoTour(id: DemoTourId | null) {
  if (active === id) return;

  active = id;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => void listeners.delete(listener);
};

export const useActiveDemoTour = () => useSyncExternalStore(subscribe, () => active, () => null);
