'use client';

import { createContext, useContext } from 'react';

export type SceneSlotName = 'dock';

export type SceneSlots = Record<SceneSlotName, HTMLElement | null>;

export const EMPTY_SCENE_SLOTS: SceneSlots = {
    dock: null,
};

export const SceneSlotsContext = createContext<SceneSlots>(EMPTY_SCENE_SLOTS);

export const useSceneSlot = (name: SceneSlotName) =>
    useContext(SceneSlotsContext)[name];
