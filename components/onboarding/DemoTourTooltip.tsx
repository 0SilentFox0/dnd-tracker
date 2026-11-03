"use client";

import type { TooltipRenderProps } from "react-joyride";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DemoTourTooltip({ backProps, closeProps, index, isLastStep, primaryProps, size, skipProps, step, tooltipProps }: TooltipRenderProps) {
  return (
    <div {...tooltipProps} data-joyride-step={index} className="w-[min(380px,calc(100vw-32px))] rounded-xl border border-hud-gold/60 bg-hud-panel p-4 text-hud-bone shadow-[0_0_0_1px_var(--color-hud-edge-faint),0_18px_40px_rgba(0,0,0,0.65)] backdrop-blur-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {step.title && <h4 className="hud-sc text-base text-hud-ink">{step.title}</h4>}
          <div className="mt-1 text-sm text-hud-bone">{step.content}</div>
        </div>
        <button type="button" {...closeProps} className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-hud-muted transition-colors hover:text-hud-ink">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="hud-sc text-xs text-hud-muted">{index + 1} / {size}</span>
        {!isLastStep && <Button type="button" variant="link" size="sm" {...skipProps} className="px-1 text-hud-muted hover:text-hud-ink" />}
        <span className="flex-1" />
        {index > 0 && <Button type="button" variant="outline" size="sm" {...backProps} className="border-hud-gold/50 bg-transparent text-hud-bone hover:bg-hud-gold/10 hover:text-hud-ink" />}
        <Button type="button" size="sm" {...primaryProps} />
      </div>
    </div>
  );
}
