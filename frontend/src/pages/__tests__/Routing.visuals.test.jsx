import React, { act } from "react";
import { createRoot } from "react-dom/client";

import { ModeSelector, StopTimeline } from "../Routing";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../../lib/api", () => ({
  http: { get: jest.fn(), post: jest.fn() },
  fmtDist: (m) => `${m} m`,
  fmtDur: (s) => `${s} sec`,
}));

jest.mock("../../components/MapView", () => () => <div data-testid="mock-map" />);

jest.mock("../../context/TrackingContext", () => ({
  useTracking: () => ({
    isTracking: false,
    trackedDriverId: null,
    trackingData: null,
    startTracking: jest.fn(),
    stopTracking: jest.fn(),
  }),
}));

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

describe("Routing visual components", () => {
  it("ModeSelector renders all routing modes with labels, icons, and descriptions", () => {
    const onChange = jest.fn();
    const view = render(<ModeSelector value="time" onChange={onChange} disabled={false} />);
    try {
      expect(view.container.querySelector('[data-testid="routing-mode"]')).toBeTruthy();
      expect(view.container.textContent).toContain("Time Priority");
      expect(view.container.textContent).toContain("Eco");
      expect(view.container.textContent).toContain("Avoid ERP");
      expect(view.container.textContent).toContain("Fastest route");
      expect(view.container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3);

      const ecoButton = [...view.container.querySelectorAll("button")].find((button) =>
        button.textContent.includes("Eco")
      );
      act(() => ecoButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      expect(onChange).toHaveBeenCalledWith("eco");
    } finally {
      view.cleanup();
    }
  });

  it("StopTimeline renders sequence details and a non-color-only current stop cue", () => {
    const view = render(
      <StopTimeline
        orderedIds={["o1", "o2"]}
        currentIndex={1}
        ordersById={{
          o1: { id: "o1", code: "ORD-1", address: "1 Raffles Place", postal_code: "048616", weight_kg: 2, status: "delivered" },
          o2: { id: "o2", code: "ORD-2", address: "313 Orchard Road", postal_code: "238895", weight_kg: 3, status: "delivering" },
        }}
      />
    );
    try {
      expect(view.container.querySelectorAll("li")).toHaveLength(2);
      expect(view.container.textContent).toContain("ORD-1");
      expect(view.container.textContent).toContain("ORD-2");
      expect(view.container.textContent).toContain("Current");
      expect(view.container.querySelector(".ring-2")).toBeTruthy();
      expect(view.container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2);
    } finally {
      view.cleanup();
    }
  });
});
