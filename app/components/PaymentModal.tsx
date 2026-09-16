"use client";
import { useState } from "react";
import { X, Loader2, CheckCircle2, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

type Money = string | number | null | undefined;

export interface PaymentInvoice {
  id: string;
  invoiceRef: string;
  total?: Money;
  paymentStatus: string;
  paymentMethod?: string | null;
  advanceAmount?: Money;
  paidAt?: string | null;
}

interface Props {
  invoice: PaymentInvoice;
  customerName?: string;
  onClose: () => void;
  onSaved: (updated: PaymentInvoice) => void;
}

const STATUSES = [
  { value: "paid",    label: "Paid",    hint: "Customer paid the full amount" },
  { value: "partial", label: "Partial", hint: "Customer paid part, rest is due" },
  { value: "unpaid",  label: "Unpaid",  hint: "Nothing received yet" },
];
const STATUS_COLOR: Record<string, { bg: string; fg: string; border: string }> = {
  paid:    { bg: "#E1F5EE", fg: "#0F6E56", border: "#0F6E56" },
  partial: { bg: "#FAEEDA", fg: "#854F0B", border: "#C98A2E" },
  unpaid:  { bg: "#FCEBEB", fg: "#791F1F", border: "#C85A5A" },
};

function num(v: Money) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function aed(v: Money) {
  return `AED ${num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alnuzha_token") ?? "";
}

const CSS = `
  @keyframes payFadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes paySlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes paySpin    { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  .pay-backdrop { position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:600;display:flex;align-items:center;justify-content:center;padding:24px;animation:payFadeIn .15s ease; }
  .pay-box      { background:#fff;border-radius:20px;width:100%;max-width:420px;max-height:94vh;overflow-y:auto;padding:30px;position:relative;animation:paySlideUp .2s ease; }
  .pay-label    { font-size:12px;font-weight:600;color:#555;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em; }
  .pay-input    { width:100%;padding:10px 13px;border:1.5px solid #e0e0dc;border-radius:9px;font-size:13px;color:#1a1a18;background:#fff;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color .15s; }
  .pay-input:focus { border-color:#0F6E56; }
  .pay-status   { display:grid;grid-template-columns:repeat(3,1fr);gap:8px; }
  .pay-opt      { padding:10px 6px;border-radius:10px;border:1.5px solid #e0e0dc;background:#fff;cursor:pointer;font-size:13px;font-weight:600;color:#555;font-family:inherit; }
  .pay-summary  { background:#F7F8F6;border-radius:12px;padding:12px 16px;font-size:13px;color:#555; }
  .pay-row      { display:flex;justify-content:space-between;padding:3px 0; }
  @media (max-width: 768px) {
    .pay-backdrop { padding:0;align-items:flex-end; }
    .pay-box      { border-radius:16px 16px 0 0;padding:26px 22px; }
  }
`;

export default function PaymentModal({ invoice, customerName, onClose, onSaved }: Props) {
  const total = num(invoice.total);
  const [status, setStatus] = useState(invoice.paymentStatus || "unpaid");
  const [amountPaid, setAmountPaid] = useState(
    num(invoice.advanceAmount) > 0 ? String(num(invoice.advanceAmount)) : "",
  );
  const [method, setMethod] = useState(
    invoice.paymentMethod && invoice.paymentMethod !== "due" ? invoice.paymentMethod : "cash",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const paidSoFar = status === "paid" ? total : status === "partial" ? num(amountPaid) : 0;
  const balance = Math.max(total - paidSoFar, 0);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");

    const body: Record<string, unknown> = { paymentStatus: status };
    if (status === "partial") {
      const amt = Number(amountPaid);
      if (!Number.isFinite(amt) || amt <= 0) { setError("Enter the amount the customer has paid so far."); return; }
      if (amt >= total) { setError("That covers the full total. Choose \"Paid\" instead."); return; }
      body.amountPaid = amt;
    }
    if (status !== "unpaid") body.paymentMethod = method;

    setSaving(true);
    try {
      const updated = await api.updateInvoicePayment(invoice.id, body, getToken()) as PaymentInvoice;
      onSaved(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pay-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{CSS}</style>
      <div className="pay-box">
        <button onClick={onClose} aria-label="Close" style={{ position:"absolute", top:16, right:16, background:"none", border:"none", cursor:"pointer", color:"#aaa" }}>
          <X size={20} />
        </button>
        <h2 style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:20, fontWeight:700, marginBottom:6 }}>Update Payment</h2>
        <p style={{ fontSize:13, color:"#888", marginBottom:20 }}>
          <span style={{ fontFamily:"monospace", fontWeight:700, color:"#0F6E56" }}>{invoice.invoiceRef}</span>
          {customerName ? ` · ${customerName}` : ""} — <strong>{aed(total)}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:18 }}>
            <div className="pay-label">Payment status</div>
            <div className="pay-status">
              {STATUSES.map(s => {
                const active = status === s.value;
                const c = STATUS_COLOR[s.value];
                return (
                  <button key={s.value} type="button" className="pay-opt" onClick={() => setStatus(s.value)}
                    style={active ? { background:c.bg, color:c.fg, borderColor:c.border } : undefined}>
                    {s.label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize:12, color:"#999", marginTop:6 }}>{STATUSES.find(s => s.value === status)?.hint}</div>
          </div>

          {status === "partial" && (
            <div style={{ marginBottom:18 }}>
              <div className="pay-label">Amount paid so far (AED)</div>
              <input type="number" min="0.01" step="0.01" max={total} className="pay-input" autoFocus
                value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="e.g. 200" />
            </div>
          )}

          {status !== "unpaid" && (
            <div style={{ marginBottom:18 }}>
              <div className="pay-label">Payment method</div>
              <div style={{ position:"relative" }}>
                <select value={method} onChange={e => setMethod(e.target.value)} className="pay-input" style={{ appearance:"none", paddingRight:36, cursor:"pointer" }}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
                <ChevronDown size={14} color="#aaa" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
              </div>
            </div>
          )}

          <div className="pay-summary" style={{ marginBottom:18 }}>
            <div className="pay-row"><span>Total</span><span style={{ fontWeight:600 }}>{aed(total)}</span></div>
            <div className="pay-row"><span>Paid</span><span style={{ fontWeight:600, color:"#0F6E56" }}>{aed(paidSoFar)}</span></div>
            <div className="pay-row" style={{ borderTop:"1px solid #e6e8e4", marginTop:4, paddingTop:7 }}>
              <span style={{ fontWeight:700, color:"#0f1a15" }}>Balance due</span>
              <span style={{ fontWeight:700, color: balance > 0 ? "#791F1F" : "#0F6E56" }}>{aed(balance)}</span>
            </div>
          </div>

          {error && <div style={{ background:"#FCEBEB", borderRadius:8, padding:"10px 14px", color:"#791F1F", fontSize:13, marginBottom:14 }}>{error}</div>}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:10 }}>
            <button type="button" onClick={onClose} style={{ padding:"12px", borderRadius:50, border:"1.5px solid #e8ebe6", background:"#fff", color:"#555", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ padding:"12px", borderRadius:50, border:"none", background:"linear-gradient(135deg,#0F6E56,#1a9e75)", color:"#fff", fontSize:14, fontWeight:700, cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:"inherit" }}>
              {saving ? <><Loader2 size={14} style={{ animation:"paySpin 1s linear infinite" }} /> Saving…</> : <><CheckCircle2 size={14} /> Save Payment</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
