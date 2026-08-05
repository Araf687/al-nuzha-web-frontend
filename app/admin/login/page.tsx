"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, Phone, Lock } from "lucide-react";
import { api } from "@/lib/api";

type Mode = "customer" | "staff";

const RESPONSIVE = `
  @keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }

  .login-wrap {
    display: flex;
    min-height: 100vh;
    font-family: "Plus Jakarta Sans", sans-serif;
  }
  .login-left {
    flex: 0 0 58%;
    position: relative;
    background: linear-gradient(140deg, #1e5c42 0%, #0e3d2a 45%, #082518 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 80px 72px;
    overflow: hidden;
  }
  .login-right {
    flex: 1;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 48px;
  }
  .login-inner {
    width: 100%;
    max-width: 400px;
  }

  /* tablet */
  @media (max-width: 1024px) {
    .login-left { flex: 0 0 46%; padding: 60px 48px; }
    .login-left h1 { font-size: 42px !important; }
    .login-right { padding: 48px 36px; }
  }

  /* mobile */
  @media (max-width: 700px) {
    .login-wrap { flex-direction: column; }
    .login-left { display: none; }
    .login-right {
      padding: 48px 24px 40px;
      align-items: flex-start;
      min-height: 100vh;
    }
    .login-inner { max-width: 100%; }
  }
`;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode]       = useState<Mode>("staff");
  const [form, setForm]       = useState({ phone: "", password: "" });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "staff") {
        const res = await api.loginTechnician(form) as { accessToken: string; user: { role: string; name: string } };
        localStorage.setItem("alnuzha_token", res.accessToken);
        localStorage.setItem("alnuzha_user", JSON.stringify(res.user));
        router.replace("/admin");
      } else {
        const res = await api.loginCustomer(form) as { accessToken: string; user: { id: string; name: string } };
        localStorage.setItem("alnuzha_token", res.accessToken);
        localStorage.setItem("alnuzha_user", JSON.stringify(res.user));
        router.replace("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px",
    border: "none", borderRadius: 12,
    background: "#f0f4f8",
    fontSize: 14, outline: "none", color: "#0f1a15",
    fontFamily: "Plus Jakarta Sans, sans-serif",
    boxSizing: "border-box",
  };

  return (
    <>
      <style>{RESPONSIVE}</style>

      <div className="login-wrap">

        {/* ── Left brand panel ─────────────────────────────────────── */}
        <div className="login-left">
          {/* Ambient blobs */}
          <div style={{ position: "absolute", top: -100, left: -100, width: 480, height: 480, borderRadius: "50%", background: "rgba(26,158,117,0.14)", filter: "blur(90px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -80, right: -80, width: 360, height: 360, borderRadius: "50%", background: "rgba(15,110,86,0.16)", filter: "blur(80px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "40%", right: "10%", width: 200, height: 200, borderRadius: "50%", background: "rgba(6,43,31,0.4)", filter: "blur(60px)", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <h1 style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 58, fontWeight: 800,
              color: "#fff", lineHeight: 1.08,
              marginBottom: 24, letterSpacing: "-0.01em",
            }}>
              Redefining<br />Dubai&apos;s Comfort.
            </h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.52)", lineHeight: 1.78, maxWidth: 400, marginBottom: 64 }}>
              Experience precision-engineered AC maintenance and premium repair services designed for the discerning resident.
            </p>

            {/* Stats */}
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <div>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 800, color: "#e8a045", lineHeight: 1 }}>24/7</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.38)", letterSpacing: "0.14em", marginTop: 5, textTransform: "uppercase" }}>Support</div>
              </div>
              <div style={{ width: 1, height: 38, background: "rgba(255,255,255,0.18)", margin: "0 32px" }} />
              <div>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 800, color: "#e8a045", lineHeight: 1 }}>15k+</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.38)", letterSpacing: "0.14em", marginTop: 5, textTransform: "uppercase" }}>Repairs</div>
              </div>
            </div>
          </div>

          {/* Bottom badge */}
          <div style={{ position: "absolute", bottom: 40, left: 72, display: "flex", alignItems: "center", gap: 12, zIndex: 1 }}>
            <img src="/logo.png" alt="" aria-hidden="true" width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover", filter: "brightness(0) invert(1)", opacity: 0.45, border: "1.5px solid rgba(255,255,255,0.22)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.38)", letterSpacing: "0.14em" }}>ELITE DUBAI PARTNER</span>
          </div>
        </div>

        {/* ── Right form panel ─────────────────────────────────────── */}
        <div className="login-right" style={{ position: "relative" }}>
          {/* Bottom-right watermark logo */}
          <img src="/logo.png" alt="" aria-hidden="true" width={180} height={180} style={{ position: "absolute", bottom: -20, right: -20, opacity: 0.07, filter: "grayscale(1)", pointerEvents: "none", userSelect: "none", borderRadius: "50%", objectFit: "cover" }} />
          <div className="login-inner">

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 44 }}>
              <img src="/logo.png" alt="Al-Nuzha" width={44} height={44} style={{ borderRadius: 11, objectFit: "cover", flexShrink: 0 }} />
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 19, fontWeight: 700, color: "#0f1a15" }}>Al-Nuzha</span>
            </div>

            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 34, fontWeight: 800, color: "#0f1a15", marginBottom: 8, letterSpacing: "-0.01em" }}>
              Welcome Back
            </h2>
            <p style={{ fontSize: 14, color: "#7a9b8e", marginBottom: 36, lineHeight: 1.65 }}>
              Sign in to manage your bookings or access the admin panel.
            </p>

            <form onSubmit={handleSubmit}>
              {/* Phone */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Phone size={13} color="#7a9b8e" />
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#0f1a15" }}>Phone Number</label>
                </div>
                <input
                  required
                  type="tel"
                  placeholder="+971 50 000 0000"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Lock size={13} color="#7a9b8e" />
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#0f1a15" }}>Password</label>
                  </div>
                  <span style={{ fontSize: 12, color: "#0f6e56", cursor: "pointer", fontWeight: 500 }}>Forgot Password?</span>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    required
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    style={{ ...inputStyle, paddingRight: 46 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#7a9b8e", display: "flex", padding: 0 }}
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 10, padding: "11px 14px", color: "#791F1F", fontSize: 13, marginBottom: 18 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "15px",
                  border: "none", borderRadius: 50,
                  background: "#0a3d2a",
                  color: "#fff", fontSize: 15, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.8 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  marginBottom: 28,
                  letterSpacing: "0.01em",
                }}
              >
                {loading
                  ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Signing in…</>
                  : "Sign In →"
                }
              </button>
            </form>

            {/* Customer / Staff toggle */}
            <div style={{ background: "#f0f4f8", borderRadius: 50, padding: 4, display: "flex", marginBottom: 32 }}>
              {(["customer", "staff"] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(""); }}
                  style={{
                    flex: 1, padding: "11px",
                    border: "none", borderRadius: 50,
                    background: mode === m ? "#fff" : "transparent",
                    color: mode === m ? "#0f1a15" : "#7a9b8e",
                    fontSize: 14,
                    fontWeight: mode === m ? 700 : 500,
                    cursor: "pointer",
                    transition: "background .2s, color .2s",
                    boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.09)" : "none",
                    fontFamily: "Plus Jakarta Sans, sans-serif",
                  }}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            <p style={{ textAlign: "center", fontSize: 14, color: "#7a9b8e" }}>
              New to Al-Nuzha?{" "}
              <a href="/request" style={{ color: "#0f1a15", fontWeight: 700, textDecoration: "none" }}>Create an Account</a>
            </p>

          </div>
        </div>

      </div>
    </>
  );
}
