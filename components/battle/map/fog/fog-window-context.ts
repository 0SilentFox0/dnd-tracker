import { createContext } from 'react';

import type { GridWindow } from '@/lib/utils/battle/grid';

export const FogWindowContext = createContext<GridWindow | null>(null);
