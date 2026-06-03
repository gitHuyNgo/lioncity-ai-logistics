import React, { useEffect, useState, useCallback } from "react";
import { http } from "../lib/api";
import { Modal, Badge } from "../components/UI";
import { useAuth } from "../context/AuthContext";

export default function Vehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({ plate: "", type: "van", fuel_type: "ev", capacity_kg: 500 });
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(null); // vehicle
  const [assignDriverId, setAssignDriverId] = useState("");

  const canMutate = user?.role === "super_admin" || user?.role === "hub_manager";

  const load = useCallback(async () => {
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
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const [assignErr, setAssignErr] = useState("");

  const create = async () => { if (!canMutate) return; await http.post("/vehicles", form); setOpen(false); load(); };
  const remove = async (id) => { 
    if (!canMutate) return;
    if (!window.confirm("Delete this vehicle?")) return; 
    await http.delete(`/vehicles/${id}`); load(); 
  };
  const assign = async () => {
    if (!canMutate) return;
    try {
      setAssignErr("");
      await http.post(`/vehicles/${assignOpen.id}/assign`, { driver_id: assignDriverId });
      setAssignOpen(null); setAssignDriverId(""); load();
    } catch (e) {
      setAssignErr(e.response?.data?.detail || "Error assigning driver");
    }
  };
  const unassign = async (v) => { if (!canMutate) return; await http.post(`/vehicles/${v.id}/unassign`); load(); };

  const dById = Object.fromEntries(drivers.map(d => [d.id, d]));

  // License-to-vehicle matrix: motorbike→A/B, van→B/C
  const allowedLicenses = (type) => (type === "motorbike" ? ["A", "B"] : type === "van" ? ["B", "C"] : []);
  const eligibleDrivers = assignOpen
    ? drivers.filter(d => allowedLicenses(assignOpen.type).includes(d.license_type))
    : [];

  return (
    <div>
      <div className="page-title"><span className="accent"></span>{user?.role === "shipper" ? "My Vehicle" : "Fleet Management"}</div>

      <div className="toolbar">
        {canMutate && <button className="btn primary" data-testid="add-vehicle-btn" onClick={() => { setForm({ plate: "", type: "van", fuel_type: "ev", capacity_kg: 500 }); setOpen(true); }}>+ Add Vehicle</button>}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="tbl" data-testid="vehicles-table">
          <thead><tr><th>Plate</th><th>Type</th><th>Fuel</th><th>Capacity</th><th>Assigned Driver</th>{canMutate && <th></th>}</tr></thead>
          <tbody>
            {vehicles.map(v => {
              const drv = v.assigned_driver_id ? dById[v.assigned_driver_id] : null;
              return (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600 }}>{v.plate}</td>
                  <td style={{ textTransform: "capitalize" }}>{v.type}</td>
                  <td><Badge tone={v.fuel_type}>{v.fuel_type.toUpperCase()}</Badge></td>
                  <td>{v.capacity_kg} kg</td>
                  <td>
                    {drv ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 12.5 }}>{drv.name}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <span className="muted" style={{ fontSize: 11 }}>{drv.phone}</span>
                          <Badge tone={drv.status}>{drv.status}</Badge>
                          <span className="muted" style={{ fontSize: 11 }}>· License {drv.license_type}</span>
                        </div>
                      </div>
                    ) : <span className="muted">Unassigned</span>}
                  </td>
                  {canMutate && (
                    <td style={{ textAlign: "right" }}>
                      {!v.assigned_driver_id
                        ? <button className="btn sm" onClick={() => { setAssignOpen(v); setAssignDriverId(""); }} data-testid={`assign-vehicle-${v.id}`}>Assign</button>
                        : <button className="btn sm ghost" onClick={() => unassign(v)} data-testid={`unassign-vehicle-${v.id}`}>Unassign</button>}
                      <button className="btn sm ghost" style={{ color: "#b91c1c" }} onClick={() => remove(v.id)} data-testid={`del-vehicle-${v.id}`}>Delete</button>
                    </td>
                  )}
                </tr>
              );
            })}
            {vehicles.length === 0 && <tr><td colSpan={canMutate ? 6 : 5} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>{user?.role === "shipper" ? "No vehicle assigned yet." : "No vehicles."}</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={open} title="New Vehicle" onClose={() => setOpen(false)}
        footer={<>
          <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn primary" onClick={create} data-testid="save-vehicle-btn">Create</button>
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
          <button className="btn" onClick={() => { setAssignOpen(null); setAssignErr(""); }}>Cancel</button>
          <button className="btn primary" disabled={!assignDriverId} onClick={assign} data-testid="confirm-assign-vehicle-btn">Assign</button>
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
            <div className="muted" style={{ fontSize: 12, marginTop: 6, color: "#b91c1c" }}>
              No drivers with a compatible license available.
            </div>
          )}
          {assignErr && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }} data-testid="assign-err">{assignErr}</div>}
        </div>
      </Modal>
    </div>
  );
}