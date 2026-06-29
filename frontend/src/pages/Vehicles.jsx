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

export default function Vehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({ plate: "", type: "van", fuel_type: "ev", capacity_kg: 500 });
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(null); // vehicle
  const [assignDriverId, setAssignDriverId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const canMutate = user?.role === "super_admin" || user?.role === "hub_manager";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [v, d] = await Promise.all([http.get("/vehicles"), http.get("/drivers")]);
      let filteredVehicles = v.data;
      let filteredDrivers = d.data;

      if (user?.role === "hub_manager" && user.reference_id) {
        const hmRes = await http.get("/hub-managers");
        const manager = hmRes.data.find(m => m.id === user.reference_id);
        if (manager) {
          filteredDrivers = d.data.filter(dr => dr.hub_manager_id === manager.id);
          const driverIds = filteredDrivers.map(dr => dr.id);
          filteredVehicles = v.data.filter(veh => driverIds.includes(veh.assigned_driver_id) || !veh.assigned_driver_id);
        }
      } else if (user?.role === "shipper" && user.reference_id) {
        filteredVehicles = v.data.filter(veh => veh.assigned_driver_id === user.reference_id);
        filteredDrivers = d.data.filter(dr => dr.id === user.reference_id);
      }

      setVehicles(filteredVehicles);
      setDrivers(filteredDrivers);
    } catch (e) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const [assignErr, setAssignErr] = useState("");

  const create = async () => {
    if (!canMutate) return;
    const entity = `Vehicle "${form.plate}"`;
    try {
      await http.post("/vehicles", form);
      setOpen(false);
      notifySuccess("create", entity);
      load();
    } catch (e) {
      notifyError("create", entity, e.response?.data?.detail || e.message);
    }
  };

  const remove = (v) => {
    if (!canMutate) return;
    setPendingDelete(v);
  };

  const confirmRemove = async () => {
    const v = pendingDelete;
    setPendingDelete(null);
    if (!v) return;
    const entity = `Vehicle "${v.plate}"`;
    try {
      await http.delete(`/vehicles/${v.id}`);
      notifySuccess("delete", entity);
      load();
    } catch (e) {
      notifyError("delete", entity, e.response?.data?.detail || e.message);
    }
  };

  const assign = async () => {
    if (!canMutate) return;
    const entity = `Vehicle "${assignOpen?.plate || ""}"`;
    try {
      setAssignErr("");
      await http.post(`/vehicles/${assignOpen.id}/assign`, { driver_id: assignDriverId });
      setAssignOpen(null); setAssignDriverId("");
      notifySuccess("update", entity);
      load();
    } catch (e) {
      const reason = e.response?.data?.detail || "Error assigning driver";
      setAssignErr(reason);
      notifyError("update", entity, reason);
    }
  };

  const unassign = async (v) => {
    if (!canMutate) return;
    const entity = `Vehicle "${v.plate}"`;
    try {
      await http.post(`/vehicles/${v.id}/unassign`);
      notifySuccess("update", entity);
      load();
    } catch (e) {
      notifyError("update", entity, e.response?.data?.detail || e.message);
    }
  };

  const dById = Object.fromEntries(drivers.map(d => [d.id, d]));

  // License-to-vehicle matrix: motorbike→A/B, van→B/C
  const allowedLicenses = (type) => (type === "motorbike" ? ["A", "B"] : type === "van" ? ["B", "C"] : []);
  const eligibleDrivers = assignOpen
    ? drivers.filter(d => allowedLicenses(assignOpen.type).includes(d.license_type))
    : [];

  const columns = [
    { key: "plate", header: "Plate", render: (v) => <span className="font-semibold">{v.plate}</span> },
    { key: "type", header: "Type", render: (v) => <span className="capitalize">{v.type}</span> },
    { key: "fuel_type", header: "Fuel", render: (v) => <StatusBadge status={v.fuel_type} /> },
    { key: "capacity_kg", header: "Capacity", align: "right", render: (v) => `${v.capacity_kg} kg` },
    {
      key: "assigned_driver",
      header: "Assigned Driver",
      render: (v) => {
        const drv = v.assigned_driver_id ? dById[v.assigned_driver_id] : null;
        return drv ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[12.5px] font-semibold">{drv.name}</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">{drv.phone}</span>
              <StatusBadge status={drv.status} />
              <span className="text-[11px] text-muted-foreground">· License {drv.license_type}</span>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        );
      },
    },
  ];

  if (canMutate) {
    columns.push({
      key: "actions",
      header: "",
      align: "right",
      render: (v) => (
        <div className="flex justify-end gap-1">
          {!v.assigned_driver_id ? (
            <Button variant="secondary" size="sm" onClick={() => { setAssignOpen(v); setAssignDriverId(""); }} data-testid={`assign-vehicle-${v.id}`}>Assign</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => unassign(v)} data-testid={`unassign-vehicle-${v.id}`}>Unassign</Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => remove(v)}
            data-testid={`del-vehicle-${v.id}`}
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
        title={user?.role === "shipper" ? "My Vehicle" : "Fleet Management"}
        actions={canMutate && (
          <Button data-testid="add-vehicle-btn" onClick={() => { setForm({ plate: "", type: "van", fuel_type: "ev", capacity_kg: 500 }); setOpen(true); }}>+ Add Vehicle</Button>
        )}
      />

      <div className="mt-4">
        {loadError ? (
          <ErrorState message="Couldn't load vehicles. Please try again." onRetry={load} />
        ) : (
          <div className="rounded-lg border border-border bg-card" data-testid="vehicles-table">
            <DataTable
              columns={columns}
              rows={vehicles}
              rowKey={(v) => v.id}
              isLoading={loading}
              emptyMessage={user?.role === "shipper" ? "No vehicle assigned yet." : "No vehicles."}
            />
          </div>
        )}
      </div>

      <Modal open={open} title="New Vehicle" onClose={() => setOpen(false)}
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={create} data-testid="save-vehicle-btn">Create</Button>
        </>}>
        <div className="field"><label className="label">Plate</label>
          <input className="input" data-testid="veh-plate" value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} /></div>
        <div className="row">
          <div className="field"><label className="label">Type</label>
            <select className="select" data-testid="veh-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="motorbike">Motorbike</option>
              <option value="van">Van</option>
            </select></div>
          <div className="field"><label className="label">Fuel</label>
            <select className="select" data-testid="veh-fuel" value={form.fuel_type} onChange={e => setForm({ ...form, fuel_type: e.target.value })}>
              <option value="ev">EV</option>
              <option value="diesel">Diesel</option>
            </select></div>
        </div>
        <div className="field"><label className="label">Capacity (kg)</label>
          <input className="input" type="number" data-testid="veh-capacity" value={form.capacity_kg}
            onChange={e => setForm({ ...form, capacity_kg: parseFloat(e.target.value) || 0 })} /></div>
      </Modal>

      <Modal open={!!assignOpen} title={`Assign ${assignOpen?.plate || ""}`} onClose={() => { setAssignOpen(null); setAssignErr(""); }}
        footer={<>
          <Button variant="outline" onClick={() => { setAssignOpen(null); setAssignErr(""); }}>Cancel</Button>
          <Button disabled={!assignDriverId} onClick={assign} data-testid="confirm-assign-vehicle-btn">Assign</Button>
        </>}>
        <div className="field">
          <label className="label">Driver</label>
          <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
            {assignOpen?.type === "motorbike" && "Motorbike — only License A or B drivers shown"}
            {assignOpen?.type === "van" && "Van — only License B or C drivers shown"}
          </div>
          <select className="select" data-testid="veh-assign-driver" value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)}>
            <option value="">— select —</option>
            {eligibleDrivers.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} · License {d.license_type}{d.vehicle_id ? ` (re-assign)` : ""}
              </option>
            ))}
          </select>
          {eligibleDrivers.length === 0 && (
            <div className="mt-1.5 text-xs text-destructive">
              No drivers with a compatible license available.
            </div>
          )}
          {assignErr && <div className="mt-1.5 text-xs text-destructive" data-testid="assign-err">{assignErr}</div>}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        destructive
        title={pendingDelete ? `Delete vehicle "${pendingDelete.plate}"?` : "Delete this vehicle?"}
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmRemove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
