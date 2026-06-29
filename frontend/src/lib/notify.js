import { toast } from "@/components/ui/sonner";

/**
 * Notification helpers wrapping the `sonner` toast API to enforce the
 * Notification_System behavior from Requirement 6.
 *
 * These helpers exist so every create/update/delete outcome produces a message
 * that *identifies the operation type and the affected entity* (Req 6.1), and,
 * on failure, the *reason* (Req 6.2) — rather than relying on each caller to
 * format a string consistently.
 *
 * Durations:
 * - success: 5000ms — inside the required 4–6s auto-dismiss band (Req 6.4).
 * - error:   Infinity — stays visible until the user dismisses it (Req 6.5).
 *
 * Concurrency cap (max 3, queueing) and the dismiss control are configured on
 * the <Toaster/> mounted in App.js (`visibleToasts={3}`, `closeButton`).
 */

/** Auto-dismiss window for success toasts (ms). Must be within 4000–6000. */
export const SUCCESS_DURATION = 5000;

/**
 * Human-friendly verb for an operation type, used to build the message.
 * @param {"create"|"update"|"delete"|string} operation
 * @param {boolean} success - whether to use the completed or failed phrasing
 */
function operationVerb(operation, success) {
  const map = {
    create: success ? "created" : "create",
    update: success ? "updated" : "update",
    delete: success ? "deleted" : "delete",
  };
  const key = String(operation || "").toLowerCase();
  return map[key] || (success ? `${operation} completed` : operation);
}

/**
 * Capitalize the first character of a label for use as a title.
 * @param {string} value
 */
function titleCase(value) {
  const s = String(value || "").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Build the success message identifying the operation type + entity (Req 6.1).
 * @param {string} operation - e.g. "create" | "update" | "delete"
 * @param {string} entity - entity name or identifier, e.g. `Driver "John Tan"`
 * @returns {string}
 */
export function formatSuccessMessage(operation, entity) {
  const verb = operationVerb(operation, true);
  return titleCase(`${entity} ${verb}`.trim());
}

/**
 * Build the error message identifying operation + entity + reason (Req 6.2).
 * @param {string} operation - e.g. "create" | "update" | "delete"
 * @param {string} entity - entity name or identifier
 * @param {string} [reason] - failure reason
 * @returns {string}
 */
export function formatErrorMessage(operation, entity, reason) {
  const verb = operationVerb(operation, false);
  const base = titleCase(`Failed to ${verb} ${entity}`.trim());
  return reason ? `${base}: ${reason}` : base;
}

/**
 * Show a success notification. Auto-dismisses within the 4–6s band (Req 6.4)
 * and names the operation + affected entity (Req 6.1).
 *
 * @param {string} operation - operation type ("create" | "update" | "delete")
 * @param {string} entity - affected entity name or identifier
 * @param {import("sonner").ExternalToast} [options] - extra sonner options
 * @returns {string|number} the toast id
 */
export function notifySuccess(operation, entity, options = {}) {
  return toast.success(formatSuccessMessage(operation, entity), {
    duration: SUCCESS_DURATION,
    ...options,
  });
}

/**
 * Show an error notification. Persists until the user dismisses it (Req 6.5)
 * and names the operation, entity, and reason for failure (Req 6.2).
 *
 * @param {string} operation - operation type ("create" | "update" | "delete")
 * @param {string} entity - affected entity name or identifier
 * @param {string|Error} [reason] - failure reason (Error messages are unwrapped)
 * @param {import("sonner").ExternalToast} [options] - extra sonner options
 * @returns {string|number} the toast id
 */
export function notifyError(operation, entity, reason, options = {}) {
  const text =
    reason instanceof Error ? reason.message : reason ? String(reason) : "";
  return toast.error(formatErrorMessage(operation, entity, text), {
    duration: Infinity,
    ...options,
  });
}

/**
 * Show a neutral informational notification (auto-dismiss within the band).
 * @param {string} message
 * @param {import("sonner").ExternalToast} [options]
 * @returns {string|number} the toast id
 */
export function notifyInfo(message, options = {}) {
  return toast(message, { duration: SUCCESS_DURATION, ...options });
}

/** Re-export the raw sonner toast for advanced/custom cases. */
export { toast };
