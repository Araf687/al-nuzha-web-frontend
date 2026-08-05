"use client";
import { useEffect, useState, useRef } from "react";
import { Search, Plus, Loader2, RefreshCw, X, Upload, Download, CheckCircle, AlertCircle, Pencil } from "lucide-react";
import * as XLSX from "xlsx";
import Badge from "../../components/Badge";
import { api } from "@/lib/api";

interface Part {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  stockQty: number;
  minStockLevel: number;
  needsReview: boolean;
  updatedAt: string;
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alnuzha_token") ?? "";
}

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", border: "1.5px solid #d4e8e0",
  borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif",
};

const PARTS_CSS = `
  .parts-wrap        { padding: 32px; }
  .parts-hdr         { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .parts-btns        { display: flex; gap: 8px; }
  .parts-search      { display: flex; align-items: center; gap: 8px; border: 1px solid #e0e0dc; border-radius: 8px; padding: 8px 12px; background: #fff; margin-bottom: 16px; max-width: 300px; }
  .parts-table-wrap  { display: block; overflow-x: auto; }
  .parts-card-list   { display: none; flex-direction: column; gap: 10px; padding: 12px; }
  @media (max-width: 640px) {
    .parts-wrap        { padding: 16px 14px 40px; }
    .parts-hdr         { flex-wrap: wrap; gap: 12px; }
    .parts-btns        { width: 100%; flex-wrap: wrap; }
    .parts-btns button { flex: 1; justify-content: center; min-width: 120px; }
    .parts-search      { max-width: 100%; }
    .parts-table-wrap  { display: none !important; }
    .parts-card-list   { display: flex !important; }
  }
`;

export default function AdminPartsPage() {
  const [tab, setTab]         = useState<"all" | "review">("all");
  const [parts, setParts]     = useState<Part[]>([]);
  const [pending, setPending] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");

  // Set Remaining modal
  const [remainPart, setRemainPart]   = useState<Part | null>(null);
  const [remainQty, setRemainQty]     = useState("0");
  const [remaining, setRemaining]     = useState(false);
  const [remainErr, setRemainErr]     = useState("");
  const [remainWarn, setRemainWarn]   = useState(false);

  // Add Part modal
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ name: "", sku: "", unitPrice: "", minStockLevel: "5" });
  const [adding, setAdding]     = useState(false);
  const [addErr, setAddErr]     = useState("");

  // Approve modal
  const [approvePart, setApprovePart]   = useState<Part | null>(null);
  const [approveForm, setApproveForm]   = useState({ sku: "", unitPrice: "", minStockLevel: "" });
  const [approving, setApproving]       = useState(false);
  const [approveErr, setApproveErr]     = useState("");

  // Edit Part modal
  const [editPart, setEditPart]   = useState<Part | null>(null);
  const [editForm, setEditForm]   = useState({ name: "", sku: "", unitPrice: "", minStockLevel: "" });
  const [editing, setEditing]     = useState(false);
  const [editErr, setEditErr]     = useState("");

  // Bulk upload modal
  type BulkRow = { name: string; sku: string; unitPrice: string; minStockLevel: string };
  type BulkResult = { created: Part[]; errors: { row: number; name: string; error: string }[] };
  const [showBulk, setShowBulk]         = useState(false);
  const [bulkRows, setBulkRows]         = useState<BulkRow[]>([]);
  const [bulkParseErr, setBulkParseErr] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult]     = useState<BulkResult | null>(null);
  const [dragOver, setDragOver]         = useState(false);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  const daysLeftInMonth = (() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
  })();

  function load() {
    setLoading(true);
    setError("");
    const token = getToken();
    Promise.all([api.getParts(token), api.getPendingReview(token)])
      .then(([all, rev]) => {
        setParts(all as Part[]);
        setPending(rev as Part[]);
      })
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load parts"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = (tab === "all" ? parts : pending).filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // reset to page 1 when search or tab changes
  useEffect(() => { setPage(1); }, [search, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const lowCount = parts.filter(p => Number(p.stockQty) <= Number(p.minStockLevel)).length;

  async function handleSetRemaining(e: React.FormEvent) {
    e.preventDefault();
    if (!remainPart) return;
    setRemaining(true);
    setRemainErr("");
    const qty = parseInt(remainQty, 10);
    setRemainWarn(qty < Number(remainPart.minStockLevel));
    try {
      const updated = await api.setRemainingQty(remainPart.id, { qty }, getToken()) as Part;
      setParts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setRemainPart(null);
    } catch (e: unknown) {
      setRemainErr(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setRemaining(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddErr("");
    try {
      const created = await api.createPart({
        name: addForm.name,
        sku: addForm.sku,
        unitPrice: parseFloat(addForm.unitPrice),
        stockQty: 0,
        minStockLevel: parseInt(addForm.minStockLevel, 10),
      }, getToken()) as Part;
      setParts(prev => [created, ...prev]);
      setShowAdd(false);
      setAddForm({ name: "", sku: "", unitPrice: "", minStockLevel: "5" });
    } catch (e: unknown) {
      setAddErr(e instanceof Error ? e.message : "Failed to create part");
    } finally {
      setAdding(false);
    }
  }

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!approvePart) return;
    setApproving(true);
    setApproveErr("");
    try {
      await api.approvePart(approvePart.id, {
        sku: approveForm.sku,
        unitPrice: parseFloat(approveForm.unitPrice),
        minStockLevel: parseInt(approveForm.minStockLevel, 10),
      }, getToken());
      setPending(prev => prev.filter(p => p.id !== approvePart.id));
      setApprovePart(null);
    } catch (e: unknown) {
      setApproveErr(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setApproving(false);
    }
  }

  async function handleEdit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!editPart) return;
    setEditing(true);
    setEditErr("");
    try {
      const updated = await api.updatePart(editPart.id, {
        name: editForm.name,
        sku: editForm.sku,
        unitPrice: parseFloat(editForm.unitPrice),
        minStockLevel: parseInt(editForm.minStockLevel, 10),
      }, getToken()) as Part;
      setParts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
      setEditPart(null);
    } catch (e: unknown) {
      setEditErr(e instanceof Error ? e.message : "Failed to update part");
    } finally {
      setEditing(false);
    }
  }

  // ── CSV helpers ────────────────────────────────────────────────────
  const CSV_TEMPLATE = "name,sku,unitPrice,minStockLevel\nCapacitor 45MFD,CAP-45,35.00,5\nIndoor Fan Motor,MOTOR-IND,120.00,3";

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "parts_template.csv";
    a.click();
  }

  function parseCSV(text: string): { rows: BulkRow[]; error: string } {
    const clean = text.replace(/^﻿/, ""); // strip Excel BOM
    const lines = clean.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { rows: [], error: "CSV must have a header row and at least one data row." };
    // auto-detect delimiter: tab or comma
    const delim = lines[0].includes("\t") ? "\t" : ",";
    const header = lines[0].split(delim).map(h => h.trim().toLowerCase());
    const required = ["name", "sku", "unitprice"];
    const missing = required.filter(r => !header.includes(r));
    if (missing.length) return { rows: [], error: `Missing columns: ${missing.join(", ")}` };
    const rows: BulkRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delim).map(c => c.trim());
      const get = (col: string) => cols[header.indexOf(col)] ?? "";
      rows.push({
        name: get("name"),
        sku: get("sku"),
        unitPrice: get("unitprice"),
        minStockLevel: get("minstocklevel") || "5",
      });
    }
    return { rows, error: "" };
  }

  function handleCSVFile(file: File) {
    setBulkParseErr("");
    setBulkRows([]);
    setBulkResult(null);

    const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls") ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel";

    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json: Record<string, string | number>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          console.log("[XLSX] raw rows:", json.slice(0, 3));
          if (!json.length) { setBulkParseErr("Spreadsheet is empty."); return; }
          // normalise keys to lowercase
          const rows: BulkRow[] = json.map(r => {
            const norm: Record<string, string> = {};
            Object.keys(r).forEach(k => { norm[k.trim().toLowerCase()] = String(r[k]); });
            return {
              name: norm["name"] ?? "",
              sku: norm["sku"] ?? "",
              unitPrice: norm["unitprice"] ?? "",
              minStockLevel: norm["minstocklevel"] || "5",
            };
          }).filter(r => r.name);
          console.log("[XLSX] parsed rows:", rows);
          if (!rows.length) { setBulkParseErr("No valid rows found."); return; }
          setBulkRows(rows);
        } catch (err) {
          console.error("[XLSX] parse error:", err);
          setBulkParseErr("Failed to read Excel file.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target?.result as string;
        console.log("[CSV] raw text:", text.slice(0, 300));
        console.log("[CSV] detected delimiter:", text.split(/\r?\n/)[0].includes("\t") ? "tab" : "comma");
        console.log("[CSV] headers:", text.split(/\r?\n/)[0].replace(/^﻿/, ""));
        const { rows, error } = parseCSV(text);
        if (error) { console.error("[CSV] parse error:", error); setBulkParseErr(error); }
        else { console.log("[CSV] parsed rows:", rows); setBulkRows(rows); }
      };
      reader.readAsText(file);
    }
  }

  async function handleBulkUpload() {
    if (!bulkRows.length) return;
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const payload = bulkRows.map(r => ({
        name: r.name,
        sku: r.sku,
        unitPrice: parseFloat(r.unitPrice),
        minStockLevel: parseInt(r.minStockLevel, 10) || 5,
      }));
      const result = await api.bulkCreateParts({ parts: payload }, getToken()) as BulkResult;
      setBulkResult(result);
      if (result.created.length) setParts(prev => [...result.created, ...prev]);
    } catch (e: unknown) {
      console.error("[BulkUpload] upload error:", e);
      setBulkParseErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBulkUploading(false);
    }
  }

  function closeBulk() {
    setShowBulk(false);
    setBulkRows([]);
    setBulkParseErr("");
    setBulkResult(null);
    setDragOver(false);
  }
  // ────────────────────────────────────────────────────────────────────

  return (
    <div className="parts-wrap">
      <style>{PARTS_CSS}</style>
      {/* Header */}
      <div className="parts-hdr">
        <div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Parts & Inventory</h1>
          <p style={{ color: "#888", fontSize: 13 }}>
            {loading ? "Loading…" : `${parts.length} parts · ${lowCount} low stock · ${pending.length} pending review`}
          </p>
        </div>
        <div className="parts-btns">
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: "1px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={() => { setShowBulk(true); setBulkRows([]); setBulkParseErr(""); setBulkResult(null); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: "1px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Upload size={13} /> Bulk Upload
          </button>
          <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={14} /> Add Part
          </button>
        </div>
      </div>

      {/* Month-end banner — visible only in the last 5 days of the month */}
      {daysLeftInMonth <= 5 && (
        <div style={{ background: "#e8f5f0", border: "1px solid #b2dfd0", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0a4a35", marginBottom: 3 }}>
            Month-End Stock Check — {daysLeftInMonth === 0 ? "last day!" : `${daysLeftInMonth} day${daysLeftInMonth === 1 ? "" : "s"} left`}
          </div>
          <div style={{ fontSize: 13, color: "#3d5a4e" }}>
            Count physical stock in the storeroom and click <strong>Set Remaining</strong> on each part to record the actual remaining quantity.
          </div>
        </div>
      )}

      {/* Low-stock alert */}
      {!loading && lowCount > 0 && (
        <div style={{ background: "#FCEBEB", border: "1px solid #F7C1C1", borderRadius: 10, padding: "12px 24px", marginBottom: 20, fontSize: 13, color: "#791F1F", display: "flex", gap: 8 }}>
          ⚠ {lowCount} {lowCount === 1 ? "part is" : "parts are"} below minimum stock level.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #e8ebe6", paddingBottom: 0 }}>
        {(["all", "review"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 16px", fontSize: 13, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? "#0F6E56" : "#888", background: "none", border: "none",
            borderBottom: tab === t ? "2px solid #0F6E56" : "2px solid transparent",
            cursor: "pointer", marginBottom: -1,
          }}>
            {t === "all" ? `All Parts (${parts.length})` : `Pending Review (${pending.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="parts-search">
        <Search size={13} color="#aaa" />
        <input
          type="text"
          placeholder="Search parts…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: "none", outline: "none", fontSize: 13, background: "transparent", width: "100%", color: "#1a1a18" }}
        />
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#888", fontSize: 14, marginTop: 32 }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading…
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {error && !loading && (
        <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 10, padding: "14px 18px", color: "#791F1F", fontSize: 13 }}>{error}</div>
      )}

      {!loading && !error && (
        <div style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 12, overflow: "hidden", overflowX: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>
              {tab === "review" ? "No parts pending review." : "No parts found."}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="parts-table-wrap">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640, tableLayout: "fixed" }}>
                  <thead>
                    <tr style={{ background: "#F7F8F6" }}>
                      {["Part name", "SKU", "Unit price", "In stock", "Min. level", "Status", ""].map(h => (
                        <th key={h} style={{ padding: "12px 24px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, borderBottom: "1px solid #e8ebe6", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(p => {
                      const isLow = Number(p.stockQty) <= Number(p.minStockLevel);
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid #f0f0ec" }}>
                          <td style={{ padding: "12px 24px", fontWeight: 600, color: "#1a1a18", minWidth: 160 }}>
                            {p.name}
                            {p.needsReview && (
                              <span style={{ marginLeft: 8, fontSize: 10, background: "#FAEEDA", color: "#633806", padding: "2px 7px", borderRadius: 10, fontWeight: 600 }}>Review</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 24px", color: "#888", fontFamily: "monospace", fontSize: 12 }}>{p.sku ?? "—"}</td>
                          <td style={{ padding: "12px 24px", color: "#333" }}>AED {Number(p.unitPrice).toFixed(2)}</td>
                          <td style={{ padding: "12px 24px", fontWeight: 700, color: isLow ? "#A32D2D" : "#27500A" }}>{p.stockQty}</td>
                          <td style={{ padding: "12px 24px", color: "#aaa" }}>{p.minStockLevel}</td>
                          <td style={{ padding: "12px 24px" }}>
                            <Badge variant={isLow ? "low" : "ok"} label={isLow ? "Low stock" : "In stock"} />
                          </td>
                          <td style={{ padding: "12px 24px", display: "flex", gap: 6 }}>
                            {tab === "review" ? (
                              <button
                                onClick={() => { setApprovePart(p); setApproveForm({ sku: p.sku ?? "", unitPrice: String(p.unitPrice), minStockLevel: String(p.minStockLevel) }); setApproveErr(""); }}
                                style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #0F6E56", borderRadius: 6, background: "transparent", cursor: "pointer", color: "#0F6E56", fontWeight: 600 }}
                              >
                                Approve
                              </button>
                            ) : (
                              <button
                                onClick={() => { setRemainPart(p); setRemainQty(String(p.stockQty)); setRemainErr(""); setRemainWarn(false); }}
                                style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #e0e0dc", borderRadius: 6, background: "transparent", cursor: "pointer", color: "#555" }}
                              >
                                Set Remaining
                              </button>
                            )}
                            <button
                              onClick={() => { setEditPart(p); setEditForm({ name: p.name, sku: p.sku ?? "", unitPrice: String(p.unitPrice), minStockLevel: String(p.minStockLevel) }); setEditErr(""); }}
                              style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #d4e8e0", borderRadius: 6, background: "transparent", cursor: "pointer", color: "#0F6E56", display: "flex", alignItems: "center", gap: 4 }}
                            >
                              <Pencil size={11} /> Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="parts-card-list">
                {paginated.map(p => {
                  const isLow = Number(p.stockQty) <= Number(p.minStockLevel);
                  return (
                    <div key={p.id} style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a18" }}>
                            {p.name}
                            {p.needsReview && (
                              <span style={{ marginLeft: 8, fontSize: 10, background: "#FAEEDA", color: "#633806", padding: "2px 7px", borderRadius: 10, fontWeight: 600 }}>Review</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace", marginTop: 2 }}>{p.sku ?? "—"}</div>
                        </div>
                        <Badge variant={isLow ? "low" : "ok"} label={isLow ? "Low stock" : "In stock"} />
                      </div>
                      <div style={{ display: "flex", gap: 20, marginBottom: 12, fontSize: 13 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>Unit price</div>
                          <div style={{ fontWeight: 600, color: "#333" }}>AED {Number(p.unitPrice).toFixed(2)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>In stock</div>
                          <div style={{ fontWeight: 700, color: isLow ? "#A32D2D" : "#27500A" }}>{p.stockQty}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>Min. level</div>
                          <div style={{ color: "#888" }}>{p.minStockLevel}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {tab === "review" ? (
                          <button
                            onClick={() => { setApprovePart(p); setApproveForm({ sku: p.sku ?? "", unitPrice: String(p.unitPrice), minStockLevel: String(p.minStockLevel) }); setApproveErr(""); }}
                            style={{ flex: 1, fontSize: 12, padding: "8px", border: "1px solid #0F6E56", borderRadius: 8, background: "transparent", cursor: "pointer", color: "#0F6E56", fontWeight: 600 }}
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => { setRemainPart(p); setRemainQty(String(p.stockQty)); setRemainErr(""); setRemainWarn(false); }}
                            style={{ flex: 1, fontSize: 12, padding: "8px", border: "1px solid #e0e0dc", borderRadius: 8, background: "transparent", cursor: "pointer", color: "#555" }}
                          >
                            Set Remaining
                          </button>
                        )}
                        <button
                          onClick={() => { setEditPart(p); setEditForm({ name: p.name, sku: p.sku ?? "", unitPrice: String(p.unitPrice), minStockLevel: String(p.minStockLevel) }); setEditErr(""); }}
                          style={{ flex: 1, fontSize: 12, padding: "8px", border: "1px solid #d4e8e0", borderRadius: 8, background: "transparent", cursor: "pointer", color: "#0F6E56", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid #f0f0ec", background: "#fafaf8" }}>
              <span style={{ fontSize: 12, color: "#888" }}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e8ebe6", background: "#fff", fontSize: 12, fontWeight: 600, color: page === 1 ? "#ccc" : "#333", cursor: page === 1 ? "default" : "pointer" }}
                >← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<(number | "…")[]>((acc, n, i, arr) => {
                    if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("…");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) => n === "…"
                    ? <span key={`e${i}`} style={{ padding: "5px 8px", fontSize: 12, color: "#aaa" }}>…</span>
                    : <button key={n} onClick={() => setPage(n as number)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #e8ebe6", background: page === n ? "var(--brand, #0a4a35)" : "#fff", color: page === n ? "#fff" : "#333", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{n}</button>
                  )
                }
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e8ebe6", background: "#fff", fontSize: 12, fontWeight: 600, color: page === totalPages ? "#ccc" : "#333", cursor: page === totalPages ? "default" : "pointer" }}
                >Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Set Remaining Modal ─────────────────────────────── */}
      {remainPart && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 400, padding: "32px 32px 28px", position: "relative" }}>
            <button onClick={() => setRemainPart(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Set Remaining</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 22 }}>{remainPart.name} — currently <strong>{remainPart.stockQty}</strong> in stock</p>
            <form onSubmit={handleSetRemaining}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 }}>
                  Physical count (actual qty in storeroom) <span style={{ color: "#e05252" }}>*</span>
                </label>
                <input required type="number" min={0} value={remainQty} onChange={e => setRemainQty(e.target.value)} style={inp} />
              </div>
              {remainWarn && (
                <div style={{ background: "#FFF8EC", border: "1px solid #f5d48a", borderRadius: 8, padding: "10px 14px", color: "#7a4a00", fontSize: 13, marginBottom: 14 }}>
                  ⚠ Stock below minimum — consider ordering more
                </div>
              )}
              {remainErr && (
                <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 14 }}>{remainErr}</div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setRemainPart(null)} style={{ padding: "12px", borderRadius: 50, border: "1.5px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={remaining} style={{ padding: "12px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0F6E56,#1a9e75)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: remaining ? "not-allowed" : "pointer", opacity: remaining ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {remaining ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Save Count"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Part Modal ──────────────────────────────────── */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440, padding: "32px 32px 28px", position: "relative" }}>
            <button onClick={() => { setShowAdd(false); setAddErr(""); }} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Add Part</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 22 }}>Initial stock is 0. Use a Purchase Challan to add stock.</p>
            <form onSubmit={handleAdd}>
              {[
                { key: "name",         label: "Part name",        ph: "e.g. Capacitor 45/5 MFD" },
                { key: "sku",          label: "SKU",              ph: "e.g. CAP-4505" },
                { key: "unitPrice",    label: "Unit price (AED)", ph: "e.g. 35.00" },
                { key: "minStockLevel", label: "Min. stock level", ph: "e.g. 5" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 }}>
                    {f.label} <span style={{ color: "#e05252" }}>*</span>
                  </label>
                  <input
                    required
                    type={["unitPrice", "minStockLevel"].includes(f.key) ? "number" : "text"}
                    min={0} step={f.key === "unitPrice" ? "0.01" : "1"}
                    placeholder={f.ph}
                    value={(addForm as Record<string, string>)[f.key]}
                    onChange={e => setAddForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={inp}
                  />
                </div>
              ))}
              {addErr && <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 14 }}>{addErr}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => { setShowAdd(false); setAddErr(""); }} style={{ padding: "12px", borderRadius: 50, border: "1.5px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={adding} style={{ padding: "12px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0F6E56,#1a9e75)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: adding ? "not-allowed" : "pointer", opacity: adding ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {adding ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Add Part"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Approve Modal ───────────────────────────────────── */}
      {approvePart && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440, padding: "32px 32px 28px", position: "relative" }}>
            <button onClick={() => setApprovePart(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Approve Part</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 22 }}>{approvePart.name} — added by a technician in the field</p>
            <form onSubmit={handleApprove}>
              {[
                { key: "sku",          label: "Official SKU",     ph: "e.g. COPPER-ELBOW-025" },
                { key: "unitPrice",    label: "Unit price (AED)", ph: "e.g. 12.50" },
                { key: "minStockLevel", label: "Min. stock level", ph: "e.g. 10" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 }}>
                    {f.label} <span style={{ color: "#e05252" }}>*</span>
                  </label>
                  <input
                    required
                    type={["unitPrice", "minStockLevel"].includes(f.key) ? "number" : "text"}
                    min={0} step={f.key === "unitPrice" ? "0.01" : "1"}
                    placeholder={f.ph}
                    value={(approveForm as Record<string, string>)[f.key]}
                    onChange={e => setApproveForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={inp}
                  />
                </div>
              ))}
              {approveErr && <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 14 }}>{approveErr}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setApprovePart(null)} style={{ padding: "12px", borderRadius: 50, border: "1.5px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={approving} style={{ padding: "12px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0F6E56,#1a9e75)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: approving ? "not-allowed" : "pointer", opacity: approving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {approving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Approve Part"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Part Modal ─────────────────────────────────────── */}
      {editPart && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440, padding: "32px 32px 28px", position: "relative" }}>
            <button onClick={() => setEditPart(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Edit Part</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 22 }}>{editPart.name}</p>
            <form onSubmit={handleEdit}>
              {[
                { key: "name",          label: "Part name",        ph: "e.g. Capacitor 45/5 MFD" },
                { key: "sku",           label: "SKU",              ph: "e.g. CAP-4505" },
                { key: "unitPrice",     label: "Unit price (AED)", ph: "e.g. 35.00" },
                { key: "minStockLevel", label: "Min. stock level", ph: "e.g. 5" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 }}>
                    {f.label} <span style={{ color: "#e05252" }}>*</span>
                  </label>
                  <input
                    required
                    type={["unitPrice", "minStockLevel"].includes(f.key) ? "number" : "text"}
                    min={0} step={f.key === "unitPrice" ? "0.01" : "1"}
                    placeholder={f.ph}
                    value={(editForm as Record<string, string>)[f.key]}
                    onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={inp}
                  />
                </div>
              ))}
              {editErr && <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 14 }}>{editErr}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setEditPart(null)} style={{ padding: "12px", borderRadius: 50, border: "1.5px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={editing} style={{ padding: "12px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0F6E56,#1a9e75)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: editing ? "not-allowed" : "pointer", opacity: editing ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {editing ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Upload Modal ───────────────────────────────────── */}
      {showBulk && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 620, padding: "32px 32px 28px", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={closeBulk} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Bulk Upload Parts</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 22 }}>Upload a CSV file to add multiple parts at once.</p>

            {/* Result screen */}
            {bulkResult ? (
              <div>
                {bulkResult.created.length > 0 && (
                  <div style={{ background: "#e8f5f0", border: "1px solid #b2dfd0", borderRadius: 10, padding: "14px 16px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <CheckCircle size={18} color="#0F6E56" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0a4a35" }}>{bulkResult.created.length} part{bulkResult.created.length !== 1 ? "s" : ""} created successfully</div>
                      <div style={{ fontSize: 12, color: "#3d5a4e", marginTop: 4 }}>{bulkResult.created.map(p => p.name).join(", ")}</div>
                    </div>
                  </div>
                )}
                {bulkResult.errors.length > 0 && (
                  <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                      <AlertCircle size={18} color="#A32D2D" style={{ flexShrink: 0 }} />
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#791F1F" }}>{bulkResult.errors.length} row{bulkResult.errors.length !== 1 ? "s" : ""} failed</div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          {["Row", "Name", "Error"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "4px 8px", color: "#791F1F", fontWeight: 600, borderBottom: "1px solid #f5c6c6" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResult.errors.map(err => (
                          <tr key={err.row}>
                            <td style={{ padding: "4px 8px", color: "#555" }}>{err.row}</td>
                            <td style={{ padding: "4px 8px", color: "#555" }}>{err.name}</td>
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
                <div style={{ background: "#F7F8F6", border: "1px solid #e8ebe6", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 2 }}>File format (.xlsx / .csv)</div>
                    <div style={{ fontSize: 12, color: "#888", fontFamily: "monospace" }}>name, sku, unitPrice, minStockLevel</div>
                  </div>
                  <button onClick={downloadTemplate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1px solid #e8ebe6", borderRadius: 8, background: "#fff", color: "#0F6E56", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                    <Download size={12} /> Download template
                  </button>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleCSVFile(f); }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? "#0F6E56" : "#d4e8e0"}`,
                    borderRadius: 12, padding: "32px 24px", textAlign: "center",
                    background: dragOver ? "#e8f5f0" : "#fafafa",
                    cursor: "pointer", marginBottom: 16, transition: "all 0.15s",
                  }}
                >
                  <Upload size={24} color={dragOver ? "#0F6E56" : "#aaa"} style={{ margin: "0 auto 10px" }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: dragOver ? "#0F6E56" : "#555", marginBottom: 4 }}>
                    {bulkRows.length > 0 ? `${bulkRows.length} rows parsed — click to replace` : "Drop file here or click to browse"}
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>Supported: .xlsx, .xls, .csv</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f); e.target.value = ""; }}
                  />
                </div>

                {bulkParseErr && (
                  <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 14 }}>
                    {bulkParseErr}
                  </div>
                )}

                {/* Preview table */}
                {bulkRows.length > 0 && (
                  <div style={{ border: "1px solid #e8ebe6", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
                    <div style={{ background: "#F7F8F6", padding: "8px 14px", fontSize: 11, fontWeight: 600, color: "#888", borderBottom: "1px solid #e8ebe6" }}>
                      PREVIEW — {bulkRows.length} rows
                    </div>
                    <div style={{ maxHeight: 220, overflowY: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: "#fafafa" }}>
                            {["Name", "SKU", "Unit price (AED)", "Min. level"].map(h => (
                              <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontWeight: 500, color: "#888", borderBottom: "1px solid #f0f0ec" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bulkRows.map((r, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f0f0ec" }}>
                              <td style={{ padding: "7px 12px", fontWeight: 600, color: "#1a1a18" }}>{r.name || <span style={{ color: "#e05252" }}>—</span>}</td>
                              <td style={{ padding: "7px 12px", color: "#888", fontFamily: "monospace" }}>{r.sku || <span style={{ color: "#e05252" }}>—</span>}</td>
                              <td style={{ padding: "7px 12px", color: "#333" }}>{r.unitPrice}</td>
                              <td style={{ padding: "7px 12px", color: "#aaa" }}>{r.minStockLevel}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                  <button type="button" onClick={closeBulk} style={{ padding: "12px", borderRadius: 50, border: "1.5px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkUpload}
                    disabled={!bulkRows.length || bulkUploading}
                    style={{ padding: "12px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0F6E56,#1a9e75)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: (!bulkRows.length || bulkUploading) ? "not-allowed" : "pointer", opacity: (!bulkRows.length || bulkUploading) ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    {bulkUploading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Uploading…</> : `Upload ${bulkRows.length || ""} Parts`}
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
