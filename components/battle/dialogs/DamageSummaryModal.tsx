"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
  /** При кількох цілях передати масив; тоді API викликається з targetIds і показується блок на ціль */
  targets?: BattleParticipant[];
  attack: BattleAttack;
  damageRolls: number[];
  /** @deprecated API fetches battle from DB; kept for backward compat with callers */
  allParticipants?: BattleParticipant[];
  isCritical?: boolean;
  campaignId: string;
  battleId: string;
  onApply: () => void;
}

const STAGGER_DELAY = 0.12;

const requestKey = (
  attackerId: string,
  targetIds: string[],
  attackId: string | undefined,
  attackName: string,
  isCritical: boolean,
  damageRolls: number[],
) =>
  `${attackerId}-${targetIds.join(",")}-${attackId ?? attackName}-${isCritical}-${damageRolls.join(",")}`;

function DamageSummaryContent({
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
}: {
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
}) {
  const [breakdown, setBreakdown] = useState<string[] | null>(null);

  const [totalDamage, setTotalDamage] = useState<number | null>(null);

  const [targetBreakdown, setTargetBreakdown] = useState<string[] | null>(null);

  const [finalDamage, setFinalDamage] = useState<number | null>(null);

  const [targetsResult, setTargetsResult] = useState<
    Array<{ targetId: string; targetName: string; targetBreakdown: string[]; finalDamage: number }> | null
  >(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const attackerId = attacker.basicInfo.id;

  const targets = targetsProp && targetsProp.length > 0 ? targetsProp : [target];
  const targetIds = targets.map((t) => t.basicInfo.id);
  const isMultiTarget = targets.length > 1;

  const attackId = attack.id ?? undefined;

  const attackName = attack.name ?? "";

  useEffect(() => {
    let cancelled = false;

    fetch(
      `/api/campaigns/${campaignId}/battles/${battleId}/damage-breakdown`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attackerId,
          ...(isMultiTarget ? { targetIds } : { targetId: targetIds[0] }),
          attackId: attackId ?? (attackName || undefined),
          damageRolls,
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
          if (Array.isArray(data.targets) && data.targets.length > 0) {
            setTargetsResult(data.targets);
            setTargetBreakdown(null);
            const sumFinal = (data.targets as Array<{ finalDamage?: number }>).reduce(
              (s, t) => s + (t.finalDamage ?? 0),
              0,
            );
            setFinalDamage(sumFinal);
          } else {
            setTargetsResult(null);
            setTargetBreakdown(Array.isArray(data.targetBreakdown) ? data.targetBreakdown : null);
            setFinalDamage(
              typeof data.finalDamage === "number" ? data.finalDamage : data.totalDamage ?? 0,
            );
          }
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
    campaignId,
    battleId,
    damageRolls,
    attackerId,
    targetIds.join(","),
    attackId,
    attackName,
    isCritical,
    isMultiTarget,
  ]);

  const handleApply = () => {
    onApply();
    onOpenChange(false);
  };

  return (
    <>
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
                  key={`b-${index}-${line}`}
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
                      <div key={`${tr.targetId}-${index}`} className="text-muted-foreground pl-2">
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

export function DamageSummaryModal({
  open,
  onOpenChange,
  attacker,
  target,
  targets: targetsProp,
  attack,
  damageRolls,
  isCritical = false,
  campaignId,
  battleId,
  onApply,
}: DamageSummaryModalProps) {
  const targets = targetsProp && targetsProp.length > 0 ? targetsProp : [target];
  const targetIds = targets.map((t) => t.basicInfo.id);
  const contentKey =
    open && damageRolls.length > 0
      ? requestKey(
          attacker.basicInfo.id,
          targetIds,
          attack.id ?? undefined,
          attack.name ?? "",
          isCritical,
          damageRolls,
        )
      : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto z-[110]">
        <DialogHeader>
          <DialogTitle>💥 Підсумок урону</DialogTitle>
          <DialogDescription>
            {attacker.basicInfo.name} → {targets.map((t) => t.basicInfo.name).join(", ")}
            {isCritical && " (крит!)"}
          </DialogDescription>
        </DialogHeader>

        {open && damageRolls.length > 0 ? (
          <DamageSummaryContent
            key={contentKey}
            campaignId={campaignId}
            battleId={battleId}
            attacker={attacker}
            target={target}
            targets={targets.length > 1 ? targets : undefined}
            attack={attack}
            damageRolls={damageRolls}
            isCritical={isCritical}
            onApply={onApply}
            onOpenChange={onOpenChange}
          />
        ) : (
          <>
            <div className="min-h-[120px] py-2" />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Скасувати
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
