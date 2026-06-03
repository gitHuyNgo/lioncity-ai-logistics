import React, { useEffect, useState, useCallback, useMemo } from "react";
import { http, fmtDate, fmtDist, fmtDur } from "../lib/api";
import MapView from "../components/MapView";
import { Badge, Modal } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { useTracking } from "../context/TrackingContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Camera, QrCode, CheckCircle2, TrendingUp, DollarSign, Package, MapPin } from "lucide-react";

export default function Shipper() {
  const { user } = useAuth();
  const { isTracking, trackedDriverId, trackingData, startTracking, stopTracking } = useTracking();
  
  const [drivers, setDrivers] = useState([]);
  const [driverId, setDriverId] = useState("");
  const [payload, setPayload] = useState(null);
  const [orders, setOrders] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("deliveries"); // deliveries | earnings
  
  // Modals
  const [failOpen, setFailOpen] = useState(null);
  const [failReason, setFailReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(null); // order to confirm
  const [proofType, setProofType] = useState(null); // 'photo' | 'qr' | null
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const d = await http.get("/drivers");
    setDrivers(d.data);
    
    if (user?.role === "shipper" && user.reference_id) {
      setDriverId(user.reference_id);
    } else if (!driverId && d.data.length) {
      setDriverId(d.data[0].id);
    }
  }, [user, driverId]);

  const loadOrders = useCallback(async () => {
    if (!driverId) return;
    try {
      const [pRes, allRes, eRes] = await Promise.all([
        http.get(`/shipper/${driverId}/orders`),
        http.get("/orders", { params: { driver_id: driverId } }),
        http.get(`/shipper/${driverId}/earnings`)
      ]);
      setPayload(pRes.data);
      setOrders(allRes.data);
      setEarnings(eRes.data);
    } catch (e) { console.error("Error loading shipper data", e); }
  }, [driverId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Sync with global tracking data for the map
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
    return payload?.route || null;
  }, [isTracking, trackedDriverId, driverId, trackingData.route, payload]);

  const setStatus = async (status) => { 
    await http.put(`/drivers/${driverId}/status`, { status }); 
    if (status === "delivering") startTracking(driverId);
    else if (status === "available") stopTracking();
    load(); 
  };

  const finalizeDelivery = async () => {
    setUploading(true);
    // Simulate processing
    await new Promise(r => setTimeout(r, 1500));
    try {
      await http.put(`/orders/${confirmOpen.id}/status`, { 
        status: "delivered",
        proof_photo: proofType === 'photo' ? "simulated_upload_url" : null,
        proof_signature: proofType === 'qr' ? "verified_qr_code" : "manual_signature"
      });
      setConfirmOpen(null);
      setProofType(null);
      loadOrders();
    } catch (e) { alert("Failed to complete delivery"); }
    setUploading(false);
  };

  const markFailed = async () => {
    await http.put(`/orders/${failOpen.id}/status`, { status: "failed", fail_reason: failReason });
    setFailOpen(null); setFailReason(""); loadOrders();
  };

  const simulateMove = async () => { 
    setBusy(true); 
    await http.post(`/drivers/${driverId}/simulate-step`, { step_m: 300 }); 
    if (!isTracking) loadOrders(); 
    setBusy(false); 
  };

  const activeOrders = payload?.orders || [];
  const done = orders.filter(o => ["delivered", "failed"].includes(o.status));
  const isDelivering = currentDriver?.status === "delivering";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div className="page-title">
        <span className="accent"></span>
        {user?.role === "shipper" ? `Hello, ${user.full_name}` : "Shipper Management"}
      </div>
      <div className="page-subtitle" style={{ marginBottom: 16 }}>
        {isDelivering ? "Live tracking and delivery dispatch active." : "Set status to 'Delivering' to start your shift."}
      </div>

      <div className="toolbar" style={{ background: "white", padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 20 }}>
        {user?.role !== "shipper" && (
          <select className="select" style={{ width: 220 }} value={driverId} onChange={e => setDriverId(e.target.value)}>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        
        <div style={{ display: "flex", gap: 10 }}>
          <button className={`btn sm ${activeTab === 'deliveries' ? 'primary' : 'ghost'}`} onClick={() => setActiveTab('deliveries')}>
            <Package size={14} /> My Deliveries
          </button>
          <button className={`btn sm ${activeTab === 'earnings' ? 'primary' : 'ghost'}`} onClick={() => setActiveTab('earnings')}>
            <TrendingUp size={14} /> My Earnings
          </button>
        </div>

        <div style={{ flex: 1 }}></div>

        {currentDriver && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
             <select className="select" style={{ width: 140, height: 32, fontSize: 12 }} 
              value={currentDriver.status} onChange={e => setStatus(e.target.value)}>
              <option value="available">Available</option>
              <option value="delivering">Delivering</option>
              <option value="off_duty">Off-duty</option>
            </select>
            <Badge tone={currentDriver.status}>{currentDriver.status}</Badge>
          </div>
        )}
      </div>

      {activeTab === "deliveries" ? (
        <div className="section">
          <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
            <MapView
              height={560}
              orders={activeOrders}
              drivers={currentDriver && currentDriver.location ? [currentDriver] : []}
              routes={currentRoute ? [{ ...currentRoute, color: "#0d7c78" }] : []}
              tracking={isTracking && trackedDriverId === driverId ? { driver_id: driverId, location: currentDriver?.location } : null}
            />
            {isTracking && (
              <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1000 }}>
                <div className="badge available" style={{ background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: "6px 12px" }}>
                   <span className="tracking-dot"></span> LIVE GPS SYNC
                </div>
              </div>
            )}
            <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 1000 }}>
               <button className="btn primary sm" disabled={!currentRoute || busy} onClick={simulateMove} style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                 ▶ Advance GPS 300m
               </button>
            </div>
          </div>

          <div className="card" style={{ maxHeight: 620, overflow: "auto", display: "flex", flexDirection: "column" }}>
            <div className="card-header">
              <div>
                <div className="card-title">Delivery Queue</div>
                <div className="card-subtitle">{activeOrders.length} pending · {done.length} completed</div>
              </div>
              {currentRoute && <Badge tone="assigned">{fmtDist(currentRoute.distance_m)} total</Badge>}
            </div>

            {activeOrders.length === 0 && <div className="empty">No active deliveries.</div>}

            <div style={{ flex: 1 }}>
              {activeOrders.map((o) => (
                <div key={o.id} className="card" style={{ marginBottom: 12, borderLeft: `4px solid ${o.status === 'delivering' ? 'var(--amber)' : 'var(--teal)'}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "var(--teal-ink)" }}>{o.code}</div>
                    <Badge tone="emerald" style={{ fontSize: 10 }}>Payout: ${o.payout?.toFixed(2)}</Badge>
                  </div>
                  <div style={{ display: "flex", gap: 8, color: "#475569", fontSize: 13, marginBottom: 4 }}>
                    <MapPin size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{o.address}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginLeft: 22, marginBottom: 12 }}>
                    {o.weight_kg} kg · Due {fmtDate(o.required_by)}
                  </div>
                  
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn sm primary" style={{ flex: 1 }} onClick={() => setConfirmOpen(o)}>
                      <CheckCircle2 size={14} /> Mark Delivered
                    </button>
                    <button className="btn sm ghost danger" style={{ border: "1px solid #fee2e2" }} onClick={() => { setFailOpen(o); setFailReason(""); }}>
                      ✗ Failed
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {done.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  Recently Completed
                </div>
                {done.slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 13 }}>
                    <span><b style={{ color: "#475569" }}>{o.code}</b> <span style={{ color: "#94a3b8" }}>— ${o.payout?.toFixed(2)}</span></span>
                    <Badge tone={o.status} style={{ fontSize: 9 }}>{o.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="section" style={{ gridTemplateColumns: "1fr 380px" }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 20 }}>Earnings History</div>
            <div style={{ height: 350, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={earnings?.chart_data || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={11} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={35}>
                    {(earnings?.chart_data || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "var(--teal)" : "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ marginTop: 24 }}>
               <table className="tbl">
                 <thead>
                   <tr><th>Code</th><th>Address</th><th>Payout</th><th>Status</th></tr>
                 </thead>
                 <tbody>
                   {earnings?.history?.map(h => (
                     <tr key={h.id}>
                       <td><b>{h.code}</b></td>
                       <td className="muted">{h.address}</td>
                       <td><b>${h.payout?.toFixed(2)}</b></td>
                       <td><Badge tone={h.status}>{h.status}</Badge></td>
                     </tr>
                   ))}
                   {(!earnings?.history || earnings.history.length === 0) && (
                     <tr><td colSpan="4" style={{ textAlign: "center", padding: 20 }} className="muted">No earnings history yet.</td></tr>
                   )}
                 </tbody>
               </table>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="stat teal">
              <div className="label">Total Earned (Today)</div>
              <div className="value" style={{ color: "var(--teal-ink)", display: "flex", alignItems: "center", gap: 8 }}>
                <DollarSign size={24} /> {earnings?.total_earned?.toFixed(2) || "0.00"}
              </div>
              <div className="delta">You've earned this across {earnings?.delivery_count || 0} deliveries.</div>
            </div>
            
            <div className="card" style={{ background: "linear-gradient(135deg, var(--teal-ink), #0b1e24)", color: "white" }}>
               <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Earnings Booster</div>
               <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>
                 Complete 5 more deliveries today to unlock a **$10.00** performance bonus!
               </div>
               <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, ((earnings?.delivery_count || 0) / 10) * 100)}%`, background: "var(--teal)" }}></div>
               </div>
               <div style={{ fontSize: 11, marginTop: 8, textAlign: "right" }}>{earnings?.delivery_count || 0}/10 completed</div>
            </div>

            <div className="card">
               <div className="card-title" style={{ fontSize: 13, marginBottom: 12 }}>Payment Details</div>
               <div className="muted" style={{ fontSize: 12 }}>
                 Current payout settings:
                 <ul style={{ paddingLeft: 16, marginTop: 8 }}>
                    <li>Base per order: **$3.00**</li>
                    <li>Weight bonus: **$0.50/kg**</li>
                    <li>EV Bonus: **+$2.00** (Applied at weekly payout)</li>
                 </ul>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal 
        open={!!confirmOpen} 
        title={`Confirm Delivery: ${confirmOpen?.code}`} 
        onClose={() => !uploading && setConfirmOpen(null)}
        footer={!uploading && (
          <>
            <button className="btn" onClick={() => setConfirmOpen(null)}>Cancel</button>
            <button className="btn primary" disabled={!proofType} onClick={finalizeDelivery}>Confirm Success</button>
          </>
        )}
      >
        {uploading ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <div className="tracking-dot" style={{ width: 20, height: 20, marginBottom: 16 }}></div>
            <div style={{ fontWeight: 600 }}>Uploading Proof...</div>
            <div className="muted">Connecting to secure storage</div>
          </div>
        ) : (
          <div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
              Please provide proof of delivery at **{confirmOpen?.address}**.
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <button 
                className={`btn ${proofType === 'photo' ? 'primary' : ''}`} 
                style={{ height: 80, flexDirection: "column", gap: 8 }}
                onClick={() => setProofType('photo')}
              >
                <Camera size={24} />
                <span>Take Photo</span>
              </button>
              <button 
                className={`btn ${proofType === 'qr' ? 'primary' : ''}`} 
                style={{ height: 80, flexDirection: "column", gap: 8 }}
                onClick={() => setProofType('qr')}
              >
                <QrCode size={24} />
                <span>Scan QR</span>
              </button>
            </div>
            
            {proofType === 'photo' && (
              <div style={{ border: "2px dashed var(--border)", borderRadius: 12, height: 160, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
                 <div className="muted" style={{ textAlign: "center" }}>
                    <Camera size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                    <div style={{ fontSize: 12 }}>Camera preview active...</div>
                 </div>
              </div>
            )}

            {proofType === 'qr' && (
              <div style={{ border: "2px dashed var(--teal)", borderRadius: 12, height: 160, display: "flex", alignItems: "center", justifyContent: "center", background: "#e6f4f3" }}>
                 <div style={{ textAlign: "center", color: "var(--teal-ink)" }}>
                    <QrCode size={32} style={{ marginBottom: 8 }} className="animate-pulse" />
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Align QR code within frame</div>
                 </div>
              </div>
            )}

            {!proofType && (
              <div style={{ padding: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, color: "#92400e", fontSize: 12 }}>
                <b>Note:</b> A valid photo or QR scan is required to claim the <b>${confirmOpen?.payout?.toFixed(2)}</b> payout.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Failure Modal */}
      <Modal open={!!failOpen} title={`Mark ${failOpen?.code} as failed`} onClose={() => setFailOpen(null)}
        footer={<>
          <button className="btn" onClick={() => setFailOpen(null)}>Cancel</button>
          <button className="btn danger" onClick={markFailed}>Confirm</button>
        </>}>
        <div className="field"><label className="label">Reason</label>
          <textarea className="textarea" value={failReason} onChange={e => setFailReason(e.target.value)} placeholder="Recipient not home, damaged package, etc." /></div>
      </Modal>
    </div>
  );
}
