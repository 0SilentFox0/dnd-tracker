"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface GlobalDamageOverlayProps {
  value: number;
  isHealing: boolean;
  onDone?: () => void;
  durationMs?: number;
}

/**
 * Анімація урону/лікування по центру екрану (глобальний оверлей).
 * onDone викликається після завершення exit-анімації, щоб ефект не «зависав».
 */
export function GlobalDamageOverlay({
  value,
  isHealing,
  onDone,
  durationMs = 1800,
}: GlobalDamageOverlayProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(t);
  }, [durationMs]);

  const handleExitComplete = useCallback(() => {
    onDone?.();
  }, [onDone]);

  const text = isHealing ? "+" + value : "-" + value;

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.2 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
        >
          <span
            className={cn(
              "font-black text-6xl sm:text-8xl drop-shadow-2xl select-none",
              isHealing
                ? "text-green-400 drop-shadow-[0_0_30px_rgba(74,222,128,0.6)]"
                : "text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]",
            )}
          >
            {text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
