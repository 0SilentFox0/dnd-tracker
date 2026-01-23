import { useState } from "react";

export interface UseFileImportOptions<T> {
  onImport: (data: T[]) => Promise<{ imported: number; total: number; skipped?: number }>;
  parseCSV?: (file: File) => Promise<T[]>;
  parseJSON?: (file: File) => Promise<T[]>;
}

export interface UseFileImportReturn {
  file: File | null;
  error: string | null;
  success: { imported: number; total: number } | null;
  isLoading: boolean;
  setFile: (file: File | null) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: { imported: number; total: number } | null) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImport: () => Promise<void>;
  reset: () => void;
}

/**
 * Загальний хук для імпорту файлів
 */
export function useFileImport<T>({
  onImport,
  parseCSV,
  parseJSON,
}: UseFileImportOptions<T>): UseFileImportReturn {
  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<{ imported: number; total: number } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();

      if (ext !== "csv" && ext !== "json") {
        setError("Підтримуються тільки CSV та JSON файли");

        return;
      }

      setFile(selectedFile);
      setError(null);
      setSuccess(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("Виберіть файл для імпорту");

      return;
    }

    if (!parseCSV && !parseJSON) {
      setError("Не вказано функції парсингу");

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
          throw new Error("CSV парсинг не підтримується");
        }

        data = await parseCSV(file);
      } else if (ext === "json") {
        if (!parseJSON) {
          throw new Error("JSON парсинг не підтримується");
        }

        data = await parseJSON(file);
      } else {
        throw new Error("Непідтримуваний формат файлу");
      }

      const result = await onImport(data);

      setSuccess({
        imported: result.imported,
        total: result.total,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Помилка при імпорті";

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
    error,
    success,
    isLoading,
    setFile,
    setError,
    setSuccess,
    handleFileChange,
    handleImport,
    reset,
  };
}
