"use client";

import { useState } from "react";

import { EntityIcon } from "@/components/common/EntityIcon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { HeroClusterGroup } from "@/lib/utils/world/hero-clusters";

interface HeroClusterProps {
  cluster: HeroClusterGroup;
  zoom: number;
  onHeroClick?(id: string): void;
}

export function HeroCluster({ cluster, zoom, onHeroClick }: HeroClusterProps) {
  const [open, setOpen] = useState(false);

  const [top, ...rest] = cluster.heroes;

  const style = { left: `${cluster.x * 100}%`, top: `${cluster.y * 100}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})`, touchAction: "none" } as const;

  const stop = (e: React.PointerEvent) => e.stopPropagation();

  const avatar = <EntityIcon src={top.avatar} name={top.name} size={30} className="size-full rounded-full bg-transparent text-inherit" />;

  if (rest.length === 0) {
    return (
      <button
        type="button"
        aria-label={top.name}
        data-own={top.own}
        className={cn("atlas-hero absolute", top.own && "atlas-hero-own")}
        style={style}
        onPointerDown={stop}
        onPointerUp={(e) => {
          e.stopPropagation();
          onHeroClick?.(top.id);
        }}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {avatar}
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${top.name} і ще ${rest.length}`}
          data-own={top.own}
          data-cluster={cluster.heroes.length}
          className={cn("atlas-hero atlas-hero-cluster absolute", top.own && "atlas-hero-own")}
          style={style}
          onPointerDown={stop}
          onPointerUp={stop}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {avatar}
          <span aria-hidden className="atlas-hero-badge">+{rest.length}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex w-48 flex-col gap-1 p-1">
        {cluster.heroes.map((h) => (
          <button
            key={h.id}
            type="button"
            className="flex items-center gap-2 rounded-sm px-1.5 py-1 text-left text-sm hover:bg-accent"
            onClick={() => {
              setOpen(false);
              onHeroClick?.(h.id);
            }}
          >
            <EntityIcon src={h.avatar} name={h.name} size={24} className="size-6 shrink-0 rounded-full" />
            <span className="truncate">{h.name}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
