"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import { useDamageBreakdown } from "@/lib/hooks/battle";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export const STAGGER_DELAY = 0.12;

export function requestKey(
  attackerId: string,
  targetIds: string[],
  attackId: string | undefined,
  attackName: string,
  isCritical: boolean,
  damageRolls: number[],
) {
  return `${attackerId}-${targetIds.join(",")}-${attackId ?? attackName}-${isCritical}-${damageRolls.join(",")}`;
}

interface DamageSummaryContentProps {
  campaignId: string;
  battleId: string;
  attacker: BattleParticipant;
  target: BattleParticipant;
  targets?: BattleParticipant[];
  attack: BattleAttack;
  damageRolls: number[];
  isCritical: boolean;
  onApply: () => void;
  onOpenChange: (open: boolean) => void;
}

export function DamageSummaryContent({
  campaignId,
  battleId,
  attacker,
  target,
  targets: targetsProp,
  attack,
  damageRolls,
  isCritical,
  onApply,
  onOpenChange,
}: DamageSummaryContentProps) {
  const targets = targetsProp && targetsProp.length > 0 ? targetsProp : [target];

  const targetIds = targets.map((t) => t.basicInfo.id);

  const request = {
    attackerId: attacker.basicInfo.id,
    targetIds,
    attackId: attack.id ?? undefined,
    damageRolls,
    isCritical,
  };

  const {
    breakdown,
    totalDamage,
    targetBreakdown,
    finalDamage,
    targetsResult,
    loading,
    error,
  } = useDamageBreakdown({
    campaignId,
    battleId,
    request,
    enabled: true,
  });

  const handleApply = () => {
    onApply();
    onOpenChange(false);
  };

  return (
    <>
      <div className="min-h-[120px] space-y-2 py-2">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span>Обчислення…</span>
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
                  key={`b-${index}-${line}`}
                  variants={{
                    hidden: { opacity: 0, y: -8 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.3, ease: "easeOut" },
                    },
                  }}
                  className={
                    line.startsWith("────")
                      ? "border-t border-border/60 pt-2 mt-2"
                      : line.includes("шкоди") || line.includes("(крит)")
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                  }
                >
                  {line}
                </motion.div>
              ))}
              {targetsResult && targetsResult.length > 0 ? (
                targetsResult.map((tr) => (
                  <motion.div
                    key={tr.targetId}
                    className="border-t border-border/60 pt-2 mt-2"
                    variants={{
                      hidden: { opacity: 0, y: -8 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.3, ease: "easeOut" },
                      },
                    }}
                  >
                    <span className="font-medium text-foreground">
                      Ціль: {tr.targetName}
                    </span>
                    {tr.targetBreakdown.map((line, index) => (
                      <div
                        key={`${tr.targetId}-${index}`}
                        className="text-muted-foreground pl-2"
                      >
                        {line}
                      </div>
                    ))}
                  </motion.div>
                ))
              ) : (
                targetBreakdown &&
                targetBreakdown.length > 0 && (
                  <>
                    <motion.div
                      className="border-t border-border/60 pt-2 mt-2"
                      variants={{
                        hidden: { opacity: 0, y: -8 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.3, ease: "easeOut" },
                        },
                      }}
                    >
                      <span className="font-medium text-foreground">
                        Ціль: {target.basicInfo.name}
                      </span>
                    </motion.div>
                    {targetBreakdown.map((line, index) => (
                      <motion.div
                        key={`t-${index}-${line}`}
                        variants={{
                          hidden: { opacity: 0, y: -8 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: { duration: 0.3, ease: "easeOut" },
                          },
                        }}
                        className="text-muted-foreground pl-2"
                      >
                        {line}
                      </motion.div>
                    ))}
                  </>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Скасувати
        </Button>
        <Button
          onClick={handleApply}
          disabled={loading || !!error}
        >
          Застосувати{" "}
          {finalDamage != null
            ? `(${finalDamage} урону)`
            : totalDamage != null
              ? `(${totalDamage} урону)`
              : ""}
        </Button>
      </DialogFooter>
    </>
  );
}
