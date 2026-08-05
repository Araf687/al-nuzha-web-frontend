"use client";
import { useEffect, useState } from "react";
import { Search, Loader2, RefreshCw, KeyRound, X } from "lucide-react";
import { api } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: string;
  serviceRequests?: Array<{ id: string }>;
  invoices?: Array<{ totalAmount: number; status: string }>;
}

const AVATAR_COLORS = ["#E1F5EE","#E6F1FB","#FAEEDA","#FBEAF0","#EAF3DE","#FAECE7"];
const AVATAR_TEXT   = ["#0F6E56","#0C447C","#633806","#72243E","#27500A","#712B13"];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alnuzha_token") ?? "";
}

const CSS = `
  .cust-wrap   { padding: 32px; }
  .cust-search { display: flex; align-items: center; gap: 8px; border: 1px solid #e0e0dc; border-radius: 8px; padding: 8px 12px; background: #fff; margin-bottom: 18px; max-width: 320px; }
  @media (max-width: 768px) {
    .cust-wrap   { padding: 16px; }
    .cust-search { max-width: 100%; }
  }
`;

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");

  // Reset password
  const [resetTarget, setResetTarget]   = useState<Customer | null>(null);
  const [resetPw, setResetPw]           = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting]       = useState(false);
  const [resetError, setResetError]     = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api.getCustomers(getToken())
      .then(d => setCustomers(d as Customer[]))
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load customers"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openReset(c: Customer) {
    setResetTarget(c);
    setResetPw(""); setResetConfirm("");
    setResetError(""); setResetSuccess("");
  }

  async function handleReset(e: { preventDefault(): void }) {
    e.preventDefault();
    if (resetPw.length < 6)        { setResetError("Password must be at least 6 characters."); return; }
    if (resetPw !== resetConfirm)  { setResetError("Passwords do not match."); return; }
    if (!resetTarget) return;
    setResetting(true); setResetError(""); setResetSuccess("");
    try {
      await api.resetCustomerPassword(resetTarget.id, { newPassword: resetPw }, getToken());
      setResetSuccess(`Password for ${resetTarget.name} has been reset.`);
      setResetPw(""); setResetConfirm("");
    } catch (e: unknown) {
      setResetError(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="cust-wrap">
      <style>{CSS}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Customers</h1>
          <p style={{ color: "#888", fontSize: 13 }}>
            {loading ? "Loading…" : `${filtered.length} registered customers`}
          </p>
        </div>
        <button
          onClick={load}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "transparent", color: "#555", border: "1px solid #e8ebe6", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="cust-search">
        <Search size={13} color="#aaa" />
        <input
          type="text"
          placeholder="Search by name, phone or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: "none", outline: "none", fontSize: 13, background: "transparent", width: "100%", color: "#1a1a18" }}
        />
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#888", fontSize: 14, marginTop: 32 }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading customers…
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {error && !loading && (
        <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 10, padding: "14px 18px", color: "#791F1F", fontSize: 13 }}>{error}</div>
      )}

      {!loading && !error && (
        <div style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>No customers found.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F7F8F6" }}>
                    {["Customer", "Phone", "Email", "Area", "Jobs", "Total spent", "Joined", ""].map((h, idx) => (
                      <th key={idx} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, borderBottom: "1px solid #e8ebe6", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const jobCount   = c.serviceRequests?.length ?? 0;
                    const totalSpent = c.invoices?.reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0) ?? 0;
                    const area       = c.address ? c.address.split(",").pop()?.trim() : null;
                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid #f0f0ec" }}>
                        <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                              background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontWeight: 700, fontSize: 12, color: AVATAR_TEXT[i % AVATAR_TEXT.length],
                            }}>
                              {initials(c.name)}
                            </div>
                            <span style={{ fontWeight: 600, color: "#1a1a18" }}>{c.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "11px 16px", color: "#555", whiteSpace: "nowrap" }}>{c.phone}</td>
                        <td style={{ padding: "11px 16px", color: "#888", fontSize: 12, whiteSpace: "nowrap" }}>{c.email ?? "—"}</td>
                        <td style={{ padding: "11px 16px", color: "#888", whiteSpace: "nowrap" }}>{area ?? "—"}</td>
                        <td style={{ padding: "11px 16px", fontWeight: 700, color: "#0F6E56", textAlign: "center" }}>{jobCount}</td>
                        <td style={{ padding: "11px 16px", fontWeight: 600, color: "#1a1a18", whiteSpace: "nowrap" }}>
                          {totalSpent > 0 ? `AED ${totalSpent.toLocaleString()}` : "—"}
                        </td>
                        <td style={{ padding: "11px 16px", color: "#aaa", fontSize: 12, whiteSpace: "nowrap" }}>
                          {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                        </td>
                        <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>
                          <button
                            onClick={() => openReset(c)}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 50, border: "1px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                          >
                            <KeyRound size={12} /> Reset PW
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
      )}

      {/* ── Reset Password Modal ─────────────────────────────── */}
      {resetTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 400, padding: "32px 32px 28px", position: "relative" }}>
            <button onClick={() => setResetTarget(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <KeyRound size={18} color="#0F6E56" />
              </div>
              <div>
                <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontWeight: 700, margin: 0 }}>Reset Password</h2>
                <p style={{ fontSize: 12, color: "#888", margin: 0 }}>{resetTarget.name} · {resetTarget.phone}</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "#7a9b8e", margin: "14px 0 22px", lineHeight: 1.6 }}>
              Set a new password for this account. The customer will use it on their next login.
            </p>

            <form onSubmit={handleReset}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 6 }}>
                  New Password <span style={{ color: "#e05252" }}>*</span>
                </label>
                <input
                  required
                  type="password"
                  placeholder="Min 6 characters"
                  value={resetPw}
                  onChange={e => { setResetPw(e.target.value); setResetError(""); setResetSuccess(""); }}
                  style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #d4e8e0", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 6 }}>
                  Confirm Password <span style={{ color: "#e05252" }}>*</span>
                </label>
                <input
                  required
                  type="password"
                  placeholder="Re-enter password"
                  value={resetConfirm}
                  onChange={e => { setResetConfirm(e.target.value); setResetError(""); setResetSuccess(""); }}
                  style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${resetError && resetConfirm ? "#f5c6c6" : "#d4e8e0"}`, borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif", boxSizing: "border-box" }}
                />
              </div>

              {resetError && (
                <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 14 }}>{resetError}</div>
              )}
              {resetSuccess && (
                <div style={{ background: "#E1F5EE", borderRadius: 8, padding: "10px 14px", color: "#0F6E56", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>✓ {resetSuccess}</div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <button type="button" onClick={() => setResetTarget(null)} style={{ padding: "12px", borderRadius: 50, border: "1.5px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={resetting} style={{ padding: "12px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0F6E56,#1a9e75)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: resetting ? "not-allowed" : "pointer", opacity: resetting ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(15,110,86,0.3)" }}>
                  {resetting ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Resetting…</> : <><KeyRound size={14} /> Reset Password</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
