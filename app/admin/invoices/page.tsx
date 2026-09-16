"use client";
import { useEffect, useState } from "react";
import Badge from "../../components/Badge";
import { Search, Loader2, RefreshCw, X, User, FileText, Wrench } from "lucide-react";
import { api } from "@/lib/api";
import PaymentModal, { type PaymentInvoice } from "../../components/PaymentModal";

/* ── Types ─────────────────────────────────────────────────────── */
interface Invoice {
  id: string;
  invoiceRef: string;
  subtotal: string | number;
  vat: string | number;
  total: string | number;
  paymentStatus: string;
  paymentMethod?: string | null;
  advanceAmount?: string | number;
  pdfUrl?: string | null;
  issuedAt: string;
  paidAt?: string | null;
  customer?: { id: string; name: string; phone: string; email?: string };
  jobReport?: {
    id: string;
    faultFound?: string;
    diagnosisNotes?: string;
    labourCharge: number;
    partsTotal: number;
    extraExpensesTotal: number;
    arrivedAt?: string;
    completedAt?: string;
    technician?: { name: string; phone?: string };
    parts?: { id: string; quantity: number; unitPrice: number; lineTotal: number; isCustom: boolean; customPartName?: string; part?: { name: string; sku: string } }[];
    services?: { id: string; serviceName: string; labourCost: number; notes?: string }[];
    expenses?: { id: string; description: string; amount: number }[];
  } | null;
}

/* ── Helpers ───────────────────────────────────────────────────── */
function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alnuzha_token") ?? "";
}
function fmt(n: string | number, decimals = 2) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" });
}
const METHOD_LABEL: Record<string, string> = { cash: "Cash", card: "Card", bank_transfer: "Bank Transfer", due: "Due" };

/* ── CSS ───────────────────────────────────────────────────────── */
const CSS = `
  @keyframes spin    { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes fadeIn  { from{opacity:0}           to{opacity:1} }
  @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

  .inv-wrap    { padding: 32px; }
  .inv-hdr     { display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;gap:12px; }
  .inv-summary { display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:24px; }
  .inv-filters { display:flex;gap:10px;margin-bottom:16px;flex-wrap:nowrap; }
  .inv-search  { display:flex;align-items:center;gap:8px;border:1px solid #e0e0dc;border-radius:8px;padding:7px 12px;background:#fff;flex:1;min-width:0; }
  .inv-select  { padding:7px 12px;border:1px solid #e0e0dc;border-radius:8px;font-size:13px;background:#fff;color:#1a1a18;flex-shrink:0; }

  /* Table vs cards */
  .inv-table-wrap { display:block; }
  .inv-card-list  { display:none; }
  .inv-card       { background:#fff;border:1px solid #e8ebe6;border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:10px; }
  .inv-card-top   { display:flex;align-items:flex-start;justify-content:space-between;gap:8px; }
  .inv-card-ref   { font-family:monospace;font-size:11px;font-weight:700;color:#0F6E56; }
  .inv-card-row   { display:flex;align-items:center;justify-content:space-between;gap:8px; }

  /* Drawer */
  .drawer-backdrop { position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:400;animation:fadeIn .15s ease; }
  .drawer          { position:fixed;top:0;right:0;height:100vh;width:500px;max-width:100vw;background:#fff;z-index:401;display:flex;flex-direction:column;box-shadow:-8px 0 40px rgba(0,0,0,0.12);animation:slideIn .22s ease; }
  .drawer-head     { padding:20px 24px;border-bottom:1px solid #f0f0ec;display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0; }
  .drawer-body     { flex:1;overflow-y:auto;padding:24px; }

  .d-section   { margin-bottom:22px; }
  .d-label     { font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;display:flex;align-items:center;gap:5px; }
  .d-grid      { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
  .d-cell      { background:#F7F8F6;border-radius:10px;padding:11px 14px; }
  .d-cell-lbl  { font-size:10px;font-weight:600;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px; }
  .d-cell-val  { font-size:13px;font-weight:600;color:#0f1a15; }

  .field-input { width:100%;padding:10px 13px;border:1.5px solid #e0e0dc;border-radius:9px;font-size:13px;color:#1a1a18;background:#fff;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color .15s; }
  .field-input:focus { border-color:#0F6E56; }
  .field-label { font-size:12px;font-weight:600;color:#555;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em; }


  @media (max-width: 768px) {
    .inv-wrap    { padding:16px 14px 40px; }
    .inv-hdr     { flex-wrap:wrap; }
    .inv-summary { grid-template-columns:1fr 1fr !important;gap:10px !important; }
    .inv-select  { font-size:12px;padding:7px 8px; }
    .drawer      { width:100vw; }
    .d-grid      { grid-template-columns:1fr; }
  }

  @media (max-width: 640px) {
    .inv-table-wrap { display:none !important; }
    .inv-card-list  { display:flex;flex-direction:column;gap:10px; }
  }
`;

/* ══════════════════════════════════════════════════════════════ */
export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatus] = useState("");

  /* View drawer */
  const [viewInv, setViewInv]       = useState<Invoice | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError]   = useState("");

  /* Payment modal */
  const [payingInv, setPayingInv] = useState<Invoice | null>(null);

  /* ── load ── */
  function fetchInvoices(status: string) {
    setLoading(true); setError("");
    api.getInvoices(getToken(), status ? `?status=${status}` : "")
      .then(d => setInvoices(d as Invoice[]))
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load invoices"))
      .finally(() => setLoading(false));
  }
  useEffect(() => { fetchInvoices(statusFilter); }, [statusFilter]); // eslint-disable-line

  const filtered = invoices.filter(inv => {
    if (!search) return true;
    const q = search.toLowerCase();
    return inv.invoiceRef.toLowerCase().includes(q) || (inv.customer?.name ?? "").toLowerCase().includes(q);
  });

  const totalBilled  = invoices.reduce((s, i) => s + Number(i.total), 0);
  const outstanding  = invoices.filter(i => i.paymentStatus !== "paid").reduce((s, i) => s + Number(i.total) - Number(i.advanceAmount ?? 0), 0);
  const paidCount    = invoices.filter(i => i.paymentStatus === "paid").length;

  /* ── view drawer ── */
  function openView(id: string) {
    setViewInv(null); setViewError(""); setViewLoading(true);
    api.getInvoice(id, getToken())
      .then(d => setViewInv(d as Invoice))
      .catch(e => setViewError(e instanceof Error ? e.message : "Failed to load invoice"))
      .finally(() => setViewLoading(false));
  }
  function closeView() { setViewInv(null); setViewLoading(false); setViewError(""); }

  /* ── payment ── */
  function handlePaymentSaved(updated: PaymentInvoice) {
    const patch = {
      paymentStatus: updated.paymentStatus,
      paymentMethod: updated.paymentMethod,
      advanceAmount: updated.advanceAmount ?? undefined,
      paidAt: updated.paidAt,
    };
    setInvoices(prev => prev.map(i => i.id === updated.id ? { ...i, ...patch } : i));
    setViewInv(prev => prev?.id === updated.id ? { ...prev, ...patch } : prev);
    setPayingInv(null);
  }

  /* ══════════════════════ RENDER ═══════════════════════════════ */
  return (
    <div className="inv-wrap">
      <style>{CSS}</style>

      {/* Header */}
      <div className="inv-hdr">
        <div>
          <h1 style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:22, fontWeight:700, marginBottom:2 }}>Invoices</h1>
          <p style={{ color:"#888", fontSize:13 }}>{loading ? "Loading…" : `${invoices.length} invoices`}</p>
        </div>
        <button onClick={() => fetchInvoices(statusFilter)} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 16px", background:"transparent", color:"#555", border:"1px solid #e8ebe6", borderRadius:50, fontSize:13, fontWeight:600, cursor:"pointer" }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      {!loading && invoices.length > 0 && (
        <div className="inv-summary">
          {[
            { label:"Total invoiced",  val:`AED ${fmt(totalBilled)}`, bg:"#EAF3DE", color:"#27500A" },
            { label:"Unpaid",          val:`AED ${fmt(outstanding)}`,  bg:"#FCEBEB", color:"#791F1F" },
            { label:"Paid invoices",   val:`${paidCount} / ${invoices.length}`, bg:"#E1F5EE", color:"#0F6E56" },
          ].map(s => (
            <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:"14px 16px" }}>
              <div style={{ fontSize:11, color:s.color, opacity:0.8, marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:18, fontWeight:700, color:s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="inv-filters">
        <div className="inv-search">
          <Search size={13} color="#aaa" />
          <input type="text" placeholder="Search customer or invoice ID…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ border:"none", outline:"none", fontSize:13, background:"transparent", width:"100%", color:"#1a1a18" }} />
        </div>
        <select className="inv-select" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">All payments</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
        </select>
      </div>

      {loading && (
        <div style={{ display:"flex", alignItems:"center", gap:10, color:"#888", fontSize:14, marginTop:32 }}>
          <Loader2 size={16} style={{ animation:"spin 1s linear infinite" }} /> Loading invoices…
        </div>
      )}
      {error && !loading && (
        <div style={{ background:"#FCEBEB", border:"1px solid #f5c6c6", borderRadius:10, padding:"14px 18px", color:"#791F1F", fontSize:13 }}>{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Desktop table */}
          <div className="inv-table-wrap" style={{ background:"#fff", border:"1px solid #e8ebe6", borderRadius:12, overflow:"hidden", overflowX:"auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding:"48px", textAlign:"center", color:"#aaa", fontSize:14 }}>No invoices found.</div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:560 }}>
                <thead>
                  <tr style={{ background:"#F7F8F6" }}>
                    {["Invoice ID", "Customer", "Invoice Date", "Amount", "VAT", "Status", ""].map(h => (
                      <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:500, color:"#888", fontSize:11, borderBottom:"1px solid #e8ebe6", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => (
                    <tr key={inv.id} style={{ borderBottom:"1px solid #f0f0ec" }}>
                      <td style={{ padding:"11px 14px", fontWeight:700, color:"#0F6E56", whiteSpace:"nowrap", fontFamily:"monospace", fontSize:12 }}>{inv.invoiceRef}</td>
                      <td style={{ padding:"11px 14px", color:"#333", whiteSpace:"nowrap" }}>{inv.customer?.name ?? "—"}</td>
                      <td style={{ padding:"11px 14px", color:"#3d5a4e", fontSize:12.5, fontWeight:600, whiteSpace:"nowrap" }}>{fmtDate(inv.issuedAt)}</td>
                      <td style={{ padding:"11px 14px", fontWeight:700, whiteSpace:"nowrap" }}>AED {fmt(inv.total)}</td>
                      <td style={{ padding:"11px 14px", color:"#888", fontSize:12, whiteSpace:"nowrap" }}>AED {fmt(inv.vat)}</td>
                      <td style={{ padding:"11px 14px" }}>
                        {inv.paymentStatus === "partial"
                          ? <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:"#FAEEDA", color:"#633806" }}>Partial</span>
                          : <Badge variant={inv.paymentStatus} />
                        }
                      </td>
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => openView(inv.id)} style={{ fontSize:12, padding:"5px 12px", border:"1px solid #0F6E56", borderRadius:6, background:"transparent", cursor:"pointer", color:"#0F6E56", fontWeight:600 }}>View</button>
                          <button onClick={() => setPayingInv(inv)} style={{ fontSize:12, padding:"5px 10px", border:"1px solid #e0e0dc", borderRadius:6, background:"transparent", cursor:"pointer", color:"#555", fontWeight:600, whiteSpace:"nowrap" }}>Update payment</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile card list */}
          <div className="inv-card-list">
            {filtered.length === 0 ? (
              <div style={{ padding:"40px 0", textAlign:"center", color:"#aaa", fontSize:14 }}>No invoices found.</div>
            ) : filtered.map(inv => (
              <div key={inv.id} className="inv-card">
                <div className="inv-card-top">
                  <div>
                    <div className="inv-card-ref">{inv.invoiceRef}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#0f1a15", marginTop:2 }}>{inv.customer?.name ?? "—"}</div>
                    <div style={{ fontSize:12, color:"#888", marginTop:1 }}>{fmtDate(inv.issuedAt)}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:16, fontWeight:700, color:"#0f1a15" }}>AED {fmt(inv.total)}</div>
                    <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>+AED {fmt(inv.vat)} VAT</div>
                  </div>
                </div>
                <div className="inv-card-row">
                  <div>
                    {inv.paymentStatus === "partial"
                      ? <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:"#FAEEDA", color:"#633806" }}>Partial</span>
                      : <Badge variant={inv.paymentStatus} />
                    }
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => openView(inv.id)} style={{ fontSize:12, padding:"6px 14px", border:"1px solid #0F6E56", borderRadius:6, background:"transparent", cursor:"pointer", color:"#0F6E56", fontWeight:600 }}>View</button>
                    <button onClick={() => setPayingInv(inv)} style={{ fontSize:12, padding:"6px 12px", border:"1px solid #e0e0dc", borderRadius:6, background:"transparent", cursor:"pointer", color:"#555", fontWeight:600, whiteSpace:"nowrap" }}>Update payment</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══════ VIEW DRAWER ════════════════════════════════════════ */}
      {(viewLoading || viewInv || viewError) && (
        <>
          <div className="drawer-backdrop" onClick={closeView} />
          <div className="drawer">

            {/* Head */}
            <div className="drawer-head">
              <div>
                {viewInv && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>
                      {viewInv.invoiceRef}
                    </div>
                    <div style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:18, fontWeight:700, color:"#0f1a15", marginBottom:6 }}>
                      {viewInv.customer?.name ?? "Invoice"}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {viewInv.paymentStatus === "partial"
                        ? <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:"#FAEEDA", color:"#633806" }}>Partial</span>
                        : <Badge variant={viewInv.paymentStatus} />
                      }
                      <button onClick={() => setPayingInv(viewInv)} style={{ fontSize:12, padding:"4px 12px", background:"#0F6E56", color:"#fff", border:"none", borderRadius:6, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        Update payment
                      </button>
                    </div>
                  </>
                )}
                {viewLoading && <div style={{ fontSize:14, color:"#888" }}>Loading…</div>}
              </div>
              <button onClick={closeView} style={{ background:"none", border:"none", cursor:"pointer", color:"#aaa", padding:4, display:"flex" }}><X size={20} /></button>
            </div>

            <div className="drawer-body">
              {viewLoading && (
                <div style={{ display:"flex", alignItems:"center", gap:10, color:"#888", fontSize:14, marginTop:40, justifyContent:"center" }}>
                  <Loader2 size={18} style={{ animation:"spin 1s linear infinite" }} /> Loading invoice…
                </div>
              )}
              {viewError && <div style={{ background:"#FCEBEB", border:"1px solid #f5c6c6", borderRadius:9, padding:"14px", color:"#791F1F", fontSize:13 }}>{viewError}</div>}

              {viewInv && (
                <>
                  {/* Financial summary */}
                  <div className="d-section">
                    <div style={{ background:"#F7F8F6", borderRadius:12, padding:"16px 18px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13, color:"#555" }}>
                        <span>Subtotal</span><span style={{ fontWeight:600 }}>AED {fmt(viewInv.subtotal)}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12, fontSize:13, color:"#555" }}>
                        <span>VAT (5%)</span><span style={{ fontWeight:600 }}>AED {fmt(viewInv.vat)}</span>
                      </div>
                      <div style={{ borderTop:"1.5px solid #e0e8e4", paddingTop:12, display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontSize:15, fontWeight:700, color:"#0f1a15" }}>Total</span>
                        <span style={{ fontSize:18, fontWeight:800, color:"#0F6E56" }}>AED {fmt(viewInv.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer */}
                  <div className="d-section">
                    <div className="d-label"><User size={11} /> Customer</div>
                    <div className="d-grid">
                      <div className="d-cell"><div className="d-cell-lbl">Name</div><div className="d-cell-val">{viewInv.customer?.name ?? "—"}</div></div>
                      <div className="d-cell"><div className="d-cell-lbl">Phone</div><div className="d-cell-val">{viewInv.customer?.phone ?? "—"}</div></div>
                      {viewInv.customer?.email && <div className="d-cell" style={{ gridColumn:"span 2" }}><div className="d-cell-lbl">Email</div><div className="d-cell-val">{viewInv.customer.email}</div></div>}
                    </div>
                  </div>

                  {/* Invoice info */}
                  <div className="d-section">
                    <div className="d-label"><FileText size={11} /> Invoice Info</div>
                    <div className="d-grid">
                      <div className="d-cell"><div className="d-cell-lbl">Issued</div><div className="d-cell-val">{fmtDate(viewInv.issuedAt)}</div></div>
                      {viewInv.paidAt && <div className="d-cell"><div className="d-cell-lbl">Paid on</div><div className="d-cell-val">{fmtDate(viewInv.paidAt)}</div></div>}
                      {viewInv.paymentMethod && <div className="d-cell"><div className="d-cell-lbl">Method</div><div className="d-cell-val">{METHOD_LABEL[viewInv.paymentMethod] ?? viewInv.paymentMethod}</div></div>}
                      {viewInv.paymentStatus === "partial" && (
                        <>
                          <div className="d-cell"><div className="d-cell-lbl">Paid so far</div><div className="d-cell-val" style={{ color:"#854F0B" }}>AED {fmt(viewInv.advanceAmount ?? 0)}</div></div>
                          <div className="d-cell"><div className="d-cell-lbl">Balance due</div><div className="d-cell-val" style={{ color:"#791F1F" }}>AED {fmt(Number(viewInv.total) - Number(viewInv.advanceAmount ?? 0))}</div></div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Job report */}
                  {viewInv.jobReport && (() => {
                    const jr = viewInv.jobReport!;
                    return (
                      <>
                        <div className="d-section">
                          <div className="d-label"><Wrench size={11} /> Job Report</div>
                          {jr.technician && (
                            <div style={{ background:"#f0faf6", border:"1px solid #b2dfd0", borderRadius:10, padding:"10px 14px", fontSize:13, fontWeight:600, color:"#0F6E56", marginBottom:10 }}>
                              {jr.technician.name}{jr.technician.phone ? ` · ${jr.technician.phone}` : ""}
                            </div>
                          )}
                          {(jr.arrivedAt || jr.completedAt) && (
                            <div className="d-grid" style={{ marginBottom:10 }}>
                              {jr.arrivedAt && <div className="d-cell"><div className="d-cell-lbl">Arrived</div><div className="d-cell-val">{fmtTime(jr.arrivedAt)}</div></div>}
                              {jr.completedAt && <div className="d-cell"><div className="d-cell-lbl">Completed</div><div className="d-cell-val">{fmtTime(jr.completedAt)}</div></div>}
                            </div>
                          )}
                          {jr.faultFound && (
                            <div style={{ marginBottom:8 }}>
                              <div style={{ fontSize:11, fontWeight:600, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Fault Found</div>
                              <div style={{ background:"#F7F8F6", borderRadius:8, padding:"10px 12px", fontSize:13, color:"#333" }}>{jr.faultFound}</div>
                            </div>
                          )}
                          {jr.diagnosisNotes && (
                            <div>
                              <div style={{ fontSize:11, fontWeight:600, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Diagnosis Notes</div>
                              <div style={{ background:"#F7F8F6", borderRadius:8, padding:"10px 12px", fontSize:13, color:"#555", lineHeight:1.6 }}>{jr.diagnosisNotes}</div>
                            </div>
                          )}
                        </div>

                        {/* Parts */}
                        {jr.parts && jr.parts.length > 0 && (
                          <div className="d-section">
                            <div className="d-label">Parts used</div>
                            <div style={{ background:"#fff", border:"1px solid #e8ebe6", borderRadius:10, overflow:"hidden" }}>
                              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                                <thead>
                                  <tr style={{ background:"#F7F8F6" }}>
                                    {["Part", "Qty", "Unit", "Total"].map(h => (
                                      <th key={h} style={{ padding:"7px 10px", textAlign:"left", fontWeight:600, color:"#888", fontSize:10, borderBottom:"1px solid #e8ebe6" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {jr.parts.map(p => (
                                    <tr key={p.id} style={{ borderBottom:"1px solid #f5f5f3" }}>
                                      <td style={{ padding:"8px 10px", color:"#333" }}>
                                        {p.isCustom ? (p.customPartName ?? "Custom") : (p.part?.name ?? "—")}
                                        {p.isCustom && <span style={{ marginLeft:5, fontSize:9, fontWeight:700, background:"#FFF3CD", color:"#856404", padding:"1px 5px", borderRadius:4 }}>Custom</span>}
                                      </td>
                                      <td style={{ padding:"8px 10px", color:"#555" }}>{p.quantity}</td>
                                      <td style={{ padding:"8px 10px", color:"#555" }}>AED {fmt(p.unitPrice)}</td>
                                      <td style={{ padding:"8px 10px", fontWeight:600 }}>AED {fmt(p.lineTotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Services */}
                        {jr.services && jr.services.length > 0 && (
                          <div className="d-section">
                            <div className="d-label">Services</div>
                            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                              {jr.services.map(s => (
                                <div key={s.id} style={{ background:"#F7F8F6", borderRadius:9, padding:"10px 13px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                  <div>
                                    <div style={{ fontSize:13, fontWeight:600, color:"#0f1a15" }}>{s.serviceName}</div>
                                    {s.notes && <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{s.notes}</div>}
                                  </div>
                                  <div style={{ fontSize:13, fontWeight:700, color:"#0F6E56", whiteSpace:"nowrap" }}>AED {fmt(s.labourCost)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Expenses */}
                        {jr.expenses && jr.expenses.length > 0 && (
                          <div className="d-section">
                            <div className="d-label">Extra Expenses</div>
                            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                              {jr.expenses.map(ex => (
                                <div key={ex.id} style={{ background:"#F7F8F6", borderRadius:9, padding:"10px 13px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                  <div style={{ fontSize:13, color:"#555" }}>{ex.description}</div>
                                  <div style={{ fontSize:13, fontWeight:700, color:"#0f1a15", whiteSpace:"nowrap" }}>AED {fmt(ex.amount)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
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
          customerName={payingInv.customer?.name}
          onClose={() => setPayingInv(null)}
          onSaved={handlePaymentSaved}
        />
      )}
    </div>
  );
}
