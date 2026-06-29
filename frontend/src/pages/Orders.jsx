import React, { useEffect, useState, useCallback } from "react";
import { http, fmtDate } from "../lib/api";
import { Modal } from "../components/UI";
import MapView from "../components/MapView";
import HubPicker from "../components/HubPicker";
import { PageHeader } from "@/components/composite/PageHeader";
import { DataTable } from "@/components/composite/DataTable";
import { StatusBadge } from "@/components/composite/StatusBadge";
import { ErrorState } from "@/components/composite/ErrorState";
import { ConfirmDialog } from "@/components/composite/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { notifySuccess, notifyError, notifyInfo } from "@/lib/notify";

const SG_DEFAULT = [1.305, 103.83];

function inTwoDaysISO() {
  // Default delivery deadline: now + 2 days, rounded to the hour.
  const d = new Date(Date.now() + 2 * 24 * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  return d;
}

const emptyForm = () => ({
  address: "",
  postal_code: "",
  lat: SG_DEFAULT[0],
  lng: SG_DEFAULT[1],
  weight_kg: 2.0,
  required_by: inTwoDaysISO().toISOString().slice(0, 16),
});

export default function Orders() {
  const [tab, setTab] = useState("inbound");
  const [orders, setOrders] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [manualDriver, setManualDriver] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [geo, setGeo] = useState({ q: "", busy: false, results: [], error: "" });
  const [pinHasMoved, setPinHasMoved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [o, c, d] = await Promise.all([http.get("/orders"), http.get("/clusters"), http.get("/drivers")]);
      setOrders(o.data); setClusters(c.data); setDrivers(d.data);
    } catch (e) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setForm(emptyForm());
    setGeo({ q: "", busy: false, results: [], error: "" });
    setPinHasMoved(false);
    setOpen(true);
  };

  const searchAddress = async () => {
    if (!geo.q || geo.q.length < 3) return;
    setGeo(g => ({ ...g, busy: true, error: "", results: [] }));
    try {
      const r = await http.get("/geocode", { params: { q: geo.q } });
      if (r.data.error) setGeo(g => ({ ...g, busy: false, error: r.data.error, results: [] }));
      else setGeo(g => ({ ...g, busy: false, results: r.data.results || [] }));
    } catch {
      setGeo(g => ({ ...g, busy: false, error: "Geocoder unreachable — drag the pin on the map." }));
    }
  };

  const pickResult = (r) => {
    setForm(f => ({
      ...f,
      address: r.name || f.address,
      lat: r.lat,
      lng: r.lng,
      postal_code: r.postal_code || f.postal_code,
    }));
    setGeo(g => ({ ...g, results: [] }));
    setPinHasMoved(false);
  };

  const onPinMove = async ([lat, lng]) => {
    setForm(f => ({ ...f, lat, lng }));
    setPinHasMoved(true);
    // Reverse-geocode silently to keep the address in sync.
    try {
      const r = await http.get("/geocode/reverse", { params: { lat, lng } });
      if (r.data && r.data.name) {
        setForm(f => ({
          ...f,
          address: r.data.name,
          postal_code: r.data.postal_code || f.postal_code,
        }));
      }
    } catch { /* keep manual address if reverse fails */ }
  };

  const addOrder = async () => {
    if (!form.address) return;
    const entity = `Order to ${form.address}`;
    try {
      setBusy(true);
      await http.post("/orders", {
        address: form.address,
        postal_code: form.postal_code || "000000",
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        weight_kg: parseFloat(form.weight_kg),
        required_by: new Date(form.required_by).toISOString(),
      });
      setOpen(false);
      notifySuccess("create", entity);
      load();
    } catch (e) {
      notifyError("create", entity, e.response?.data?.detail || e.message);
    } finally { setBusy(false); }
  };
  const doCluster = async () => {
    try {
      setBusy(true);
      const r = await http.post("/orders/cluster", {});
      const { count = 0, unassigned = 0, message } = r.data || {};
      let msg = `Clustering done · ${count} cluster${count === 1 ? "" : "s"}`;
      if (unassigned > 0) msg += ` · ${unassigned} order${unassigned === 1 ? "" : "s"} outside any zone`;
      if (message && count === 0) msg = message;
      notifyInfo(msg);
      await load();
    } catch (e) {
      notifyError("update", "orders", e.response?.data?.detail || e.message);
    } finally { setBusy(false); }
  };
  const doAuto = async () => {
    try {
      setBusy(true);
      const r = await http.post("/orders/assign-auto");
      const { count = 0, skipped = [], assignments = [] } = r.data || {};
      let msg = `Auto-assigned ${count} cluster${count === 1 ? "" : "s"}`;
      if (assignments.length) {
        const evCount = assignments.filter(a => a.vehicle_fuel === "ev").length;
        const zoneMatch = assignments.filter(a => a.zone_match).length;
        const avgUtil = assignments.reduce((s, a) => s + (a.utilisation_pct || 0), 0) / assignments.length;
        msg += ` · zone match ${zoneMatch}/${assignments.length} · EV ${evCount}/${assignments.length} · avg fleet utilisation ${avgUtil.toFixed(0)}%`;
      }
      if (skipped.length) {
        msg += ` · ${skipped.length} skipped (no eligible driver)`;
      }
      notifyInfo(msg);
      await load();
    } catch (e) {
      notifyError("update", "clusters", e.response?.data?.detail || e.message);
    } finally { setBusy(false); }
  };
  const doManual = async () => {
    if (!manualDriver || selected.length === 0) return;
    const count = selected.length;
    try {
      setBusy(true);
      await http.post("/orders/assign-manual", { driver_id: manualDriver, order_ids: selected });
      notifyInfo(`Assigned ${count} order${count === 1 ? "" : "s"} to driver`);
      setSelected([]);
      await load();
    } catch (e) {
      notifyError("update", `${count} order${count === 1 ? "" : "s"}`, e.response?.data?.detail || e.message);
    } finally { setBusy(false); }
  };
  const updateStatus = async (o, status) => {
    try {
      await http.put(`/orders/${o.id}/status`, { status });
      notifySuccess("update", `Order ${o.code}`);
      load();
    } catch (e) {
      notifyError("update", `Order ${o.code}`, e.response?.data?.detail || e.message);
    }
  };
  const remove = (o) => setPendingDelete(o);
  const confirmRemove = async () => {
    const o = pendingDelete;
    setPendingDelete(null);
    if (!o) return;
    const entity = `Order ${o.code}`;
    try {
      await http.delete(`/orders/${o.id}`);
      notifySuccess("delete", entity);
      load();
    } catch (e) {
      notifyError("delete", entity, e.response?.data?.detail || e.message);
    }
  };

  const dById = Object.fromEntries(drivers.map(d => [d.id, d]));
  const cById = Object.fromEntries(clusters.map(c => [c.id, c]));
  const pendingOrders = orders.filter(o => o.status === "pending");
  const clusteredOrders = orders.filter(o => o.cluster_id);

  const toggleSel = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const inboundColumns = [
    { key: "code", header: "Code", render: (o) => <span className="font-semibold">{o.code}</span> },
    { key: "address", header: "Address" },
    { key: "postal_code", header: "Postal" },
    { key: "weight_kg", header: "Weight", render: (o) => `${o.weight_kg} kg` },
    { key: "required_by", header: "Required by", render: (o) => <span className="text-muted-foreground">{fmtDate(o.required_by)}</span> },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
    {
      key: "driver",
      header: "Driver",
      render: (o) => o.driver_id
        ? <span className="chip">{dById[o.driver_id]?.name || "driver"}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (o) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => remove(o)}
            data-testid={`del-order-${o.id}`}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const clusterColumns = [
    { key: "code", header: "Order Code", render: (o) => <span className="font-semibold">{o.code}</span> },
    { key: "address", header: "Address" },
    {
      key: "zone",
      header: "Zone",
      render: (o) => {
        const c = cById[o.cluster_id];
        return c?.zone_name ? <span className="chip">{c.zone_name}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: "hub",
      header: "Hub",
      render: (o) => {
        const c = cById[o.cluster_id];
        return c?.hub_name ? <span className="chip" data-testid={`cluster-hub-${o.id}`}>{c.hub_name}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
  ];

  const assignmentColumns = [
    {
      key: "select",
      header: (
        <input type="checkbox" data-testid="select-all-orders"
          checked={selected.length === pendingOrders.length && pendingOrders.length > 0}
          onChange={(e) => setSelected(e.target.checked ? pendingOrders.map(o => o.id) : [])} />
      ),
      render: (o) => (
        <input type="checkbox" data-testid={`select-order-${o.id}`}
          disabled={o.status !== "pending"}
          checked={selected.includes(o.id)} onChange={() => toggleSel(o.id)} />
      ),
    },
    { key: "code", header: "Code", render: (o) => <span className="font-semibold">{o.code}</span> },
    { key: "address", header: "Address" },
    {
      key: "zone_hub",
      header: "Zone / Hub",
      render: (o) => {
        const c = cById[o.cluster_id];
        return c ? (
          <div className="flex flex-wrap gap-1">
            {c.zone_name && <span className="chip">{c.zone_name}</span>}
            {c.hub_name && <span className="chip" data-testid={`assign-hub-${o.id}`}>{c.hub_name}</span>}
          </div>
        ) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: "driver",
      header: "Driver",
      render: (o) => o.driver_id
        ? <span className="chip">{dById[o.driver_id]?.name || "driver"}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
  ];

  const trackingColumns = [
    { key: "code", header: "Code", render: (o) => <span className="font-semibold">{o.code}</span> },
    { key: "address", header: "Address" },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
    {
      key: "driver",
      header: "Driver",
      render: (o) => o.driver_id ? dById[o.driver_id]?.name : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "update",
      header: "Update",
      render: (o) => (
        <select className="select h-7 px-1.5 text-xs"
          value={o.status} data-testid={`status-${o.id}`}
          onChange={(e) => updateStatus(o, e.target.value)}>
          <option value="pending">pending</option>
          <option value="assigned">assigned</option>
          <option value="delivering">delivering</option>
          <option value="delivered">delivered</option>
          <option value="failed">failed</option>
        </select>
      ),
    },
  ];

  return (
    <div>
      <PageHeader accent title="Orders & Dispatching" />

      <div className="tabs">
        <div className={`tab ${tab==='inbound'?'active':''}`} data-testid="tab-inbound" onClick={()=>setTab('inbound')}>Inbound Warehouse</div>
        <div className={`tab ${tab==='clustering'?'active':''}`} data-testid="tab-clustering" onClick={()=>setTab('clustering')}>Clustering</div>
        <div className={`tab ${tab==='assignment'?'active':''}`} data-testid="tab-assignment" onClick={()=>setTab('assignment')}>Assignment</div>
        <div className={`tab ${tab==='tracking'?'active':''}`} data-testid="tab-tracking" onClick={()=>setTab('tracking')}>Tracking</div>
      </div>

      {tab === "inbound" && (
        <div>
          <div className="toolbar">
            <Button data-testid="add-order-btn" onClick={openNew}>+ Warehouse Entry</Button>
          </div>
          {loadError ? (
            <ErrorState message="Couldn't load orders. Please try again." onRetry={load} />
          ) : (
            <div className="rounded-lg border border-border bg-card" data-testid="orders-table">
              <DataTable
                columns={inboundColumns}
                rows={orders}
                rowKey={(o) => o.id}
                isLoading={loading}
                emptyMessage="No orders yet."
              />
            </div>
          )}
        </div>
      )}

      {tab === "clustering" && (
        <div>
          <div className="toolbar">
            <Button data-testid="run-cluster-btn" disabled={busy} onClick={doCluster}>⚙ Run Clustering</Button>
            <span className="muted" style={{ fontSize: 12 }}>Groups orders by zone (point-in-polygon) and picks the closest hub inside that zone</span>
          </div>
          <div className="section">
            {loadError ? (
              <ErrorState message="Couldn't load orders. Please try again." onRetry={load} />
            ) : (
              <div className="rounded-lg border border-border bg-card" data-testid="clusters-table">
                <DataTable
                  columns={clusterColumns}
                  rows={clusteredOrders}
                  rowKey={(o) => o.id}
                  isLoading={loading}
                  emptyMessage="Run clustering to assign each pending order to its zone & nearest hub."
                />
              </div>
            )}
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <MapView height={420} orders={orders.filter(o => o.status === 'pending')} />
            </div>
          </div>
        </div>
      )}

      {tab === "assignment" && (
        <div>
          <div className="toolbar">
            <Button data-testid="auto-assign-btn" disabled={busy || clusters.length === 0} onClick={doAuto}>⚡ Auto-Assign Clusters</Button>
            <div style={{ flex: 1 }}></div>
            <span className="muted" style={{ fontSize: 12 }}>Manual:</span>
            <select className="select" style={{ width: 220 }} value={manualDriver} onChange={e => setManualDriver(e.target.value)} data-testid="manual-driver-select">
              <option value="">— choose driver —</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <Button variant="outline" disabled={!manualDriver || selected.length === 0 || busy} onClick={doManual} data-testid="manual-assign-btn">Assign {selected.length || ""} selected</Button>
          </div>
          {loadError ? (
            <ErrorState message="Couldn't load orders. Please try again." onRetry={load} />
          ) : (
            <div className="rounded-lg border border-border bg-card" data-testid="assignment-table">
              <DataTable
                columns={assignmentColumns}
                rows={orders}
                rowKey={(o) => o.id}
                isLoading={loading}
                emptyMessage="No orders to assign."
              />
            </div>
          )}
        </div>
      )}

      {tab === "tracking" && (
        <div className="section">
          {loadError ? (
            <ErrorState message="Couldn't load orders. Please try again." onRetry={load} />
          ) : (
            <div className="rounded-lg border border-border bg-card" data-testid="tracking-table">
              <DataTable
                columns={trackingColumns}
                rows={orders}
                rowKey={(o) => o.id}
                isLoading={loading}
                emptyMessage="No orders."
              />
            </div>
          )}
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <MapView height={520} orders={orders} />
          </div>
        </div>
      )}

      <Modal open={open} title="Register a new parcel" onClose={() => setOpen(false)}
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={addOrder} disabled={busy || !form.address} data-testid="save-order-btn">
            {busy ? "Saving…" : "Save"}
          </Button>
        </>}>
        <div className="field">
          <label className="label">Search customer address (OneMap.gov.sg)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" data-testid="order-geocode-q"
              value={geo.q} onChange={e => setGeo(g => ({ ...g, q: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), searchAddress())}
              placeholder="e.g., 313 Somerset, Marina Bay Sands, 60 Airport Blvd…" />
            <Button type="button" variant="outline" disabled={geo.busy || geo.q.length < 3}
              onClick={searchAddress} data-testid="order-geocode-btn">
              {geo.busy ? "…" : "Search"}
            </Button>
          </div>
          {geo.error && <div className="mt-1.5 text-xs text-destructive">{geo.error}</div>}
          {geo.results.length > 0 && (
            <div style={{ marginTop: 6, border: "1px solid var(--border)", borderRadius: 8, maxHeight: 160, overflow: "auto" }}>
              {geo.results.map((r, i) => (
                <div key={i} style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", fontSize: 12, cursor: "pointer" }}
                  onClick={() => pickResult(r)} data-testid={`order-geo-result-${i}`}>
                  <b>{(r.name || "").split(",")[0]}</b>{" "}
                  <span className="muted">{r.name}</span>
                  {r.postal_code && <span className="chip" style={{ marginLeft: 6, fontSize: 10 }}>S{r.postal_code}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label className="label">Delivery location — drag the pin to fine-tune</label>
          <HubPicker
            position={[form.lat, form.lng]}
            color="#0d7c78"
            onChange={onPinMove}
            height={260}
          />
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
            {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
            {form.postal_code && <> · Postal <b>S{form.postal_code}</b></>}
            {pinHasMoved && <span className="text-primary"> · address updated from pin</span>}
          </div>
        </div>

        <div className="field"><label className="label">Customer address</label>
          <textarea className="textarea" data-testid="order-address"
            value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
            placeholder="Auto-filled from the search result or pin. You can edit it manually too." />
        </div>

        <div className="row">
          <div className="field"><label className="label">Weight (kg)</label>
            <input className="input" type="number" step="0.1" data-testid="order-weight"
              value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Required by (default: +2 days)</label>
            <input className="input" type="datetime-local" data-testid="order-required"
              value={form.required_by}
              onChange={e => setForm({ ...form, required_by: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        destructive
        title={pendingDelete ? `Delete order ${pendingDelete.code}?` : "Delete order?"}
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmRemove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
