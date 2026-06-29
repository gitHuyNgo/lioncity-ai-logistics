import React, { act } from "react";
import { createRoot } from "react-dom/client";

import { DataTable } from "../DataTable";
import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";
import { LoadingState } from "../LoadingState";
import { PageHeader } from "../PageHeader";
import { StatCard } from "../StatCard";
import { StatusBadge } from "../StatusBadge";
import { Modal } from "@/components/UI";

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
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("composite UI render and accessibility smoke tests", () => {
  it("renders PageHeader, StatCard, StatusBadge, and async states with semantic text", () => {
    const retry = jest.fn();
    const view = render(
      <div>
        <PageHeader title="Orders" subtitle="Dispatch queue" actions={<button type="button">Add</button>} />
        <StatCard label="Pending" value={12} delta="+2 today" />
        <StatusBadge status="delivering" />
        <EmptyState title="No records" message="Create one first." />
        <LoadingState label="Loading orders" />
        <ErrorState title="Could not load" message="Network error" onRetry={retry} />
      </div>
    );

    try {
      expect(view.container.querySelector("h1").textContent).toBe("Orders");
      expect(view.container.textContent).toContain("Pending");
      expect(view.container.textContent).toContain("Delivering");
      expect(view.container.textContent).toContain("No records");
      expect(view.container.textContent).toContain("Loading orders");
      const retryButton = [...view.container.querySelectorAll("button")].find((button) =>
        button.textContent.includes("Retry")
      );
      expect(retryButton).toBeTruthy();
      act(() => retryButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      expect(retry).toHaveBeenCalledTimes(1);
    } finally {
      view.cleanup();
    }
  });

  it("renders DataTable headers, rows, and numeric alignment without critical semantic gaps", () => {
    const view = render(
      <DataTable
        columns={[
          { key: "name", header: "Name", sortable: true },
          { key: "count", header: "Count", align: "right" },
        ]}
        rows={[{ id: "a", name: "Alpha", count: 7 }]}
        rowKey={(row) => row.id}
      />
    );

    try {
      expect(view.container.querySelector("table")).toBeTruthy();
      expect(view.container.querySelectorAll("th")).toHaveLength(2);
      expect(view.container.querySelectorAll("tbody tr")).toHaveLength(1);
      expect(view.container.querySelectorAll("td")[1].className).toContain("tabular-nums");
    } finally {
      view.cleanup();
    }
  });

  it("renders the shared Modal as a dialog with a title and focusable controls", () => {
    const close = jest.fn();
    const view = render(
      <Modal
        open
        title="Edit order"
        onClose={close}
        footer={<button type="button">Save</button>}
      >
        <button type="button">Focusable body control</button>
      </Modal>
    );

    try {
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
      expect(dialog.textContent).toContain("Edit order");
      expect(dialog.querySelectorAll("button").length).toBeGreaterThan(0);
    } finally {
      view.cleanup();
      document.body.innerHTML = "";
    }
  });
});
