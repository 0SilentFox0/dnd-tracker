"use client";

import * as React from "react";
import { AnimatePresence,motion } from "framer-motion";
import { CheckCircle2, Shield,Sword, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type RollResultType =
  | "hit"
  | "miss"
  | "success"
  | "fail"
  | "crit"
  | "crit_fail";

interface RollResultOverlayProps {
  type: RollResultType | null;
  onComplete: () => void;
}

export function RollResultOverlay({
  type,
  onComplete,
}: RollResultOverlayProps) {
  if (!type) return null;

  const config = {
    hit: {
      text: "ПОПАДАННЯ!",
      icon: Sword,
      color: "text-green-500",
      bg: "bg-green-500/20",
      border: "border-green-500/50",
      shadow: "shadow-[0_0_50px_rgba(34,197,94,0.4)]",
    },
    miss: {
      text: "ПРОМАХ",
      icon: Shield,
      color: "text-red-500",
      bg: "bg-red-500/20",
      border: "border-red-500/50",
      shadow: "shadow-[0_0_50px_rgba(239,68,68,0.4)]",
    },
    success: {
      text: "УСПІХ!",
      icon: CheckCircle2,
      color: "text-blue-500",
      bg: "bg-blue-500/20",
      border: "border-blue-500/50",
      shadow: "shadow-[0_0_50px_rgba(59,130,246,0.4)]",
    },
    fail: {
      text: "ПРОВАЛ",
      icon: XCircle,
      color: "text-orange-500",
      bg: "bg-orange-500/20",
      border: "border-orange-500/50",
      shadow: "shadow-[0_0_50px_rgba(249,115,22,0.4)]",
    },
    crit: {
      text: "КРИТИЧНИЙ УСПІХ!",
      icon: CheckCircle2,
      color: "text-yellow-400",
      bg: "bg-yellow-400/30",
      border: "border-yellow-400/60",
      shadow: "shadow-[0_0_70px_rgba(250,204,21,0.6)]",
    },
    crit_fail: {
      text: "КРИТИЧНА НЕВДАЧА!",
      icon: XCircle,
      color: "text-red-700",
      bg: "bg-red-900/40",
      border: "border-red-700/60",
      shadow: "shadow-[0_0_70px_rgba(185,28,28,0.6)]",
    },
  }[type];

  const Icon = config.icon;

  React.useEffect(() => {
    if (type) {
      const timer = setTimeout(onComplete, 2000);

      return () => clearTimeout(timer);
    }
  }, [type, onComplete]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {type && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 1.5, filter: "blur(20px)" }}
            transition={{
              type: "spring",
              damping: 12,
              stiffness: 200,
              duration: 0.4,
            }}
            className={cn(
              "px-6 py-6 sm:px-12 sm:py-8 rounded-3xl border-2 backdrop-blur-xl flex flex-col items-center gap-4 sm:gap-6",
              config.bg,
              config.border,
              config.shadow,
            )}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Icon className={cn("w-16 h-16 sm:w-24 sm:h-24", config.color)} />
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={cn(
                "text-3xl sm:text-7xl font-black italic uppercase tracking-tighter drop-shadow-2xl text-center",
                config.color,
              )}
            >
              {config.text}
            </motion.h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] -z-10"
          />
        </div>
      )}
    </AnimatePresence>
  );
}
