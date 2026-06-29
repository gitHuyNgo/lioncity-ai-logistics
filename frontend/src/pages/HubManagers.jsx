import React, { useEffect, useState, useCallback } from "react";
import { http, fmtDate } from "../lib/api";
import { Modal } from "../components/UI";
import { PageHeader } from "@/components/composite/PageHeader";
import { DataTable } from "@/components/composite/DataTable";
import { StatusBadge } from "@/components/composite/StatusBadge";
import { ErrorState } from "@/components/composite/ErrorState";
import { ConfirmDialog } from "@/components/composite/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { notifySuccess, notifyError } from "@/lib/notify";

export default function HubManagers() {
  const [rows, setRows] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", hub_id: "", status: "available" });
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [r, h] = await Promise.all([http.get("/hub-managers"), http.get("/hubs")]);
      setRows(r.data);
      setHubs(h.data);
    } catch (e) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", phone: "", hub_id: "", status: "available" });
    setOpen(true); setErr("");
  };
  const openEdit = (hm) => {
    setEditing(hm);
    setForm({
      name: hm.name,
      phone: hm.phone,
      hub_id: hm.hub_id || "",
      status: hm.status,
    });
    setOpen(true); setErr("");
  };

  const save = async () => {
    const entity = `Hub manager "${form.name}"`;
    try {
      setErr("");
      const payload = {
        name: form.name,
        phone: form.phone,
        status: form.status,
        hub_id: form.hub_id || null,
      };
      if (editing) await http.put(`/hub-managers/${editing.id}`, payload);
      else await http.post("/hub-managers", payload);
      setOpen(false);
      notifySuccess(editing ? "update" : "create", entity);
      await load();
    } catch (e) {
      const reason = e.response?.data?.detail || "Error";
      setErr(reason);
      notifyError(editing ? "update" : "create", entity, reason);
    }
  };

  const remove = (hm) => setPendingDelete(hm);

  const confirmRemove = async () => {
    const hm = pendingDelete;
    setPendingDelete(null);
    if (!hm) return;
    const entity = `Hub manager "${hm.name}"`;
    try {
      await http.delete(`/hub-managers/${hm.id}`);
      notifySuccess("delete", entity);
      load();
    } catch (e) {
      notifyError("delete", entity, e.response?.data?.detail || e.message);
    }
  };

  const columns = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "phone", header: "Phone", render: (r) => <span className="text-muted-foreground">{r.phone}</span> },
    { key: "hub_name", header: "Hub", render: (r) => r.hub_name || "—" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "created_at", header: "Created", render: (r) => <span className="text-muted-foreground">{fmtDate(r.created_at)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)} data-testid={`edit-hm-${r.id}`}>Edit</Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => remove(r)}
            data-testid={`del-hm-${r.id}`}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        accent
        title="Hub Managers"
        actions={<Button data-testid="add-hub-manager-btn" onClick={openNew}>+ Add Hub Manager</Button>}
      />

      <div className="mt-4">
        {loadError ? (
          <ErrorState message="Couldn't load hub managers. Please try again." onRetry={load} />
        ) : (
          <div className="rounded-lg border border-border bg-card" data-testid="hub-managers-table">
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              isLoading={loading}
              emptyMessage="No hub managers yet."
            />
          </div>
        )}
      </div>

      <Modal open={open} title={editing ? "Edit Hub Manager" : "New Hub Manager"} onClose={() => setOpen(false)}
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} data-testid="save-hm-btn">{editing ? "Save" : "Create"}</Button>
        </>}>
        <div className="field"><label className="label">Full name</label>
          <input className="input" data-testid="hm-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label className="label">Phone (unique)</label>
          <input className="input" data-testid="hm-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="field">
          <label className="label">Hub</label>
          <select
            className="select"
            data-testid="hm-hub"
            value={form.hub_id}
            onChange={e => setForm({ ...form, hub_id: e.target.value })}
          >
            <option value="">— select hub —</option>
            {hubs.map(h => (
              <option key={h.id} value={h.id}>
                {h.name}{h.is_default ? " (default)" : ""}
              </option>
            ))}
          </select>
          {hubs.length === 0 && (
            <div className="mt-1.5 text-xs text-destructive">
              No hubs found. Create a Hub first under the Hubs page.
            </div>
          )}
        </div>
        <div className="field"><label className="label">Status</label>
          <select className="select" data-testid="hm-status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="available">Available</option>
            <option value="off_duty">Off-duty</option>
          </select></div>
        {err && <div className="text-xs text-destructive" data-testid="hm-err">{err}</div>}
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        destructive
        title={pendingDelete ? `Delete hub manager "${pendingDelete.name}"?` : "Delete this hub manager?"}
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmRemove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
