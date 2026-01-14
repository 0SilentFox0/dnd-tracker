"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import type { UseFileImportReturn } from "@/lib/hooks/useFileImport";

interface ImportDialogProps {
  triggerLabel?: string;
  title?: string;
  description?: string;
  importHook: UseFileImportReturn;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

export function ImportDialog({
  triggerLabel = "Імпортувати",
  title = "Імпорт",
  description = "Завантажте CSV або JSON файл для масового імпорту",
  importHook,
  onOpenChange,
  open,
}: ImportDialogProps) {
  const {
    file,
    error,
    success,
    isLoading,
    handleFileChange,
    handleImport,
    reset,
  } = importHook;

  const handleDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
    }
    onOpenChange?.(newOpen);
  };

  const handleImportClick = async () => {
    await handleImport();
    // Закриваємо діалог через 2 секунди після успішного імпорту
    if (success) {
      setTimeout(() => {
        handleDialogOpenChange(false);
      }, 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Файл</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                disabled={isLoading}
                className="w-full"
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Успішно імпортовано {success.imported} з {success.total} записів
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isLoading}
            >
              Скасувати
            </Button>
            <Button onClick={handleImportClick} disabled={isLoading || !file}>
              {isLoading ? "Імпорт..." : "Імпортувати"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
