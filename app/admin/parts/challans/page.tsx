"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Plus, Upload, Download, X, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface ChallanItem {
  id: string;
  quantity: number;
  unitPrice: number;
  part: { id: string; name: string; sku: string };
}
interface PartChallan {
  id: string;
  challanNumber: string;
  purchaseDate: string;
  supplierName: string | null;
  createdAt: string;
  items: ChallanItem[];
}

// CSV row after parsing (flat)
interface CsvRow {
  challanNumber: string;
  purchaseDate: string;
  supplierName: string;
  partSku: string;
  quantity: string;
  unitPrice: string;
}

// Grouped for preview + submission
interface ChallanGroup {
  challanNumber: string;
  purchaseDate: string;
  supplierName: string;
  items: { partSku: string; quantity: number; unitPrice: number }[];
}

type BulkResult = {
  created: PartChallan[];
  errors: { challanNumber: string; error: string }[];
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alnuzha_token") ?? "";
}

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const CSS = `
  .chal-wrap { padding: 32px; }
  .chal-hdr  { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .chal-btns { display: flex; gap: 8px; }
  @media (max-width: 768px) {
    .chal-wrap { padding: 16px 14px 40px; }
    .chal-hdr  { flex-wrap: wrap; gap: 12px; }
    .chal-btns { width: 100%; }
    .chal-btns button { flex: 1; justify-content: center; }
  }
  @keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
`;

const CSV_TEMPLATE =
  "challanNumber,purchaseDate,supplierName,partSku,quantity,unitPrice\n" +
  "CH-2026-06-001,2026-06-10,Abu Dhabi HVAC Supplies LLC,CAP-45,20,35.00\n" +
  "CH-2026-06-001,2026-06-10,Abu Dhabi HVAC Supplies LLC,MOTOR-IND,10,120.00\n" +
  "CH-2026-06-002,2026-06-12,Ahmed Parts Store,THERM-DIG,5,65.00";

function parseCSV(text: string): { groups: ChallanGroup[]; error: string } {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { groups: [], error: "CSV must have a header row and at least one data row." };

  const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, ""));
  const required = ["challannumber", "purchasedate", "partsku", "quantity", "unitprice"];
  const missing = required.filter(r => !header.includes(r));
  if (missing.length) return { groups: [], error: `Missing columns: ${missing.join(", ")}` };

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    const get = (col: string) => cols[header.indexOf(col)] ?? "";
    rows.push({
      challanNumber: get("challannumber"),
      purchaseDate:  get("purchasedate"),
      supplierName:  get("suppliername"),
      partSku:       get("partsku"),
      quantity:      get("quantity"),
      unitPrice:     get("unitprice"),
    });
  }

  // Group by challanNumber
  const map = new Map<string, ChallanGroup>();
  for (const r of rows) {
    if (!r.challanNumber) continue;
    if (!map.has(r.challanNumber)) {
      map.set(r.challanNumber, {
        challanNumber: r.challanNumber,
        purchaseDate:  r.purchaseDate,
        supplierName:  r.supplierName,
        items: [],
      });
    }
    map.get(r.challanNumber)!.items.push({
      partSku:   r.partSku,
      quantity:  parseInt(r.quantity, 10) || 0,
      unitPrice: parseFloat(r.unitPrice) || 0,
    });
  }

  const groups = Array.from(map.values());
  if (!groups.length) return { groups: [], error: "No valid challan rows found." };
  return { groups, error: "" };
}

export default function ChallansPage() {
  const router = useRouter();
  const [challans, setChallans] = useState<PartChallan[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  // Bulk upload state
  const [showBulk, setShowBulk]           = useState(false);
  const [groups, setGroups]               = useState<ChallanGroup[]>([]);
  const [parseErr, setParseErr]           = useState("");
  const [uploading, setUploading]         = useState(false);
  const [bulkResult, setBulkResult]       = useState<BulkResult | null>(null);
  const [dragOver, setDragOver]           = useState(false);
  const [expandedIdx, setExpandedIdx]     = useState<number | null>(null);
  const fileRef                           = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    setError("");
    api.getChallans(getToken())
      .then(d => setChallans(d as PartChallan[]))
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load challans"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  // ── CSV helpers ──────────────────────────────────────────────────
  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "challans_template.csv";
    a.click();
  }

  function handleFile(file: File) {
    setParseErr("");
    setGroups([]);
    setBulkResult(null);
    setExpandedIdx(null);
    const reader = new FileReader();
    reader.onload = e => {
      const { groups: g, error: err } = parseCSV(e.target?.result as string);
      if (err) setParseErr(err);
      else setGroups(g);
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    if (!groups.length) return;
    setUploading(true);
    setBulkResult(null);
    try {
      const result = await api.bulkCreateChallans(
        { challans: groups.map(g => ({ ...g })) },
        getToken()
      ) as BulkResult;
      setBulkResult(result);
      if (result.created.length) {
        setChallans(prev => [...result.created, ...prev]);
      }
    } catch (e: unknown) {
      setParseErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function closeBulk() {
    setShowBulk(false);
    setGroups([]);
    setParseErr("");
    setBulkResult(null);
    setDragOver(false);
    setExpandedIdx(null);
  }
  // ────────────────────────────────────────────────────────────────

  const totalItems = (g: ChallanGroup) =>
    g.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return (
    <div className="chal-wrap">
      <style>{CSS}</style>
      <div className="chal-hdr">
        <div>
          <button onClick={() => router.push("/admin/parts")} style={{ fontSize: 12, color: "#888", background: "none", border: "none", cursor: "pointer", marginBottom: 6, padding: 0 }}>
            ← Back to Parts
          </button>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Purchase Challans</h1>
          <p style={{ color: "#888", fontSize: 13 }}>{loading ? "Loading…" : `${challans.length} challans`}</p>
        </div>
        <div className="chal-btns">
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: "1px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => { setShowBulk(true); setGroups([]); setParseErr(""); setBulkResult(null); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: "1px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <Upload size={13} /> Bulk Upload
          </button>
          <button onClick={() => router.push("/admin/parts/challans/new")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={14} /> New Challan
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#888", fontSize: 14, marginTop: 32 }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading challans…
        </div>
      )}

      {error && !loading && (
        <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 10, padding: "14px 18px", color: "#791F1F", fontSize: 13 }}>{error}</div>
      )}

      {!loading && !error && (
        <div style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 12, overflow: "hidden", overflowX: "auto" }}>
          {challans.length === 0 ? (
            <div style={{ padding: "56px", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: "#aaa", marginBottom: 16 }}>No purchase challans yet.</div>
              <button onClick={() => router.push("/admin/parts/challans/new")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <Plus size={14} /> Create first challan
              </button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr style={{ background: "#F7F8F6" }}>
                  {["Challan #", "Purchase Date", "Supplier", "Items", "Created", ""].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, borderBottom: "1px solid #e8ebe6" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {challans.map(c => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f0f0ec" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, fontFamily: "monospace", color: "#1a1a18" }}>{c.challanNumber}</td>
                    <td style={{ padding: "12px 16px", color: "#333" }}>{fmtDate(c.purchaseDate)}</td>
                    <td style={{ padding: "12px 16px", color: "#555" }}>{c.supplierName ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#555" }}>{c.items.length} {c.items.length === 1 ? "part" : "parts"}</td>
                    <td style={{ padding: "12px 16px", color: "#aaa", fontSize: 12 }}>{fmtDate(c.createdAt)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => router.push(`/admin/parts/challans/${c.id}`)}
                        style={{ fontSize: 12, padding: "4px 12px", border: "1px solid #e0e0dc", borderRadius: 6, background: "transparent", cursor: "pointer", color: "#555", fontWeight: 500 }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Bulk Upload Modal ─────────────────────────────────────── */}
      {showBulk && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 680, padding: "32px 32px 28px", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={closeBulk} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Bulk Upload Challans</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 22 }}>
              Upload a CSV — rows sharing the same <strong>challanNumber</strong> are grouped into one challan.
            </p>

            {/* Result screen */}
            {bulkResult ? (
              <div>
                {bulkResult.created.length > 0 && (
                  <div style={{ background: "#e8f5f0", border: "1px solid #b2dfd0", borderRadius: 10, padding: "14px 16px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <CheckCircle size={18} color="#0F6E56" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0a4a35" }}>
                        {bulkResult.created.length} challan{bulkResult.created.length !== 1 ? "s" : ""} created — stock updated
                      </div>
                      <div style={{ fontSize: 12, color: "#3d5a4e", marginTop: 4 }}>
                        {bulkResult.created.map(c => c.challanNumber).join(", ")}
                      </div>
                    </div>
                  </div>
                )}
                {bulkResult.errors.length > 0 && (
                  <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                      <AlertCircle size={18} color="#A32D2D" style={{ flexShrink: 0 }} />
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#791F1F" }}>
                        {bulkResult.errors.length} challan{bulkResult.errors.length !== 1 ? "s" : ""} failed
                      </div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          {["Challan #", "Reason"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "4px 8px", color: "#791F1F", fontWeight: 600, borderBottom: "1px solid #f5c6c6" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResult.errors.map(err => (
                          <tr key={err.challanNumber}>
                            <td style={{ padding: "4px 8px", color: "#555", fontFamily: "monospace", fontWeight: 600 }}>{err.challanNumber}</td>
                            <td style={{ padding: "4px 8px", color: "#791F1F" }}>{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button onClick={closeBulk} style={{ width: "100%", padding: "12px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0F6E56,#1a9e75)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Template download */}
                <div style={{ background: "#F7F8F6", border: "1px solid #e8ebe6", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 2 }}>CSV columns</div>
                    <div style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>
                      challanNumber, purchaseDate, supplierName, partSku, quantity, unitPrice
                    </div>
                  </div>
                  <button onClick={downloadTemplate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1px solid #e8ebe6", borderRadius: 8, background: "#fff", color: "#0F6E56", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                    <Download size={12} /> Download template
                  </button>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? "#0F6E56" : "#d4e8e0"}`,
                    borderRadius: 12, padding: "28px 24px", textAlign: "center",
                    background: dragOver ? "#e8f5f0" : "#fafafa",
                    cursor: "pointer", marginBottom: 16, transition: "all 0.15s",
                  }}
                >
                  <Upload size={24} color={dragOver ? "#0F6E56" : "#aaa"} style={{ margin: "0 auto 10px" }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: dragOver ? "#0F6E56" : "#555", marginBottom: 4 }}>
                    {groups.length > 0
                      ? `${groups.length} challan${groups.length !== 1 ? "s" : ""} parsed — click to replace`
                      : "Drop CSV here or click to browse"}
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>Supported: .csv</div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                  />
                </div>

                {parseErr && (
                  <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 14 }}>
                    {parseErr}
                  </div>
                )}

                {/* Preview — one card per challan group */}
                {groups.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                      Preview — {groups.length} challan{groups.length !== 1 ? "s" : ""}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {groups.map((g, idx) => (
                        <div key={g.challanNumber} style={{ border: "1px solid #e8ebe6", borderRadius: 10, overflow: "hidden" }}>
                          {/* Challan header row */}
                          <button
                            type="button"
                            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                            style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#F7F8F6", border: "none", cursor: "pointer", textAlign: "left", gap: 10 }}
                          >
                            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 13, color: "#1a1a18" }}>{g.challanNumber}</span>
                              <span style={{ fontSize: 12, color: "#555" }}>{g.purchaseDate}</span>
                              {g.supplierName && <span style={{ fontSize: 12, color: "#888" }}>{g.supplierName}</span>}
                              <span style={{ fontSize: 11, color: "#0F6E56", fontWeight: 600, background: "#e8f5f0", padding: "2px 8px", borderRadius: 10 }}>
                                {g.items.length} item{g.items.length !== 1 ? "s" : ""} · AED {totalItems(g).toFixed(2)}
                              </span>
                            </div>
                            <span style={{ fontSize: 12, color: "#aaa" }}>{expandedIdx === idx ? "▲" : "▼"}</span>
                          </button>

                          {/* Expanded items table */}
                          {expandedIdx === idx && (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr style={{ background: "#fafafa" }}>
                                  {["Part SKU", "Qty", "Unit Price (AED)", "Line Total"].map(h => (
                                    <th key={h} style={{ padding: "6px 12px", textAlign: "left", fontWeight: 500, color: "#aaa", borderBottom: "1px solid #f0f0ec" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {g.items.map((item, j) => (
                                  <tr key={j} style={{ borderBottom: "1px solid #f8f8f6" }}>
                                    <td style={{ padding: "6px 12px", fontFamily: "monospace", fontWeight: 600, color: "#333" }}>{item.partSku}</td>
                                    <td style={{ padding: "6px 12px", color: "#555" }}>{item.quantity}</td>
                                    <td style={{ padding: "6px 12px", color: "#555" }}>{item.unitPrice.toFixed(2)}</td>
                                    <td style={{ padding: "6px 12px", fontWeight: 600, color: "#0F6E56" }}>{(item.quantity * item.unitPrice).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                  <button type="button" onClick={closeBulk} style={{ padding: "12px", borderRadius: 50, border: "1.5px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!groups.length || uploading}
                    style={{ padding: "12px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0F6E56,#1a9e75)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: (!groups.length || uploading) ? "not-allowed" : "pointer", opacity: (!groups.length || uploading) ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    {uploading
                      ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Uploading…</>
                      : `Upload ${groups.length || ""} Challan${groups.length !== 1 ? "s" : ""}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
