'use client';

import { createContext, useContext } from 'react';

// undefined = no host (tools render over the map); null = host not mounted yet (render nothing)
export const MapToolsSlotContext = createContext<
    HTMLElement | null | undefined
>(undefined);

export const useMapToolsSlot = () => useContext(MapToolsSlotContext);

// same contract as the tools slot: the DM tools sidebar hosts the player-preview select
export const MapPreviewSlotContext = createContext<
    HTMLElement | null | undefined
>(undefined);

export const usePreviewSlot = () => useContext(MapPreviewSlotContext);
