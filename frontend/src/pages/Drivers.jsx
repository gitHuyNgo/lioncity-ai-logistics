import React, { useEffect, useState, useCallback } from "react";
import { http } from "../lib/api";
import { Modal } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "@/components/composite/PageHeader";
import { DataTable } from "@/components/composite/DataTable";
import { StatusBadge } from "@/components/composite/StatusBadge";
import { ErrorState } from "@/components/composite/ErrorState";
import { ConfirmDialog } from "@/components/composite/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { notifySuccess, notifyError } from "@/lib/notify";

export default function Drivers() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [zones, setZones] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", license_type: "B", zone_id: "" });
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const canMutate = user?.role === "super_admin" || user?.role === "hub_manager";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [d, v, z] = await Promise.all([http.get("/drivers"), http.get("/vehicles"), http.get("/zones")]);
      let filteredDrivers = d.data;

      if (user?.role === "hub_manager" && user.reference_id) {
        const hmRes = await http.get("/hub-managers");
        const manager = hmRes.data.find(m => m.id === user.reference_id);
        if (manager) {
          filteredDrivers = d.data.filter(dr => dr.hub_manager_id === manager.id);
        }
      } else if (user?.role === "shipper" && user.reference_id) {
        const driver = d.data.find(dr => dr.id === user.reference_id);
        if (driver && driver.zone_id) {
          filteredDrivers = d.data.filter(dr => dr.zone_id === driver.zone_id);
        } else {
          filteredDrivers = d.data.filter(dr => dr.id === user.reference_id);
        }
      }

      setDrivers(filteredDrivers);
      setVehicles(v.data);
      setZones(z.data);
    } catch (e) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { if (!canMutate) return; setEditing(null); setForm({ name: "", phone: "", license_type: "B", zone_id: "" }); setOpen(true); setErr(""); };
  const openEdit = (d) => { if (!canMutate) return; setEditing(d); setForm({ name: d.name, phone: d.phone, license_type: d.license_type, zone_id: d.zone_id || "" }); setOpen(true); setErr(""); };

  const save = async () => {
    if (!canMutate) return;
    const entity = `Driver "${form.name}"`;
    try {
      setErr("");
      const payload = { ...form, zone_id: form.zone_id || null };
      if (editing) await http.put(`/drivers/${editing.id}`, payload);
      else await http.post("/drivers", payload);
      setOpen(false);
      notifySuccess(editing ? "update" : "create", entity);
      load();
    } catch (e) {
      const reason = e.response?.data?.detail || "Error";
      setErr(reason);
      notifyError(editing ? "update" : "create", entity, reason);
    }
  };

  const setStatus = async (d, status) => {
    // Drivers can only update their own status if role is shipper
    if (user?.role === "shipper" && d.id !== user.reference_id) return;
    try {
      await http.put(`/drivers/${d.id}/status`, { status });
      load();
    } catch (e) {
      notifyError("update", `Driver "${d.name}"`, e.response?.data?.detail || e.message);
    }
  };

  const remove = (d) => {
    if (!canMutate) return;
    setPendingDelete(d);
  };

  const confirmRemove = async () => {
    const d = pendingDelete;
    setPendingDelete(null);
    if (!d) return;
    const entity = `Driver "${d.name}"`;
    try {
      await http.delete(`/drivers/${d.id}`);
      notifySuccess("delete", entity);
      load();
    } catch (e) {
      notifyError("delete", entity, e.response?.data?.detail || e.message);
    }
  };

  const vById = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const zById = Object.fromEntries(zones.map(z => [z.id, z]));

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (d) => {
        const isSelf = user?.reference_id === d.id;
        return (
          <span className="font-medium">
            {d.name}
            {isSelf && (
              <span className="ml-1.5 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                You
              </span>
            )}
          </span>
        );
      },
    },
    { key: "phone", header: "Phone", render: (d) => <span className="text-muted-foreground">{d.phone}</span> },
    { key: "license_type", header: "License" },
    {
      key: "status",
      header: "Status",
      render: (d) => {
        const isSelf = user?.reference_id === d.id;
        return canMutate || isSelf ? (
          <select
            className="select h-7 px-2 text-xs"
            data-testid={`driver-status-${d.id}`}
            value={d.status}
            onChange={(e) => setStatus(d, e.target.value)}
          >
            <option value="available">Available</option>
            <option value="delivering">Delivering</option>
            <option value="off_duty">Off-duty</option>
          </select>
        ) : (
          <StatusBadge status={d.status} />
        );
      },
    },
    {
      key: "assigned_fleet",
      header: "Assigned Fleet",
      render: (d) => {
        const veh = d.vehicle_id ? vById[d.vehicle_id] : null;
        return veh ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[12.5px] font-semibold">{veh.plate}</span>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] capitalize text-muted-foreground">{veh.type}</span>
              <StatusBadge status={veh.fuel_type} />
              <span className="text-[11px] text-muted-foreground">· {veh.capacity_kg} kg</span>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        );
      },
    },
    {
      key: "zone",
      header: "Zone",
      render: (d) => {
        const zone = d.zone_id ? zById[d.zone_id] : null;
        return zone ? (
          <span
            className="chip"
            style={{ background: `${zone.color}22`, borderColor: zone.color }}
          >
            <span
              className="mr-1 inline-block h-2 w-2 rounded-[2px]"
              style={{ background: zone.color }}
            />
            {zone.name}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
  ];

  if (canMutate) {
    columns.push({
      key: "actions",
      header: "",
      align: "right",
      render: (d) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(d)} data-testid={`edit-driver-${d.id}`}>Edit</Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => remove(d)}
            data-testid={`del-driver-${d.id}`}
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
        title={user?.role === "shipper" ? "Team & Colleagues" : "Shipper Management"}
        actions={canMutate && (
          <Button data-testid="add-driver-btn" onClick={openNew}>+ Add Driver</Button>
        )}
      />

      <div className="mt-4">
        {loadError ? (
          <ErrorState message="Couldn't load drivers. Please try again." onRetry={load} />
        ) : (
          <div className="rounded-lg border border-border bg-card" data-testid="drivers-table">
            <DataTable
              columns={columns}
              rows={drivers}
              rowKey={(d) => d.id}
              isLoading={loading}
              emptyMessage="No drivers."
            />
          </div>
        )}
      </div>

      <Modal open={open} title={editing ? "Edit Driver" : "New Driver"} onClose={() => setOpen(false)}
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} data-testid="save-driver-btn">{editing ? "Save" : "Create"}</Button>
        </>}>
        <div className="row">
          <div className="field"><label className="label">Full name</label>
            <input className="input" data-testid="driver-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label className="label">Phone (unique)</label>
            <input className="input" data-testid="driver-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div className="row">
          <div className="field"><label className="label">License Type</label>
            <select className="select" data-testid="driver-license" value={form.license_type} onChange={e => setForm({ ...form, license_type: e.target.value })}>
              <option value="A">A — Motorbike only</option>
              <option value="B">B — Motorbike or Van</option>
              <option value="C">C — Van / Truck only</option>
            </select></div>
          <div className="field"><label className="label">Operating Zone</label>
            <select className="select" data-testid="driver-zone" value={form.zone_id || ""} onChange={e => setForm({ ...form, zone_id: e.target.value })}>
              <option value="">— No zone (any) —</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select></div>
        </div>
        <div className="muted" style={{ fontSize: 11.5 }}>
          Tip: license <b>B</b> is the most flexible — drivers can be matched to motorbikes <em>and</em> vans during auto-assignment.
        </div>
        {err && <div className="text-xs text-destructive">{err}</div>}
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        destructive
        title={pendingDelete ? `Delete driver "${pendingDelete.name}"?` : "Delete this driver?"}
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmRemove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
