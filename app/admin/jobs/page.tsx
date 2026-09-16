"use client";
import { useEffect, useState } from "react";
import Badge from "../../components/Badge";
import {
  Search, RefreshCw, Loader2, PlusCircle, X,
  ChevronDown, User, MapPin, Wrench, Clock, CheckCircle2, AlertCircle, DollarSign, FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import PaymentModal, { type PaymentInvoice } from "../../components/PaymentModal";

/* ── Types ───────────────────────────────────────────────────────── */
interface ServiceRequest {
  id: string;
  jobRef?: string;
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  serviceType: string;
  address: string;
  createdAt: string;
  scheduledAt?: string;
  isRecurring: boolean;
  problemDescription?: string;
  equipmentType?: string;
  equipmentBrand?: string;
  equipmentModel?: string;
  preferredTime?: string;
  source?: string;
  customer: { id?: string; name: string; phone: string; email?: string };
  assignedTechnician?: { id: string; name: string; phone?: string } | null;
  technician?: { name: string }; // list endpoint key
  jobReport?: JobReport | null;
}

/** Postgres numerics arrive as strings ("159.60"), so money fields are string | number. */
type Money = string | number | null | undefined;

interface JobReport {
  id: string;
  faultFound?: string;
  diagnosisNotes?: string;
  labourCharge?: Money;
  partsTotal?: Money;
  extraExpensesTotal?: Money;
  vatAmount?: Money;
  grandTotal?: Money;
  arrivedAt?: string | null;
  completedAt?: string | null;
  technician?: { id: string; name: string } | null;
  parts?: { id: string; quantity: number; unitPrice: Money; lineTotal: Money; isCustom?: boolean; customPartName?: string | null; part?: { name: string; sku: string } | null }[];
  services?: { id: string; serviceName: string; labourCost: Money; notes?: string | null }[];
  expenses?: { id: string; description: string; amount: Money }[];
  invoice?: Invoice | null;
}

interface Invoice {
  id: string;
  invoiceRef: string;
  subtotal?: Money;
  vat?: Money;
  total?: Money;
  paymentStatus: "unpaid" | "paid" | "partial";
  paymentMethod?: string | null;
  advanceAmount?: Money;
  issuedAt: string;
  paidAt?: string | null;
}

interface Customer { id: string; name: string; phone: string; email?: string; }
interface Technician { id: string; name: string; phone?: string; }

type BadgeVariant = "pending" | "inprogress" | "completed" | "recurring";

/* ── Constants ───────────────────────────────────────────────────── */
const SERVICE_TYPES = [
  "AC Service & Cleaning", "AC Gas Refill", "AC Repair",
  "AC Installation", "AC Duct Cleaning", "Electrical Work",
  "Plumbing", "General Maintenance",
];
const BLANK_FORM = {
  name: "", phone: "", serviceType: "AC Service & Cleaning",
  problemDescription: "", address: "",
  equipmentType: "", equipmentBrand: "", equipmentModel: "",
  preferredTime: "",
};
const STATUS_OPTIONS = [
  { value: "pending",     label: "Pending" },
  { value: "assigned",    label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed",   label: "Completed" },
  { value: "cancelled",   label: "Cancelled" },
];

/* ── Helpers ─────────────────────────────────────────────────────── */
function jobBadge(j: ServiceRequest): BadgeVariant | null {
  if (j.isRecurring) return "recurring";
  if (j.status === "in_progress" || j.status === "assigned") return "inprogress";
  if (j.status === "completed") return "completed";
  if (j.status === "pending") return "pending";
  return null;
}
function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alnuzha_token") ?? "";
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function toNum(v: Money) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function fmtAed(v: Money) {
  return `AED ${toNum(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
const PAY_LABEL: Record<string, string> = { cash: "Cash", card: "Card", due: "Due" };
function payLabel(m?: string | null) {
  if (!m) return null;
  return PAY_LABEL[m.toLowerCase()] ?? m;
}
const PAY_STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  paid:    { bg: "#E1F5EE", fg: "#0F6E56" },
  partial: { bg: "#FAEEDA", fg: "#854F0B" },
  unpaid:  { bg: "#FCEBEB", fg: "#791F1F" },
};

/* ── CSS ─────────────────────────────────────────────────────────── */
const CSS = `
  @keyframes spin    { from{transform:rotate(0)}   to{transform:rotate(360deg)} }
  @keyframes fadeIn  { from{opacity:0}              to{opacity:1} }
  @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }

  .jobs-wrap    { padding: 32px; }
  .jobs-filters { display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap; }
  .jobs-search  { display:flex;align-items:center;gap:8px;border:1px solid #e0e0dc;border-radius:8px;padding:7px 12px;background:#fff;flex:1 1 200px; }
  .jobs-select  { padding:7px 12px;border:1px solid #e0e0dc;border-radius:8px;font-size:13px;background:#fff;color:#1a1a18; }

  /* Add modal */
  .modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .15s ease; }
  .modal-box      { background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;animation:slideUp .2s ease;box-shadow:0 24px 64px rgba(0,0,0,0.18); }
  .modal-header   { padding:22px 24px 18px;border-bottom:1px solid #f0f0ec;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:1;border-radius:16px 16px 0 0; }
  .modal-body     { padding:24px; }
  .modal-footer   { padding:16px 24px;border-top:1px solid #f0f0ec;display:flex;justify-content:flex-end;gap:10px;position:sticky;bottom:0;background:#fff;border-radius:0 0 16px 16px; }

  /* View drawer */
  .drawer-backdrop { position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:400;animation:fadeIn .15s ease; }
  .drawer          { position:fixed;top:0;right:0;height:100vh;width:480px;max-width:100vw;background:#fff;z-index:401;display:flex;flex-direction:column;box-shadow:-8px 0 40px rgba(0,0,0,0.12);animation:slideIn .22s ease; }
  .drawer-head     { padding:20px 24px;border-bottom:1px solid #f0f0ec;display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0; }
  .drawer-body     { flex:1;overflow-y:auto;padding:24px; }
  .drawer-foot     { padding:16px 24px;border-top:1px solid #f0f0ec;flex-shrink:0;display:flex;gap:10px;flex-wrap:wrap; }

  .detail-section  { margin-bottom:22px; }
  .detail-label    { font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px; }
  .detail-grid     { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
  .detail-cell     { background:#F7F8F6;border-radius:10px;padding:12px 14px; }
  .detail-cell-lbl { font-size:10px;font-weight:600;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px; }
  .detail-cell-val { font-size:13px;font-weight:600;color:#0f1a15; }

  .field-label { font-size:12px;font-weight:600;color:#555;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em; }
  .field-input { width:100%;padding:10px 13px;border:1.5px solid #e0e0dc;border-radius:9px;font-size:13px;color:#1a1a18;background:#fff;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color .15s; }
  .field-input:focus { border-color:#0F6E56; }
  .field-row   { display:grid;grid-template-columns:1fr 1fr;gap:14px; }

  .seg-btn { flex:1;padding:8px 12px;border:1.5px solid #e0e0dc;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;background:#fff;color:#888;transition:all .15s; }
  .seg-btn.on { border-color:#0F6E56;background:#f0faf6;color:#0F6E56; }

  .save-btn   { padding:10px 24px;background:linear-gradient(135deg,#0F6E56,#1a9e75);color:#fff;border:none;border-radius:50px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;box-shadow:0 4px 14px rgba(15,110,86,0.3);font-family:inherit; }
  .save-btn:disabled { opacity:0.7;cursor:not-allowed; }
  .cancel-btn { padding:10px 20px;background:#fff;border:1.5px solid #e0e0dc;border-radius:50px;font-size:13px;font-weight:600;cursor:pointer;color:#555;font-family:inherit; }
  .act-btn    { flex:1;padding:10px 16px;border-radius:50px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .15s;font-family:inherit; }

  /* Mobile card list (replaces table) */
  .jobs-table-wrap { display:block; }
  .jobs-card-list  { display:none; }

  .job-card { background:#fff;border:1px solid #e8ebe6;border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:10px; }
  .job-card-top { display:flex;align-items:flex-start;justify-content:space-between;gap:8px; }
  .job-card-ref { font-family:monospace;font-size:11px;font-weight:700;color:#0F6E56; }
  .job-card-date{ font-size:11px;color:#aaa; }
  .job-card-name{ font-size:14px;font-weight:700;color:#0f1a15; }
  .job-card-sub { font-size:12px;color:#7a9b8e;margin-top:2px; }
  .job-card-row { display:flex;align-items:center;justify-content:space-between;gap:8px; }

  @media (max-width: 768px) {
    .jobs-wrap    { padding: 16px; }
    .jobs-filters { flex-wrap:nowrap;gap:8px; }
    .jobs-search  { flex:1;min-width:0; }
    .jobs-select  { flex-shrink:0;font-size:12px;padding:7px 8px; }
    .field-row    { grid-template-columns:1fr; }
    .modal-backdrop { padding:0;align-items:flex-end; }
    .modal-box   { border-radius:16px 16px 0 0;max-height:94vh; }
    .drawer      { width:100vw; }
    .detail-grid { grid-template-columns:1fr; }
  }

  @media (max-width: 640px) {
    .jobs-table-wrap { display:none !important; }
    .jobs-card-list  { display:flex;flex-direction:column;gap:10px; }
    .jobs-hdr { flex-direction:column;align-items:flex-start !important; }
    .jobs-hdr-btns { width:100%;justify-content:stretch; }
    .jobs-hdr-btns button { flex:1;justify-content:center; }
    .jobs-eq-grid { grid-template-columns:1fr !important; }
  }
`;

/* ══════════════════════════════════════════════════════════════════ */
export default function AdminJobsPage() {

  /* List state */
  const [jobs, setJobs]       = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatus] = useState("");

  /* Add-job modal */
  const [showModal, setShowModal]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState("");
  const [customers, setCustomers]     = useState<Customer[]>([]);
  const [custLoading, setCustLoading] = useState(false);
  const [useExisting, setUseExisting] = useState(true);
  const [selectedCust, setSelectedCust] = useState("");
  const [form, setForm] = useState(BLANK_FORM);

  /* View drawer */
  const [viewJob, setViewJob]         = useState<ServiceRequest | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError]     = useState("");
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [assignId, setAssignId]       = useState("");
  const [assigning, setAssigning]     = useState(false);
  const [newStatus, setNewStatus]     = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionMsg, setActionMsg]     = useState("");
  const [payingInv, setPayingInv]     = useState<Invoice | null>(null);

  /* ── helpers ── */
  function ff(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));
  }

  function loadJobs() {
    setLoading(true); setError("");
    const params = statusFilter ? `?status=${statusFilter}` : "";
    api.getRequests(getToken(), params)
      .then(d => setJobs(d as ServiceRequest[]))
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load jobs"))
      .finally(() => setLoading(false));
  }
  useEffect(() => { loadJobs(); }, [statusFilter]); // eslint-disable-line

  /* ── Add job modal ── */
  function openModal() {
    setShowModal(true); setSaveError(""); setForm(BLANK_FORM);
    setSelectedCust(""); setUseExisting(true);
    if (customers.length === 0) {
      setCustLoading(true);
      api.getCustomers(getToken())
        .then(d => setCustomers(d as Customer[]))
        .catch(() => {})
        .finally(() => setCustLoading(false));
    }
  }
  function onSelectCustomer(id: string) {
    setSelectedCust(id);
    const c = customers.find(c => c.id === id);
    setForm(p => ({ ...p, name: c?.name ?? "", phone: c?.phone ?? "" }));
  }
  async function handleAdd(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { setSaveError("Customer name and phone are required."); return; }
    if (!form.problemDescription.trim()) { setSaveError("Problem description is required."); return; }
    if (!form.address.trim()) { setSaveError("Address is required."); return; }
    setSaving(true); setSaveError("");
    try {
      const body: Record<string, string> = {
        name: form.name.trim(), phone: form.phone.trim(),
        serviceType: form.serviceType, problemDescription: form.problemDescription.trim(),
        address: form.address.trim(), source: "admin",
      };
      if (form.equipmentType.trim())  body.equipmentType  = form.equipmentType.trim();
      if (form.equipmentBrand.trim()) body.equipmentBrand = form.equipmentBrand.trim();
      if (form.equipmentModel.trim()) body.equipmentModel = form.equipmentModel.trim();
      if (form.preferredTime.trim())  body.preferredTime  = form.preferredTime.trim();
      const created = await api.createRequest(body) as ServiceRequest;
      setJobs(prev => [created, ...prev]);
      setShowModal(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setSaving(false);
    }
  }

  /* ── View drawer ── */
  function openView(jobId: string) {
    setViewJob(null); setViewError(""); setActionMsg("");
    setAssignId(""); setNewStatus("");
    setViewLoading(true);
    api.getServiceRequest(jobId, getToken())
      .then(d => {
        const j = d as ServiceRequest;
        setViewJob(j);
        setNewStatus(j.status);
        setAssignId(j.assignedTechnician?.id ?? "");
      })
      .catch(e => setViewError(e instanceof Error ? e.message : "Failed to load job"))
      .finally(() => setViewLoading(false));

    if (technicians.length === 0) {
      api.getTechnicians(getToken())
        .then(d => setTechnicians(d as Technician[]))
        .catch(() => {});
    }
  }
  function closeView() { setViewJob(null); setViewLoading(false); setViewError(""); }

  async function handleAssign() {
    if (!viewJob || !assignId) return;
    setAssigning(true); setActionMsg("");
    try {
      const updated = await api.assignTechnician(viewJob.id, { technicianId: assignId }, getToken()) as ServiceRequest;
      setViewJob(updated); setNewStatus(updated.status);
      setJobs(prev => prev.map(j => j.id === updated.id ? { ...j, status: updated.status, technician: updated.assignedTechnician ? { name: updated.assignedTechnician.name } : undefined } : j));
      setActionMsg("Technician assigned.");
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setAssigning(false);
    }
  }

  async function handleStatusUpdate() {
    if (!viewJob || !newStatus || newStatus === viewJob.status) return;
    setUpdatingStatus(true); setActionMsg("");
    try {
      const updated = await api.updateStatus(viewJob.id, { status: newStatus }, getToken()) as ServiceRequest;
      setViewJob(updated); setNewStatus(updated.status);
      setJobs(prev => prev.map(j => j.id === updated.id ? { ...j, status: updated.status } : j));
      setActionMsg("Status updated.");
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  }

  function handlePaymentSaved(updated: PaymentInvoice) {
    const patch = {
      paymentStatus: updated.paymentStatus as Invoice["paymentStatus"],
      paymentMethod: updated.paymentMethod,
      advanceAmount: updated.advanceAmount,
      paidAt: updated.paidAt,
    };
    const merge = (j: ServiceRequest): ServiceRequest =>
      j.jobReport?.invoice?.id === updated.id
        ? { ...j, jobReport: { ...j.jobReport, invoice: { ...j.jobReport.invoice, ...patch } } }
        : j;
    setViewJob(prev => prev ? merge(prev) : prev);
    setJobs(prev => prev.map(merge));
    setPayingInv(null);
    setActionMsg("Payment updated.");
  }

  /* ── Filtered list ── */
  const filtered = jobs.filter(j => {
    if (!search) return true;
    const q = search.toLowerCase();
    return j.customer.name.toLowerCase().includes(q) || j.id.toLowerCase().includes(q) || j.serviceType.toLowerCase().includes(q);
  });

  /* ══════════ RENDER ══════════════════════════════════════════════ */
  return (
    <div className="jobs-wrap">
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div className="jobs-hdr" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:22, fontWeight:700, marginBottom:2 }}>All jobs</h1>
          <p style={{ color:"#888", fontSize:13 }}>{loading ? "Loading…" : `${filtered.length} records`}</p>
        </div>
        <div className="jobs-hdr-btns" style={{ display:"flex", gap:10 }}>
          <button onClick={loadJobs} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 16px", background:"transparent", color:"#555", border:"1px solid #e8ebe6", borderRadius:50, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={openModal} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px", background:"linear-gradient(135deg,#0F6E56,#1a9e75)", color:"#fff", border:"none", borderRadius:50, fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(15,110,86,0.3)" }}>
            <PlusCircle size={14} /> Add Job
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="jobs-filters">
        <div className="jobs-search">
          <Search size={13} color="#aaa" />
          <input type="text" placeholder="Search customer, service or ID…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ border:"none", outline:"none", fontSize:13, background:"transparent", width:"100%", color:"#1a1a18" }} />
        </div>
        <select className="jobs-select" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading && (
        <div style={{ display:"flex", alignItems:"center", gap:10, color:"#888", fontSize:14, marginTop:32 }}>
          <Loader2 size={16} style={{ animation:"spin 1s linear infinite" }} /> Loading jobs…
        </div>
      )}
      {error && !loading && (
        <div style={{ background:"#FCEBEB", border:"1px solid #f5c6c6", borderRadius:10, padding:"14px 18px", color:"#791F1F", fontSize:13 }}>{error}</div>
      )}

      {/* ── Table (desktop) ── */}
      {!loading && !error && (
        <>
          <div className="jobs-table-wrap" style={{ background:"#fff", border:"1px solid #e8ebe6", borderRadius:12, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              {filtered.length === 0 ? (
                <div style={{ padding:"48px", textAlign:"center", color:"#aaa", fontSize:14 }}>No jobs found.</div>
              ) : (
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ background:"#F7F8F6" }}>
                      {["Job ID", "Customer", "Phone", "Service", "Address", "Technician", "Date", "Invoice Date", "Status", ""].map(h => (
                        <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:500, color:"#888", fontSize:11, borderBottom:"1px solid #e8ebe6", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(j => {
                      const badge = jobBadge(j);
                      return (
                        <tr key={j.id} style={{ borderBottom:"1px solid #f0f0ec" }}>
                          <td style={{ padding:"11px 14px", fontWeight:700, color:"#0F6E56", whiteSpace:"nowrap", fontFamily:"monospace", fontSize:12 }}>
                            {j.jobRef ?? j.id.slice(0,8).toUpperCase()}
                          </td>
                          <td style={{ padding:"11px 14px", color:"#333", whiteSpace:"nowrap" }}>{j.customer.name}</td>
                          <td style={{ padding:"11px 14px", color:"#888", fontSize:12, whiteSpace:"nowrap" }}>{j.customer.phone}</td>
                          <td style={{ padding:"11px 14px", color:"#555", whiteSpace:"nowrap" }}>{j.serviceType}</td>
                          <td style={{ padding:"11px 14px", color:"#888", whiteSpace:"nowrap", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis" }}>{j.address}</td>
                          <td style={{ padding:"11px 14px", color:"#555", whiteSpace:"nowrap" }}>{j.assignedTechnician?.name ?? j.technician?.name ?? "—"}</td>
                          <td style={{ padding:"11px 14px", color:"#aaa", fontSize:12, whiteSpace:"nowrap" }}>
                            {new Date(j.createdAt).toLocaleDateString("en-GB", { day:"numeric", month:"short" })}
                          </td>
                          <td style={{ padding:"11px 14px", color:"#555", fontSize:12, whiteSpace:"nowrap" }}>
                            {j.jobReport?.invoice?.issuedAt
                              ? new Date(j.jobReport.invoice.issuedAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"2-digit" })
                              : <span style={{ color:"#c4c4c4" }}>—</span>}
                          </td>
                          <td style={{ padding:"11px 14px" }}>
                            {badge
                              ? <Badge variant={badge} />
                              : <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:"#F0F0EC", color:"#888" }}>Cancelled</span>
                            }
                          </td>
                          <td style={{ padding:"11px 14px" }}>
                            <button onClick={() => openView(j.id)} style={{ fontSize:12, padding:"5px 12px", border:"1px solid #0F6E56", borderRadius:6, background:"transparent", cursor:"pointer", color:"#0F6E56", fontWeight:600 }}>
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Card list (mobile) ── */}
          <div className="jobs-card-list">
            {filtered.length === 0 ? (
              <div style={{ padding:"40px 0", textAlign:"center", color:"#aaa", fontSize:14 }}>No jobs found.</div>
            ) : filtered.map(j => {
              const badge = jobBadge(j);
              const tech = j.assignedTechnician?.name ?? j.technician?.name;
              return (
                <div key={j.id} className="job-card">
                  <div className="job-card-top">
                    <div>
                      <div className="job-card-ref">{j.jobRef ?? j.id.slice(0,8).toUpperCase()}</div>
                      <div className="job-card-name">{j.customer.name}</div>
                      <div className="job-card-sub">{j.customer.phone}</div>
                    </div>
                    <div className="job-card-date" style={{ textAlign:"right" }}>
                      {new Date(j.createdAt).toLocaleDateString("en-GB", { day:"numeric", month:"short" })}
                      {j.jobReport?.invoice?.issuedAt && (
                        <div style={{ marginTop:2, color:"#0F6E56", fontWeight:600 }}>
                          Inv {new Date(j.jobReport.invoice.issuedAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"2-digit" })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize:13, color:"#555", fontWeight:500 }}>{j.serviceType}</div>
                  <div style={{ fontSize:12, color:"#888", display:"flex", alignItems:"center", gap:5 }}>
                    <MapPin size={11} color="#aaa" />
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.address}</span>
                  </div>

                  {tech && (
                    <div style={{ fontSize:12, color:"#7a9b8e", display:"flex", alignItems:"center", gap:5 }}>
                      <User size={11} color="#aaa" /> {tech}
                    </div>
                  )}

                  <div className="job-card-row">
                    <div>
                      {badge
                        ? <Badge variant={badge} />
                        : <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:"#F0F0EC", color:"#888" }}>Cancelled</span>
                      }
                    </div>
                    <button onClick={() => openView(j.id)} style={{ fontSize:12, padding:"6px 16px", border:"1px solid #0F6E56", borderRadius:6, background:"transparent", cursor:"pointer", color:"#0F6E56", fontWeight:600 }}>
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════ ADD JOB MODAL ════════════════════════════════════ */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-box">
            <div className="modal-header">
              <div>
                <div style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:18, fontWeight:700, color:"#0f1a15" }}>Add New Job</div>
                <div style={{ fontSize:12, color:"#888", marginTop:2 }}>Create a service request on behalf of a customer</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#aaa", display:"flex", padding:4 }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body" style={{ display:"flex", flexDirection:"column", gap:18 }}>

                {/* Customer toggle */}
                <div>
                  <div className="field-label" style={{ marginBottom:10 }}>Customer</div>
                  <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                    <button type="button" className={`seg-btn${useExisting?" on":""}`} onClick={() => { setUseExisting(true); setForm(p=>({...p,name:"",phone:""})); setSelectedCust(""); }}>Existing customer</button>
                    <button type="button" className={`seg-btn${!useExisting?" on":""}`} onClick={() => { setUseExisting(false); setSelectedCust(""); setForm(p=>({...p,name:"",phone:""})); }}>New / walk-in</button>
                  </div>
                  {useExisting ? (
                    <div style={{ position:"relative" }}>
                      {custLoading
                        ? <div style={{ display:"flex", alignItems:"center", gap:8, color:"#888", fontSize:13 }}><Loader2 size={13} style={{ animation:"spin 1s linear infinite" }} /> Loading…</div>
                        : <>
                            <select className="field-input" value={selectedCust} onChange={e => onSelectCustomer(e.target.value)} style={{ appearance:"none", paddingRight:36, cursor:"pointer" }}>
                              <option value="">— Select customer —</option>
                              {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
                            </select>
                            <ChevronDown size={14} color="#aaa" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
                          </>
                      }
                      {selectedCust && <div style={{ marginTop:8, fontSize:12, color:"#0F6E56", fontWeight:600 }}>{form.name} · {form.phone}</div>}
                    </div>
                  ) : (
                    <div className="field-row">
                      <div><div className="field-label">Full Name *</div><input className="field-input" placeholder="Customer name" value={form.name} onChange={ff("name")} required /></div>
                      <div><div className="field-label">Phone *</div><input className="field-input" placeholder="+971 50 000 0000" value={form.phone} onChange={ff("phone")} required /></div>
                    </div>
                  )}
                </div>

                {/* Service type */}
                <div>
                  <div className="field-label">Service Type *</div>
                  <div style={{ position:"relative" }}>
                    <select className="field-input" value={form.serviceType} onChange={ff("serviceType")} style={{ appearance:"none", paddingRight:36, cursor:"pointer" }}>
                      {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} color="#aaa" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
                  </div>
                </div>

                {/* Problem */}
                <div>
                  <div className="field-label">Problem Description *</div>
                  <textarea className="field-input" rows={3} placeholder="Describe the issue…" value={form.problemDescription} onChange={ff("problemDescription")} required style={{ resize:"vertical", lineHeight:1.55 }} />
                </div>

                {/* Address */}
                <div>
                  <div className="field-label">Address *</div>
                  <input className="field-input" placeholder="Villa 12, Al Khalidiyah, Abu Dhabi" value={form.address} onChange={ff("address")} required />
                </div>

                {/* Equipment */}
                <div>
                  <div className="field-label" style={{ marginBottom:10 }}>Equipment (optional)</div>
                  <div className="jobs-eq-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                    <div><div className="field-label">Type</div><input className="field-input" placeholder="Split AC" value={form.equipmentType} onChange={ff("equipmentType")} /></div>
                    <div><div className="field-label">Brand</div><input className="field-input" placeholder="Daikin" value={form.equipmentBrand} onChange={ff("equipmentBrand")} /></div>
                    <div><div className="field-label">Model</div><input className="field-input" placeholder="FTXB35C" value={form.equipmentModel} onChange={ff("equipmentModel")} /></div>
                  </div>
                </div>

                {/* Preferred time */}
                <div>
                  <div className="field-label">Preferred Time (optional)</div>
                  <input className="field-input" placeholder="e.g. Tomorrow morning, 10 Jun 2–4pm" value={form.preferredTime} onChange={ff("preferredTime")} />
                </div>

                {saveError && <div style={{ background:"#FCEBEB", border:"1px solid #f5c6c6", borderRadius:9, padding:"11px 14px", color:"#791F1F", fontSize:13 }}>{saveError}</div>}
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="save-btn" disabled={saving || (useExisting && !selectedCust)}>
                  {saving ? <><Loader2 size={13} style={{ animation:"spin 1s linear infinite" }} /> Creating…</> : <><PlusCircle size={13} /> Create Job</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ VIEW DRAWER ══════════════════════════════════════ */}
      {(viewLoading || viewJob || viewError) && (
        <>
          <div className="drawer-backdrop" onClick={closeView} />
          <div className="drawer">

            {/* Head */}
            <div className="drawer-head">
              <div>
                {viewJob && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>
                      {viewJob.jobRef ?? viewJob.id.slice(0,8).toUpperCase()}
                    </div>
                    <div style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:18, fontWeight:700, color:"#0f1a15", marginBottom:6 }}>
                      {viewJob.serviceType}
                    </div>
                    <div>{(() => { const b = jobBadge(viewJob); return b ? <Badge variant={b} /> : <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:"#F0F0EC", color:"#888" }}>Cancelled</span>; })()}</div>
                  </>
                )}
                {viewLoading && <div style={{ fontSize:14, color:"#888" }}>Loading…</div>}
              </div>
              <button onClick={closeView} style={{ background:"none", border:"none", cursor:"pointer", color:"#aaa", padding:4, display:"flex" }}><X size={20} /></button>
            </div>

            <div className="drawer-body">
              {viewLoading && (
                <div style={{ display:"flex", alignItems:"center", gap:10, color:"#888", fontSize:14, marginTop:40, justifyContent:"center" }}>
                  <Loader2 size={18} style={{ animation:"spin 1s linear infinite" }} /> Loading job details…
                </div>
              )}
              {viewError && <div style={{ background:"#FCEBEB", border:"1px solid #f5c6c6", borderRadius:9, padding:"14px", color:"#791F1F", fontSize:13 }}>{viewError}</div>}

              {viewJob && (
                <>
                  {/* Customer */}
                  <div className="detail-section">
                    <div className="detail-label" style={{ display:"flex", alignItems:"center", gap:6 }}><User size={11} /> Customer</div>
                    <div className="detail-grid">
                      <div className="detail-cell"><div className="detail-cell-lbl">Name</div><div className="detail-cell-val">{viewJob.customer.name}</div></div>
                      <div className="detail-cell"><div className="detail-cell-lbl">Phone</div><div className="detail-cell-val">{viewJob.customer.phone}</div></div>
                      {viewJob.customer.email && <div className="detail-cell" style={{ gridColumn:"span 2" }}><div className="detail-cell-lbl">Email</div><div className="detail-cell-val">{viewJob.customer.email}</div></div>}
                    </div>
                  </div>

                  {/* Job info */}
                  <div className="detail-section">
                    <div className="detail-label" style={{ display:"flex", alignItems:"center", gap:6 }}><Wrench size={11} /> Job Details</div>
                    <div className="detail-grid">
                      <div className="detail-cell"><div className="detail-cell-lbl">Service</div><div className="detail-cell-val">{viewJob.serviceType}</div></div>
                      <div className="detail-cell"><div className="detail-cell-lbl">Created</div><div className="detail-cell-val">{fmtDate(viewJob.createdAt)}</div></div>
                      {viewJob.preferredTime && <div className="detail-cell"><div className="detail-cell-lbl">Preferred Time</div><div className="detail-cell-val">{viewJob.preferredTime}</div></div>}
                      {viewJob.scheduledAt && <div className="detail-cell"><div className="detail-cell-lbl">Scheduled</div><div className="detail-cell-val">{fmtDate(viewJob.scheduledAt)}</div></div>}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="detail-section">
                    <div className="detail-label" style={{ display:"flex", alignItems:"center", gap:6 }}><MapPin size={11} /> Location</div>
                    <div style={{ background:"#F7F8F6", borderRadius:10, padding:"12px 14px", fontSize:13, fontWeight:500, color:"#0f1a15", lineHeight:1.55 }}>{viewJob.address}</div>
                  </div>

                  {/* Problem */}
                  <div className="detail-section">
                    <div className="detail-label" style={{ display:"flex", alignItems:"center", gap:6 }}><AlertCircle size={11} /> Problem Description</div>
                    <div style={{ background:"#F7F8F6", borderRadius:10, padding:"12px 14px", fontSize:13, color:"#333", lineHeight:1.65 }}>{viewJob.problemDescription ?? "—"}</div>
                  </div>

                  {/* Equipment */}
                  {(viewJob.equipmentType || viewJob.equipmentBrand || viewJob.equipmentModel) && (
                    <div className="detail-section">
                      <div className="detail-label">Equipment</div>
                      <div className="detail-grid">
                        {viewJob.equipmentType  && <div className="detail-cell"><div className="detail-cell-lbl">Type</div><div className="detail-cell-val">{viewJob.equipmentType}</div></div>}
                        {viewJob.equipmentBrand && <div className="detail-cell"><div className="detail-cell-lbl">Brand</div><div className="detail-cell-val">{viewJob.equipmentBrand}</div></div>}
                        {viewJob.equipmentModel && <div className="detail-cell"><div className="detail-cell-lbl">Model</div><div className="detail-cell-val">{viewJob.equipmentModel}</div></div>}
                      </div>
                    </div>
                  )}

                  {/* Current technician */}
                  <div className="detail-section">
                    <div className="detail-label" style={{ display:"flex", alignItems:"center", gap:6 }}><Clock size={11} /> Assigned Technician</div>
                    {viewJob.assignedTechnician
                      ? <div style={{ background:"#f0faf6", border:"1.5px solid #b2dfd0", borderRadius:10, padding:"12px 14px", fontSize:13, fontWeight:600, color:"#0F6E56" }}>
                          {viewJob.assignedTechnician.name}{viewJob.assignedTechnician.phone ? ` · ${viewJob.assignedTechnician.phone}` : ""}
                        </div>
                      : <div style={{ background:"#F7F8F6", borderRadius:10, padding:"12px 14px", fontSize:13, color:"#aaa" }}>Not assigned yet</div>
                    }
                  </div>

                  {/* ── Job report (completed jobs only) ── */}
                  {viewJob.jobReport && (() => {
                    const jr = viewJob.jobReport!;
                    const inv = jr.invoice;
                    const payStyle = inv ? PAY_STATUS_STYLE[inv.paymentStatus] : null;
                    const balance = inv ? toNum(inv.total) - toNum(inv.advanceAmount) : 0;
                    return (
                      <>
                        <div className="detail-section">
                          <div className="detail-label" style={{ display:"flex", alignItems:"center", gap:6 }}><FileText size={11} /> Job Report</div>
                          <div style={{ background:"#F7F8F6", borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
                            <div className="detail-cell-lbl">Fault Found</div>
                            <div style={{ fontSize:13, color:"#0f1a15", lineHeight:1.6 }}>{jr.faultFound || "—"}</div>
                            {jr.diagnosisNotes && (
                              <>
                                <div className="detail-cell-lbl" style={{ marginTop:10 }}>Diagnosis Notes</div>
                                <div style={{ fontSize:13, color:"#333", lineHeight:1.6 }}>{jr.diagnosisNotes}</div>
                              </>
                            )}
                          </div>
                          <div className="detail-grid">
                            {jr.technician?.name && (
                              <div className="detail-cell"><div className="detail-cell-lbl">Completed By</div><div className="detail-cell-val">{jr.technician.name}</div></div>
                            )}
                            {jr.completedAt && (
                              <div className="detail-cell"><div className="detail-cell-lbl">Completed At</div><div className="detail-cell-val">{fmtDate(jr.completedAt)}</div></div>
                            )}
                            <div className="detail-cell"><div className="detail-cell-lbl">Service Cost</div><div className="detail-cell-val">{fmtAed(jr.labourCharge)}</div></div>
                            <div className="detail-cell"><div className="detail-cell-lbl">Extra Expenses</div><div className="detail-cell-val">{fmtAed(jr.extraExpensesTotal)}</div></div>
                            <div className="detail-cell"><div className="detail-cell-lbl">VAT</div><div className="detail-cell-val">{fmtAed(jr.vatAmount)}</div></div>
                            <div className="detail-cell"><div className="detail-cell-lbl">Grand Total</div><div className="detail-cell-val" style={{ color:"#0F6E56" }}>{fmtAed(jr.grandTotal)}</div></div>
                          </div>

                          {!!jr.parts?.length && (
                            <>
                              <div className="detail-cell-lbl" style={{ marginTop:14, marginBottom:6 }}>Parts Used</div>
                              <div style={{ background:"#F7F8F6", borderRadius:10, padding:"8px 12px" }}>
                                {jr.parts.map(p => (
                                  <div key={p.id} style={{ display:"flex", justifyContent:"space-between", gap:10, padding:"5px 0", fontSize:12.5 }}>
                                    <span style={{ color:"#0f1a15" }}>
                                      {p.part?.name ?? p.customPartName ?? "Part"}
                                      {p.isCustom && <span style={{ marginLeft:6, fontSize:10, color:"#854F0B", fontWeight:600 }}>CUSTOM</span>}
                                    </span>
                                    <span style={{ color:"#7a9b8e", whiteSpace:"nowrap" }}>×{p.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}

                          {!!jr.expenses?.length && (
                            <>
                              <div className="detail-cell-lbl" style={{ marginTop:14, marginBottom:6 }}>Extra Expenses</div>
                              <div style={{ background:"#F7F8F6", borderRadius:10, padding:"8px 12px" }}>
                                {jr.expenses.map(e => (
                                  <div key={e.id} style={{ display:"flex", justifyContent:"space-between", gap:10, padding:"5px 0", fontSize:12.5 }}>
                                    <span style={{ color:"#0f1a15" }}>{e.description || "—"}</span>
                                    <span style={{ color:"#0f1a15", fontWeight:600, whiteSpace:"nowrap" }}>{fmtAed(e.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {inv && (
                          <div className="detail-section">
                            <div className="detail-label" style={{ display:"flex", alignItems:"center", gap:6 }}><DollarSign size={11} /> Invoice</div>
                            <div style={{ background:"#f0faf6", border:"1.5px solid #b2dfd0", borderRadius:10, padding:"12px 14px", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                              <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:"#0F6E56" }}>{inv.invoiceRef}</span>
                              <span style={{ fontSize:17, fontWeight:700, color:"#0f1a15" }}>{fmtAed(inv.total)}</span>
                            </div>
                            <button onClick={() => setPayingInv(inv)} style={{ width:"100%", marginBottom:12, padding:"10px", borderRadius:9, border:"1.5px solid #0F6E56", background:"#fff", color:"#0F6E56", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                              <DollarSign size={14} /> Update payment status
                            </button>
                            <div className="detail-grid">
                              <div className="detail-cell">
                                <div className="detail-cell-lbl">Payment Status</div>
                                <div className="detail-cell-val">
                                  {payStyle && (
                                    <span style={{ padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:600, background:payStyle.bg, color:payStyle.fg }}>
                                      {inv.paymentStatus.charAt(0).toUpperCase() + inv.paymentStatus.slice(1)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="detail-cell">
                                <div className="detail-cell-lbl">Payment Method</div>
                                <div className="detail-cell-val">{payLabel(inv.paymentMethod) ?? "—"}</div>
                              </div>
                              <div className="detail-cell"><div className="detail-cell-lbl">Subtotal</div><div className="detail-cell-val">{fmtAed(inv.subtotal)}</div></div>
                              <div className="detail-cell"><div className="detail-cell-lbl">VAT</div><div className="detail-cell-val">{fmtAed(inv.vat)}</div></div>
                              {inv.paymentStatus !== "paid" && toNum(inv.advanceAmount) > 0 && (
                                <>
                                  <div className="detail-cell"><div className="detail-cell-lbl">Advance Paid</div><div className="detail-cell-val" style={{ color:"#854F0B" }}>{fmtAed(inv.advanceAmount)}</div></div>
                                  <div className="detail-cell"><div className="detail-cell-lbl">Balance Due</div><div className="detail-cell-val" style={{ color:"#791F1F" }}>{fmtAed(balance)}</div></div>
                                </>
                              )}
                              <div className="detail-cell"><div className="detail-cell-lbl">Issued</div><div className="detail-cell-val">{fmtDate(inv.issuedAt)}</div></div>
                              {inv.paidAt && (
                                <div className="detail-cell"><div className="detail-cell-lbl">Paid</div><div className="detail-cell-val">{fmtDate(inv.paidAt)}</div></div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* ── Actions ── */}
                  <div style={{ borderTop:"1px solid #f0f0ec", paddingTop:20, marginTop:4 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#0f1a15", marginBottom:14 }}>Actions</div>

                    {/* Assign technician */}
                    <div style={{ marginBottom:16 }}>
                      <div className="field-label">Assign Technician</div>
                      <div style={{ display:"flex", gap:8 }}>
                        <div style={{ flex:1, position:"relative" }}>
                          <select
                            className="field-input"
                            value={assignId}
                            onChange={e => setAssignId(e.target.value)}
                            style={{ appearance:"none", paddingRight:36 }}
                          >
                            <option value="">— Select technician —</option>
                            {technicians.map(t => <option key={t.id} value={t.id}>{t.name}{t.phone ? ` · ${t.phone}` : ""}</option>)}
                          </select>
                          <ChevronDown size={13} color="#aaa" style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
                        </div>
                        <button
                          onClick={handleAssign}
                          disabled={assigning || !assignId}
                          style={{ padding:"10px 16px", background:"#0F6E56", color:"#fff", border:"none", borderRadius:9, fontSize:12, fontWeight:700, cursor:assigning||!assignId?"not-allowed":"pointer", opacity:assigning||!assignId?0.6:1, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6, fontFamily:"inherit" }}
                        >
                          {assigning ? <Loader2 size={12} style={{ animation:"spin 1s linear infinite" }} /> : <CheckCircle2 size={12} />}
                          Assign
                        </button>
                      </div>
                    </div>

                    {/* Update status */}
                    <div style={{ marginBottom:16 }}>
                      <div className="field-label">Update Status</div>
                      <div style={{ display:"flex", gap:8 }}>
                        <div style={{ flex:1, position:"relative" }}>
                          <select
                            className="field-input"
                            value={newStatus}
                            onChange={e => setNewStatus(e.target.value)}
                            style={{ appearance:"none", paddingRight:36 }}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          <ChevronDown size={13} color="#aaa" style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
                        </div>
                        <button
                          onClick={handleStatusUpdate}
                          disabled={updatingStatus || newStatus === viewJob.status}
                          style={{ padding:"10px 16px", background:"#0F6E56", color:"#fff", border:"none", borderRadius:9, fontSize:12, fontWeight:700, cursor:updatingStatus||newStatus===viewJob.status?"not-allowed":"pointer", opacity:updatingStatus||newStatus===viewJob.status?0.6:1, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6, fontFamily:"inherit" }}
                        >
                          {updatingStatus ? <Loader2 size={12} style={{ animation:"spin 1s linear infinite" }} /> : <CheckCircle2 size={12} />}
                          Update
                        </button>
                      </div>
                    </div>

                    {actionMsg && (
                      <div style={{ background:"#f0faf6", border:"1px solid #b2dfd0", borderRadius:8, padding:"9px 13px", color:"#0F6E56", fontSize:13, fontWeight:600 }}>
                        {actionMsg}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
      {/* ══════ PAYMENT MODAL ══════════════════════════════════════ */}
      {payingInv && (
        <PaymentModal
          invoice={payingInv}
          customerName={viewJob?.customer?.name}
          onClose={() => setPayingInv(null)}
          onSaved={handlePaymentSaved}
        />
      )}
    </div>
  );
}
