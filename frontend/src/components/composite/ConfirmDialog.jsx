import * as React from "react";

import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

/**
 * ConfirmDialog — a reusable confirmation prompt for destructive (and other)
 * actions, built on the shadcn `AlertDialog` (Radix) primitive.
 *
 * Requirement 6 behavior:
 *   - Offers a confirm control and a cancel control (Req 6.8).
 *   - Does NOT execute the operation until the user activates confirm: the
 *     parent owns the action and only runs it from `onConfirm` (Req 6.8).
 *   - Activating cancel aborts the operation, leaves the target entity
 *     unchanged, and closes the prompt — `onCancel` performs no mutation and
 *     the dialog is dismissed via the controlled `open` state (Req 6.9).
 *
 * Accessibility / styling:
 *   - Radix `AlertDialog` traps focus, moves initial focus into the dialog,
 *     returns focus to the trigger on close, and supports Escape-to-dismiss.
 *   - All visual values resolve through Design_Tokens via Tailwind utilities
 *     and `buttonVariants` — no raw hex / inline palette (Requirement 1.2).
 *   - `destructive` styles the confirm button with the destructive token so a
 *     delete reads as dangerous; otherwise the default (primary) variant.
 *
 * Controlled component: the parent holds `open` and toggles it from the
 * `onConfirm` / `onCancel` callbacks (or `onOpenChange`).
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the prompt is visible (controlled).
 * @param {string} props.title - Prompt heading, e.g. 'Delete driver "John Tan"?'.
 * @param {React.ReactNode} [props.description] - Supporting copy describing the
 *   consequence of confirming.
 * @param {string} [props.confirmLabel="Confirm"] - Confirm control label.
 * @param {string} [props.cancelLabel="Cancel"] - Cancel control label.
 * @param {() => void} props.onConfirm - Invoked when the user activates confirm.
 *   The parent should perform the operation here, then close the dialog.
 * @param {() => void} [props.onCancel] - Invoked when the user cancels (cancel
 *   button, Escape, or overlay). Must not mutate the target entity (Req 6.9).
 * @param {boolean} [props.destructive=false] - Style confirm as destructive.
 * @param {(open: boolean) => void} [props.onOpenChange] - Optional raw Radix
 *   open-change handler. Defaults to calling `onCancel` when closing.
 * @returns {JSX.Element}
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
  onOpenChange,
} = {}) {
  // When the dialog requests to close (Escape, overlay, cancel) and the parent
  // has not supplied a custom handler, treat it as a cancel so the operation is
  // aborted and the entity left unchanged (Req 6.9).
  const handleOpenChange = (next) => {
    if (onOpenChange) {
      onOpenChange(next);
      return;
    }
    if (!next) onCancel?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onCancel?.()}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              destructive &&
                buttonVariants({ variant: "destructive" })
            )}
            onClick={() => onConfirm?.()}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmDialog;
