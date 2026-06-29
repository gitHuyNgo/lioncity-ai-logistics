import React, { useEffect, useState, useCallback } from "react";
import { AlertTriangle, Package, Truck, CheckCircle2, Users, Map as MapIcon, Warehouse, Zap } from "lucide-react";

import { http } from "../lib/api";
import { notifySuccess, notifyError } from "../lib/notify";
import MapView from "../components/MapView";
import { PageHeader } from "../components/composite/PageHeader";
import { StatCard } from "../components/composite/StatCard";
import { LoadingState } from "../components/composite/LoadingState";
import { EmptyState } from "../components/composite/EmptyState";
import { ErrorState } from "../components/composite/ErrorState";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { useTracking } from "../context/TrackingContext";

export default function Overview() {
  const { user } = useAuth();
  const { isTracking, trackedDriverId, trackingData, isSimulating, toggleSimulation } = useTracking();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [zones, setZones] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [linkedEntity, setLinkedEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sRes, oRes, dRes, zRes, hRes] = await Promise.allSettled([
        http.get("/stats"), http.get("/orders"), http.get("/drivers"), http.get("/zones"), http.get("/hubs"),
      ]);

      // If every core request failed, surface an error state and preserve any
      // data already shown to the user (Req 5.4).
      const allFailed = [sRes, oRes, dRes, zRes, hRes].every((r) => r.status === "rejected");
      if (allFailed) {
        setError(true);
        return;
      }
      setError(false);

      const s = sRes.status === "fulfilled" ? sRes.value : { data: {} };
      const o = oRes.status === "fulfilled" ? oRes.value : { data: [] };
      const d = dRes.status === "fulfilled" ? dRes.value : { data: [] };
      const z = zRes.status === "fulfilled" ? zRes.value : { data: [] };
      const h = hRes.status === "fulfilled" ? hRes.value : { data: [] };

      let filteredOrders = o.data || [];
      let filteredDrivers = d.data || [];
      let filteredZones = z.data || [];
      let filteredHubs = h.data || [];

      if (user?.role === "hub_manager" && user.reference_id) {
        try {
          const hm = await http.get(`/hub-managers`);
          const manager = hm.data.find(m => m.id === user.reference_id);
          if (manager) {
            setLinkedEntity(manager);
            filteredHubs = h.data;
            filteredZones = z.data;
            const hasLinks = d.data.some(dr => dr.hub_manager_id === manager.id);
            if (hasLinks) {
              filteredDrivers = d.data.filter(dr => dr.hub_manager_id === manager.id);
              const driverIds = filteredDrivers.map(dr => dr.id);
              filteredOrders = o.data.filter(ord => driverIds.includes(ord.assigned_driver_id) || ord.hub_id === manager.hub_id);
            } else if (manager.hub_id) {
              filteredOrders = o.data.filter(ord => ord.hub_id === manager.hub_id);
            }
          }
        } catch (err) { console.error("Error fetching linked manager", err); }
      }
 else if (user?.role === "shipper" && user.reference_id) {
        try {
          const dRec = d.data.find(dr => dr.id === user.reference_id);
          if (dRec) {
            setLinkedEntity(dRec);
            filteredDrivers = [dRec];
            filteredOrders = o.data.filter(ord => ord.assigned_driver_id === dRec.id);
            if (dRec.zone_id) {
              filteredZones = z.data.filter(zone => zone.id === dRec.zone_id);
              const colleagues = (d.data || []).filter(dr => dr.zone_id === dRec.zone_id && dr.id !== dRec.id);
              filteredDrivers = [...filteredDrivers, ...colleagues];
            }
          }
        } catch (err) { console.error("Error fetching linked driver", err); }
      }

      setStats(s.data || {});
      setOrders(filteredOrders);
      setDrivers(filteredDrivers);
      setZones(filteredZones);
      setHubs(filteredHubs);
    } catch (globalErr) {
      console.error("Critical error in overview load", globalErr);
      setError(true);
    } finally {
      setLoading(false);
    }

    try { const inc = await http.get("/lta/incidents"); setIncidents(inc.data); } catch { setIncidents([]); }
  }, [user]);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(false);
    load();
  }, [load]);

  // Merge global tracking data for map display
  const mapDrivers = isTracking && trackingData.driver
    ? [...drivers.filter(d => d.id !== trackedDriverId), trackingData.driver]
    : drivers;

  const mapRoutes = isTracking && trackingData.route
    ? [{ ...trackingData.route, color: "#0d7c78" }]
    : [];

  const stepSim = async () => {
    try {
      await http.post("/routing/simulate-step-all", { step_m: 500 });
      notifySuccess("update", "Simulation (+500m step)");
      load();
    } catch (err) {
      notifyError("update", "Simulation", err?.response?.data?.detail || err);
    }
  };

  const getGreeting = () => {
    if (!user) return "Welcome to LionCity";
    const firstName = user.full_name.split(' ')[0];
    return `Welcome, ${firstName}`;
  };

  const simulationControls = (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Global Simulation
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={isSimulating ? "destructive" : "default"}
          onClick={toggleSimulation}
          data-testid="sim-toggle"
        >
          {isSimulating ? "Stop All" : "Auto Play"}
        </Button>
        <Button size="sm" variant="outline" onClick={stepSim} disabled={isSimulating} data-testid="sim-step">
          Step All +500m
        </Button>
      </div>
    </div>
  );

  // Role-aware stat tiles, preserving the exact metrics/role gating from before.
  const statCards = [
    user?.role !== "shipper" && {
      label: "Pending Orders", value: stats?.orders_pending, tone: "red", icon: Package,
    },
    {
      label: "In Delivery",
      value: user?.role === "shipper" ? orders.filter(o => o.status === "delivering").length : stats?.orders_delivering,
      tone: "amber", icon: Truck,
    },
    {
      label: "Delivered Today",
      value: user?.role === "shipper" ? orders.filter(o => o.status === "delivered").length : stats?.orders_delivered,
      tone: "emerald", icon: CheckCircle2,
    },
    user?.role !== "shipper" && {
      label: "Drivers Available", value: stats?.drivers_available, tone: "teal", icon: Users,
    },
    user?.role === "super_admin" && {
      label: "Active Zones", value: stats?.zones, tone: "default", icon: MapIcon,
    },
    user?.role === "super_admin" && {
      label: "Hubs", value: hubs.length, tone: "red", icon: Warehouse,
    },
    user?.role === "super_admin" && {
      label: "EV Vehicles", value: `${stats?.vehicles_ev ?? 0}/${stats?.vehicles ?? 0}`, tone: "teal", icon: Zap,
    },
    {
      label: "Live Incidents", value: incidents.length, tone: "red", icon: AlertTriangle,
    },
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <PageHeader title={getGreeting()} accent actions={simulationControls} />

      {error ? (
        <ErrorState
          message="Couldn't load the dashboard data. Please try again."
          onRetry={handleRetry}
        />
      ) : loading && !stats ? (
        <>
          <LoadingState variant="cards" label="Loading dashboard metrics" />
          <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
            <LoadingState variant="block" className="h-[600px] rounded-xl" label="Loading operations map" />
            <LoadingState variant="block" className="h-[460px] rounded-xl" label="Loading traffic incidents" />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((c) => (
              <StatCard
                key={c.label}
                label={c.label}
                value={c.value}
                tone={c.tone}
                icon={c.icon}
                data-testid={`stat-${c.label.toLowerCase().replace(/\s+/g, '-')}`}
              />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="font-semibold tracking-tight">Live Operations Map</span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[hsl(var(--primary)/0.12)] px-2.5 py-1 text-xs font-medium text-primary">
                    {mapDrivers.length} Drivers
                  </span>
                  <span className="inline-flex items-center rounded-full bg-[hsl(var(--chart-3)/0.12)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--chart-3))]">
                    {orders.length} Active Orders
                  </span>
                </div>
              </div>
              <div className="p-3">
                <MapView
                  height={560}
                  orders={orders}
                  drivers={mapDrivers}
                  hubs={hubs}
                  zones={zones}
                  routes={mapRoutes}
                  tracking={isTracking ? { driver_id: trackedDriverId, location: trackingData.driver?.location } : null}
                  highlight={{
                    hubId: user?.role === "hub_manager" ? linkedEntity?.hub_id : null,
                    zoneIds: user?.role === "hub_manager"
                      ? [...new Set(drivers.map(dr => dr.zone_id).filter(Boolean))]
                      : (user?.role === "shipper" ? [linkedEntity?.zone_id] : [])
                  }}
                />
              </div>
            </Card>

            <Card className="p-4">
              <div className="mb-4 font-semibold tracking-tight">Live Traffic Incidents (LTA)</div>
              <div className="max-h-[400px] overflow-auto">
                {incidents.length === 0 ? (
                  <EmptyState title="No traffic incidents" message="No major incidents reported." />
                ) : (
                  incidents.map((e, i) => (
                    <div
                      key={i}
                      className="border-b border-border py-3 text-[13px] last:border-b-0"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <b className="text-destructive">{e.Type}</b>
                        <span className="text-muted-foreground">{e.Latitude?.toFixed(3)}, {e.Longitude?.toFixed(3)}</span>
                      </div>
                      <div className="text-foreground/80">{e.Message}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
