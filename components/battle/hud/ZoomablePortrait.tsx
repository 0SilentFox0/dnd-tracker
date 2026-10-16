"use client";

import { useState } from "react";
import Image from "next/image";

import { Portrait, type PortraitProps } from "./Portrait";

import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

export function ZoomablePortrait(props: PortraitProps) {
  const { avatar, name } = props.participant.basicInfo;

  const [zoomed, setZoomed] = useState(false);

  if (!avatar) return <Portrait {...props} />;

  return (
    <>
      <button type="button" aria-label={`${name}: аватар у повний розмір`} onClick={() => setZoomed(true)} className="cursor-zoom-in rounded-full">
        <Portrait {...props} />
      </button>
      {zoomed && (
        <ResponsiveDialog open onOpenChange={setZoomed} title={name} size="lg" hud>
          <div className="relative mx-auto aspect-square w-full max-w-[min(80vh,640px)]">
            <Image src={avatar} alt={name} fill sizes="640px" className="object-contain" />
          </div>
        </ResponsiveDialog>
      )}
    </>
  );
}
