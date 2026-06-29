import React, { useEffect, useState, useCallback } from "react";
import { http, fmtDate } from "../lib/api";
import MapView from "../components/MapView";
import HubPicker from "../components/HubPicker";
import { Modal } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "@/components/composite/PageHeader";
import { DataTable } from "@/components/composite/DataTable";
import { StatusBadge } from "@/components/composite/StatusBadge";
import { ErrorState } from "@/components/composite/ErrorState";
import { ConfirmDialog } from "@/components/composite/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { notifySuccess, notifyError } from "@/lib/notify";

export default function Hubs() {
  const { user } = useAuth();
  const [hubs, setHubs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", lat: 1.3521, lng: 103.8198, is_default: false, color: "#0d7c78", notes: "" });
  const [geo, setGeo] = useState({ q: "", busy: false, results: [], error: "" });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const isAdmin = user?.role === "super_admin";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const r = await http.get("/hubs");
      let filteredHubs = r.data;

      if (user?.role === "hub_manager" && user.reference_id) {
         const hmRes = await http.get("/hub-managers");
         const manager = hmRes.data.find(m => m.id === user.reference_id);
         if (manager && manager.hub_id) {
           filteredHubs = r.data.filter(h => h.id === manager.hub_id);
         }
      } else if (user?.role === "shipper" && user.reference_id) {
         const drRes = await http.get("/drivers");
         const driver = drRes.data.find(d => d.id === user.reference_id);
         if (driver && driver.hub_manager_id) {
           const hmRes = await http.get("/hub-managers");
           const manager = hmRes.data.find(m => m.id === driver.hub_manager_id);
           if (manager && manager.hub_id) {
             filteredHubs = r.data.filter(h => h.id === manager.hub_id);
           }
         }
      }
      setHubs(filteredHubs);
    } catch (e) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    if (!isAdmin) return;
    setEditing(null);
    setForm({ name: "", address: "", lat: 1.3521, lng: 103.8198, is_default: hubs.length === 0, color: "#0d7c78", notes: "" });
    setGeo({ q: "", busy: false, results: [], error: "" });
    setOpen(true);
  };
  const openEdit = (h) => {
    if (!isAdmin) return;
    setEditing(h);
    setForm({ name: h.name, address: h.address || "", lat: h.lat, lng: h.lng, is_default: !!h.is_default, color: h.color || "#0d7c78", notes: h.notes || "" });
    setGeo({ q: "", busy: false, results: [], error: "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name || !isAdmin) return;
    const entity = `Hub "${form.name}"`;
    try {
      if (editing) await http.put(`/hubs/${editing.id}`, form);
      else await http.post("/hubs", form);
      setOpen(false);
      notifySuccess(editing ? "update" : "create", entity);
      load();
    } catch (e) {
      notifyError(editing ? "update" : "create", entity, e.response?.data?.detail || e.message);
    }
  };

  const remove = (h) => {
    if (!isAdmin) return;
    setPendingDelete(h);
  };

  const confirmRemove = async () => {
    const h = pendingDelete;
    setPendingDelete(null);
    if (!h) return;
    const entity = `Hub "${h.name}"`;
    try {
      await http.delete(`/hubs/${h.id}`);
      notifySuccess("delete", entity);
      load();
    } catch (e) {
      notifyError("delete", entity, e.response?.data?.detail || e.message);
    }
  };

  const makeDefault = async (h) => {
    if (!isAdmin) return;
    const entity = `Hub "${h.name}"`;
    try {
      await http.put(`/hubs/${h.id}`, { ...h, is_default: true });
      notifySuccess("update", entity);
      load();
    } catch (e) {
      notifyError("update", entity, e.response?.data?.detail || e.message);
    }
  };

  const geocode = async () => {
    if (!geo.q || geo.q.length < 3) return;
    setGeo(g => ({ ...g, busy: true, error: "", results: [] }));
    try {
      const r = await http.get("/geocode", { params: { q: geo.q } });
      if (r.data.error) setGeo(g => ({ ...g, busy: false, error: r.data.error, results: [] }));
      else setGeo(g => ({ ...g, busy: false, results: r.data.results || [] }));
    } catch (e) {
      setGeo(g => ({ ...g, busy: false, error: "Geocoder error — drag the pin on the map instead." }));
    }
  };

  const selectGeo = (r) => {
    setForm(f => ({ ...f, lat: r.lat, lng: r.lng, address: f.address || r.name }));
    setGeo(g => ({ ...g, results: [] }));
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (h) => (
        <div>
          <div className="flex items-center gap-2">
            {/* Data-driven hub color from the API stays as an inline style. */}
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 rounded-[3px] border-2 border-card"
              style={{
                background: h.color || "hsl(var(--primary))",
                boxShadow: `0 0 0 1px ${h.color ? `${h.color}55` : "hsl(var(--primary)/0.35)"}`,
              }}
            />
            <b>{h.name}</b>
          </div>
          <div className="text-[11px] text-muted-foreground">{fmtDate(h.created_at)}</div>
        </div>
      ),
    },
    {
      key: "address",
      header: "Address / Coords",
      render: (h) => (
        <div className="text-xs">
          <div>{h.address || <span className="text-muted-foreground">No address</span>}</div>
          <div className="text-muted-foreground">{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (h) => (
        h.is_default ? (
          <StatusBadge status="available">Default</StatusBadge>
        ) : isAdmin ? (
          <Button variant="ghost" size="sm" onClick={() => makeDefault(h)} data-testid={`set-default-hub-${h.id}`}>Set default</Button>
        ) : (
          <span className="text-muted-foreground">Active</span>
        )
      ),
    },
  ];

  if (isAdmin) {
    columns.push({
      key: "actions",
      header: "",
      align: "right",
      render: (h) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(h)} data-testid={`edit-hub-${h.id}`}>Edit</Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => remove(h)}
            data-testid={`del-hub-${h.id}`}
          >
            Delete
          </Button>
        </div>
      ),
    });
  }

  return (
    <div>
      <PageHeader
        accent
        title={isAdmin ? "Hubs Management" : "Assigned Hub"}
        subtitle={isAdmin ? "Default hub is used by route planning & auto-assignment." : undefined}
        actions={isAdmin && (
          <Button data-testid="add-hub-btn" onClick={openNew}>+ Add Hub</Button>
        )}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_420px]">
        <Card className="flex flex-col overflow-hidden p-0">
          <div className="min-h-[520px] flex-1">
            <MapView height="100%" hubs={hubs} />
          </div>
        </Card>

        <div>
          {loadError ? (
            <ErrorState message="Couldn't load hubs. Please try again." onRetry={load} />
          ) : (
            <div className="rounded-lg border border-border bg-card" data-testid="hubs-table">
              <DataTable
                columns={columns}
                rows={hubs}
                rowKey={(h) => h.id}
                isLoading={loading}
                emptyMessage="No hubs yet. Add your first hub."
              />
            </div>
          )}
        </div>
      </div>

      <Modal open={open} title={editing ? `Edit ${editing.name}` : "New Hub"} onClose={() => setOpen(false)}
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={!form.name} data-testid="save-hub-btn">{editing ? "Save" : "Create"}</Button>
        </>}>
        <div className="row">
          <div className="field"><label className="label">Hub name</label>
            <input className="input" data-testid="hub-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label className="label">Marker color</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input type="color" className="input" style={{ width: 52, padding: 2, height: 36 }}
                data-testid="hub-color" value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })} />
              {["#0d7c78", "#7c3aed", "#f59e0b", "#0ea5e9", "#16a34a", "#db2777", "#475569"].map(c => (
                <button key={c} type="button" title={c}
                  data-testid={`hub-color-preset-${c.replace('#','')}`}
                  onClick={() => setForm({ ...form, color: c })}
                  style={{
                    width: 22, height: 22, borderRadius: 6, background: c,
                    border: form.color === c ? "2px solid hsl(var(--foreground))" : "1px solid hsl(var(--border))",
                    cursor: "pointer", padding: 0,
                  }} />
              ))}
            </div>
          </div>
        </div>
        <div className="field"><label className="label">Address (optional, free text)</label>
          <input className="input" data-testid="hub-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="e.g., 1 Tanglin Rd, Singapore" /></div>

        <div className="field">
          <label className="label">Search address (OneMap.gov.sg)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" data-testid="hub-geocode-q" value={geo.q} onChange={e => setGeo(g => ({ ...g, q: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && geocode()} placeholder="e.g., Marina Bay Sands" />
            <Button type="button" variant="outline" disabled={geo.busy || geo.q.length < 3} onClick={geocode} data-testid="hub-geocode-btn">
              {geo.busy ? "…" : "Search"}
            </Button>
          </div>
          {geo.error && <div className="mt-1.5 text-[11.5px] text-destructive">{geo.error}</div>}
          {geo.results.length > 0 && (
            <div className="mt-1.5 max-h-[140px] overflow-auto rounded-lg border border-border">
              {geo.results.map((r, i) => (
                <div key={i} className="cursor-pointer border-b border-border px-2.5 py-2 text-xs"
                  onClick={() => selectGeo(r)} data-testid={`geo-result-${i}`}>
                  <b>{r.name.split(",")[0]}</b> <span className="text-muted-foreground">{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label className="label">Location — click the map or drag the pin</label>
          <HubPicker position={[form.lat, form.lng]} color={form.color} onChange={(p) => setForm(f => ({ ...f, lat: p[0], lng: p[1] }))} height={260} />
          <div className="mt-1 text-[11px] text-muted-foreground">
            {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
          </div>
        </div>

        <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" id="hub-default" data-testid="hub-is-default"
            checked={!!form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} />
          <label htmlFor="hub-default" style={{ fontSize: 13 }}>Use as default hub (routes + auto-assign start here)</label>
        </div>
        <div className="field"><label className="label">Notes</label>
          <textarea className="textarea" data-testid="hub-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        destructive
        title={pendingDelete ? `Delete hub "${pendingDelete.name}"?` : "Delete this hub?"}
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmRemove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
