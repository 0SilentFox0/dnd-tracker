import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const messageOf = (error: unknown) => (error instanceof Error && error.message ? error.message : "Щось пішло не так");

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 rounded-lg border border-destructive/40 px-4 py-8 text-center", className)}>
      <p className="text-sm text-destructive">{messageOf(error)}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="w-full sm:w-auto">
          Спробувати ще раз
        </Button>
      ) : null}
    </div>
  );
}
