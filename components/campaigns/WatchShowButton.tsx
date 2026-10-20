"use client";

import { Images } from "lucide-react";

import { HeaderPillLink } from "@/components/campaigns/HeaderPillLink";
import { useWatchShow } from "@/lib/hooks/campaigns";

export function WatchShowButton() {
  const { href } = useWatchShow();

  return href ? <HeaderPillLink href={href} icon={Images} label="ПОКАЗ" srLabel="Дивитися показ" /> : null;
}
