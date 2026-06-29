import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Camera, QrCode, CheckCircle2, TrendingUp, DollarSign, Package, MapPin } from "lucide-react";

import { http, fmtDate, fmtDist } from "../lib/api";
import { notifySuccess, notifyError } from "../lib/notify";
import MapView from "../components/MapView";
import { Modal } from "../components/UI";
import { PageHeader } from "../components/composite/PageHeader";
import { StatCard } from "../components/composite/StatCard";
import { StatusBadge } from "../components/composite/StatusBadge";
import { ChartCard } from "../components/composite/ChartCard";
import { LoadingState } from "../components/composite/LoadingState";
import { EmptyState } from "../components/composite/EmptyState";
import { ErrorState } from "../components/composite/ErrorState";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { chartTheme } from "../lib/design/chartTheme";
import { useAuth } from "../context/AuthContext";
import { useTracking } from "../context/TrackingContext";

export default function Shipper() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const { isTracking, trackedDriverId, trackingData, startTracking, stopTracking } = useTracking();

  const [drivers, setDrivers] = useState([]);
  const [driverId, setDriverId] = useState("");
  const [payload, setPayload] = useState(null);
  const [orders, setOrders] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("deliveries"); // deliveries | earnings

  // Async-view state (Req 5.1, 5.3, 5.4)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Modals
  const [failOpen, setFailOpen] = useState(null);
  const [failReason, setFailReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(null); // order to confirm
  const [proofType, setProofType] = useState(null); // 'photo' | 'qr' | null
  const [uploading, setUploading] = useState(false);

  // Recompute chart colors from Design_Tokens; re-evaluated on theme change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const theme = useMemo(() => chartTheme(), [resolvedTheme]);

  const load = useCallback(async () => {
    try {
      const d = await http.get("/drivers");
      setDrivers(d.data);

      if (user?.role === "shipper" && user.reference_id) {
        setDriverId(user.reference_id);
      } else if (!driverId && d.data.length) {
        setDriverId(d.data[0].id);
      } else if (!driverId && !d.data.length) {
        // No driver to load orders for — stop the loading indicator.
        setLoading(false);
      }
    } catch (e) {
      console.error("Error loading drivers", e);
      setError(true);
      setLoading(false);
    }
  }, [user, driverId]);

  const loadOrders = useCallback(async () => {
    if (!driverId) return;
    setError(false);
    try {
      const [pRes, allRes, eRes] = await Promise.all([
        http.get(`/shipper/${driverId}/orders`),
        http.get("/orders", { params: { driver_id: driverId } }),
        http.get(`/shipper/${driverId}/earnings`)
      ]);
      setPayload(pRes.data);
      setOrders(allRes.data);
      setEarnings(eRes.data);
    } catch (e) {
      console.error("Error loading shipper data", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(false);
    load();
    loadOrders();
  }, [load, loadOrders]);

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
    try {
      await http.put(`/drivers/${driverId}/status`, { status });
      if (status === "delivering") startTracking(driverId);
      else if (status === "available") stopTracking();
      notifySuccess("update", `Driver status → ${status}`);
      load();
    } catch (e) {
      notifyError("update", "Driver status", e?.response?.data?.detail || e);
    }
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
      notifySuccess("update", `Order ${confirmOpen.code} delivered`);
      setConfirmOpen(null);
      setProofType(null);
      loadOrders();
    } catch (e) {
      notifyError("update", `Order ${confirmOpen?.code}`, e?.response?.data?.detail || e);
    }
    setUploading(false);
  };

  const markFailed = async () => {
    try {
      await http.put(`/orders/${failOpen.id}/status`, { status: "failed", fail_reason: failReason });
      notifySuccess("update", `Order ${failOpen.code} marked failed`);
      setFailOpen(null); setFailReason(""); loadOrders();
    } catch (e) {
      notifyError("update", `Order ${failOpen?.code}`, e?.response?.data?.detail || e);
    }
  };

  const simulateMove = async () => {
    setBusy(true);
    try {
      await http.post(`/drivers/${driverId}/simulate-step`, { step_m: 300 });
      if (!isTracking) loadOrders();
    } catch (e) {
      notifyError("update", "GPS position", e?.response?.data?.detail || e);
    }
    setBusy(false);
  };

  const activeOrders = payload?.orders || [];
  const done = orders.filter(o => ["delivered", "failed"].includes(o.status));
  const isDelivering = currentDriver?.status === "delivering";
  const chartData = earnings?.chart_data || [];

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <PageHeader
        title={user?.role === "shipper" ? `Hello, ${user.full_name}` : "Shipper Management"}
        accent
        subtitle={isDelivering
          ? "Live tracking and delivery dispatch active."
          : "Set status to 'Delivering' to start your shift."}
      />

      <Card className="flex flex-wrap items-center gap-3 p-3">
        {user?.role !== "shipper" && (
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select driver" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={activeTab === 'deliveries' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('deliveries')}
          >
            <Package className="h-3.5 w-3.5" /> My Deliveries
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'earnings' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('earnings')}
          >
            <TrendingUp className="h-3.5 w-3.5" /> My Earnings
          </Button>
        </div>

        <div className="flex-1" />

        {currentDriver && (
          <div className="flex items-center gap-3">
            <Select value={currentDriver.status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="delivering">Delivering</SelectItem>
                <SelectItem value="off_duty">Off-duty</SelectItem>
              </SelectContent>
            </Select>
            <StatusBadge status={currentDriver.status} />
          </div>
        )}
      </Card>

      {error ? (
        <ErrorState
          message="Couldn't load delivery data. Please try again."
          onRetry={handleRetry}
        />
      ) : loading && !payload && !earnings ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <LoadingState variant="block" className="h-[560px] rounded-xl" label="Loading deliveries" />
          <LoadingState variant="block" className="h-[560px] rounded-xl" label="Loading delivery queue" />
        </div>
      ) : activeTab === "deliveries" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Card className="relative overflow-hidden p-0">
            <MapView
              height={560}
              orders={activeOrders}
              drivers={currentDriver && currentDriver.location ? [currentDriver] : []}
              routes={currentRoute ? [{ ...currentRoute, color: "#0d7c78" }] : []}
              tracking={isTracking && trackedDriverId === driverId ? { driver_id: driverId, location: currentDriver?.location } : null}
              emptyMessage="No deliveries to display on the map."
            />
            {isTracking && (
              <div className="absolute left-3 top-3 z-[1000]">
                <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg">
                  <span className="tracking-dot" /> LIVE GPS SYNC
                </span>
              </div>
            )}
            <div className="absolute bottom-3 right-3 z-[1000]">
              <Button size="sm" disabled={!currentRoute || busy} onClick={simulateMove} className="shadow-lg">
                ▶ Advance GPS 300m
              </Button>
            </div>
          </Card>

          <Card className="flex max-h-[620px] flex-col overflow-auto p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold tracking-tight">Delivery Queue</div>
                <div className="text-sm text-muted-foreground">{activeOrders.length} pending · {done.length} completed</div>
              </div>
              {currentRoute && <StatusBadge status="assigned">{fmtDist(currentRoute.distance_m)} total</StatusBadge>}
            </div>

            {activeOrders.length === 0 && (
              <EmptyState title="No active deliveries" message="New assignments will appear here once dispatched." />
            )}

            <div className="flex-1">
              {activeOrders.map((o) => (
                <div
                  key={o.id}
                  className="mb-3 rounded-xl border border-border p-3"
                  style={{ borderLeftWidth: 4, borderLeftColor: o.status === 'delivering' ? 'hsl(var(--chart-3))' : 'hsl(var(--primary))' }}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="text-[15px] font-extrabold text-primary">{o.code}</div>
                    <span className="inline-flex items-center rounded-full bg-[hsl(var(--chart-4)/0.12)] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--chart-4))]">
                      Payout: ${o.payout?.toFixed(2)}
                    </span>
                  </div>
                  <div className="mb-1 flex gap-2 text-[13px] text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{o.address}</span>
                  </div>
                  <div className="mb-3 ml-[22px] text-[11px] text-muted-foreground">
                    {o.weight_kg} kg · Due {fmtDate(o.required_by)}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => setConfirmOpen(o)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark Delivered
                    </Button>
                    <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => { setFailOpen(o); setFailReason(""); }}>
                      ✗ Failed
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {done.length > 0 && (
              <div className="mt-5">
                <div className="mb-2.5 border-t border-border pt-4 text-[11px] font-bold uppercase text-muted-foreground">
                  Recently Completed
                </div>
                {done.slice(0, 5).map(o => (
                  <div key={o.id} className="mb-2 flex items-center justify-between text-[13px]">
                    <span>
                      <b className="text-foreground">{o.code}</b>{" "}
                      <span className="text-muted-foreground">— ${o.payout?.toFixed(2)}</span>
                    </span>
                    <StatusBadge status={o.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <ChartCard
              title="Earnings History"
              height={350}
              isEmpty={chartData.length === 0}
              emptyTitle="No earnings data"
              emptyMessage="Earnings will appear here once you complete deliveries."
            >
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: theme.axis }} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} tick={{ fill: theme.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{ borderRadius: 12, border: "none", background: theme.tooltipBg, color: "hsl(var(--popover-foreground))" }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={35}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? theme.series[0] : theme.series[1]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>

            <Card className="p-4">
              <table className="w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr className="bg-muted text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="border-b border-border px-3 py-2.5">Code</th>
                    <th className="border-b border-border px-3 py-2.5">Address</th>
                    <th className="border-b border-border px-3 py-2.5">Payout</th>
                    <th className="border-b border-border px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings?.history?.map(h => (
                    <tr key={h.id} className="hover:bg-muted/50">
                      <td className="border-b border-border px-3 py-2.5"><b>{h.code}</b></td>
                      <td className="border-b border-border px-3 py-2.5 text-muted-foreground">{h.address}</td>
                      <td className="border-b border-border px-3 py-2.5 tabular-nums"><b>${h.payout?.toFixed(2)}</b></td>
                      <td className="border-b border-border px-3 py-2.5"><StatusBadge status={h.status} /></td>
                    </tr>
                  ))}
                  {(!earnings?.history || earnings.history.length === 0) && (
                    <tr><td colSpan="4" className="px-3 py-5 text-center text-muted-foreground">No earnings history yet.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <StatCard
              label="Total Earned (Today)"
              tone="teal"
              icon={DollarSign}
              value={earnings?.total_earned?.toFixed(2) || "0.00"}
              delta={`You've earned this across ${earnings?.delivery_count || 0} deliveries.`}
            />

            <Card className="bg-popover p-4 text-popover-foreground">
              <div className="mb-3 text-[15px] font-bold">Earnings Booster</div>
              <div className="mb-4 text-[13px] opacity-80">
                Complete 5 more deliveries today to unlock a **$10.00** performance bonus!
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, ((earnings?.delivery_count || 0) / 10) * 100)}%` }}
                />
              </div>
              <div className="mt-2 text-right text-[11px]">{earnings?.delivery_count || 0}/10 completed</div>
            </Card>

            <Card className="p-4">
              <div className="mb-3 text-[13px] font-semibold tracking-tight">Payment Details</div>
              <div className="text-xs text-muted-foreground">
                Current payout settings:
                <ul className="mt-2 list-disc pl-4">
                  <li>Base per order: **$3.00**</li>
                  <li>Weight bonus: **$0.50/kg**</li>
                  <li>EV Bonus: **+$2.00** (Applied at weekly payout)</li>
                </ul>
              </div>
            </Card>
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
            <Button variant="outline" onClick={() => setConfirmOpen(null)}>Cancel</Button>
            <Button disabled={!proofType} onClick={finalizeDelivery}>Confirm Success</Button>
          </>
        )}
      >
        {uploading ? (
          <div className="py-10 text-center">
            <div className="tracking-dot mx-auto mb-4 h-5 w-5" />
            <div className="font-semibold">Uploading Proof...</div>
            <div className="text-sm text-muted-foreground">Connecting to secure storage</div>
          </div>
        ) : (
          <div>
            <p className="mb-5 text-[13px] text-muted-foreground">
              Please provide proof of delivery at **{confirmOpen?.address}**.
            </p>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <Button
                variant={proofType === 'photo' ? 'default' : 'outline'}
                className="h-20 flex-col gap-2"
                onClick={() => setProofType('photo')}
              >
                <Camera className="h-6 w-6" />
                <span>Take Photo</span>
              </Button>
              <Button
                variant={proofType === 'qr' ? 'default' : 'outline'}
                className="h-20 flex-col gap-2"
                onClick={() => setProofType('qr')}
              >
                <QrCode className="h-6 w-6" />
                <span>Scan QR</span>
              </Button>
            </div>

            {proofType === 'photo' && (
              <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40">
                <div className="text-center text-muted-foreground">
                  <Camera className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <div className="text-xs">Camera preview active...</div>
                </div>
              </div>
            )}

            {proofType === 'qr' && (
              <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-primary bg-[hsl(var(--primary)/0.08)]">
                <div className="text-center text-primary">
                  <QrCode className="mx-auto mb-2 h-8 w-8 animate-pulse" />
                  <div className="text-xs font-semibold">Align QR code within frame</div>
                </div>
              </div>
            )}

            {!proofType && (
              <div className="rounded-lg border border-[hsl(var(--chart-3)/0.4)] bg-[hsl(var(--chart-3)/0.1)] p-3 text-xs text-[hsl(var(--chart-3))]">
                <b>Note:</b> A valid photo or QR scan is required to claim the <b>${confirmOpen?.payout?.toFixed(2)}</b> payout.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Failure Modal */}
      <Modal open={!!failOpen} title={`Mark ${failOpen?.code} as failed`} onClose={() => setFailOpen(null)}
        footer={<>
          <Button variant="outline" onClick={() => setFailOpen(null)}>Cancel</Button>
          <Button variant="destructive" onClick={markFailed}>Confirm</Button>
        </>}>
        <div className="field"><label className="label">Reason</label>
          <textarea className="textarea" value={failReason} onChange={e => setFailReason(e.target.value)} placeholder="Recipient not home, damaged package, etc." /></div>
      </Modal>
    </div>
  );
}
