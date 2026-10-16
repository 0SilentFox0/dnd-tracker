"use client";

import { useState } from "react";

import { Portrait, type PortraitProps } from "./Portrait";

import { ImageZoomDialog } from "@/components/common/ImageZoomDialog";

export function ZoomablePortrait(props: PortraitProps) {
  const { avatar, name } = props.participant.basicInfo;

  const [zoomed, setZoomed] = useState(false);

  if (!avatar) return <Portrait {...props} />;

  return (
    <>
      <button type="button" aria-label={`${name}: аватар у повний розмір`} onClick={() => setZoomed(true)} className="cursor-zoom-in rounded-full">
        <Portrait {...props} />
      </button>
      {zoomed && <ImageZoomDialog src={avatar} name={name} open onOpenChange={setZoomed} shape="square" />}
    </>
  );
}
