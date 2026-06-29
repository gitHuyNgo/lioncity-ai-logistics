import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Clock,
  Leaf,
  Ban,
  Navigation,
  Timer,
  ListOrdered,
  Play,
  CheckCircle2,
  Radio,
} from "lucide-react";

import { http, fmtDist, fmtDur } from "../lib/api";
import MapView from "../components/MapView";
import { useTracking } from "../context/TrackingContext";
import { PageHeader } from "../components/composite/PageHeader";
import { StatCard } from "../components/composite/StatCard";
import { StatusBadge } from "../components/composite/StatusBadge";
import { EmptyState } from "../components/composite/EmptyState";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { cn } from "../lib/utils";

// Routing modes. Each carries a lucide icon (non-color cue), a short label,
// and a description shown in the ModeSelector (Req 12.10).
const MODES = [
  { id: "time", label: "Time Priority", desc: "Fastest route", icon: Clock },
  { id: "eco", label: "Eco", desc: "Minimize distance (EV-friendly)", icon: Leaf },
  { id: "avoid_erp", label: "Avoid ERP", desc: "Route around CBD ERP zones", icon: Ban },
];

// Mode → route stroke color mapping (PRESERVED from the legacy page). These
// concrete colors are consumed by MapView for the route polyline + arrows,
// where a CSS token variable cannot resolve inside Leaflet path options.
const MODE_ROUTE_COLOR = {
  eco: "hsl(160 84% 26%)",
  avoid_erp: "hsl(32 95% 44%)",
  time: "hsl(178 81% 27%)",
};

/**
 * ModeSelector — a labeled segmented control (shadcn ToggleGroup) for the three
 * routing modes. Each option shows an icon + name + short description. Mode
 * changes are disabled while a delivery is in progress (Req 12.10).
 */
export function ModeSelector({ value, onChange, disabled }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v)}
      disabled={disabled}
      className="flex-wrap justify-start gap-2"
      data-testid="routing-mode"
      aria-label="Routing mode"
    >
      {MODES.map((m) => {
        const Icon = m.icon;
        return (
          <ToggleGroupItem
            key={m.id}
            value={m.id}
            variant="outline"
            aria-label={`${m.label} — ${m.desc}`}
            className="h-auto min-w-0 flex-col items-start gap-0.5 px-3 py-2 text-left data-[state=on]:border-primary data-[state=on]:bg-[hsl(var(--primary)/0.12)] data-[state=on]:text-primary"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {m.label}
            </span>
            <span className="text-[11px] font-normal text-muted-foreground">
              {m.desc}
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}

/**
 * StopTimeline — the Delivery_Sequence rebuilt as a vertical stepper. Numbered
 * circular nodes connected by a vertical line; each stop shows the order code,
 * address, postal/weight, and a StatusBadge. The current/next stop gets a
 * ring + "Current" label emphasis that is NOT conveyed by color alone
 * (Req 12.12, 12.13).
 */
export function StopTimeline({ orderedIds, ordersById, currentIndex }) {
  return (
    <ol className="relative m-0 list-none p-0">
      {orderedIds.map((oid, i) => {
        const o = ordersById[oid];
        if (!o) return null;
        const isCurrent = i === currentIndex;
        const isLast = i === orderedIds.length - 1;
        return (
          <li key={oid} className="relative flex gap-3 pb-4 last:pb-0">
            {/* connector line */}
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px bg-border"
              />
            )}
            {/* numbered node */}
            <div
              className={cn(
                "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                isCurrent
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-card"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isCurrent && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full ring-2 ring-primary/40 motion-safe:animate-ping"
                />
              )}
              <span className="relative">{i + 1}</span>
            </div>
            {/* details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{o.code}</span>
                {isCurrent && (
                  <span className="rounded-full border border-primary/40 bg-[hsl(var(--primary)/0.12)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Current
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">{o.address}</div>
              <div className="text-[11px] text-muted-foreground">
                Postal {o.postal_code} · {o.weight_kg} kg
              </div>
            </div>
            <StatusBadge status={o.status} className="shrink-0" />
          </li>
        );
      })}
    </ol>
  );
}

export default function Routing() {
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [driverId, setDriverId] = useState("");
  const [mode, setMode] = useState("time");
  const [route, setRoute] = useState(null);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [speedBands, setSpeedBands] = useState([]);
  const [showTraffic, setShowTraffic] = useState(false);
  const [err, setErr] = useState("");

  const { isTracking, trackedDriverId, trackingData, startTracking, stopTracking } = useTracking();

  const load = useCallback(async () => {
    const [d, o, h] = await Promise.all([http.get("/drivers"), http.get("/orders"), http.get("/hubs")]);
    setDrivers(d.data); setOrders(o.data); setHubs(h.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sync with global tracking data
  const currentDriver = useMemo(() => {
    if (isTracking && trackedDriverId === driverId && trackingData.driver) {
      return trackingData.driver;
    }
    return drivers.find(d => d.id === driverId);
  }, [isTracking, trackedDriverId, driverId, trackingData.driver, drivers]);

  const currentRoute = useMemo(() => {
    if (isTracking && trackedDriverId === driverId && trackingData.route) {
      return trackingData.route;
    }
    return route;
  }, [isTracking, trackedDriverId, driverId, trackingData.route, route]);

  useEffect(() => {
    (async () => {
      if (driverId && (!isTracking || trackedDriverId !== driverId)) {
        try { const r = await http.get(`/routing/${driverId}`); setRoute(r.data); } catch { setRoute(null); }
      }
    })();
  }, [driverId, isTracking, trackedDriverId]);

  const plan = async () => {
    setBusy(true); setErr(""); setRoute(null);
    try {
      const r = await http.post("/routing/plan", { driver_id: driverId, mode });
      setRoute(r.data); await load();
    } catch (e) { setErr(e.response?.data?.detail || "Error planning route"); }
    setBusy(false);
  };

  const startDelivery = async () => {
    setStarting(true); setErr("");
    try {
      await http.post("/routing/start", { driver_id: driverId });
      await load();
      startTracking(driverId);
    } catch (e) { setErr(e.response?.data?.detail || "Error starting delivery"); }
    setStarting(false);
  };

  const simulate = async () => {
    await http.post(`/drivers/${driverId}/simulate-step`, { step_m: 500 });
    if (!isTracking) load();
  };

  const toggleTraffic = async () => {
    if (!showTraffic && speedBands.length === 0) {
      const r = await http.get("/lta/speed-bands");
      setSpeedBands(r.data);
    }
    setShowTraffic(v => !v);
  };

  const driverOrders = orders.filter(o => o.driver_id === driverId && ["assigned", "delivering"].includes(o.status));
  const ordersById = Object.fromEntries(orders.map(o => [o.id, o]));
  const driversWithOrders = drivers.filter(d => orders.some(o => o.driver_id === d.id && ["assigned", "delivering"].includes(o.status)));
  const isDelivering = currentDriver?.status === "delivering";
  const isLiveTracking = isTracking && trackedDriverId === driverId;

  // Derive the current/next stop index for the StopTimeline emphasis. While
  // tracking, pick the stop closest to the live driver position; otherwise the
  // first non-delivered stop. Returns -1 when nothing should be emphasized.
  const currentStopIndex = useMemo(() => {
    const ordered = currentRoute?.ordered_order_ids || [];
    if (ordered.length === 0) return -1;

    const loc = isLiveTracking ? currentDriver?.location : null;
    if (loc) {
      let bestIdx = -1;
      let bestDist = Infinity;
      ordered.forEach((oid, i) => {
        const o = ordersById[oid];
        if (!o || o.lat == null || o.lng == null) return;
        const dist = Math.hypot(o.lat - loc.lat, o.lng - loc.lng);
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      });
      if (bestIdx !== -1) return bestIdx;
    }

    const firstPending = ordered.findIndex((oid) => ordersById[oid] && ordersById[oid].status !== "delivered");
    return firstPending;
  }, [currentRoute, isLiveTracking, currentDriver, ordersById]);

  const modeDesc = MODES.find(m => m.id === mode)?.desc;

  // Right-aligned page actions: Show/Hide traffic + (when delivering) advance.
  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {isDelivering && (
        <Button variant="outline" size="sm" onClick={simulate} data-testid="simulate-step-btn">
          <Play className="h-4 w-4" aria-hidden="true" /> Advance 500 m
        </Button>
      )}
      <Button
        variant={showTraffic ? "secondary" : "outline"}
        size="sm"
        onClick={toggleTraffic}
        data-testid="toggle-traffic-btn"
      >
        {showTraffic ? "Hide" : "Show"} Live Traffic
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Route Planning" accent actions={headerActions} />

      {/* Control bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" id="routing-driver-label">
                Driver
              </label>
              <Select
                value={driverId || undefined}
                onValueChange={(v) => { setDriverId(v); setRoute(null); }}
              >
                <SelectTrigger
                  className="w-[240px]"
                  data-testid="routing-driver"
                  aria-labelledby="routing-driver-label"
                >
                  <SelectValue placeholder="— choose driver with orders —" />
                </SelectTrigger>
                <SelectContent>
                  {driversWithOrders.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No drivers with assigned orders
                    </div>
                  ) : (
                    driversWithOrders.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Routing mode</span>
              <ModeSelector value={mode} onChange={setMode} disabled={isDelivering} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isDelivering ? (
              <Button
                disabled={!driverId || busy || driverOrders.length === 0}
                onClick={plan}
                data-testid="plan-route-btn"
              >
                {busy ? "Planning…" : "Plan Route"}
              </Button>
            ) : (
              <>
                <StatusBadge status="delivering" />
                <Button
                  variant={isLiveTracking ? "destructive" : "default"}
                  size="sm"
                  onClick={() => (isLiveTracking ? stopTracking() : startTracking(driverId))}
                >
                  <Radio className="h-4 w-4" aria-hidden="true" />
                  {isLiveTracking ? "Stop Tracking" : "Live Track"}
                </Button>
              </>
            )}

            {currentRoute && !isDelivering && (
              <Button
                onClick={startDelivery}
                disabled={starting}
                data-testid="start-delivery-btn"
                className="bg-[hsl(var(--chart-4))] text-primary-foreground hover:bg-[hsl(var(--chart-4)/0.9)]"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {starting ? "Starting..." : "Start Delivery"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {err && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
        >
          {err}
        </div>
      )}

      {isLiveTracking && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-[hsl(var(--primary)/0.1)] px-4 py-2 text-sm font-medium text-primary">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          LIVE TRACKING ACTIVE — Auto-updating every 2s
          {trackingData.lastUpdated > 0 && (
            <span className="ml-auto font-normal opacity-70">
              Synced: {new Date(trackingData.lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Map + Delivery Sequence */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden p-0">
          <MapView
            height="min(70vh, 640px)"
            orders={driverOrders.length ? driverOrders : orders}
            drivers={currentDriver && currentDriver.location ? [currentDriver] : []}
            hubs={hubs}
            routes={currentRoute ? [{ ...currentRoute, color: MODE_ROUTE_COLOR[mode] || MODE_ROUTE_COLOR.time }] : []}
            speedBands={showTraffic ? speedBands : []}
            tracking={isLiveTracking ? { driver_id: driverId, location: currentDriver?.location } : null}
          />
        </Card>

        <Card className="flex max-h-[min(70vh,640px)] flex-col overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <div className="font-semibold tracking-tight">Delivery Sequence</div>
            <div className="text-xs text-muted-foreground">{modeDesc}</div>
          </div>

          {/* Route summary strip */}
          {currentRoute && (
            <div className="grid grid-cols-3 gap-2 border-b border-border p-3">
              <StatCard label="Distance" value={fmtDist(currentRoute.distance_m)} tone="teal" icon={Navigation} />
              <StatCard label="Duration" value={fmtDur(currentRoute.duration_s)} tone="amber" icon={Timer} />
              <StatCard label="Stops" value={currentRoute.ordered_order_ids?.length ?? 0} tone="emerald" icon={ListOrdered} />
            </div>
          )}

          <div className="flex-1 overflow-auto p-4">
            {!currentRoute ? (
              <EmptyState
                title="No route planned"
                message="Select a driver with assigned orders and plan a route."
                icon={ListOrdered}
              />
            ) : (
              <StopTimeline
                orderedIds={currentRoute.ordered_order_ids || []}
                ordersById={ordersById}
                currentIndex={currentStopIndex}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
