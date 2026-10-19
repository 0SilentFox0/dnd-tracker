"use client";

import { useState } from "react";

import { Portrait, type PortraitProps } from "./Portrait";

import { ImageZoomDialog } from "@/components/common/ImageZoomDialog";

interface ZoomablePortraitProps extends PortraitProps {
  /** перезапускає анімацію лише портрета — діалог збільшення лишається відкритим */
  flashKey?: string;
}

export function ZoomablePortrait({ flashKey, ...props }: ZoomablePortraitProps) {
  const { avatar, name } = props.participant.basicInfo;

  const [zoomed, setZoomed] = useState(false);

  if (!avatar) return <Portrait key={flashKey} {...props} />;

  return (
    <>
      <button type="button" aria-label={`${name}: аватар у повний розмір`} onClick={() => setZoomed(true)} className="cursor-zoom-in rounded-full">
        <Portrait key={flashKey} {...props} />
      </button>
      {zoomed && <ImageZoomDialog src={avatar} name={name} open onOpenChange={setZoomed} shape="square" />}
    </>
  );
}
