"use client";

import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";

import { importCampaign } from "@/lib/api/templates";
import { useFileImport } from "@/lib/hooks/common";
import { parseJSONFile } from "@/lib/utils/common/file-import";
import type { BundleFile, CampaignBundle } from "@/types/campaigns";

export function useImportCampaign() {
  return useMutation({ mutationFn: importCampaign });
}

const countEntities = (bundle: CampaignBundle) =>
  Object.entries(bundle).reduce((sum, [key, value]) => (key !== "rules" && Array.isArray(value) ? sum + value.length : sum), 0);

export function useBundleFilePicker(onPick: (file: BundleFile) => void) {
  const fileName = useRef("");

  return useFileImport<CampaignBundle>({
    parseJSON: (file) => {
      fileName.current = file.name;

      return parseJSONFile<CampaignBundle>(file);
    },
    onImport: async ([bundle]) => {
      const entities = countEntities(bundle);

      onPick({ name: fileName.current, bundle, entities });

      return { imported: entities, total: entities };
    },
  });
}
