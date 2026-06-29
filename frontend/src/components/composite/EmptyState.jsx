import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * EmptyState — a tokenized message shown when an Async_View completes retrieval
 * and the result contains zero records (Requirement 5.3).
 *
 * Design notes:
 *   - The message names the absent data (e.g. "No drivers", "No orders found")
 *     so the user is never left looking at a blank region (Req 5.3).
 *   - All visual values resolve through Design_Tokens via Tailwind utilities
 *     (`text-foreground`, `text-muted-foreground`, `border`, `bg-muted`). No
 *     raw hex / inline palette values (Requirement 1.2).
 *   - Exposes `role="status"` so assistive technology announces the empty
 *     result, and `aria-live="polite"` so the announcement does not interrupt.
 *   - Centered layout with reserved padding so it occupies the content region
 *     in place of the loading indicator (Req 5.3).
 *
 * @param {Object} props
 * @param {string} props.title - Short heading naming the absent data
 *   (e.g. "No drivers"). Required so the message always names the data.
 * @param {string} [props.message] - Optional supporting copy under the title.
 * @param {import("lucide-react").LucideIcon} [props.icon] - Optional lucide
 *   icon shown above the title (decorative — hidden from assistive tech).
 * @param {React.ReactNode} [props.action] - Optional call-to-action control
 *   (e.g. a "Create order" button) rendered beneath the message.
 * @param {string} [props.className] - Optional extra classes for the wrapper.
 * @returns {JSX.Element}
 */
export function EmptyState({ title, message, icon: Icon, action, className } = {}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center",
        className
      )}
    >
      {Icon ? (
        <span
          aria-hidden="true"
          className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {message ? (
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
