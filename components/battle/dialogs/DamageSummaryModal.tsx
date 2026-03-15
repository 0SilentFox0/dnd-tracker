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
  targetId: string,
  attackId: string | undefined,
  attackName: string,
  isCritical: boolean,
  damageRolls: number[],
) =>
  `${attackerId}-${targetId}-${attackId ?? attackName}-${isCritical}-${damageRolls.join(",")}`;

function DamageSummaryContent({
  campaignId,
  battleId,
  attacker,
  target,
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
  attack: BattleAttack;
  damageRolls: number[];
  isCritical: boolean;
  onApply: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [breakdown, setBreakdown] = useState<string[] | null>(null);

  const [totalDamage, setTotalDamage] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const attackerId = attacker.basicInfo.id;

  const targetId = target.basicInfo.id;

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
          targetId,
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
    targetId,
    attackId,
    attackName,
    isCritical,
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
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Скасувати
        </Button>
        <Button
          onClick={handleApply}
          disabled={loading || !!error}
        >
          Застосувати {totalDamage != null ? `(${totalDamage} урону)` : ""}
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
  attack,
  damageRolls,
  isCritical = false,
  campaignId,
  battleId,
  onApply,
}: DamageSummaryModalProps) {
  const contentKey =
    open && damageRolls.length > 0
      ? requestKey(
          attacker.basicInfo.id,
          target.basicInfo.id,
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
            {attacker.basicInfo.name} → {target.basicInfo.name}
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
