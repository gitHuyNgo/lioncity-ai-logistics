import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { ProtectedRoute } from "../App";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { getNavForRole } from "@/lib/design/nav.config";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mockAuthState = { isAuthenticated: false, loading: false };
let mockCurrentTheme = "light";

jest.mock("@/context/AuthContext", () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: () => mockAuthState,
}));

jest.mock("../lib/api", () => ({
  http: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  fmtDate: (value) => value || "—",
  fmtDist: (value) => `${value} m`,
  fmtDur: (value) => `${value} sec`,
}));

jest.mock("../pages/Overview", () => () => <div />);
jest.mock("../pages/HubManagers", () => () => <div />);
jest.mock("../pages/Drivers", () => () => <div />);
jest.mock("../pages/Vehicles", () => () => <div />);
jest.mock("../pages/Zones", () => () => <div />);
jest.mock("../pages/Orders", () => () => <div />);
jest.mock("../pages/Routing", () => () => <div />);
jest.mock("../pages/Shipper", () => () => <div />);
jest.mock("../pages/Hubs", () => () => <div />);
jest.mock("../pages/Auth", () => () => <div />);

jest.mock("next-themes", () => ({
  ThemeProvider: ({ children }) => <>{children}</>,
  useTheme: () => ({
    theme: mockCurrentTheme,
    setTheme: (nextTheme) => {
      mockCurrentTheme = nextTheme;
      globalThis.document.documentElement.classList.toggle("dark", nextTheme === "dark");
    },
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

function AuthLocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="auth-location">
      {location.pathname}:{location.state?.from?.pathname || ""}
    </div>
  );
}

describe("routing/access and theme integration", () => {
  beforeEach(() => {
    mockAuthState = { isAuthenticated: false, loading: false };
    mockCurrentTheme = "light";
    document.documentElement.className = "";
  });

  it("redirects unauthenticated protected routes to /auth and preserves return location", () => {
    const view = render(
      <MemoryRouter initialEntries={["/orders"]}>
        <Routes>
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <div>Orders page</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<AuthLocationProbe />} />
        </Routes>
      </MemoryRouter>
    );
    try {
      expect(view.container.textContent).toContain("/auth:/orders");
    } finally {
      view.cleanup();
    }
  });

  it("allows authenticated protected routes to render their content", () => {
    mockAuthState = { isAuthenticated: true, loading: false };
    const view = render(
      <MemoryRouter initialEntries={["/orders"]}>
        <Routes>
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <div>Orders page</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<div>Auth page</div>} />
        </Routes>
      </MemoryRouter>
    );
    try {
      expect(view.container.textContent).toContain("Orders page");
      expect(view.container.textContent).not.toContain("Auth page");
    } finally {
      view.cleanup();
    }
  });

  it("keeps role navigation scoped to permitted routes", () => {
    expect(getNavForRole("super_admin").flatMap((g) => g.items.map((i) => i.to))).toContain("/hub-managers");
    expect(getNavForRole("hub_manager").flatMap((g) => g.items.map((i) => i.to))).not.toContain("/hub-managers");
    expect(getNavForRole("shipper").flatMap((g) => g.items.map((i) => i.to))).toEqual([
      "/",
      "/routing",
      "/shipper",
    ]);
  });

  it("theme toggle flips the html dark class", () => {
    const view = render(<ThemeToggle />);
    try {
      const toggle = view.container.querySelector("button");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      act(() => toggle.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    } finally {
      view.cleanup();
    }
  });
});
