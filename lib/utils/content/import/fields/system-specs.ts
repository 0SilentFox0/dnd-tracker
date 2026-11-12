// <systems:generated>
import { ARTIFACTSETS_IMPORT_SPECS } from "@/systems/artifactsets/rules/import-specs";
import { D20_IMPORT_SPECS } from "@/systems/d20/rules/import-specs";
import { SKILLTREES_IMPORT_SPECS } from "@/systems/skilltrees/rules/import-specs";
import type { ImportSpec } from '@/types/content-import';
// </systems:generated>

export const SYSTEM_IMPORT_SPECS: Record<string, ImportSpec> = {
    // <systems:generated>
    ...ARTIFACTSETS_IMPORT_SPECS,
    ...D20_IMPORT_SPECS,
    ...SKILLTREES_IMPORT_SPECS,
    // </systems:generated>
};
