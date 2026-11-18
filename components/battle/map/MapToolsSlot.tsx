'use client';

import { createContext, useContext } from 'react';

export const MapToolsSlotContext = createContext<HTMLElement | null>(null);

export const useMapToolsSlot = () => useContext(MapToolsSlotContext);
