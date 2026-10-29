import Link from "next/link";
import { useTranslations } from "next-intl";
import { Map as MapIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface WorldMapLinkProps {
  campaignId: string;
  variant: "button" | "toggle";
  newTab?: boolean;
}

export function WorldMapLink({ campaignId, variant, newTab }: WorldMapLinkProps) {
  const t = useTranslations("world");

  const href = `/campaigns/${campaignId}/dm/world`;

  const target = newTab ? { target: "_blank", rel: "noopener" } : {};

  const content = (
    <>
      <MapIcon className="size-4" aria-hidden />
      {t("mapLink")}
    </>
  );

  if (variant === "toggle") {
    return (
      <Link className="toggle sb-hide-sm inline-flex items-center gap-1.5 whitespace-nowrap" href={href} {...target}>
        {content}
      </Link>
    );
  }

  return (
    <Button asChild variant="outline">
      <Link href={href} className="flex items-center gap-2" {...target}>
        {content}
      </Link>
    </Button>
  );
}
