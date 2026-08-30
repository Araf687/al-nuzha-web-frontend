"use client";
import { useEffect, useState } from "react";
import { UserPlus, X, Loader2, RefreshCw, KeyRound } from "lucide-react";
import TechnicianMap from "@/components/TechnicianMap";
import { api } from "@/lib/api";

/* ── Types ─────────────────────────────────────────────────── */
interface Technician {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: "technician" | "senior_technician" | "admin";
  isActive: boolean;
}

interface PerfRow {
  technicianId: string;
  name: string;
  jobsCompleted: number;
  totalRevenue: number;
  avgDurationHours: number;
}

const ROLE_LABELS: Record<string, string> = {
  technician:        "Technician",
  senior_technician: "Senior Technician",
  admin:             "Admin",
};

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alnuzha_token") ?? "";
}

/* ── Page ───────────────────────────────────────────────────── */
export default function AdminStaffPage() {
  const [techs, setTechs]       = useState<Technician[]>([]);
  const [perf, setPerf]         = useState<PerfRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [trackingId, setTrackingId] = useState<string | null>(null);

  // Add form
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", role: "technician" });

  // Reset password
  const [resetTarget, setResetTarget]   = useState<Technician | null>(null);
  const [resetPw, setResetPw]           = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting]       = useState(false);
  const [resetError, setResetError]     = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const token = getToken();
    try {
      const [techList, perfList] = await Promise.all([
        api.getTechnicians(token) as Promise<Technician[]>,
        api.getStaffPerformance(token) as Promise<PerfRow[]>,
      ]);
      setTechs(techList);
      setPerf(perfList);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    const token = getToken();
    try {
      const created = await api.createTechnician(form, token) as Technician;
      setTechs(prev => [created, ...prev]);
      setShowModal(false);
      setForm({ name: "", phone: "", email: "", password: "", role: "technician" });
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to create technician");
    } finally {
      setSaving(false);
    }
  }

  function openReset(t: Technician) {
    setResetTarget(t);
    setResetPw(""); setResetConfirm("");
    setResetError(""); setResetSuccess("");
  }

  async function handleReset(e: { preventDefault(): void }) {
    e.preventDefault();
    if (resetPw.length < 6)          { setResetError("Password must be at least 6 characters."); return; }
    if (resetPw !== resetConfirm)     { setResetError("Passwords do not match."); return; }
    if (!resetTarget) return;
    setResetting(true); setResetError(""); setResetSuccess("");
    try {
      await api.resetTechnicianPassword(resetTarget.id, { newPassword: resetPw }, getToken());
      setResetSuccess(`Password for ${resetTarget.name} has been reset.`);
      setResetPw(""); setResetConfirm("");
    } catch (e: unknown) {
      setResetError(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  function perfFor(id: string): PerfRow | undefined {
    return perf.find(p => p.technicianId === id);
  }

  const tracked = techs.find(t => t.id === trackingId);

  const CSS = `
    .staff-wrap { padding: 32px 32px 60px; }
    .staff-hdr  { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .staff-btns { display: flex; gap: 10px; }
    .staff-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; margin-bottom: 32px; }
    @media (max-width: 640px) {
      .staff-wrap { padding: 16px 14px 40px; }
      .staff-hdr  { flex-wrap: wrap; gap: 12px; }
      .staff-btns { width: 100%; }
      .staff-btns button { flex: 1; justify-content: center; }
      .staff-grid { grid-template-columns: 1fr !important; gap: 12px; }
      .staff-stat-grid { grid-template-columns: 1fr 1fr 1fr !important; gap: 8px !important; }
      .staff-stat-val  { font-size: 12px !important; }
    }
  `;

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="staff-wrap">
      <style>{CSS}</style>

      {/* Header */}
      <div className="staff-hdr">
        <div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Staff</h1>
          <p style={{ color: "#888", fontSize: 13 }}>Technician list, performance & live location</p>
        </div>
        <div className="staff-btns">
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 50, border: "1px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0F6E56,#1a9e75)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(15,110,86,0.3)" }}>
            <UserPlus size={14} /> Add Technician
          </button>
        </div>
      </div>

      {/* States */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#888", fontSize: 14 }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
          Loading staff…
        </div>
      )}
      {error && !loading && (
        <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 10, padding: "14px 18px", color: "#791F1F", fontSize: 13 }}>{error}</div>
      )}

      {/* Technician cards */}
      {!loading && !error && (
        <>
          {techs.length === 0 ? (
            <div style={{ color: "#aaa", fontSize: 14, marginTop: 40, textAlign: "center" }}>No technicians found. Add one above.</div>
          ) : (
            <div className="staff-grid">
              {techs.map(t => {
                const p = perfFor(t.id);
                const active = trackingId === t.id;
                return (
                  <div key={t.id} style={{ background: "#fff", border: `1.5px solid ${active ? "#0F6E56" : "#e8ebe6"}`, borderRadius: 14, padding: "22px 24px", transition: "border-color .2s" }}>

                    {/* Top row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: t.isActive ? "#E1F5EE" : "#F0F0EC", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: t.isActive ? "#0F6E56" : "#aaa", flexShrink: 0 }}>
                        {initials(t.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>{ROLE_LABELS[t.role] ?? t.role}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>{t.phone}</div>
                      </div>
                      <span style={{ display: "inline-block", background: t.isActive ? "#E1F5EE" : "#F0F0EC", color: t.isActive ? "#0F6E56" : "#aaa", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, flexShrink: 0 }}>
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Stats from performance endpoint */}
                    <div className="staff-stat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                      {[
                        { label: "Jobs done",    val: p ? p.jobsCompleted.toString() : "—" },
                        { label: "Revenue",      val: p ? `AED ${p.totalRevenue.toLocaleString()}` : "—" },
                        { label: "Avg duration", val: p ? `${p.avgDurationHours.toFixed(1)}h` : "—" },
                      ].map(m => (
                        <div key={m.label} style={{ background: "#F7F8F6", borderRadius: 9, padding: "10px 12px", textAlign: "center" }}>
                          <div className="staff-stat-val" style={{ fontSize: 14, fontWeight: 700, color: "#0F6E56", marginBottom: 2 }}>{m.val}</div>
                          <div style={{ fontSize: 10, color: "#aaa" }}>{m.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setTrackingId(active ? null : t.id)}
                        style={{
                          flex: 1, padding: "10px", borderRadius: 50, border: "none", cursor: "pointer",
                          background: active ? "#0F6E56" : "#E1F5EE",
                          color:      active ? "#fff"    : "#0F6E56",
                          fontSize: 13, fontWeight: 700, transition: "background .2s, color .2s",
                        }}
                      >
                        {active ? "▲ Hide" : "📍 Track"}
                      </button>
                      <button
                        onClick={() => openReset(t)}
                        style={{ padding: "10px 14px", borderRadius: 50, border: "1px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                      >
                        <KeyRound size={13} /> Reset PW
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Location map + history */}
          {trackingId && tracked && (
            <div style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid #e8ebe6", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#0d1b2a" }}>📍 {tracked.name}</span>
                <span style={{ fontSize: 12, color: "#7a9b8e", marginLeft: "auto" }}>Live tracking & location history</span>
              </div>
              <TechnicianMap techId={trackingId} />
            </div>
          )}
        </>
      )}

      {/* ── Add Technician Modal ─────────────────────────────── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 460, padding: "32px 32px 28px", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>

            {/* Close */}
            <button onClick={() => { setShowModal(false); setSaveError(""); }} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 22 }}>Add Technician</h2>

            <form onSubmit={handleAdd}>
              {[
                { key: "name",     label: "Full name",     type: "text",     ph: "e.g. Khalid Hassan" },
                { key: "phone",    label: "Phone",         type: "tel",      ph: "+971 50 000 0000" },
                { key: "email",    label: "Email",         type: "email",    ph: "khalid@alnuzha.ae" },
                { key: "password", label: "Password",      type: "password", ph: "Min 8 characters" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 6 }}>
                    {f.label} <span style={{ color: "#e05252" }}>*</span>
                  </label>
                  <input
                    required
                    type={f.type}
                    placeholder={f.ph}
                    value={(form as Record<string, string>)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #d4e8e0", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif" }}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 22 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 6 }}>Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #d4e8e0", borderRadius: 10, fontSize: 14, outline: "none", background: "#fff", fontFamily: "Plus Jakarta Sans, sans-serif", appearance: "none" }}
                >
                  <option value="technician">Technician</option>
                  <option value="senior_technician">Senior Technician</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {saveError && (
                <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 16 }}>{saveError}</div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <button type="button" onClick={() => { setShowModal(false); setSaveError(""); }} style={{ padding: "12px", borderRadius: 50, border: "1.5px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ padding: "12px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0F6E56,#1a9e75)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(15,110,86,0.3)" }}>
                  {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Add Technician"}
                </button>
              </div>
            </form>
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
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <KeyRound size={18} color="#0F6E56" />
              </div>
              <div>
                <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontWeight: 700, margin: 0 }}>Reset Password</h2>
                <p style={{ fontSize: 12, color: "#888", margin: 0 }}>{resetTarget.name} · {resetTarget.phone}</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "#7a9b8e", margin: "14px 0 22px", lineHeight: 1.6 }}>
              Set a new password for this account. The technician will use it on their next login.
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
