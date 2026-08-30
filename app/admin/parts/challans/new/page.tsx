"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus } from "lucide-react";
import { api } from "@/lib/api";

interface Part { id: string; name: string; sku: string; unitPrice: number; }
interface PartRow { partId: string; name: string; sku: string; unitPrice: string; qty: number; }

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alnuzha_token") ?? "";
}
function today() { return new Date().toISOString().split("T")[0]; }
function genChallanNumber(date: string) {
  const d = date.replace(/-/g, "");
  const now = new Date();
  const hhmm = String(now.getHours()).padStart(2, "0") + String(now.getMinutes()).padStart(2, "0");
  return `CH-${d}-${hhmm}`;
}

const inp: React.CSSProperties = {
  padding: "8px 10px", border: "1.5px solid #d4e8e0", borderRadius: 8,
  fontSize: 13, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif",
  boxSizing: "border-box", width: "100%",
};

const CSS = `
  .nchal-wrap        { padding: 32px; }
  .nchal-layout      { display: grid; grid-template-columns: 7fr 3fr; gap: 20px; align-items: start; }
  .nchal-layout > *  { min-width: 0; }
  .nchal-qty-cell    { display: flex; align-items: center; gap: 6px; }
  .nchal-mob-summary { display: none; }
  .nchal-desk-summ   { display: flex; flex-direction: column; gap: 14px; }
  .prow:hover        { background: #f7faf8 !important; }
  @keyframes spin    { from{transform:rotate(0)} to{transform:rotate(360deg)} }

  @media (max-width: 900px) {
    .nchal-wrap   { padding: 20px 18px 40px; }
    .nchal-layout { grid-template-columns: 1fr !important; }
  }

  @media (max-width: 640px) {
    .nchal-wrap { padding: 14px 12px 48px; }
    .nchal-mob-summary {
      display: grid !important;
      grid-template-columns: 1fr 1fr 1fr;
      width: 100%;
      background: #fff;
      border: 1px solid #e8ebe6;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 12px;
      box-sizing: border-box;
    }
    .nchal-mob-summary > div {
      padding: 10px 10px !important;
    }
    .nchal-mob-summary span:first-child {
      font-size: 9px !important;
    }
    .nchal-mob-summary span:last-child {
      font-size: 12px !important;
    }
    .nchal-desk-summ { display: none !important; }
    .nchal-summ-card { display: none !important; }
    .nchal-wrap table th,
    .nchal-wrap table td { padding: 8px 12px !important; font-size: 12px !important; }
    .nchal-qty-cell button { width: 24px !important; height: 24px !important; }
    .nchal-qty-cell input  { width: 44px !important; }
    .nchal-price-inp       { width: 72px !important; }
  }

  @media (max-width: 400px) {
    .nchal-wrap table th,
    .nchal-wrap table td { padding: 6px 8px !important; font-size: 11px !important; }
  }
`;

const SUMMARY_ITEMS = (selected: PartRow[], total: number) => [
  { label: "Items in challan", value: String(selected.length),                         color: "#0F6E56" },
  { label: "Total qty",        value: String(selected.reduce((s, r) => s + r.qty, 0)), color: "#1a1a18" },
  { label: "Total value",      value: `AED ${total.toFixed(2)}`,                       color: "#0a4a35" },
];

export default function NewChallanPage() {
  const router = useRouter();

  const [purchaseDate,  setPurchaseDate]  = useState(today());
  const [challanNumber, setChallanNumber] = useState(() => genChallanNumber(today()));
  const [supplierName,  setSupplierName]  = useState("");
  const [rows,          setRows]          = useState<PartRow[]>([]);
  const [partsLoading,  setPartsLoading]  = useState(true);
  const [search,        setSearch]        = useState("");
  const [page,          setPage]          = useState(1);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState("");

  const PAGE_SIZE = 10;

  useEffect(() => {
    api.getParts(getToken())
      .then(d => setRows((d as Part[]).map(p => ({
        partId: p.id, name: p.name, sku: p.sku ?? "",
        unitPrice: String(p.unitPrice ?? ""), qty: 0,
      }))))
      .finally(() => setPartsLoading(false));
  }, []);

  useEffect(() => { setPage(1); }, [search]);

  function handleDateChange(date: string) {
    setPurchaseDate(date);
    setChallanNumber(genChallanNumber(date));
  }
  function setQty(partId: string, qty: number) {
    setRows(prev => prev.map(r => r.partId === partId ? { ...r, qty: Math.max(0, qty) } : r));
  }
  function setPrice(partId: string, val: string) {
    setRows(prev => prev.map(r => r.partId === partId ? { ...r, unitPrice: val } : r));
  }

  const selected   = rows.filter(r => r.qty > 0);
  const total      = selected.reduce((s, r) => s + r.qty * (parseFloat(r.unitPrice) || 0), 0);
  const visible    = rows.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.sku.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageRows   = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selected.length) { setError("Increase qty for at least one item."); return; }
    setSubmitting(true);
    try {
      await api.createChallan({
        challanNumber, purchaseDate,
        supplierName: supplierName || undefined,
        items: selected.map(r => ({ partId: r.partId, quantity: r.qty, unitPrice: parseFloat(r.unitPrice) || 0 })),
      }, getToken());
      router.push("/admin/parts/challans");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create challan");
    } finally {
      setSubmitting(false);
    }
  }

  const summaryItems = SUMMARY_ITEMS(selected, total);

  return (
    <div className="nchal-wrap">
      <style>{CSS}</style>
      <button onClick={() => router.push("/admin/parts/challans")} style={{ fontSize: 12, color: "#888", background: "none", border: "none", cursor: "pointer", marginBottom: 6, padding: 0 }}>
        ← Challans
      </button>
      <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, marginBottom: 28 }}>New Purchase Challan</h1>

      <form onSubmit={handleSubmit}>
        <div className="nchal-layout">

          {/* ── LEFT column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Mobile-only summary strip (hidden on desktop via CSS) */}
            <div className="nchal-mob-summary">
              {summaryItems.map(({ label, value, color }, idx) => (
                <div key={label} style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 3, borderRight: idx < 2 ? "1px solid #f0f0ec" : "none" }}>
                  <span style={{ fontSize: 10, color: "#7a9b8e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: selected.length > 0 ? color : "#ccc" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Table card */}
            <div style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 14, overflow: "hidden" }}>
              {/* header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 14px", borderBottom: "1px solid #f0f0ec", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, fontWeight: 700, color: "#3d5a4e", margin: 0 }}>Items</h2>
                  {selected.length > 0 && (
                    <span style={{ fontSize: 11, color: "#0F6E56", fontWeight: 600 }}>{selected.length} item{selected.length > 1 ? "s" : ""} selected</span>
                  )}
                </div>
                <input type="text" placeholder="Search parts…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, width: "auto", minWidth: 180 }} />
              </div>

              {/* table */}
              {partsLoading ? (
                <div style={{ padding: 40, display: "flex", alignItems: "center", gap: 10, color: "#888", fontSize: 13 }}>
                  <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Loading parts…
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
                    <thead>
                      <tr style={{ background: "#F7F8F6" }}>
                        {["Part name", "SKU", "Unit price (AED)", "Qty", "Subtotal"].map(h => (
                          <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, borderBottom: "1px solid #e8ebe6", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map(r => {
                        const subtotal = r.qty * (parseFloat(r.unitPrice) || 0);
                        const active   = r.qty > 0;
                        return (
                          <tr key={r.partId} className="prow" style={{ borderBottom: "1px solid #f0f0ec", background: active ? "#f0faf6" : "#fff", transition: "background .15s" }}>
                            <td style={{ padding: "10px 20px", fontWeight: active ? 700 : 500, color: "#1a1a18", whiteSpace: "nowrap" }}>{r.name}</td>
                            <td style={{ padding: "10px 20px", color: "#888", fontFamily: "monospace", fontSize: 12 }}>{r.sku || "—"}</td>
                            <td style={{ padding: "10px 20px" }}>
                              <input type="number" min={0} step="0.01" value={r.unitPrice} onChange={e => setPrice(r.partId, e.target.value)}
                                className="nchal-price-inp" style={{ ...inp, width: 90, textAlign: "right" }} />
                            </td>
                            <td style={{ padding: "10px 20px" }}>
                              <div className="nchal-qty-cell">
                                <button type="button" onClick={() => setQty(r.partId, r.qty - 1)}
                                  style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e0e0dc", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#555" }}>
                                  <Minus size={12} />
                                </button>
                                <input type="number" min={0} step={1} value={r.qty} onChange={e => setQty(r.partId, parseInt(e.target.value) || 0)}
                                  style={{ ...inp, width: 52, textAlign: "center", padding: "6px 4px" }} />
                                <button type="button" onClick={() => setQty(r.partId, r.qty + 1)}
                                  style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #0F6E56", background: active ? "#0F6E56" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: active ? "#fff" : "#0F6E56" }}>
                                  <Plus size={12} />
                                </button>
                              </div>
                            </td>
                            <td style={{ padding: "10px 20px", fontWeight: 600, color: active ? "#0F6E56" : "#ccc", whiteSpace: "nowrap" }}>
                              {active ? `AED ${subtotal.toFixed(2)}` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderTop: "1px solid #f0f0ec", background: "#fafaf8" }}>
                  <span style={{ fontSize: 12, color: "#888" }}>
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, visible.length)} of {visible.length}
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e8ebe6", background: "#fff", fontSize: 12, fontWeight: 600, color: page === 1 ? "#ccc" : "#333", cursor: page === 1 ? "default" : "pointer" }}>
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                      .reduce<(number | "…")[]>((acc, n, i, arr) => {
                        if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("…");
                        acc.push(n);
                        return acc;
                      }, [])
                      .map((n, i) => n === "…"
                        ? <span key={`e${i}`} style={{ padding: "5px 8px", fontSize: 12, color: "#aaa" }}>…</span>
                        : <button key={n} type="button" onClick={() => setPage(n as number)}
                            style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #e8ebe6", background: page === n ? "var(--brand,#0a4a35)" : "#fff", color: page === n ? "#fff" : "#333", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{n}</button>
                      )
                    }
                    <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e8ebe6", background: "#fff", fontSize: 12, fontWeight: 600, color: page === totalPages ? "#ccc" : "#333", cursor: page === totalPages ? "default" : "pointer" }}>
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Summary card (desktop only — hidden on mobile via CSS) */}
            <div className="nchal-summ-card" style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 14, padding: 24 }}>
              <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, fontWeight: 700, color: "#3d5a4e", margin: "0 0 14px" }}>Summary</h2>
              <div className="nchal-desk-summ">
                {summaryItems.map(({ label, value, color }) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 11, color: "#7a9b8e", fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: selected.length > 0 ? color : "#ccc" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Challan details card */}
            <div style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, fontWeight: 700, color: "#3d5a4e", margin: 0 }}>Challan details</h2>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 }}>Purchase Date <span style={{ color: "#e05252" }}>*</span></label>
                <input required type="date" value={purchaseDate} onChange={e => handleDateChange(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 }}>Challan Number <span style={{ color: "#e05252" }}>*</span></label>
                <input required type="text" value={challanNumber} onChange={e => setChallanNumber(e.target.value)} style={{ ...inp, fontFamily: "monospace", fontSize: 12 }} />
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Auto-generated from date</div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 }}>Supplier Name</label>
                <input type="text" placeholder="e.g. Abu Dhabi HVAC Supplies LLC" value={supplierName} onChange={e => setSupplierName(e.target.value)} style={inp} />
              </div>
            </div>

            {error && (
              <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 10, padding: "12px 14px", color: "#791F1F", fontSize: 12 }}>{error}</div>
            )}

            <button type="submit" disabled={submitting || !selected.length}
              style={{ width: "100%", padding: "13px", borderRadius: 50, border: "none", background: selected.length ? "linear-gradient(135deg,#0F6E56,#1a9e75)" : "#ccc", color: "#fff", fontSize: 14, fontWeight: 700, cursor: submitting || !selected.length ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {submitting ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : `Create Challan${selected.length ? ` (${selected.length})` : ""}`}
            </button>

            <button type="button" onClick={() => router.push("/admin/parts/challans")}
              style={{ width: "100%", padding: "12px", borderRadius: 50, border: "1.5px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>

          </div>

        </div>
      </form>
    </div>
  );
}
