import { Label } from "@/components/ui/label";

/**
 * Label / hint / error row shared by every form in the app.
 *
 * `htmlFor` matters: without it the <Label> is visually adjacent to the control
 * but not programmatically associated with it, so a screen reader announces the
 * input unlabelled. Always pass the control's id.
 *
 * When `error` is present the message gets an id derived from `htmlFor`, which
 * callers should wire to the control's `aria-describedby` — `describedBy()`
 * below returns it for you.
 */
export function errorId(htmlFor?: string): string | undefined {
  return htmlFor ? `${htmlFor}-error` : undefined;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
  tone = "light",
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  /** "dark" restyles for use on the noir panels. */
  tone?: "light" | "dark";
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <Label
          htmlFor={htmlFor}
          className={
            tone === "dark"
              ? "text-xs font-medium uppercase tracking-[0.12em] text-white/70"
              : "text-xs font-medium uppercase tracking-[0.12em] text-ink/70"
          }
        >
          {label}
        </Label>
        {hint && (
          <span
            className={
              tone === "dark"
                ? "text-[10px] text-white/45"
                : "text-[10px] text-muted-foreground"
            }
          >
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <p
          id={errorId(htmlFor)}
          className="mt-1.5 text-xs font-medium text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
