"use client";
import { useEffect, useState } from "react";
import Badge from "../components/Badge";
import { api } from "../../lib/api";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle,
  ClipboardList,
  DollarSign,
  Loader2,
  Package,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

/* ── API shape: GET /dashboard?startDate&endDate ─────────────────── */
interface DashboardData {
  range: { startDate: string; endDate: string };
  stats: {
    jobs: {
      total: number; completed: number; pending: number;
      assigned: number; inProgress: number; cancelled: number; recurring: number;
    };
    revenue: {
      billed: number; collected: number; outstanding: number;
      advanceCollected: number; invoiceCount: number;
    };
    purchases: { spend: number; challanCount: number; partsAddedQty: number };
    inventory: { lowStockCount: number; pendingReviewCount: number };
  };
  revenueByMonth: { month: string; totalRevenue: number; collectedRevenue: number; invoiceCount: number }[];
  partsAddedByMonth: { month: string; qty: number; spend: number; challans: number }[];
  challans: {
    id: string; challanNumber: string; purchaseDate: string;
    supplierName: string | null; itemCount: number; quantity: number; total: number;
  }[];
  topTechnicians: {
    technicianId: string; name: string; jobsCompleted: number;
    totalRevenue: number; avgDurationHours: number;
  }[];
  recentJobs: {
    id: string; jobRef: string; serviceType: string; address: string;
    status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
    isRecurring: boolean; createdAt: string;
    customer: { id: string; name: string; phone: string } | null;
    technician: { id: string; name: string } | null;
    invoice: {
      id: string; invoiceRef: string; total: number;
      paymentStatus: "unpaid" | "paid" | "partial";
      paymentMethod: string | null; advanceAmount: number; issuedAt: string;
    } | null;
  }[];
}

interface StatCard {
  label: string;
  val: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  iconColor: string;
}

type BadgeVariant = "pending" | "inprogress" | "completed" | "recurring";

/* ── Helpers ─────────────────────────────────────────────────────── */
function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alnuzha_token") ?? "";
}

function normaliseStatus(raw: string): BadgeVariant | null {
  const s = (raw ?? "").toLowerCase();
  if (s === "completed") return "completed";
  if (s === "in_progress" || s === "inprogress" || s === "in-progress" || s === "assigned") return "inprogress";
  if (s === "recurring") return "recurring";
  if (s === "pending") return "pending";
  return null;
}

function fmtMonth(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function aed(n: number, decimals = 0) {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * The API must return the full aggregate shape. An older build of /dashboard
 * returns a `stats` object with completely different keys, so a truthy `stats`
 * is not enough to render against — check the nested groups explicitly.
 */
function isCompleteDashboard(d: DashboardData | null): d is DashboardData {
  const s = d?.stats;
  return !!(
    s?.jobs && s.revenue && s.purchases && s.inventory &&
    Array.isArray(d?.revenueByMonth) &&
    Array.isArray(d?.partsAddedByMonth) &&
    Array.isArray(d?.challans) &&
    Array.isArray(d?.topTechnicians) &&
    Array.isArray(d?.recentJobs)
  );
}

const DASH_CSS = `
  .dash-wrap   { padding: 32px 32px 48px; }
  /* auto-fit (not auto-fill) collapses empty tracks so the cards stretch across the full row */
  .dash-grid   { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 28px; }
  .dash-2col   { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; margin-bottom: 24px; }
  .dash-card   { background: #fff; border: 1px solid #e8ebe6; border-radius: 14px; overflow: hidden; }
  .dash-head   { padding: 16px 20px; border-bottom: 1px solid #e8ebe6; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .dash-filter { display: flex; gap: 10px; flex-wrap: wrap; align-items: end; margin-bottom: 22px; }
  .dash-filter-field { display: flex; flex-direction: column; gap: 6px; min-width: 150px; }
  .dash-filter-field label { font-size: 11px; color: #888; font-weight: 600; }
  .dash-filter-field input {
    padding: 10px 12px; border-radius: 10px; border: 1px solid #d9dfd8; background: #fff;
    font-size: 13px; color: #1a1a18; font-family: inherit;
  }
  .dash-filter-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .dash-note {
    display: inline-flex; align-items: center; gap: 9px;
    margin-left: auto;   /* pushes the pill to the right edge of the filter row */
    background: #E1F5EE; border: 1px solid #b2dfd0; border-radius: 10px;
    padding: 10px 16px; color: #0F6E56; font-size: 15px; line-height: 1.2;
  }
  .dash-note-label { font-weight: 600; opacity: 0.7; }
  .dash-note-range { font-weight: 800; letter-spacing: 0.01em; }
  @media (max-width: 980px) {
    .dash-wrap { padding: 20px 16px 36px; }
    .dash-2col { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .dash-wrap { padding: 14px 12px 28px; }
    .dash-grid { grid-template-columns: 1fr 1fr !important; gap: 10px; }
    .dash-filter-field { min-width: calc(50% - 5px); flex: 1 1 calc(50% - 5px); }
    .dash-filter-actions { width: 100%; }
    .dash-filter-actions button { flex: 1; justify-content: center; }
    .dash-note { width: 100%; justify-content: center; font-size: 14px; padding: 10px 12px; margin-left: 0; }
  }
`;

/* ══════════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [data, setData] = useState<DashboardData | null>(null);
  const [startDate, setStartDate] = useState(() => toDateInputValue(currentMonthStart));
  const [endDate, setEndDate] = useState(() => toDateInputValue(today));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const qs = new URLSearchParams();
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    const query = qs.toString();

    api.getDashboard(getToken(), query ? `?${query}` : "")
      .then((res) => { if (!cancelled) { setData(res as DashboardData); setError(""); } })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Guards against a slow earlier range resolving after a newer one
    return () => { cancelled = true; };
  }, [startDate, endDate, reloadKey]);

  // Loading is flipped in the event handlers, never synchronously inside the effect
  const reload = () => { setLoading(true); setReloadKey((k) => k + 1); };
  const applyRange = (next: { start?: string; end?: string }) => {
    setLoading(true);
    if (next.start !== undefined) setStartDate(next.start);
    if (next.end !== undefined) setEndDate(next.end);
  };

  const filteredRangeLabel = startDate || endDate
    ? `${startDate || "Beginning"} to ${endDate || "Today"}`
    : "All dates";

  const stats = isCompleteDashboard(data) ? data.stats : null;

  const statCards: StatCard[] = stats ? [
    {
      label: "Jobs completed",
      val: stats.jobs.completed.toLocaleString(),
      sub: `${stats.jobs.total.toLocaleString()} total jobs in range`,
      icon: ClipboardList, color: "#E1F5EE", iconColor: "#0F6E56",
    },
    {
      label: "Recurring jobs",
      val: stats.jobs.recurring.toLocaleString(),
      sub: `${stats.jobs.pending.toLocaleString()} pending now`,
      icon: TrendingUp, color: "#E6F1FB", iconColor: "#185FA5",
    },
    {
      label: "Revenue (AED)",
      val: aed(stats.revenue.billed),
      sub: `AED ${aed(stats.revenue.collected)} collected`,
      icon: DollarSign, color: "#EAF3DE", iconColor: "#3B6D11",
    },
    {
      label: "Purchase spend (AED)",
      val: aed(stats.purchases.spend),
      sub: `${stats.purchases.challanCount.toLocaleString()} challans in range`,
      icon: Package, color: "#FAEEDA", iconColor: "#854F0B",
    },
    {
      label: "Parts added",
      val: stats.purchases.partsAddedQty.toLocaleString(),
      sub: "Total quantity purchased in selected dates",
      icon: Package, color: "#FBEAF0", iconColor: "#72243E",
    },
  ] : [];

  return (
    <div className="dash-wrap">
      <style>{DASH_CSS}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: "#888", fontSize: 14 }}>Reports overview on one page with date-wise filtering.</p>
        </div>
        <button
          onClick={reload}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 50, border: "1px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="dash-filter">
        <div className="dash-filter-field">
          <label htmlFor="dash-start-date">From date</label>
          <input id="dash-start-date" type="date" value={startDate} onChange={(e) => applyRange({ start: e.target.value })} />
        </div>
        <div className="dash-filter-field">
          <label htmlFor="dash-end-date">To date</label>
          <input id="dash-end-date" type="date" value={endDate} onChange={(e) => applyRange({ end: e.target.value })} />
        </div>
        <div className="dash-filter-actions">
          <button
            onClick={() => applyRange({
              start: toDateInputValue(currentMonthStart),
              end: toDateInputValue(today),
            })}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 10, border: "1px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Reset to current month
          </button>
        </div>
        <div className="dash-note">
          <CalendarRange size={16} strokeWidth={2.2} />
          <span className="dash-note-label">Showing:</span>
          <span className="dash-note-range">{filteredRangeLabel}</span>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fff3f3", border: "1px solid #f5c0c0", borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "#c0392b", display: "flex", gap: 8, alignItems: "center" }}>
          <AlertTriangle size={14} strokeWidth={2} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 32, display: "flex", alignItems: "center", gap: 10, color: "#888", fontSize: 14 }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
          Loading dashboard…
        </div>
      ) : !isCompleteDashboard(data) || !stats ? (
        !error && (
          <div style={{ background: "#FAEEDA", border: "1px solid #e8c98a", borderRadius: 12, padding: "18px 20px", fontSize: 13, color: "#633806", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>The dashboard API returned an unexpected shape.</div>
              <div style={{ lineHeight: 1.6 }}>
                <code>GET /dashboard</code> did not include the expected <code>stats.jobs</code> / <code>stats.revenue</code> groups.
                This usually means the API server is still running an older compiled build — rebuild and restart it
                (<code>npm run build &amp;&amp; node dist/main</code>), then hit Refresh.
              </div>
            </div>
          </div>
        )
      ) : (
        <>
          <div className="dash-grid">
            {statCards.map((card) => (
              <div key={card.label} style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 12, padding: "18px 20px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, background: card.color, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <card.icon size={18} color={card.iconColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{card.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{card.val}</div>
                </div>
                {card.sub && <div style={{ fontSize: 11, color: "#0F6E56", flexBasis: "100%", marginLeft: 52 }}>{card.sub}</div>}
              </div>
            ))}
          </div>

          <div className="dash-2col">
            <div className="dash-card">
              <div className="dash-head">
                <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, fontWeight: 700, margin: 0 }}>Revenue Summary</h2>
                <span style={{ fontSize: 11, color: "#888" }}>{stats.revenue.invoiceCount} invoices</span>
              </div>
              <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, borderBottom: "1px solid #f0f0ec" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>Billed</div>
                  <div style={{ fontWeight: 700 }}>AED {aed(stats.revenue.billed)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>Collected</div>
                  <div style={{ fontWeight: 700, color: "#0F6E56" }}>AED {aed(stats.revenue.collected)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>Outstanding</div>
                  <div style={{ fontWeight: 700, color: stats.revenue.outstanding > 0 ? "#854F0B" : "#1a1a18" }}>
                    AED {aed(stats.revenue.outstanding)}
                  </div>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                {data.revenueByMonth.length === 0 ? (
                  <div style={{ padding: "28px 20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>No invoice data in this date range.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#F7F8F6" }}>
                        {["Month", "Total (AED)", "Collected", "Invoices"].map((header) => (
                          <th key={header} style={{ padding: "9px 14px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, borderBottom: "1px solid #e8ebe6" }}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.revenueByMonth.map((row) => {
                        const pct = row.totalRevenue > 0 ? Math.round((row.collectedRevenue / row.totalRevenue) * 100) : 0;
                        return (
                          <tr key={row.month} style={{ borderBottom: "1px solid #f0f0ec" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 600 }}>{fmtMonth(row.month)}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700 }}>{aed(row.totalRevenue)}</td>
                            <td style={{ padding: "10px 14px", color: "#0F6E56", fontWeight: 600 }}>
                              {aed(row.collectedRevenue)}
                              <span style={{ color: "#aaa", fontSize: 11, marginLeft: 4 }}>({pct}%)</span>
                            </td>
                            <td style={{ padding: "10px 14px", color: "#555" }}>{row.invoiceCount}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="dash-card">
              <div className="dash-head">
                <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, fontWeight: 700, margin: 0 }}>Job Snapshot</h2>
                <span style={{ fontSize: 11, color: "#888" }}>Date filtered</span>
              </div>
              <div style={{ padding: 20, display: "grid", gap: 12 }}>
                {[
                  { label: "Completed", value: stats.jobs.completed, color: "#0F6E56", icon: CheckCircle },
                  { label: "In progress", value: stats.jobs.inProgress, color: "#185FA5", icon: TrendingUp },
                  { label: "Pending", value: stats.jobs.pending, color: "#854F0B", icon: Users },
                  { label: "Cancelled", value: stats.jobs.cancelled, color: "#791F1F", icon: AlertTriangle },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#F7F8F6", borderRadius: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <item.icon size={15} color={item.color} />
                      <span style={{ fontSize: 13, color: "#555" }}>{item.label}</span>
                    </div>
                    <strong style={{ fontSize: 16, color: item.color }}>{item.value}</strong>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: "#888" }}>
                  Based on service request created dates. Staff performance below remains all-time because that endpoint does not expose per-date rows.
                </div>
              </div>
            </div>
          </div>

          <div className="dash-2col">
            <div className="dash-card">
              <div className="dash-head">
                <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, fontWeight: 700, margin: 0 }}>Purchase History</h2>
                <span style={{ fontSize: 11, color: "#888" }}>{stats.purchases.partsAddedQty} parts added</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                {data.challans.length === 0 ? (
                  <div style={{ padding: "28px 20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>No challans in this date range.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#F7F8F6" }}>
                        {["Challan #", "Date", "Supplier", "Items", "Qty added", "Total (AED)"].map((header) => (
                          <th key={header} style={{ padding: "9px 14px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, borderBottom: "1px solid #e8ebe6" }}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.challans.map((challan) => (
                        <tr key={challan.id} style={{ borderBottom: "1px solid #f0f0ec" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0F6E56" }}>{challan.challanNumber}</td>
                          <td style={{ padding: "10px 14px", color: "#555" }}>{fmtDate(challan.purchaseDate)}</td>
                          <td style={{ padding: "10px 14px", color: "#888" }}>{challan.supplierName || "—"}</td>
                          <td style={{ padding: "10px 14px", color: "#555" }}>{challan.itemCount}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#854F0B" }}>{challan.quantity}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 700 }}>{aed(challan.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="dash-card">
              <div className="dash-head">
                <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, fontWeight: 700, margin: 0 }}>Parts Added By Month</h2>
                <span style={{ fontSize: 11, color: "#888" }}>Last 6 months</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                {data.partsAddedByMonth.length === 0 ? (
                  <div style={{ padding: "28px 20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>No purchase history yet.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#F7F8F6" }}>
                        {["Month", "Qty added", "Spend (AED)", "Challans"].map((header) => (
                          <th key={header} style={{ padding: "9px 14px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, borderBottom: "1px solid #e8ebe6" }}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.partsAddedByMonth.map((row) => (
                        <tr key={row.month} style={{ borderBottom: "1px solid #f0f0ec" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 600 }}>{fmtMonth(row.month)}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0F6E56" }}>{row.qty.toLocaleString()}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600 }}>{aed(row.spend)}</td>
                          <td style={{ padding: "10px 14px", color: "#555" }}>{row.challans}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-head">
              <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, fontWeight: 700, margin: 0 }}>Recent Jobs</h2>
              <span style={{ fontSize: 11, color: "#888" }}>{data.recentJobs.length} shown</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              {data.recentJobs.length === 0 ? (
                <div style={{ padding: "28px 20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>No jobs found in this date range.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F7F8F6" }}>
                      {["Job ID", "Created", "Customer", "Service", "Area", "Technician", "Status"].map((header) => (
                        <th key={header} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 12, borderBottom: "1px solid #e8ebe6" }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentJobs.map((job) => (
                      <tr key={job.id} style={{ borderBottom: "1px solid #f0f0ec" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0F6E56" }}>{job.jobRef || job.id.slice(0, 8)}</td>
                        <td style={{ padding: "12px 16px", color: "#555" }}>{fmtDate(job.createdAt)}</td>
                        <td style={{ padding: "12px 16px", color: "#333" }}>{job.customer?.name || "—"}</td>
                        <td style={{ padding: "12px 16px", color: "#555" }}>{job.serviceType}</td>
                        <td style={{ padding: "12px 16px", color: "#888" }}>{job.address}</td>
                        <td style={{ padding: "12px 16px", color: "#555" }}>{job.technician?.name || "—"}</td>
                        <td style={{ padding: "12px 16px" }}>
                          {normaliseStatus(job.isRecurring ? "recurring" : job.status) ? (
                            <Badge variant={normaliseStatus(job.isRecurring ? "recurring" : job.status)!} />
                          ) : (
                            <span style={{ color: "#888" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
