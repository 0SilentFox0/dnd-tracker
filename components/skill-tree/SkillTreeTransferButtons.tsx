"use client";

import { useRef } from "react";
import { Download, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSkillTreeTransfer } from "@/lib/hooks/skills";

export function SkillTreeTransferButtons({ campaignId }: { campaignId: string }) {
  const transfer = useSkillTreeTransfer(campaignId);

  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <input
        ref={input}
        type="file"
        accept=".json"
        className="hidden"
        aria-label="Файл дерев скілів"
        onChange={(e) => {
          const file = e.target.files?.[0];

          e.target.value = "";

          if (file) void transfer.actions.importFile(file);
        }}
      />
      <Button variant="outline" size="sm" disabled={!transfer.ready || transfer.busy} onClick={() => input.current?.click()}>
        <Upload className="h-4 w-4" />
        Імпорт JSON
      </Button>
      <Button variant="outline" size="sm" disabled={!transfer.ready} onClick={transfer.actions.exportAll}>
        <Download className="h-4 w-4" />
        Експорт JSON
      </Button>
    </div>
  );
}
