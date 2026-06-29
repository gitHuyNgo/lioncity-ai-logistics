import React, { act } from "react";
import { createRoot } from "react-dom/client";

import { compareForSort, DataTable, MAX_SORTABLE_ROWS } from "../DataTable";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function render(ui) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    root,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const columns = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true, align: "right" },
];

const rows = [
  { id: "a", name: "Bravo", score: 2 },
  { id: "b", name: "Alpha", score: null },
  { id: "c", name: "Charlie", score: 1 },
];

function cellTexts(container, columnIndex) {
  return [...container.querySelectorAll("tbody tr")]
    .map((row) => row.querySelectorAll("td")[columnIndex]?.textContent)
    .filter(Boolean);
}

describe("compareForSort", () => {
  it("groups null/empty values at the end regardless of direction", () => {
    expect([2, null, 1, ""].sort((a, b) => compareForSort(a, b, 1))).toEqual([1, 2, null, ""]);
    expect([2, null, 1, ""].sort((a, b) => compareForSort(a, b, -1))).toEqual([2, 1, null, ""]);
  });
});

describe("DataTable", () => {
  it("sorts ascending then descending and shows one active aria-sort indicator", () => {
    const view = render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />);
    try {
      const [nameButton, scoreButton] = view.container.querySelectorAll("th button");

      expect(cellTexts(view.container, 0)).toEqual(["Bravo", "Alpha", "Charlie"]);

      act(() => nameButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      expect(cellTexts(view.container, 0)).toEqual(["Alpha", "Bravo", "Charlie"]);
      expect(view.container.querySelectorAll('th[aria-sort="ascending"]')).toHaveLength(1);
      expect(view.container.querySelector('th[aria-sort="ascending"]').textContent).toContain("Name");
      expect(view.container.querySelectorAll('th[aria-sort="none"]')).toHaveLength(1);

      act(() => nameButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      expect(cellTexts(view.container, 0)).toEqual(["Charlie", "Bravo", "Alpha"]);
      expect(view.container.querySelectorAll('th[aria-sort="descending"]')).toHaveLength(1);

      act(() => scoreButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      expect(cellTexts(view.container, 1)).toEqual(["1", "2", "—"]);
      expect(view.container.querySelector('th[aria-sort="ascending"]').textContent).toContain("Score");
    } finally {
      view.cleanup();
    }
  });

  it("prevents sorting above the row threshold", () => {
    const bigRows = Array.from({ length: MAX_SORTABLE_ROWS + 1 }, (_, index) => ({
      id: String(index),
      name: `Row ${MAX_SORTABLE_ROWS - index}`,
      score: index,
    }));

    const view = render(<DataTable columns={columns} rows={bigRows} rowKey={(row) => row.id} />);
    try {
      const firstBefore = view.container.querySelector("tbody tr td").textContent;
      const nameButton = view.container.querySelector("th button");
      expect(nameButton.disabled).toBe(true);

      act(() => nameButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      expect(view.container.querySelector("tbody tr td").textContent).toBe(firstBefore);
      expect(view.container.querySelectorAll('th[aria-sort="ascending"], th[aria-sort="descending"]')).toHaveLength(0);
    } finally {
      view.cleanup();
    }
  });

  it("renders loading, empty, hover, and numeric alignment states", () => {
    const loading = render(<DataTable columns={columns} rows={[]} rowKey={(row) => row.id} isLoading />);
    try {
      expect(loading.container.textContent).toContain("Loading table data");
    } finally {
      loading.cleanup();
    }

    const empty = render(<DataTable columns={columns} rows={[]} rowKey={(row) => row.id} emptyMessage="No drivers" />);
    try {
      expect(empty.container.textContent).toContain("No drivers");
    } finally {
      empty.cleanup();
    }

    const populated = render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />);
    try {
      const firstRow = populated.container.querySelector("tbody tr");
      const numericCell = firstRow.querySelectorAll("td")[1];
      expect(firstRow.className).toContain("hover:bg-muted/50");
      expect(numericCell.className).toContain("text-right");
      expect(numericCell.className).toContain("tabular-nums");
    } finally {
      populated.cleanup();
    }
  });
});
