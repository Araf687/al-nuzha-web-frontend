"use client";
import { useState } from "react";
import Link from "next/link";
import { MapPin, ArrowRight, ArrowLeft, CheckCircle, ChevronRight, Loader2, X } from "lucide-react";
import Navbar from "../components/Navbar";
import { useLang } from "@/lib/i18n";

export default function RequestPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [form, setForm] = useState({ name:"",phone:"",service:"AC Gas Refill",brand:"",model:"",problem:"",preferred:"" });
  const { tx } = useLang();
  const r = tx.request;

  function getLocation() {
    setLocLoading(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setAddress(`Near ${pos.coords.latitude.toFixed(3)}°N, ${pos.coords.longitude.toFixed(3)}°E — Abu Dhabi`); setLocLoading(false); },
      () => { setAddress("Abu Dhabi, UAE"); setLocLoading(false); }
    );
  }

  const inputStyle = { width: "100%", padding: "13px 16px", border: "1.5px solid #d4e8e0", borderRadius: 12, fontSize: 14, outline: "none", background: "#fff", color: "#0f1a15", fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif", transition: "border-color .2s" };
  const focusProps = { onFocus: (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => (e.target.style.borderColor = "#0f6e56"), onBlur: (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => (e.target.style.borderColor = "#d4e8e0") };

  const steps = [r.step1, r.step2, r.step3];
  const stepIcons = [MapPin, ChevronRight, CheckCircle];

  return (
    <div style={{ minHeight: "100vh", background: "#f5faf8" }}>
      <Navbar />

      {submitted && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(6,43,31,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "relative", width: "100%", maxWidth: 520, background: "#fff", borderRadius: 28, padding: "34px 28px 28px", boxShadow: "0 32px 80px rgba(6,43,31,0.24)", textAlign: "center", animation: "pop .35s ease-out" }}>
            <button onClick={() => setSubmitted(false)} aria-label="Close success message" style={{ position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: 9999, border: "none", background: "#eef7f3", color: "#3d5a4e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={18} strokeWidth={2.2} />
            </button>
            <div style={{ width: 86, height: 86, borderRadius: "50%", background: "linear-gradient(135deg,#0f6e56,#1a9e75)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 14px 36px rgba(15,110,86,0.28)" }}>
              <CheckCircle size={42} color="#fff" strokeWidth={2} />
            </div>
            <h2 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: 30, fontWeight: 800, marginBottom: 10, color: "#0f1a15" }}>{r.successTitle}</h2>
            <p style={{ color: "#6f8b80", fontSize: 15, lineHeight: 1.8, marginBottom: 24 }}>{r.successBody}</p>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 26px", borderRadius: 9999, background: "linear-gradient(135deg,#0f6e56,#1a9e75)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14, boxShadow: "0 6px 20px rgba(15,110,86,0.28)" }}>
              {r.btnHome} <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "124px 24px 60px" }}>

        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#e8f5f0", color: "#0f6e56", fontSize: 12, fontWeight: 700, padding: "5px 16px", borderRadius: 50, marginBottom: 16, letterSpacing: "0.08em" }}>{r.pageLabel}</div>
          <h1 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: 42, fontWeight: 800, marginBottom: 8 }}>{r.pageTitle}</h1>
          <p style={{ color: "#7a9b8e", fontSize: 15, fontWeight: 400 }}>{r.pageBody}</p>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 0, marginBottom: 44 }}>
          {steps.map((label, i) => {
            const StepIcon = stepIcons[i];
            const done = step > i + 1;
            const active = step === i + 1;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#0f6e56" : active ? "linear-gradient(135deg,#0f6e56,#1a9e75)" : "#e8f5f0", boxShadow: active ? "0 4px 16px rgba(15,110,86,0.38)" : "none", transition: "all .3s" }}>
                    {done ? <CheckCircle size={18} color="#fff" strokeWidth={2.5} /> : <StepIcon size={18} color={active ? "#fff" : "#7a9b8e"} strokeWidth={2} />}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: active || done ? "#0f6e56" : "#7a9b8e" }}>{label}</span>
                </div>
                {i < 2 && <div style={{ width: 72, height: 2, background: step > i + 1 ? "#0f6e56" : "#d4e8e0", margin: "0 4px 24px", transition: "background .3s" }} />}
              </div>
            );
          })}
        </div>

        <div style={{ background: "#fff", border: "1px solid #d4e8e0", borderRadius: 24, padding: "36px 32px", boxShadow: "0 4px 28px rgba(10,74,53,0.06)" }}>

          {step === 1 && (
            <div>
              <h3 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: 24, fontWeight: 700, marginBottom: 26 }}>{r.step1}</h3>
              {[
                { key:"name",  label: r.labelName,  type:"text", ph: r.phName  },
                { key:"phone", label: r.labelPhone, type:"tel",  ph: r.phPhone },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#3d5a4e", marginBottom: 7 }}>{f.label} <span style={{ color: "#e05252" }}>*</span></label>
                  <input type={f.type} placeholder={f.ph} value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} {...focusProps} />
                </div>
              ))}
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#3d5a4e", marginBottom: 7 }}>{r.labelAddress} <span style={{ color: "#e05252" }}>*</span></label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder={r.phAddress} style={{ ...inputStyle, flex: 1 }} {...focusProps} />
                  <button onClick={getLocation} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "13px 16px", borderRadius: 12, border: "1.5px solid #0f6e56", background: "#e8f5f0", color: "#0f6e56", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {locLoading ? <Loader2 size={14} strokeWidth={2.2} style={{ animation: "spin 1s linear infinite" }} /> : <MapPin size={14} strokeWidth={2.2} />}
                    {locLoading ? r.btnLocating : r.btnLocation}
                  </button>
                </div>
              </div>
              <button onClick={() => setStep(2)} disabled={!form.name || !form.phone || !address} style={{ width: "100%", padding: "15px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0f6e56,#1a9e75)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: !form.name || !form.phone || !address ? "not-allowed" : "pointer", opacity: !form.name || !form.phone || !address ? 0.45 : 1, boxShadow: "0 6px 22px rgba(15,110,86,0.38)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>
                {r.btnContinue} <ArrowRight size={15} strokeWidth={2.5} className="arrow-icon" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: 24, fontWeight: 700, marginBottom: 26 }}>{r.step2}</h3>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#3d5a4e", marginBottom: 7 }}>{r.labelService} <span style={{ color: "#e05252" }}>*</span></label>
                <select value={form.service} onChange={e => setForm(p => ({ ...p, service: e.target.value }))} style={{ ...inputStyle, appearance: "none" }} {...focusProps}>
                  {["AC Gas Refill","AC Repair","AC Installation","Refrigerator Repair","AC Deep Cleaning","Annual Maintenance Contract","Other"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#3d5a4e", marginBottom: 7 }}>{r.labelBrand}</label>
                  <select value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} style={{ ...inputStyle, appearance: "none" }} {...focusProps}>
                    <option value="">{r.selectBrand}</option>
                    {["Samsung","LG","Gree","Carrier","Midea","Daikin","Panasonic","Other"].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#3d5a4e", marginBottom: 7 }}>{r.labelModel}</label>
                  <input type="text" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} placeholder="e.g. AR18TQHQ" style={inputStyle} {...focusProps} />
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#3d5a4e", marginBottom: 7 }}>{r.labelProblem} <span style={{ color: "#e05252" }}>*</span></label>
                <textarea rows={4} value={form.problem} onChange={e => setForm(p => ({ ...p, problem: e.target.value }))} placeholder={r.phProblem} style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties} {...focusProps} />
              </div>
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#3d5a4e", marginBottom: 7 }}>{r.labelPreferred}</label>
                <input type="text" value={form.preferred} onChange={e => setForm(p => ({ ...p, preferred: e.target.value }))} placeholder={r.phPreferred} style={inputStyle} {...focusProps} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ padding: "14px", borderRadius: 50, border: "1.5px solid #d4e8e0", background: "#fff", color: "#3d5a4e", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>
                  <ArrowLeft size={14} strokeWidth={2.5} className="arrow-icon" /> {r.btnBack}
                </button>
                <button onClick={() => setStep(3)} disabled={!form.problem} style={{ padding: "14px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0f6e56,#1a9e75)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: !form.problem ? "not-allowed" : "pointer", opacity: !form.problem ? 0.45 : 1, boxShadow: "0 6px 22px rgba(15,110,86,0.38)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>
                  {r.btnReview} <ArrowRight size={15} strokeWidth={2.5} className="arrow-icon" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: 24, fontWeight: 700, marginBottom: 26 }}>{r.confirmTitle}</h3>
              <div style={{ background: "#f5faf8", borderRadius: 16, padding: "4px 20px", marginBottom: 22, border: "1px solid #e8f5f0" }}>
                {[
                  { label: r.rowName,     val: form.name },
                  { label: r.rowPhone,    val: form.phone },
                  { label: r.rowAddress,  val: address },
                  { label: r.rowService,  val: form.service },
                  { label: r.rowBrand,    val: form.brand || r.rowBrandFallback },
                  { label: r.rowProblem,  val: form.problem },
                  { label: r.rowPreferred,val: form.preferred || r.rowPreferredFallback },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #d4e8e0", fontSize: 14 }}>
                    <span style={{ color: "#7a9b8e", fontWeight: 500 }}>{row.label}</span>
                    <span style={{ color: "#0f1a15", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{row.val}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "#e8f5f0", borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#0f6e56", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={15} strokeWidth={2.2} /> {r.confirmNote}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <button onClick={() => setStep(2)} style={{ padding: "14px", borderRadius: 50, border: "1.5px solid #d4e8e0", background: "#fff", color: "#3d5a4e", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>
                  <ArrowLeft size={14} strokeWidth={2.5} className="arrow-icon" /> {r.btnBack}
                </button>
                <button onClick={() => setSubmitted(true)} style={{ padding: "14px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0f6e56,#1a9e75)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 22px rgba(15,110,86,0.38)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>
                  <CheckCircle size={16} strokeWidth={2.5} /> {r.btnConfirm}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
