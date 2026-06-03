import React, { useEffect, useState } from "react";
import { http, fmtDate } from "../lib/api";
import MapView from "../components/MapView";
import { Badge } from "../components/UI";
import { useAuth } from "../context/AuthContext";

export default function Overview() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [zones, setZones] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [linkedEntity, setLinkedEntity] = useState(null);

  const load = async () => {
    try {
      // Use Promise.allSettled to handle potential 403 errors gracefully
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
            
            // Managers see ALL hubs and ALL zones for context
            filteredHubs = h.data;
            filteredZones = z.data;

            // But only see THEIR drivers and orders
            const hasLinks = d.data.some(dr => dr.hub_manager_id === manager.id);
            if (hasLinks) {
              filteredDrivers = d.data.filter(dr => dr.hub_manager_id === manager.id);
              const driverIds = filteredDrivers.map(dr => dr.id);
              filteredOrders = o.data.filter(ord => driverIds.includes(ord.assigned_driver_id) || ord.hub_id === manager.hub_id);
            } else if (manager.hub_id) {
              // Fallback: if no direct driver links, filter orders by hub_id
              filteredOrders = o.data.filter(ord => ord.hub_id === manager.hub_id);
              // Drivers are harder to filter without direct links, so we show all or those in linked zones
              // For now, if no explicit hub_manager_id links exist in the data, we might show all drivers
              // to avoid a broken UI, but ideally we'd link them in the DB.
            }
          }
        } catch (err) { console.error("Error fetching linked manager", err); }
      }
 else if (user?.role === "shipper" && user.reference_id) {
        try {
          const dRec = filteredDrivers.find(dr => dr.id === user.reference_id);
          if (dRec) {
            setLinkedEntity(dRec);
            filteredDrivers = [dRec];
            filteredOrders = filteredOrders.filter(ord => ord.assigned_driver_id === dRec.id);
            if (dRec.zone_id) {
              filteredZones = filteredZones.filter(zone => zone.id === dRec.zone_id);
              // Re-fetch full driver list to find colleagues if initial fetch was filtered (unlikely given allSettled)
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
  };

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [user]);

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

  const getSubTitle = () => {
    if (user?.role === "super_admin") return "Singapore-wide logistics control.";
    if (user?.role === "hub_manager") return `Managing ${linkedEntity?.hub_name || "Assigned Hub"}.`;
    if (user?.role === "shipper") return `Shipper Cockpit Overview · Route Status.`;
    return "";
  };

  return (
    <div>
      <div className="page-title"><span className="accent"></span>{getGreeting()}</div>

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
              <Badge tone="teal">{drivers.length} Drivers</Badge>
              <Badge tone="amber">{orders.length} Active Orders</Badge>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            <MapView height={560} orders={orders} drivers={drivers} hubs={hubs} zones={zones} />
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
