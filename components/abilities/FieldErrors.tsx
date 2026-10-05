export function FieldErrors({ errors, testId }: { errors: string[]; testId?: string }) {
  if (!errors.length) return null;

  return (
    <div data-testid={testId} className="space-y-0.5">
      {[...new Set(errors)].map((e) => (
        <p key={e} className="text-xs text-destructive">
          {e}
        </p>
      ))}
    </div>
  );
}
