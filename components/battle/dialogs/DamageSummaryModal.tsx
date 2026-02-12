"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

interface DamageSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  damageRolls: number[];
  allParticipants: BattleParticipant[];
  isCritical?: boolean;
  campaignId: string;
  battleId: string;
  onApply: () => void;
}

const STAGGER_DELAY = 0.12;

export function DamageSummaryModal({
  open,
  onOpenChange,
  attacker,
  target,
  attack,
  damageRolls,
  allParticipants,
  isCritical = false,
  campaignId,
  battleId,
  onApply,
}: DamageSummaryModalProps) {
  const [breakdown, setBreakdown] = useState<string[] | null>(null);
  const [totalDamage, setTotalDamage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || damageRolls.length === 0) {
      setBreakdown(null);
      setTotalDamage(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(
      `/api/campaigns/${campaignId}/battles/${battleId}/damage-breakdown`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attacker,
          target,
          attack,
          damageRolls,
          allParticipants,
          isCritical,
        }),
      },
    )
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            (data as { error?: string })?.error ?? `Помилка (${res.status})`,
          );
        }
        return data;
      })
      .then((data) => {
        if (!cancelled) {
          setBreakdown(data.breakdown ?? []);
          setTotalDamage(data.totalDamage ?? 0);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Помилка завантаження");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    campaignId,
    battleId,
    damageRolls,
    attacker.basicInfo.id,
    target.basicInfo.id,
    attack.id ?? attack.name,
    isCritical,
  ]);

  const handleApply = () => {
    onApply();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto z-[110]">
        <DialogHeader>
          <DialogTitle>💥 Підсумок урону</DialogTitle>
          <DialogDescription>
            {attacker.basicInfo.name} → {target.basicInfo.name}
            {isCritical && " (крит!)"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[120px] space-y-2 py-2">
          {loading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Обчислення…
            </div>
          )}
          {error && (
            <p className="text-destructive text-sm py-4">{error}</p>
          )}
          <AnimatePresence mode="wait">
            {!loading && breakdown && breakdown.length > 0 && (
              <motion.div
                className="space-y-1.5 font-mono text-sm"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: { staggerChildren: STAGGER_DELAY },
                  },
                  hidden: {},
                }}
              >
                {breakdown.map((line, index) => (
                  <motion.div
                    key={`${index}-${line}`}
                    variants={{
                      hidden: {
                        opacity: 0,
                        y: -8,
                      },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: {
                          duration: 0.3,
                          ease: "easeOut",
                        },
                      },
                    }}
                    className={
                      line.startsWith("────")
                        ? "border-t border-border/60 pt-2 mt-2"
                        : line.startsWith("Всього") || line.includes("(крит)")
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                    }
                  >
                    {line}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Скасувати
          </Button>
          <Button
            onClick={handleApply}
            disabled={loading || !!error}
          >
            Застосувати {totalDamage != null ? `(${totalDamage} урону)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
