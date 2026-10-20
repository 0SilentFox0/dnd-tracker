"use client";

import { createContext, type ReactNode, useContext } from "react";

const CornerStackContext = createContext(false);

export const useInCornerStack = () => useContext(CornerStackContext);

/** Лівий нижній кут: картка результату стає над плеєром музики, а не поверх нього. */
export function CornerStack({ children }: { children: ReactNode }) {
  return (
    <CornerStackContext value>
      <div data-corner-stack className="pointer-events-none fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2 *:pointer-events-auto">
        {children}
      </div>
    </CornerStackContext>
  );
}
