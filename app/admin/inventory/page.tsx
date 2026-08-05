"use client";
import { useEffect, useState } from "react";
import { Search, Plus, Loader2, RefreshCw, X } from "lucide-react";
import Badge from "../../components/Badge";
import { api } from "@/lib/api";

interface Part {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  stockQty: number;
  minStockLevel: number;
  needsReview?: boolean;
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alnuzha_token") ?? "";
}

export default function AdminInventoryPage() {
  const [parts, setParts]       = useState<Part[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");

  // Add part modal
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ name: "", sku: "", unitPrice: "", stockQty: "", minStockLevel: "5" });
  const [adding, setAdding]     = useState(false);
  const [addError, setAddError] = useState("");

  // Restock modal
  const [restockPart, setRestockPart]   = useState<Part | null>(null);
  const [restockQty, setRestockQty]     = useState("1");
  const [restocking, setRestocking]     = useState(false);
  const [restockError, setRestockError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    const token = getToken();
    api.getParts(token)
      .then(d => setParts(d as Part[]))
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load parts"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = parts.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const lowCount = parts.filter(p => Number(p.stockQty) <= Number(p.minStockLevel)).length;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError("");
    const token = getToken();
    try {
      const created = await api.createPart({
        name:          addForm.name,
        sku:           addForm.sku,
        unitPrice:     parseFloat(addForm.unitPrice),
        stockQty:      parseInt(addForm.stockQty, 10),
        minStockLevel: parseInt(addForm.minStockLevel, 10),
      }, token) as Part;
      setParts(prev => [created, ...prev]);
      setShowAdd(false);
      setAddForm({ name: "", sku: "", unitPrice: "", stockQty: "", minStockLevel: "5" });
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to create part");
    } finally {
      setAdding(false);
    }
  }

  async function handleRestock(e: React.FormEvent) {
    e.preventDefault();
    if (!restockPart) return;
    setRestocking(true);
    setRestockError("");
    const token = getToken();
    try {
      const updated = await api.restockPart(restockPart.id, { quantity: parseInt(restockQty, 10) }, token) as Part;
      setParts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setRestockPart(null);
      setRestockQty("1");
    } catch (e: unknown) {
      setRestockError(e instanceof Error ? e.message : "Failed to restock");
    } finally {
      setRestocking(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", border: "1.5px solid #d4e8e0",
    borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif",
  };

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Parts inventory</h1>
          <p style={{ color: "#888", fontSize: 13 }}>
            {loading ? "Loading…" : `${parts.length} parts · ${lowCount} low stock`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: "1px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={14} /> Add part
          </button>
        </div>
      </div>

      {!loading && lowCount > 0 && (
        <div style={{ background: "#FCEBEB", border: "1px solid #F7C1C1", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#791F1F", display: "flex", gap: 8 }}>
          ⚠ {lowCount} {lowCount === 1 ? "part is" : "parts are"} below minimum stock level. Reorder recommended.
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e0e0dc", borderRadius: 8, padding: "8px 12px", background: "#fff", marginBottom: 16, maxWidth: 300 }}>
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
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading inventory…
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {error && !loading && (
        <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 10, padding: "14px 18px", color: "#791F1F", fontSize: 13 }}>{error}</div>
      )}

      {!loading && !error && (
        <div style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 12, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>No parts found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F7F8F6" }}>
                  {["Part name", "SKU", "Unit price", "In stock", "Min. level", "Status", ""].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, borderBottom: "1px solid #e8ebe6" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const isLow = p.stockQty <= p.minStockLevel;
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f0f0ec" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1a1a18" }}>
                        {p.name}
                        {p.needsReview && (
                          <span style={{ marginLeft: 8, fontSize: 10, background: "#FAEEDA", color: "#633806", padding: "2px 7px", borderRadius: 10, fontWeight: 600 }}>Review</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#888", fontFamily: "monospace", fontSize: 12 }}>{p.sku ?? "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#333" }}>AED {Number(p.unitPrice).toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: isLow ? "#A32D2D" : "#27500A" }}>{p.stockQty}</td>
                      <td style={{ padding: "12px 16px", color: "#aaa" }}>{p.minStockLevel}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <Badge variant={isLow ? "low" : "ok"} label={isLow ? "Low stock" : "In stock"} />
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => { setRestockPart(p); setRestockQty("1"); setRestockError(""); }}
                          style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #e0e0dc", borderRadius: 6, background: "transparent", cursor: "pointer", color: "#555" }}
                        >
                          Restock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Add Part Modal ─────────────────────────────────────── */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440, padding: "32px 32px 28px", position: "relative" }}>
            <button onClick={() => { setShowAdd(false); setAddError(""); }} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 22 }}>Add Part</h2>
            <form onSubmit={handleAdd}>
              {[
                { key: "name",         label: "Part name",      ph: "e.g. Capacitor 45/5 MFD" },
                { key: "sku",          label: "SKU",            ph: "e.g. CAP-4505" },
                { key: "unitPrice",    label: "Unit price (AED)", ph: "e.g. 35.00" },
                { key: "stockQty",     label: "Initial stock qty", ph: "e.g. 20" },
                { key: "minStockLevel", label: "Min. stock level", ph: "e.g. 5" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 }}>
                    {f.label} <span style={{ color: "#e05252" }}>*</span>
                  </label>
                  <input
                    required
                    type={["unitPrice","stockQty","minStockLevel"].includes(f.key) ? "number" : "text"}
                    min={0}
                    step={f.key === "unitPrice" ? "0.01" : "1"}
                    placeholder={f.ph}
                    value={(addForm as Record<string, string>)[f.key]}
                    onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={inp}
                  />
                </div>
              ))}
              {addError && (
                <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 14 }}>{addError}</div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => { setShowAdd(false); setAddError(""); }} style={{ padding: "12px", borderRadius: 50, border: "1.5px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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

      {/* ── Restock Modal ──────────────────────────────────────── */}
      {restockPart && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 380, padding: "32px 32px 28px", position: "relative" }}>
            <button onClick={() => { setRestockPart(null); setRestockError(""); }} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Restock</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 22 }}>{restockPart.name} — currently {restockPart.stockQty} in stock</p>
            <form onSubmit={handleRestock}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 }}>
                  Quantity to add <span style={{ color: "#e05252" }}>*</span>
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  style={inp}
                />
              </div>
              {restockError && (
                <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 14 }}>{restockError}</div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <button type="button" onClick={() => { setRestockPart(null); setRestockError(""); }} style={{ padding: "12px", borderRadius: 50, border: "1.5px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={restocking} style={{ padding: "12px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0F6E56,#1a9e75)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: restocking ? "not-allowed" : "pointer", opacity: restocking ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {restocking ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Add Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
