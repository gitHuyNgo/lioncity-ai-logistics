import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import fs from "fs";
import path from "path";

import AccountMenu from "../AccountMenu";
import { AppShell, SIDEBAR_COLLAPSED_KEY, sidebarMode } from "../AppShell";
import { Sidebar } from "../Sidebar";
import { getNavForRole } from "@/lib/design/nav.config";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseBreakpoint = jest.fn();
const mockSetTheme = jest.fn();
const mockUpdateAvatar = jest.fn();
const mockLogout = jest.fn();

jest.mock("@/lib/design/useBreakpoint", () => {
  const actual = jest.requireActual("@/lib/design/useBreakpoint");
  return {
    ...actual,
    useBreakpoint: () => mockUseBreakpoint(),
  };
});

jest.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      full_name: "Alex Tan",
      email: "alex@example.test",
      role: "super_admin",
      avatar_url: "",
    },
    logout: mockLogout,
    updateAvatar: mockUpdateAvatar,
  }),
}));

function setViewportWidth(width) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
}

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

describe("AccountMenu keyboard-operable controls", () => {
  it("renders avatar upload as a focusable button with an accessible name", () => {
    const view = render(<AccountMenu />);
    try {
      const trigger = view.container.querySelector("button");
      expect(trigger).toBeTruthy();
      expect(trigger.type).toBe("button");
      expect(trigger.tabIndex).not.toBe(-1);

      const source = fs.readFileSync(path.resolve(__dirname, "..", "AccountMenu.jsx"), "utf8");
      expect(source).toContain('<button');
      expect(source).toContain('aria-label="Change profile photo"');
      expect(source).not.toContain('role="button"');
    } finally {
      view.cleanup();
      document.body.innerHTML = "";
    }
  });
});

describe("AppShell and Sidebar responsive behavior", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUseBreakpoint.mockReset();
    mockUseBreakpoint.mockReturnValue({ width: 1024, bp: "lg", isMobile: false });
    setViewportWidth(1024);
  });

  it("maps widths to drawer, rail, and expanded modes", () => {
    expect(sidebarMode(375, false)).toBe("drawer");
    expect(sidebarMode(767, true)).toBe("drawer");
    expect(sidebarMode(768, false)).toBe("rail");
    expect(sidebarMode(1023, false)).toBe("rail");
    expect(sidebarMode(1024, false)).toBe("expanded");
    expect(sidebarMode(1440, true)).toBe("rail");
  });

  it("renders role-filtered sidebar links with one active item", () => {
    const view = render(
      <MemoryRouter initialEntries={["/orders"]}>
        <Sidebar nav={getNavForRole("hub_manager")} collapsed={false} />
      </MemoryRouter>
    );
    try {
      expect(view.container.querySelector('[data-testid="nav-hub-managers"]')).toBeNull();
      expect(view.container.querySelector('[data-testid="nav-orders"]')).toBeTruthy();
      expect(view.container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
      expect(view.container.querySelector('[aria-current="page"]').textContent).toContain("Orders");
    } finally {
      view.cleanup();
    }
  });

  it("persists desktop collapse state and switches persistent sidebar mode", () => {
    const view = render(
      <MemoryRouter initialEntries={["/"]}>
        <AppShell nav={getNavForRole("super_admin")}>
          <div>Dashboard</div>
        </AppShell>
      </MemoryRouter>
    );
    try {
      expect(view.container.querySelector("[data-testid='appshell-sidebar']").dataset.mode).toBe("expanded");
      const toggle = view.container.querySelector('button[aria-label="Toggle sidebar"]');

      act(() => toggle.dispatchEvent(new MouseEvent("click", { bubbles: true })));

      expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe("true");
      expect(view.container.querySelector("[data-testid='appshell-sidebar']").dataset.mode).toBe("rail");
    } finally {
      view.cleanup();
    }
  });

  it("hides persistent sidebar in drawer mode while keeping the toggle visible", () => {
    mockUseBreakpoint.mockReturnValue({ width: 375, bp: "base", isMobile: true });
    setViewportWidth(375);

    const view = render(
      <MemoryRouter initialEntries={["/"]}>
        <AppShell nav={getNavForRole("super_admin")}>
          <div>Dashboard</div>
        </AppShell>
      </MemoryRouter>
    );
    try {
      expect(view.container.querySelector("[data-testid='appshell-sidebar']")).toBeNull();
      expect(view.container.querySelector('button[aria-label="Toggle sidebar"]')).toBeTruthy();
    } finally {
      view.cleanup();
    }
  });
});
