import { cn } from "@/lib/utils";

interface FormAlertProps {
  children: React.ReactNode;
  className?: string;
}

export function FormAlert({ children, className }: FormAlertProps) {
  return (
    <p role="alert" className={cn("rounded-md border border-hud-danger/50 bg-hud-danger/10 px-3 py-2 text-sm text-destructive", className)}>
      {children}
    </p>
  );
}
