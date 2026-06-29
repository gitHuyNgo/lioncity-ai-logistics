import React, { act } from "react";
import { createRoot } from "react-dom/client";

import { MOBILE_MAX_WIDTH, useBreakpoint, widthToBreakpoint } from "../useBreakpoint";
import { useMediaQuery } from "../useMediaQuery";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setViewportWidth(width) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
}

describe("useBreakpoint", () => {
  let container;
  let root;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("maps breakpoint thresholds and mobile state correctly", () => {
    expect(widthToBreakpoint(375)).toBe("base");
    expect(widthToBreakpoint(640)).toBe("sm");
    expect(widthToBreakpoint(768)).toBe("md");
    expect(widthToBreakpoint(1024)).toBe("lg");
    expect(widthToBreakpoint(1280)).toBe("xl");
    expect(widthToBreakpoint(1536)).toBe("2xl");
    expect(MOBILE_MAX_WIDTH).toBe(768);
  });

  it("updates from one debounced resize listener and cleans it up", () => {
    const addSpy = jest.spyOn(window, "addEventListener");
    const removeSpy = jest.spyOn(window, "removeEventListener");
    const states = [];

    function Probe() {
      states.push(useBreakpoint());
      return null;
    }

    setViewportWidth(500);
    act(() => {
      root = createRoot(container);
      root.render(<Probe />);
    });

    expect(states.at(-1)).toEqual({ width: 500, bp: "base", isMobile: true });
    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function));

    setViewportWidth(1024);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      jest.advanceTimersByTime(149);
    });
    expect(states.at(-1)).toEqual({ width: 500, bp: "base", isMobile: true });

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(states.at(-1)).toEqual({ width: 1024, bp: "lg", isMobile: false });

    act(() => {
      root.unmount();
    });
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});

describe("useMediaQuery", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    jest.restoreAllMocks();
  });

  it("subscribes to matchMedia changes and cleans up on unmount", () => {
    const listeners = new Set();
    const mql = {
      matches: false,
      addEventListener: jest.fn((event, listener) => {
        if (event === "change") listeners.add(listener);
      }),
      removeEventListener: jest.fn((event, listener) => {
        if (event === "change") listeners.delete(listener);
      }),
    };
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: jest.fn(() => mql),
    });

    const matches = [];
    function Probe() {
      matches.push(useMediaQuery("(min-width: 768px)"));
      return null;
    }

    act(() => {
      root = createRoot(container);
      root.render(<Probe />);
    });

    expect(matches.at(-1)).toBe(false);
    expect(mql.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    act(() => {
      for (const listener of listeners) {
        listener({ matches: true });
      }
    });
    expect(matches.at(-1)).toBe(true);

    act(() => {
      root.unmount();
    });
    expect(mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(listeners.size).toBe(0);
  });
});
