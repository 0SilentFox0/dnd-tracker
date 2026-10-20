"use client";

import { useSyncExternalStore } from "react";
import { Maximize, Minimize } from "lucide-react";

const subscribe = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);

  return () => document.removeEventListener("fullscreenchange", onChange);
};

const useDocument = (read: () => boolean) =>
  useSyncExternalStore(subscribe, read, () => false);

const readSupported = () => document.fullscreenEnabled;

const readActive = () => !!document.fullscreenElement;

export function FullscreenButton() {
  const supported = useDocument(readSupported);

  const active = useDocument(readActive);

  if (!supported) return null;

  const toggle = () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

  const Icon = active ? Minimize : Maximize;

  return (
    <button type="button" onClick={toggle} aria-label={active ? "Вийти з повноекранного режиму" : "На весь екран"} className="flex size-9 items-center justify-center rounded-full border border-hud-rule bg-black/70 text-hud-bone hover:bg-black/90">
      <Icon className="size-4" />
    </button>
  );
}
