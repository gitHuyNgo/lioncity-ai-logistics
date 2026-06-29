import React, { useEffect, useState, useCallback } from "react";
import { http } from "../lib/api";
import { Modal } from "../components/UI";
import MapView from "../components/MapView";
import PolygonEditor from "../components/PolygonEditor";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "@/components/composite/PageHeader";
import { DataTable } from "@/components/composite/DataTable";
import { ErrorState } from "@/components/composite/ErrorState";
import { ConfirmDialog } from "@/components/composite/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { notifySuccess, notifyError } from "@/lib/notify";

export default function Zones() {
  const { user } = useAuth();
  const [zones, setZones] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", color: "#0d7c78", polygon: [] });
  const [assignOpen, setAssignOpen] = useState(null);
  const [assignDriverId, setAssignDriverId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const canMutate = user?.role === "super_admin" || user?.role === "hub_manager";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [z, d] = await Promise.all([http.get("/zones"), http.get("/drivers")]);
      let filteredZones = z.data;
      let filteredDrivers = d.data;

      if (user?.role === "hub_manager" && user.reference_id) {
         const hmRes = await http.get("/hub-managers");
         const manager = hmRes.data.find(m => m.id === user.reference_id);
         if (manager) {
           filteredDrivers = d.data.filter(dr => dr.hub_manager_id === manager.id);
           const driverIds = filteredDrivers.map(dr => dr.id);
           // Filter zones that have at least one driver from this hub
           filteredZones = z.data.filter(zone => zone.driver_ids.some(did => driverIds.includes(did)));
         }
      } else if (user?.role === "shipper" && user.reference_id) {
         const driver = d.data.find(dr => dr.id === user.reference_id);
         if (driver && driver.zone_id) {
           filteredZones = z.data.filter(zone => zone.id === driver.zone_id);
         } else {
           filteredZones = [];
         }
         filteredDrivers = d.data.filter(dr => dr.id === user.reference_id);
      }

      setZones(filteredZones);
      setDrivers(filteredDrivers);
    } catch (e) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { if (!canMutate) return; setEditing(null); setForm({ name: "", color: "#0d7c78", polygon: [] }); setOpen(true); };
  const openEdit = (z) => { if (!canMutate) return; setEditing(z); setForm({ name: z.name, color: z.color || "#0d7c78", polygon: z.polygon }); setOpen(true); };

  const save = async () => {
    if (!form.name || form.polygon.length < 3 || !canMutate) return;
    const entity = `Zone "${form.name}"`;
    try {
      if (editing) await http.put(`/zones/${editing.id}`, { name: form.name, polygon: form.polygon, color: form.color });
      else await http.post("/zones", { name: form.name, polygon: form.polygon, color: form.color });
      setOpen(false);
      notifySuccess(editing ? "update" : "create", entity);
      load();
    } catch (e) {
      notifyError(editing ? "update" : "create", entity, e.response?.data?.detail || e.message);
    }
  };

  const remove = (z) => {
    if (!canMutate) return;
    setPendingDelete(z);
  };

  const confirmRemove = async () => {
    const z = pendingDelete;
    setPendingDelete(null);
    if (!z) return;
    const entity = `Zone "${z.name}"`;
    try {
      await http.delete(`/zones/${z.id}`);
      notifySuccess("delete", entity);
      load();
    } catch (e) {
      notifyError("delete", entity, e.response?.data?.detail || e.message);
    }
  };

  const assign = async () => {
    if (!canMutate) return;
    const entity = `Zone "${assignOpen?.name || ""}"`;
    try {
      await http.post(`/zones/${assignOpen.id}/assign-driver`, { driver_id: assignDriverId });
      setAssignOpen(null); setAssignDriverId("");
      notifySuccess("update", entity);
      load();
    } catch (e) {
      notifyError("update", entity, e.response?.data?.detail || e.message);
    }
  };

  const unassign = async (zone, driverId) => {
    if (!canMutate) return;
    const entity = `Zone "${zone.name}"`;
    try {
      await http.post(`/zones/${zone.id}/unassign-driver`, { driver_id: driverId });
      notifySuccess("update", entity);
      load();
    } catch (e) {
      notifyError("update", entity, e.response?.data?.detail || e.message);
    }
  };

  const dById = Object.fromEntries(drivers.map(d => [d.id, d]));

  const columns = [
    {
      key: "name",
      header: "Zone",
      render: (z) => (
        <div>
          <div className="flex items-center gap-2">
            {/* Data-driven zone color from the API stays as an inline style. */}
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ background: z.color }}
            />
            <b>{z.name}</b>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {z.polygon.length} vertices · center {z.center[0].toFixed(3)}, {z.center[1].toFixed(3)}
          </div>
        </div>
      ),
    },
    {
      key: "drivers",
      header: "Drivers",
      render: (z) => (
        <div className="flex flex-wrap items-center gap-1">
          {z.driver_ids.length === 0 && <span className="text-muted-foreground">None</span>}
          {z.driver_ids.map(did => (
            <span className="chip" key={did}>
              {dById[did]?.name || "driver"}
              {canMutate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-[18px] px-1 text-[10px]"
                  onClick={() => unassign(z, did)}
                  data-testid={`unassign-driver-${did}`}
                >
                  ×
                </Button>
              )}
            </span>
          ))}
        </div>
      ),
    },
  ];

  if (canMutate) {
    columns.push({
      key: "actions",
      header: "",
      align: "right",
      render: (z) => (
        <div className="flex justify-end gap-1">
          <Button variant="secondary" size="sm" data-testid={`assign-zone-${z.id}`} onClick={() => { setAssignOpen(z); setAssignDriverId(""); }}>+ Driver</Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(z)} data-testid={`edit-zone-${z.id}`}>Edit</Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => remove(z)}
            data-testid={`del-zone-${z.id}`}
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
        title={user?.role === "shipper" ? "My Delivery Zone" : "Zone Management"}
        actions={canMutate && (
          <Button data-testid="add-zone-btn" onClick={openNew}>+ Draw New Zone</Button>
        )}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_420px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3 font-semibold tracking-tight">Zone Coverage</div>
          <div className="p-3">
            <MapView height={520} zones={zones} />
          </div>
        </Card>

        <div>
          {loadError ? (
            <ErrorState message="Couldn't load zones. Please try again." onRetry={load} />
          ) : (
            <div className="rounded-lg border border-border bg-card" data-testid="zones-table">
              <DataTable
                columns={columns}
                rows={zones}
                rowKey={(z) => z.id}
                isLoading={loading}
                emptyMessage={user?.role === "shipper" ? "No zone assigned yet." : "No zones."}
              />
            </div>
          )}
        </div>
      </div>

      <Modal open={open} title={editing ? `Edit ${editing.name}` : "Draw New Zone"} onClose={() => setOpen(false)}
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!form.name || form.polygon.length < 3} onClick={save} data-testid="save-zone-btn">
            {editing ? "Save" : "Create"}
          </Button>
        </>}>
        <div className="row">
          <div className="field"><label className="label">Zone name</label>
            <input className="input" data-testid="zone-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label className="label">Color</label>
            <input className="input" type="color" data-testid="zone-color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} /></div>
        </div>
        <div className="field">
          <label className="label">Polygon — click the map to add vertices, drag to reshape</label>
          <PolygonEditor
            value={form.polygon}
            color={form.color}
            onChange={(p) => setForm(f => ({ ...f, polygon: p }))}
            existingZones={zones.filter(z => !editing || z.id !== editing.id)}
            height={380}
          />
        </div>
      </Modal>

      <Modal open={!!assignOpen} title={`Assign driver to ${assignOpen?.name || ""}`} onClose={() => setAssignOpen(null)}
        footer={<>
          <Button variant="outline" onClick={() => setAssignOpen(null)}>Cancel</Button>
          <Button disabled={!assignDriverId} onClick={assign} data-testid="confirm-assign-zone-btn">Assign</Button>
        </>}>
        <select className="select" data-testid="zone-assign-driver" value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)}>
          <option value="">— select driver —</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        destructive
        title={pendingDelete ? `Delete zone "${pendingDelete.name}"?` : "Delete this zone?"}
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmRemove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
