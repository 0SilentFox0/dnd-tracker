import { useState } from "react";
import { useTranslations } from "next-intl";

interface UseFileImportOptions<T> {
  onImport: (data: T[]) => Promise<{ imported: number; total: number; skipped?: number; warnings?: string[] }>;
  parseCSV?: (file: File) => Promise<T[]>;
  parseJSON?: (file: File) => Promise<T[]>;
}

type FileImportSuccess = { imported: number; total: number; skipped?: number; warnings?: string[] };

export interface UseFileImportReturn {
  file: File | null;
  status: {
    error: string | null;
    success: FileImportSuccess | null;
    isLoading: boolean;
  };
  actions: {
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleImport: () => Promise<void>;
    reset: () => void;
  };
}

export function useFileImport<T>({
  onImport,
  parseCSV,
  parseJSON,
}: UseFileImportOptions<T>): UseFileImportReturn {
  const t = useTranslations("common");

  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<FileImportSuccess | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();

      if (ext !== "csv" && ext !== "json") {
        setError(t("import.unsupportedType"));

        return;
      }

      setFile(selectedFile);
      setError(null);
      setSuccess(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError(t("import.pickFile"));

      return;
    }

    if (!parseCSV && !parseJSON) {
      setError(t("import.noParsers"));

      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      let data: T[];

      if (ext === "csv") {
        if (!parseCSV) {
          throw new Error(t("import.csvUnsupported"));
        }

        data = await parseCSV(file);
      } else if (ext === "json") {
        if (!parseJSON) {
          throw new Error(t("import.jsonUnsupported"));
        }

        data = await parseJSON(file);
      } else {
        throw new Error(t("import.unsupportedFormat"));
      }

      const result = await onImport(data);

      setSuccess({
        imported: result.imported,
        total: result.total,
        skipped: result.skipped,
        warnings: result.warnings,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t("import.failed");

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setError(null);
    setSuccess(null);
    setIsLoading(false);
  };

  return {
    file,
    status: { error, success, isLoading },
    actions: { handleFileChange, handleImport, reset },
  };
}
