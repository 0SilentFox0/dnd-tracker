"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Maximize, Minimize } from "lucide-react";

const subscribe = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);

  return () => document.removeEventListener("fullscreenchange", onChange);
};

const readSupported = () => document.fullscreenEnabled;

const readActive = () => !!document.fullscreenElement;

const readOnServer = () => false;

export function FullscreenButton() {
  const t = useTranslations("show");

  const supported = useSyncExternalStore(subscribe, readSupported, readOnServer);

  const active = useSyncExternalStore(subscribe, readActive, readOnServer);

  if (!supported) return null;

  const toggle = () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

  const Icon = active ? Minimize : Maximize;

  return (
    <button type="button" onClick={toggle} aria-label={active ? t("fullscreen.exit") : t("fullscreen.enter")} className="flex size-9 items-center justify-center rounded-full border border-hud-rule bg-black/70 text-hud-bone hover:bg-black/90">
      <Icon className="size-4" />
    </button>
  );
}
