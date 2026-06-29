import * as React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/composite/EmptyState";
import { LoadingState } from "@/components/composite/LoadingState";

/**
 * Maximum number of rows for which client-side sorting is permitted. Above this
 * threshold a sort request is a no-op and the displayed order / direction
 * indicators are left unchanged (Requirement 8.3 — updated criterion).
 */
export const MAX_SORTABLE_ROWS = 1000;

/**
 * @typedef {Object} DataTableColumn
 * @property {string} key - Unique column key; used to read the sort value from
 *   each row (`row[key]`) and as the React key for header/cells.
 * @property {React.ReactNode} header - Header label.
 * @property {"left"|"right"|"center"} [align] - Cell/header alignment. "right"
 *   marks the column as numeric: it is right-aligned and rendered with
 *   tabular (fixed-width) figures (Requirement 8.9).
 * @property {(row: any) => React.ReactNode} [render] - Optional custom cell
 *   renderer. Sorting still uses the raw `row[key]` value, not the rendered
 *   output.
 * @property {boolean} [sortable] - Whether the column header is an activatable
 *   sort control.
 */

/**
 * DataTable — a responsive, accessible table built exclusively on the shared
 * Design_System `Table` primitive and composite states (no table-specific
 * styling defined outside the Design_System) (Requirement 8.1).
 *
 * Features:
 *   - Client-side sort on `sortable` columns: first activation sorts ascending,
 *     a second activation of the same column sorts descending (Req 8.2, 8.4).
 *   - Sorting is PREVENTED when there are more than {@link MAX_SORTABLE_ROWS}
 *     rows: activating a sortable header does nothing and leaves the row order
 *     and direction indicators unchanged (Req 8.3).
 *   - A direction indicator (chevron) is shown ONLY on the currently sorted
 *     column header; all other headers show no direction indicator (Req 8.5).
 *   - Null / empty values in the sorted column are grouped together at the END
 *     of the order regardless of sort direction (Req 8.6).
 *   - Empty state (zero rows) is rendered via the shared {@link EmptyState}
 *     composite (Req 8.7).
 *   - Loading uses the shared {@link LoadingState} skeleton (`variant="table"`)
 *     which reserves vertical space so surrounding content does not shift.
 *   - Row hover applies a token highlight, removed on leave (Req 8.8).
 *   - Numeric columns (`align: "right"`) are right-aligned with tabular figures
 *     (Req 8.9).
 *   - Below 1023px overflow is confined to horizontal scrolling within the
 *     table region (the `overflow-x-auto` wrapper) so the document body does
 *     not produce a horizontal scrollbar (Req 2.4).
 *
 * Sort headers are real `<button>` elements, so they are keyboard operable
 * (Tab to focus, Enter/Space to activate). All visual values resolve through
 * Design_Tokens via Tailwind utilities — no raw hex.
 *
 * @template Row
 * @param {Object} props
 * @param {DataTableColumn[]} props.columns - Column definitions.
 * @param {Row[]} props.rows - The data rows to display.
 * @param {(row: Row) => string} props.rowKey - Returns a stable unique key per row.
 * @param {string} [props.emptyMessage="No records available."] - Message shown
 *   when there are zero rows.
 * @param {boolean} [props.isLoading=false] - When true, render the loading
 *   skeleton in place of rows.
 * @param {(row: Row) => void} [props.onRowClick] - Optional row activation
 *   handler; when provided rows become keyboard-activatable.
 * @param {string} [props.className] - Extra classes for the scroll wrapper.
 * @returns {JSX.Element}
 */
export function DataTable({
  columns = [],
  rows = [],
  rowKey,
  emptyMessage = "No records available.",
  isLoading = false,
  onRowClick,
  className,
} = {}) {
  /** @type {[{key: string, dir: "asc"|"desc"}|null, Function]} */
  const [sort, setSort] = React.useState(null);

  const sortDisabled = rows.length > MAX_SORTABLE_ROWS;

  const handleSort = React.useCallback(
    (column) => {
      if (!column.sortable) return;
      // Req 8.3: sorting is prevented above the row threshold — no-op, leaving
      // the displayed order and direction indicators unchanged.
      if (rows.length > MAX_SORTABLE_ROWS) return;

      setSort((prev) => {
        if (!prev || prev.key !== column.key) {
          // First activation of this column → ascending (Req 8.2).
          return { key: column.key, dir: "asc" };
        }
        if (prev.dir === "asc") {
          // Already ascending → descending (Req 8.4).
          return { key: column.key, dir: "desc" };
        }
        // Already descending → back to ascending.
        return { key: column.key, dir: "asc" };
      });
    },
    [rows.length]
  );

  const sortedRows = React.useMemo(() => {
    if (!sort) return rows;
    const dirFactor = sort.dir === "asc" ? 1 : -1;
    // Copy so we never mutate the caller's array.
    return [...rows].sort((a, b) =>
      compareForSort(a?.[sort.key], b?.[sort.key], dirFactor)
    );
  }, [rows, sort]);

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            {columns.map((column) => {
              const isSorted = sort?.key === column.key;
              const align = column.align ?? "left";
              return (
                <TableHead
                  key={column.key}
                  aria-sort={
                    isSorted
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : column.sortable
                      ? "none"
                      : undefined
                  }
                  className={cn(
                    align === "right" && "text-right",
                    align === "center" && "text-center"
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column)}
                      disabled={sortDisabled}
                      aria-disabled={sortDisabled || undefined}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        sortDisabled && "cursor-not-allowed opacity-60 hover:text-muted-foreground",
                        align === "right" && "flex-row-reverse"
                      )}
                    >
                      <span>{column.header}</span>
                      {isSorted ? (
                        sort.dir === "asc" ? (
                          <ChevronUp aria-hidden="true" className="h-4 w-4" />
                        ) : (
                          <ChevronDown aria-hidden="true" className="h-4 w-4" />
                        )
                      ) : (
                        <ChevronsUpDown
                          aria-hidden="true"
                          className="h-4 w-4 opacity-50"
                        />
                      )}
                    </button>
                  ) : (
                    <span className="font-medium">{column.header}</span>
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                <LoadingState
                  variant="table"
                  columns={columns.length || 1}
                  rows={5}
                  className="p-2"
                  label="Loading table data"
                />
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                <EmptyState title={emptyMessage} className="border-0 bg-transparent" />
              </TableCell>
            </TableRow>
          ) : (
            sortedRows.map((row) => {
              const clickable = typeof onRowClick === "function";
              return (
                <TableRow
                  key={rowKey(row)}
                  onClick={clickable ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? "button" : undefined}
                  className={cn(
                    "transition-colors hover:bg-muted/50",
                    clickable &&
                      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  )}
                >
                  {columns.map((column) => {
                    const align = column.align ?? "left";
                    return (
                      <TableCell
                        key={column.key}
                        className={cn(
                          align === "right" && "text-right tabular-nums",
                          align === "center" && "text-center"
                        )}
                      >
                        {column.render ? column.render(row) : formatCell(row?.[column.key])}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Returns true when a value is considered empty/null for sorting purposes:
 * `null`, `undefined`, or a string that is empty after trimming.
 * @param {*} value
 * @returns {boolean}
 */
function isEmptyValue(value) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

/**
 * Comparator used for client-side sorting.
 *
 * Empty/null values are always grouped at the END regardless of sort direction
 * (Requirement 8.6): emptiness is resolved BEFORE the direction factor is
 * applied. Non-empty values compare numerically when both are numbers, and
 * otherwise via a locale-aware, numeric-aware string comparison.
 *
 * @param {*} a
 * @param {*} b
 * @param {number} dirFactor - 1 for ascending, -1 for descending.
 * @returns {number}
 */
export function compareForSort(a, b, dirFactor) {
  const aEmpty = isEmptyValue(a);
  const bEmpty = isEmptyValue(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1; // a goes after b (end), independent of direction
  if (bEmpty) return -1; // b goes after a (end), independent of direction

  let cmp;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }
  return cmp * dirFactor;
}

/**
 * Default cell formatter for columns without a custom `render`. Empty/null
 * values render as an em dash so the cell is never visually blank.
 * @param {*} value
 * @returns {React.ReactNode}
 */
function formatCell(value) {
  if (isEmptyValue(value)) return "—";
  return value;
}

export default DataTable;
