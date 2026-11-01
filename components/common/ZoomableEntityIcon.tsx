"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { EntityIcon, type EntityIconProps, isImageSrc } from "@/components/common/EntityIcon";
import { ImageZoomDialog } from "@/components/common/ImageZoomDialog";

export function ZoomableEntityIcon(props: EntityIconProps) {
  const t = useTranslations("common.actions");

  const [open, setOpen] = useState(false);

  const src = props.src?.trim();

  if (!src || !isImageSrc(src)) return <EntityIcon {...props} />;

  return (
    <>
      <button type="button" aria-label={t("zoomIcon", { name: props.name })} className="shrink-0 cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-hud-gold" onClick={() => setOpen(true)}>
        <EntityIcon {...props} />
      </button>
      <ImageZoomDialog src={src} name={props.name} open={open} onOpenChange={setOpen} shape="square" />
    </>
  );
}
