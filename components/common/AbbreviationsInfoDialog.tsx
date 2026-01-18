"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ABILITY_SCORES } from "@/lib/constants/abilities";

export function AbbreviationsInfoDialog() {
  const [open, setOpen] = useState(false);

  // Витягуємо тільки основні характеристики (перші 6)
  const mainAbilities = ABILITY_SCORES.slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Довідка про абревіатури"
        >
          <Info className="h-4 w-4" />
          <span className="sr-only">Інформація про абревіатури</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Довідка про абревіатури</DialogTitle>
          <DialogDescription>
            Пояснення скорочень характеристик та параметрів
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <h3 className="font-semibold mb-2 text-sm">Основні характеристики:</h3>
            <div className="space-y-2">
              {mainAbilities.map((ability) => (
                <div
                  key={ability.key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{ability.abbreviation}</span>
                  <span className="text-muted-foreground">{ability.label}</span>
                </div>
              ))}
            </div>
          </div>
          {ABILITY_SCORES.length > 6 && (
            <div className="pt-2 border-t">
              <h3 className="font-semibold mb-2 text-sm">Інші параметри:</h3>
              <div className="space-y-2">
                {ABILITY_SCORES.slice(6).map((ability) => (
                  <div
                    key={ability.key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{ability.abbreviation}</span>
                    <span className="text-muted-foreground">{ability.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
