import React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

/**
 * Modal — the app's shared dialog, re-implemented on top of the Design_System
 * shadcn `Dialog` (Radix) while preserving the original public API so existing
 * callers (`Zones`, `Vehicles`, `Shipper`, ...) keep working unchanged.
 *
 * Radix Dialog provides the accessibility behaviors required by Requirement 9:
 *   - Focus trap: focus is confined to the dialog and cycles last↔first (9.4).
 *   - Initial focus: focus moves to the first focusable element on open (9.5).
 *     `DialogContent` always renders a Close button, so every modal has at
 *     least one focusable element even when its body has none (9.5).
 *   - Focus return: focus returns to the trigger/previously focused element on
 *     close (9.6).
 *   - Escape-to-close: pressing Escape closes the dialog (9.7).
 *
 * Styling is token-only (inherited from `DialogContent`/`DialogTitle`); no
 * `.modal-backdrop`/`.modal` legacy classes and no raw hex (Req 9.1, 1.2).
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open.
 * @param {string} [props.title] - Dialog title (rendered as the accessible
 *   `DialogTitle`).
 * @param {() => void} [props.onClose] - Called when the dialog requests to
 *   close (Escape, overlay click, or the close button).
 * @param {React.ReactNode} [props.children] - Dialog body content.
 * @param {React.ReactNode} [props.footer] - Optional action buttons rendered in
 *   the dialog footer.
 * @returns {JSX.Element}
 */
export function Modal({ open, title, onClose, children, footer }) {
  return (
    <Dialog
      open={!!open}
      onOpenChange={(next) => {
        if (!next) {
          onClose?.();
        }
      }}
    >
      <DialogContent data-testid="modal">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {title ? `${title} dialog` : "Dialog"}
          </DialogDescription>
        </DialogHeader>
        <div>{children}</div>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

export function Badge({ children, tone = "default" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Empty({ title = "Nothing here yet", hint }) {
  return (
    <div className="empty">
      <div className="mb-1 font-semibold text-foreground">{title}</div>
      {hint && <div>{hint}</div>}
    </div>
  );
}
