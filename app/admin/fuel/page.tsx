"use client";
import { useEffect, useState } from "react";
import { Plus, Loader2, RefreshCw, X, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

interface Technician {
  id: string;
  name: string;
  phone: string;
}

interface FuelLog {
  id: string;
  litres: number;
  cost: number;
  filledAt: string; // YYYY-MM-DD
  createdAt: string;
  technician: Technician | null;
}

interface FuelSummary {
  refills: number;
  totalLitres: number;
  totalCost: number;
  avgCostPerLitre: number;
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alnuzha_token") ?? "";
}

const pad = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// First and last day of the current month
function monthRange() {
  const d = new Date();
  return {
    from: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`,
    to: toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
}

const money = (n: number) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const prettyDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const perLitre = (f: FuelLog) => (f.litres > 0 ? f.cost / f.litres : 0);

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", border: "1.5px solid #d4e8e0",
  borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif", background: "#fff",
};

const filterInp: React.CSSProperties = {
  padding: "8px 10px", border: "1px solid #e0e0dc", borderRadius: 8, fontSize: 13,
  outline: "none", background: "#fff", color: "#1a1a18", fontFamily: "Plus Jakarta Sans, sans-serif",
};

const FUEL_CSS = `
  @keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
  .fuel-wrap        { padding: 32px; }
  .fuel-hdr         { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .fuel-btns        { display: flex; gap: 8px; }
  .fuel-filters     { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; margin-bottom: 16px; }
  .fuel-stats       { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  .fuel-table-wrap  { display: block; overflow-x: auto; }
  .fuel-card-list   { display: none; flex-direction: column; gap: 10px; padding: 12px; }
  @media (max-width: 640px) {
    .fuel-wrap        { padding: 16px 14px 40px; }
    .fuel-hdr         { flex-wrap: wrap; gap: 12px; }
    .fuel-btns        { width: 100%; }
    .fuel-btns button { flex: 1; justify-content: center; }
    .fuel-filters > * { flex: 1 1 140px; }
    .fuel-stats       { grid-template-columns: repeat(2, 1fr); }
    .fuel-table-wrap  { display: none !important; }
    .fuel-card-list   { display: flex !important; }
  }
`;

const btnPrimary = (busy: boolean): React.CSSProperties => ({
  padding: "12px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0F6E56,#1a9e75)",
  color: "#fff", fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
});

const btnCancel: React.CSSProperties = {
  padding: "12px", borderRadius: 50, border: "1.5px solid #e8ebe6", background: "#fff",
  color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
};

const modalBox = (maxWidth: number): React.CSSProperties => ({
  background: "#fff", borderRadius: 20, width: "100%", maxWidth, padding: "32px 32px 28px",
  position: "relative", maxHeight: "90vh", overflowY: "auto",
});

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 };
const filterLabel: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 4 };

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#0F6E56" }}>{value}</div>
    </div>
  );
}

export default function AdminFuelPage() {
  const [logs, setLogs]         = useState<FuelLog[]>([]);
  const [summary, setSummary]   = useState<FuelSummary | null>(null);
  const [techs, setTechs]       = useState<Technician[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  // Filters — default to the current month
  const [from, setFrom]         = useState(() => monthRange().from);
  const [to, setTo]             = useState(() => monthRange().to);
  const [techId, setTechId]     = useState("");
  // Bumped to refetch with the same filters (refresh, after save / delete)
  const [reloadKey, setReloadKey] = useState(0);

  // Add / Edit modal (editing === null means "add")
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<FuelLog | null>(null);
  const [form, setForm]         = useState({ technicianId: "", litres: "", cost: "", filledAt: "" });
  const [saving, setSaving]     = useState(false);
  const [formErr, setFormErr]   = useState("");

  // Delete modal
  const [toDelete, setToDelete] = useState<FuelLog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  useEffect(() => {
    api.getTechnicians(getToken())
      .then(res => setTechs(res as Technician[]))
      .catch(() => {});
  }, []);

  // State is only set in the promise callbacks; `stale` drops responses for outdated filters
  useEffect(() => {
    let stale = false;
    const qs = new URLSearchParams();
    if (from)   qs.set("from", from);
    if (to)     qs.set("to", to);
    if (techId) qs.set("technicianId", techId);
    const params = qs.size ? `?${qs}` : "";

    Promise.all([api.getFuelLogs(getToken(), params), api.getFuelSummary(getToken(), params)])
      .then(([list, totals]) => {
        if (stale) return;
        setLogs(list as FuelLog[]);
        setSummary(totals as FuelSummary);
        setError("");
      })
      .catch(e => { if (!stale) setError(e instanceof Error ? e.message : "Failed to load fuel logs"); })
      .finally(() => { if (!stale) setLoading(false); });

    return () => { stale = true; };
  }, [from, to, techId, reloadKey]);

  const reload = () => setReloadKey(k => k + 1);

  const isThisMonth = from === monthRange().from && to === monthRange().to;
  const isAllTime   = !from && !to;

  function setRange(next: { from: string; to: string }) {
    setFrom(next.from);
    setTo(next.to);
  }

  function openAdd() {
    setEditing(null);
    setForm({ technicianId: techId, litres: "", cost: "", filledAt: toISODate(new Date()) });
    setFormErr("");
    setShowForm(true);
  }

  function openEdit(f: FuelLog) {
    setEditing(f);
    setForm({
      technicianId: f.technician?.id ?? "",
      litres: String(f.litres),
      cost: String(f.cost),
      filledAt: f.filledAt,
    });
    setFormErr("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
  }

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault();
    const litres = Number(form.litres);
    const cost   = Number(form.cost);
    if (!form.technicianId)                  { setFormErr("Select a technician."); return; }
    if (form.litres === "" || !(litres > 0)) { setFormErr("Litres must be more than 0."); return; }
    if (form.cost === "" || !(cost >= 0))    { setFormErr("Cost must be 0 or more."); return; }
    if (!form.filledAt)                      { setFormErr("Date is required."); return; }

    const body = { technicianId: form.technicianId, litres, cost, filledAt: form.filledAt };

    setSaving(true);
    setFormErr("");
    try {
      if (editing) await api.updateFuelLog(editing.id, body, getToken());
      else await api.createFuelLog(body, getToken());
      setShowForm(false);
      reload();
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : "Failed to save fuel log");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteErr("");
    try {
      await api.deleteFuelLog(toDelete.id, getToken());
      setToDelete(null);
      reload();
    } catch (err: unknown) {
      setDeleteErr(err instanceof Error ? err.message : "Failed to delete fuel log");
    } finally {
      setDeleting(false);
    }
  }

  const actionBtn = (color: string, border: string): React.CSSProperties => ({
    fontSize: 12, padding: "4px 10px", border: `1px solid ${border}`, borderRadius: 6, background: "transparent",
    cursor: "pointer", color, display: "flex", alignItems: "center", gap: 4,
  });

  const presetBtn = (active: boolean): React.CSSProperties => ({
    padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${active ? "#0F6E56" : "#e0e0dc"}`,
    background: active ? "#e8f5f0" : "#fff", color: active ? "#0F6E56" : "#555",
  });

  return (
    <div className="fuel-wrap">
      <style>{FUEL_CSS}</style>

      {/* Header */}
      <div className="fuel-hdr">
        <div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Fuel</h1>
          <p style={{ color: "#888", fontSize: 13 }}>
            {loading ? "Loading…" : `${logs.length} refill${logs.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="fuel-btns">
          <button onClick={() => { setLoading(true); reload(); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: "1px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={14} /> Add Fuel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="fuel-filters">
        <div>
          <label style={filterLabel}>From</label>
          <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} style={{ ...filterInp, width: "100%" }} />
        </div>
        <div>
          <label style={filterLabel}>To</label>
          <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} style={{ ...filterInp, width: "100%" }} />
        </div>
        <div>
          <label style={filterLabel}>Technician</label>
          <select value={techId} onChange={e => setTechId(e.target.value)} style={{ ...filterInp, width: "100%", minWidth: 170 }}>
            <option value="">All technicians</option>
            {techs.map(tc => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
          </select>
        </div>
        <button onClick={() => setRange(monthRange())} style={presetBtn(isThisMonth)}>This month</button>
        <button onClick={() => setRange({ from: "", to: "" })} style={presetBtn(isAllTime)}>All time</button>
      </div>

      {/* Totals for the filtered range */}
      {!loading && !error && summary && (
        <div className="fuel-stats">
          <StatTile label="Refills"       value={String(summary.refills)} />
          <StatTile label="Total litres"  value={`${money(summary.totalLitres)} L`} />
          <StatTile label="Total spent"   value={`AED ${money(summary.totalCost)}`} />
          <StatTile label="Avg per litre" value={`AED ${money(summary.avgCostPerLitre)}`} />
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#888", fontSize: 14, marginTop: 32 }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading…
        </div>
      )}

      {error && !loading && (
        <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 10, padding: "14px 18px", color: "#791F1F", fontSize: 13 }}>{error}</div>
      )}

      {!loading && !error && (
        <div style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 12, overflow: "hidden" }}>
          {logs.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>
              No refills found for these filters.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="fuel-table-wrap">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 620 }}>
                  <thead>
                    <tr style={{ background: "#F7F8F6" }}>
                      {["Date", "Technician", "Litres", "Cost", "Per litre", ""].map(h => (
                        <th key={h} style={{ padding: "12px 24px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, borderBottom: "1px solid #e8ebe6", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(f => (
                      <tr key={f.id} style={{ borderBottom: "1px solid #f0f0ec" }}>
                        <td style={{ padding: "10px 24px", color: "#333", whiteSpace: "nowrap" }}>{prettyDate(f.filledAt)}</td>
                        <td style={{ padding: "10px 24px" }}>
                          <div style={{ fontWeight: 600, color: "#1a1a18" }}>{f.technician?.name ?? "—"}</div>
                          {f.technician?.phone && <div style={{ fontSize: 11, color: "#aaa" }}>{f.technician.phone}</div>}
                        </td>
                        <td style={{ padding: "10px 24px", color: "#333", whiteSpace: "nowrap" }}>{money(f.litres)} L</td>
                        <td style={{ padding: "10px 24px", color: "#1a1a18", fontWeight: 600, whiteSpace: "nowrap" }}>AED {money(f.cost)}</td>
                        <td style={{ padding: "10px 24px", color: "#888", whiteSpace: "nowrap" }}>AED {money(perLitre(f))}</td>
                        <td style={{ padding: "10px 24px" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button onClick={() => openEdit(f)} style={actionBtn("#0F6E56", "#d4e8e0")}>
                              <Pencil size={11} /> Edit
                            </button>
                            <button onClick={() => { setToDelete(f); setDeleteErr(""); }} style={actionBtn("#A32D2D", "#f5c6c6")}>
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="fuel-card-list">
                {logs.map(f => (
                  <div key={f.id} style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a18", overflowWrap: "anywhere" }}>{f.technician?.name ?? "—"}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                          {prettyDate(f.filledAt)} · {money(f.litres)} L · AED {money(perLitre(f))}/L
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a18", whiteSpace: "nowrap" }}>AED {money(f.cost)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEdit(f)} style={{ ...actionBtn("#0F6E56", "#d4e8e0"), flex: 1, padding: 8, borderRadius: 8, justifyContent: "center", fontWeight: 600 }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => { setToDelete(f); setDeleteErr(""); }} style={{ ...actionBtn("#A32D2D", "#f5c6c6"), flex: 1, padding: 8, borderRadius: 8, justifyContent: "center", fontWeight: 600 }}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Add / Edit Modal ────────────────────────────────── */}
      {showForm && (
        <div style={overlay}>
          <div style={modalBox(460)}>
            <button onClick={closeForm} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {editing ? "Edit Refill" : "Add Fuel"}
            </h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 22 }}>
              {editing ? prettyDate(editing.filledAt) : "Record a fuel refill for a technician."}
            </p>

            <form onSubmit={handleSave} noValidate>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Technician <span style={{ color: "#e05252" }}>*</span></label>
                <select
                  value={form.technicianId}
                  onChange={e => setForm(p => ({ ...p, technicianId: e.target.value }))}
                  style={inp}
                >
                  <option value="">Select technician…</option>
                  {techs.map(tc => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div style={{ minWidth: 0 }}>
                  <label style={labelStyle}>Litres <span style={{ color: "#e05252" }}>*</span></label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="e.g. 40"
                    value={form.litres}
                    onChange={e => setForm(p => ({ ...p, litres: e.target.value }))}
                    style={inp}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <label style={labelStyle}>Cost (AED) <span style={{ color: "#e05252" }}>*</span></label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="e.g. 120.00"
                    value={form.cost}
                    onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
                    style={inp}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Date <span style={{ color: "#e05252" }}>*</span></label>
                <input
                  type="date"
                  value={form.filledAt}
                  onChange={e => setForm(p => ({ ...p, filledAt: e.target.value }))}
                  style={inp}
                />
              </div>

              {formErr && <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 14 }}>{formErr}</div>}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={closeForm} style={btnCancel}>Cancel</button>
                <button type="submit" disabled={saving} style={btnPrimary(saving)}>
                  {saving
                    ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
                    : editing ? "Save Changes" : "Add Fuel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Modal ────────────────────────────────────── */}
      {toDelete && (
        <div style={overlay}>
          <div style={modalBox(400)}>
            <button onClick={() => !deleting && setToDelete(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Delete Refill</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 18 }}>
              Delete the <strong style={{ color: "#333" }}>{money(toDelete.litres)} L</strong> refill of{" "}
              <strong style={{ color: "#333" }}>{prettyDate(toDelete.filledAt)}</strong>
              {toDelete.technician ? <> by <strong style={{ color: "#333" }}>{toDelete.technician.name}</strong></> : null}? This cannot be undone.
            </p>
            {deleteErr && <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 14 }}>{deleteErr}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <button type="button" onClick={() => setToDelete(null)} disabled={deleting} style={btnCancel}>Cancel</button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{ ...btnPrimary(deleting), background: "#C23B3B" }}
              >
                {deleting ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Deleting…</> : "Delete Refill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
