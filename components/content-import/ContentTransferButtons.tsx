"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Download, FileJson, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useContentTransferUrls } from "@/lib/hooks/content-import";
import type { ImportKind } from "@/types/content-import";

// csv-parse and the wizard load only when the dialog opens
const ContentImportWizard = dynamic(() => import("./ContentImportWizard").then((m) => m.ContentImportWizard), { ssr: false });

export function ContentTransferButtons({ campaignId, kind }: { campaignId: string; kind: ImportKind }) {
  const [open, setOpen] = useState(false);

  const urls = useContentTransferUrls(campaignId, kind);

  return (
    <>
      <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        Імпорт
      </Button>
      <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm" asChild>
        <a href={urls.export} download>
          <Download className="h-4 w-4" />
          Експорт CSV
        </a>
      </Button>
      <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm" asChild>
        <Link href={`/campaigns/${campaignId}/dm/compendium`}>
          <FileJson className="h-4 w-4" />
          JSON-компендіум і звіти
        </Link>
      </Button>
      {open && <ContentImportWizard campaignId={campaignId} kind={kind} open={open} onOpenChange={setOpen} />}
    </>
  );
}
