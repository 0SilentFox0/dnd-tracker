"use client";

import { createContext, useContext } from "react";

/** Рядок над картою на десктопі: інструменти ДМ рендеряться туди, поряд із перемикачем вигляду. */
export const MapToolsSlotContext = createContext<HTMLElement | null>(null);

export const useMapToolsSlot = () => useContext(MapToolsSlotContext);
