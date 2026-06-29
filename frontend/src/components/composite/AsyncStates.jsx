/**
 * AsyncStates — barrel module re-exporting the async-state primitives used to
 * give every Async_View consistent loading, empty, and error feedback
 * (Requirement 5):
 *
 *   - {@link LoadingState} — skeleton that reserves the eventual content's
 *     dimensions so data arrival causes no layout shift (Req 5.1, 5.6).
 *   - {@link EmptyState}   — message naming absent data on a zero-record result
 *     (Req 5.3).
 *   - {@link ErrorState}   — message identifying the failed data plus a retry
 *     control (Req 5.4, 5.5).
 *
 * Import individually (`@/components/composite/EmptyState`) or together from
 * this barrel (`@/components/composite/AsyncStates`).
 */

export { EmptyState } from "./EmptyState";
export { LoadingState } from "./LoadingState";
export { ErrorState } from "./ErrorState";
