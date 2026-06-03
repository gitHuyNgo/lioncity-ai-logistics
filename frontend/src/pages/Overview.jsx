import React, { useEffect, useState, useCallback } from "react";
import { http, fmtDate } from "../lib/api";
import MapView from "../components/MapView";
import { Badge } from "../components/UI";
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

  const load = useCallback(async () => {
    try {
      const [sRes, oRes, dRes, zRes, hRes] = await Promise.allSettled([
        http.get("/stats"), http.get("/orders"), http.get("/drivers"), http.get("/zones"), http.get("/hubs"),
      ]);
      
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
    }
    
    try { const inc = await http.get("/lta/incidents"); setIncidents(inc.data); } catch { setIncidents([]); }
  }, [user]);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  // Merge global tracking data for map display
  const mapDrivers = isTracking && trackingData.driver 
    ? [...drivers.filter(d => d.id !== trackedDriverId), trackingData.driver]
    : drivers;
  
  const mapRoutes = isTracking && trackingData.route
    ? [{ ...trackingData.route, color: "#0d7c78" }]
    : [];

  const stepSim = async () => {
    await http.post("/routing/simulate-step-all", { step_m: 500 });
    load();
  };

  const stat = (label, value, tone) => (
    <div className={`stat ${tone || ""}`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="label">{label}</div>
      <div className="value">{value ?? "—"}</div>
    </div>
  );

  const getGreeting = () => {
    if (!user) return "Welcome to LionCity";
    const firstName = user.full_name.split(' ')[0];
    return `Welcome, ${firstName}`;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="page-title" style={{ margin: 0 }}><span className="accent"></span>{getGreeting()}</div>
        <div className="card" style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 12, margin: 0, border: "1px solid var(--teal-ink)22" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--teal-ink)" }}>GLOBAL SIMULATION</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className={`btn sm ${isSimulating ? 'danger' : 'primary'}`} onClick={toggleSimulation}>
              {isSimulating ? "Stop All" : "Auto Play"}
            </button>
            <button className="btn sm ghost" onClick={stepSim} disabled={isSimulating}>Step All +500m</button>
          </div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        {user?.role !== "shipper" && stat("Pending Orders", stats?.orders_pending, "red")}
        {stat("In Delivery", user?.role === "shipper" ? orders.filter(o => o.status === "delivering").length : stats?.orders_delivering, "amber")}
        {stat("Delivered Today", user?.role === "shipper" ? orders.filter(o => o.status === "delivered").length : stats?.orders_delivered, "emerald")}
        {user?.role !== "shipper" && stat("Drivers Available", stats?.drivers_available, "teal")}
        {user?.role === "super_admin" && stat("Active Zones", stats?.zones)}
        {user?.role === "super_admin" && stat("Hubs", hubs.length, "red")}
        {user?.role === "super_admin" && stat("EV Vehicles", `${stats?.vehicles_ev ?? 0}/${stats?.vehicles ?? 0}`, "teal")}
        {stat("Live Incidents", incidents.length, "red")}
      </div>

      <div className="section">
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="card-title">Live Operations Map</span>
            <div style={{ display: "flex", gap: 12 }}>
              <Badge tone="teal">{mapDrivers.length} Drivers</Badge>
              <Badge tone="amber">{orders.length} Active Orders</Badge>
            </div>
          </div>
          <div style={{ padding: 12 }}>
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
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Live Traffic Incidents (LTA)</div>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            {incidents.length === 0 && <div className="muted" style={{ padding: 20, textAlign: "center" }}>No major incidents reported.</div>}
            {incidents.map((e, i) => (
              <div key={i} style={{ padding: "12px 0", borderBottom: i < incidents.length - 1 ? "1px solid var(--border)" : 0, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <b style={{ color: "#b91c1c" }}>{e.Type}</b>
                  <span className="muted">{e.Latitude?.toFixed(3)}, {e.Longitude?.toFixed(3)}</span>
                </div>
                <div style={{ color: "#334155" }}>{e.Message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
