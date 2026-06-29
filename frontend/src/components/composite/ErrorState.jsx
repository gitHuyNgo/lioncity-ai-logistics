import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * ErrorState — shown when an Async_View fails to retrieve data (Requirement 5.4).
 *
 * Design notes:
 *   - The message identifies the failed data (e.g. "Couldn't load drivers") so
 *     the user knows exactly what failed (Req 5.4).
 *   - Renders a real `<button>` retry control (the shadcn `Button`) that calls
 *     `onRetry`; activating it re-attempts retrieval (Req 5.5). The button is
 *     keyboard-operable and focus-visible by default.
 *   - Exposes `role="alert"` with `aria-live="assertive"` so assistive
 *     technology announces the failure promptly.
 *   - All visual values resolve through Design_Tokens via Tailwind utilities
 *     (`text-destructive`, `text-foreground`, `border`). No raw hex.
 *
 * @param {Object} props
 * @param {string} props.message - Error text identifying the failed data
 *   (e.g. "Couldn't load drivers. Please try again.").
 * @param {() => void} [props.onRetry] - Invoked when the retry control is
 *   activated. When omitted, no retry button is rendered.
 * @param {string} [props.retryLabel="Retry"] - Accessible label/text for the
 *   retry control.
 * @param {string} [props.className] - Optional extra classes for the wrapper.
 * @returns {JSX.Element}
 */
export function ErrorState({
  message,
  onRetry,
  retryLabel = "Retry",
  className,
} = {}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <AlertTriangle className="h-5 w-5" />
      </span>
      <p className="max-w-sm text-sm font-medium text-foreground">{message}</p>
      {typeof onRetry === "function" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-1.5"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default ErrorState;
