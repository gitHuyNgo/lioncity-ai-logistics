import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { http } from "./lib/api";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TrackingProvider } from "./context/TrackingContext";
import { AppShell } from "@/components/layout/AppShell";
import { getNavForRole } from "@/lib/design/nav.config";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import Overview from "./pages/Overview";
import HubManagers from "./pages/HubManagers";
import Drivers from "./pages/Drivers";
import Vehicles from "./pages/Vehicles";
import Zones from "./pages/Zones";
import Orders from "./pages/Orders";
import Routing from "./pages/Routing";
import Shipper from "./pages/Shipper";
import Hubs from "./pages/Hubs";
import Auth from "./pages/Auth";
import "./App.css";

/**
 * Guards the authenticated area. While the session is being restored it shows a
 * loading screen; for an unauthenticated user it redirects to `/auth`,
 * remembering the originally requested location in router `state.from` so the
 * user can be returned there after authenticating (Requirement 11.5–11.7).
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-popover text-popover-foreground">
        <RefreshCw className="animate-spin mr-2" /> Loading session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  return children;
}

/**
 * Authenticated application frame. Renders the page content (empty-DB banner +
 * role-gated routes) inside the responsive {@link AppShell}, passing the
 * role-filtered navigation from {@link getNavForRole}.
 *
 * Route set, role visibility, and the unknown-route redirect to `/` are
 * preserved exactly from the pre-upgrade behavior (Requirement 11.1–11.3).
 */
function Shell() {
  const { user } = useAuth();
  const [empty, setEmpty] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const checkEmpty = async () => {
    try {
      const s = await http.get("/stats");
      const isEmpty = Object.values(s.data).every(v => v === 0);
      setEmpty(isEmpty);
    } catch {
      setEmpty(false);
    }
  };
  useEffect(() => { checkEmpty(); }, []);

  const loadDemo = async () => {
    setSeeding(true);
    try { await http.post("/seed"); window.location.reload(); }
    finally { setSeeding(false); }
  };

  return (
    <AppShell nav={getNavForRole(user?.role)}>
      {empty && user?.role === "super_admin" && (
        <div
          data-testid="empty-db-banner"
          className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-1 font-semibold text-foreground">Database is empty</div>
              <div className="text-[12.5px] text-muted-foreground">
                Start by loading demo data or simply create your own hubs, drivers, vehicles, zones and orders — everything you create persists in MongoDB.
              </div>
            </div>
            <Button onClick={loadDemo} disabled={seeding} data-testid="load-demo-btn">
              {seeding ? "Loading…" : "Load demo data"}
            </Button>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Overview />} />
        {user?.role === "super_admin" && (
          <Route path="/hub-managers" element={<HubManagers />} />
        )}
        {(user?.role === "super_admin" || user?.role === "hub_manager") && (
          <>
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/zones" element={<Zones />} />
            <Route path="/hubs" element={<Hubs />} />
            <Route path="/orders" element={<Orders />} />
          </>
        )}
        <Route path="/routing" element={<Routing />} />
        <Route path="/shipper" element={<Shipper />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TrackingProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={
              <ProtectedRoute>
                <Shell />
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
        {/*
          Notification_System (Requirement 6). Mounted once at the app root so a
          single toast region serves every page.
          - visibleToasts={3}: at most 3 toasts shown concurrently; the rest
            queue and surface as active ones are dismissed (Req 6.7).
          - closeButton: every toast carries a user-activatable dismiss control
            (Req 6.6).
          - duration={5000}: default success auto-dismiss sits in the 4–6s band
            (Req 6.4). Per-toast overrides in src/lib/notify.js make errors
            persistent (duration: Infinity, Req 6.5).
          Theme is handled inside the Toaster wrapper via next-themes.
        */}
        <Toaster visibleToasts={3} closeButton duration={5000} />
      </TrackingProvider>
    </AuthProvider>
  );
}
