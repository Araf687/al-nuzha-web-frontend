"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "./components/Navbar";
import {
  Wind, Zap, CalendarCheck2, ClipboardList, PhoneCall,
  Truck, BadgeCheck, ShieldCheck, Star, ChevronDown,
  ArrowRight, Phone, Settings2, RefreshCw,
  FileText,
} from "lucide-react";
import { useLang } from "@/lib/i18n";

/* ─────────────── Scroll-fade helpers ────────────────────────────── */
function useFade(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, [threshold]);
  return { ref, v };
}
function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, v } = useFade();
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "none" : "translateY(28px)", transition: `opacity .65s ${delay}s ease, transform .65s ${delay}s ease` }}>
      {children}
    </div>
  );
}
function FadeLeft({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, v } = useFade();
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "none" : "translateX(-32px)", transition: `opacity .7s ${delay}s ease, transform .7s ${delay}s ease` }}>
      {children}
    </div>
  );
}
function FadeRight({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, v } = useFade();
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "none" : "translateX(32px)", transition: `opacity .7s ${delay}s ease, transform .7s ${delay}s ease` }}>
      {children}
    </div>
  );
}

/* ─────────────── Static (non-translatable) data ──────────────────── */
const SERVICE_IMGS = [
  "/home/services/central_ac_repair.png",
  "/home/services/fridge_maintanace.png",
  "/home/services/split_ac_cleaning.png",
  "/home/services/smart_thermostats.png",
  "/home/services/commercial_chillers.png",
  "/home/services/gas_refilling.png",
];

const FEATURE_ICONS = [ShieldCheck, Wind, Settings2, FileText, Zap, RefreshCw];
const STEP_ICONS    = [ClipboardList, PhoneCall, Truck, BadgeCheck];

const REVIEWS = [
  { initials: "AK", name: "Ahmed Khan",    area: "Marina Resident",    text: "Al-Nuzha Electronics is the only team I trust. Their response time in Dubai Marina is unmatched, and the work is always pristine." },
  { initials: "SJ", name: "Sarah Johnson", area: "Palm Jumeirah",       text: "Highly professional. They repaired my high-end refrigerator the same day. Transparent pricing and genuine parts. Five stars!" },
  { initials: "MT", name: "Mark T.",        area: "JLT Office Manager", text: "Found them through a neighbor and won't go anywhere else. Exceptional AC servicing and very polite technicians." },
];

/* ─────────────── Global CSS ──────────────────────────────────────── */
const PAGE_CSS = `
  @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }

  /* Service cards */
  .svc-card { border-radius: 20px; overflow: hidden; border: 1px solid #bfc9c3; cursor: pointer; transition: transform .3s, box-shadow .3s; }
  .svc-card:hover { transform: translateY(-8px); box-shadow: 0 24px 48px rgba(0,0,0,0.2); }
  .svc-card:hover .svc-img { transform: scale(1.08); }
  .svc-img { transition: transform .5s ease; }
  .svc-overlay { background: linear-gradient(to top, rgba(6,78,59,0.92) 0%, rgba(6,78,59,0) 60%); }
  .svc-img-wrap { height: 320px; }

  /* Footer link hover */
  .ftr-link { color: rgba(255,255,255,0.75); font-size: 15px; margin-bottom: 14px; cursor: pointer; transition: color .18s; text-decoration: none; display: block; font-family: "Plus Jakarta Sans", var(--font-arabic), sans-serif; }
  .ftr-link:hover { color: #fbbf24; }

  /* Section padding */
  .sec-pad   { padding: 100px 64px; }
  .sec-dark  { padding: 100px 64px; }
  .sec-white { padding: 100px 64px; }
  .sec-light { padding: 100px 64px; }
  .cta-pad   { padding: 96px 64px; }
  .footer-pad { padding: 72px 64px 32px; }

  /* Why-us image height */
  .why-img { height: 500px; }
  /* Why-us floating badge */
  .why-badge { position:absolute; bottom:-24px; right:-24px; }
  [dir="rtl"] .why-badge { right:auto; left:-24px; }

  /* Review card padding */
  .review-card { padding: 36px 32px; }

  /* Step icon */
  .step-icon { width: 96px; height: 96px; }
  .step-icon svg { width: 36px; height: 36px; }

  /* Hero body */
  .hero-body { font-size: 18px; }

  /* ── 900 px (tablet) ─────────────────────────────── */
  @media (max-width: 900px) {
    .hero-content  { padding: 100px 32px 64px !important; text-align: center !important; align-items: center !important; }
    .hero-body     { font-size: 16px !important; }
    .hero-btns     { justify-content: center !important; }
    .stat-grid     { grid-template-columns: 1fr 1fr !important; gap: 24px 32px !important; }

    .sec-pad   { padding: 72px 32px !important; }
    .sec-dark  { padding: 72px 32px !important; }
    .sec-white { padding: 72px 32px !important; }
    .sec-light { padding: 72px 32px !important; }
    .cta-pad   { padding: 72px 32px !important; }
    .footer-pad { padding: 56px 32px 24px !important; }

    .svc-grid      { grid-template-columns: 1fr 1fr !important; }
    .why-grid      { grid-template-columns: 1fr !important; gap: 40px !important; }
    .why-img       { height: 380px !important; }
    .why-badge     { bottom: -16px !important; right: 0 !important; }
    [dir="rtl"] .why-badge { right: auto !important; left: 0 !important; }
    .feat-grid     { grid-template-columns: 1fr 1fr !important; }
    .steps-row     { flex-direction: column !important; align-items: center !important; gap: 32px !important; }
    .step-connector { display: none !important; }
    .step-icon     { width: 80px !important; height: 80px !important; }
    .reviews-grid  { grid-template-columns: 1fr !important; }
    .review-card   { padding: 28px 24px !important; }
    .footer-grid   { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
    .footer-brand  { grid-column: span 2; }
    .cta-btns      { flex-direction: column !important; align-items: center !important; gap: 12px !important; }
    .cta-btns a    { width: 100%; max-width: 320px; justify-content: center; }
  }

  /* ── 600 px (mobile) ─────────────────────────────── */
  @media (max-width: 600px) {
    .hero-content  { padding: 80px 20px 52px !important; }
    .hero-badge    { padding: 6px 12px 6px 10px !important; }
    .hero-badge span { font-size: 9px !important; letter-spacing: 0.06em !important; }
    .hero-body     { font-size: 15px !important; margin-bottom: 28px !important; }
    .hero-btns     { gap: 10px !important; margin-bottom: 40px !important; }
    .hero-btns a   { padding: 13px 22px !important; font-size: 14px !important; }
    .stat-grid     { gap: 20px 16px !important; }
    .stat-val      { font-size: 20px !important; }

    .sec-pad   { padding: 52px 20px !important; }
    .sec-dark  { padding: 52px 20px !important; }
    .sec-white { padding: 52px 20px !important; }
    .sec-light { padding: 52px 20px !important; }
    .cta-pad   { padding: 52px 20px !important; }
    .footer-pad { padding: 44px 20px 20px !important; }

    .svc-grid      { grid-template-columns: 1fr !important; gap: 16px !important; }
    .svc-img-wrap  { height: 240px !important; }
    .why-img       { height: 260px !important; }
    .why-badge     { padding: 14px 16px !important; bottom: -12px !important; right: 0 !important; }
    [dir="rtl"] .why-badge { right: auto !important; left: 0 !important; }
    .feat-grid     { grid-template-columns: 1fr !important; gap: 20px !important; }
    .step-icon     { width: 68px !important; height: 68px !important; }
    .review-card   { padding: 22px 18px !important; }
    .footer-grid   { grid-template-columns: 1fr !important; }
    .footer-brand  { grid-column: span 1; }
    .footer-bottom { flex-direction: column !important; text-align: center; gap: 6px !important; }
  }
`;

/* ─────────────── Page ────────────────────────────────────────────── */
export default function Home() {
  const { tx } = useLang();
  const h = tx.home;

  return (
    <div style={{ minHeight: "100vh", background: "#f9f9ff", overflowX: "hidden", fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>
      <style>{PAGE_CSS}</style>
      <Navbar />

      {/* ══ HERO ════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <Image
            src="/home/hero/customer_homepage_updated_branding_image_2.png"
            alt="Al-Nuzha Electronics technician"
            fill priority
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(6,78,59,0.82), rgba(6,78,59,0.78))" }} />
        </div>

        <div className="hero-content" style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "120px 64px 80px", width: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {/* Badge */}
          <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(6,78,59,0.4)", backdropFilter: "blur(10px)", border: "1px solid rgba(176,240,214,0.3)", borderRadius: 9999, padding: "8px 18px 8px 12px", marginBottom: 28 }}>
            <ShieldCheck size={16} color="#fbbf24" strokeWidth={2} />
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em" }}>{h.heroBadge}</span>
          </div>

          {/* Heading */}
          <h1 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: "clamp(36px, 5.5vw, 58px)", fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.02em", maxWidth: 680 }}>
            {h.heroTitleMain}{" "}
            <span style={{ color: "#fbbf24" }}>{h.heroTitleAccent}</span>
          </h1>

          {/* Body */}
          <p className="hero-body" style={{ color: "rgba(255,255,255,0.9)", lineHeight: 1.65, marginBottom: 40, maxWidth: 560, fontWeight: 400 }}>
            {h.heroBody}
          </p>

          {/* Buttons */}
          <div className="hero-btns" style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 64 }}>
            <Link href="/request" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 32px", borderRadius: 9999, fontWeight: 700, fontSize: 15, background: "#fbbf24", color: "#064e3b", textDecoration: "none", boxShadow: "0 8px 28px rgba(251,191,36,0.45)", fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>
              {h.scheduleService} <ArrowRight size={16} className="arrow-icon" />
            </Link>
            <Link href="/customer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 32px", borderRadius: 9999, fontWeight: 600, fontSize: 15, background: "transparent", color: "#fff", textDecoration: "none", border: "2px solid rgba(255,255,255,0.6)", fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>
              {h.ourCapabilities}
            </Link>
          </div>

          {/* Stats */}
          <div style={{ width: "100%", borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 36 }}>
            <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "32px 40px", maxWidth: 680 }}>
              {h.stats.map(s => (
                <div key={s.label}>
                  <div className="stat-val" style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: 26, fontWeight: 700, color: "#fbbf24", lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 5, fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 1, animation: "bounce 2s infinite" }}>
          <ChevronDown size={28} color="#fbbf24" />
        </div>
      </section>

      {/* ══ SERVICES ════════════════════════════════════════════════ */}
      <section className="sec-pad" style={{ maxWidth: 1280, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 600, color: "#064e3b", marginBottom: 16 }}>
              {h.sectionServices}
            </h2>
            <div style={{ width: 80, height: 4, background: "#fbbf24", borderRadius: 9999, margin: "0 auto" }} />
          </div>
        </FadeUp>

        <div className="svc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
          {h.services.map(({ name, price, cta }, i) => (
            <FadeUp key={name} delay={i * 0.07}>
              <div className="svc-card">
                <div className="svc-img-wrap" style={{ position: "relative", overflow: "hidden" }}>
                  <Image src={SERVICE_IMGS[i]} alt={name} fill className="svc-img" style={{ objectFit: "cover" }} />
                  <div className="svc-overlay" style={{ position: "absolute", inset: 0 }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "24px" }}>
                    <div style={{ display: "inline-block", background: "#fbbf24", color: "#064e3b", fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 9999, width: "fit-content", marginBottom: 10 }}>
                      {price}
                    </div>
                    <h3 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: 22, fontWeight: 600, color: "#fff", marginBottom: 12, lineHeight: 1.2 }}>{name}</h3>
                    <Link href="/request" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "#fff", textDecoration: "none", fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif", transition: "color .18s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "#fbbf24"}
                      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "#fff"}
                    >
                      {cta} <ArrowRight size={15} className="arrow-icon" />
                    </Link>
                  </div>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ══ WHY US ══════════════════════════════════════════════════ */}
      <section id="about" className="sec-dark" style={{ background: "#064e3b" }}>
        <div className="why-grid" style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>

          <FadeLeft>
            <div style={{ position: "relative" }}>
              <div style={{ borderRadius: 32, overflow: "hidden", border: "3px solid rgba(251,191,36,0.25)", boxShadow: "0 32px 64px rgba(0,0,0,0.3)" }}>
                <div className="why-img" style={{ position: "relative" }}>
                  <Image src="/home/standard/standard_side.png" alt="Certified Al-Nuzha technician" fill style={{ objectFit: "cover" }} />
                </div>
              </div>
              <div className="why-badge" style={{ background: "#fbbf24", color: "#064e3b", padding: "20px 24px", borderRadius: 20, boxShadow: "0 16px 40px rgba(251,191,36,0.35)", border: "2px solid rgba(255,255,255,0.2)" }}>
                <div style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{h.emergencyLine1}</div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{h.emergencyLine2}</div>
              </div>
            </div>
          </FadeLeft>

          <FadeRight>
            <div>
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.1)", color: "#fbbf24", fontSize: 11, fontWeight: 700, padding: "6px 18px", borderRadius: 9999, marginBottom: 24, letterSpacing: "0.12em", textTransform: "uppercase", border: "1px solid rgba(251,191,36,0.3)" }}>
                {h.aboutLabel}
              </div>
              <h2 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 600, color: "#fff", marginBottom: 48, lineHeight: 1.22 }}>
                {h.aboutTitle}
              </h2>

              <div className="feat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                {h.features.map(({ title, desc }, i) => {
                  const Icon = FEATURE_ICONS[i];
                  return (
                    <FadeUp key={title} delay={i * 0.07}>
                      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <Icon size={22} color="#fbbf24" strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <div style={{ fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 5 }}>{title}</div>
                          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{desc}</div>
                        </div>
                      </div>
                    </FadeUp>
                  );
                })}
              </div>
            </div>
          </FadeRight>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════════ */}
      <section className="sec-white" style={{ background: "#fff" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <FadeUp>
            <h2 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 600, color: "#064e3b", textAlign: "center", marginBottom: 72 }}>
              {h.howItWorksTitle}
            </h2>
          </FadeUp>

          <div className="steps-row" style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div className="step-connector" style={{ position: "absolute", top: 48, left: "calc(12.5%)", right: "calc(12.5%)", height: 0, borderTop: "2px dashed rgba(6,78,59,0.2)", zIndex: 0 }} />

            {h.steps.map(({ title, desc }, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <FadeUp key={title} delay={i * 0.12}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", zIndex: 1, padding: "0 16px" }}>
                    <div className="step-icon" style={{ borderRadius: "50%", background: "#e1e8fd", border: "4px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, flexShrink: 0 }}>
                      <Icon size={36} color="#064e3b" strokeWidth={1.5} />
                    </div>
                    <h4 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: 22, fontWeight: 600, color: "#141b2b", marginBottom: 10 }}>{title}</h4>
                    <p style={{ fontSize: 15, color: "#404944", lineHeight: 1.65 }}>{desc}</p>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ REVIEWS ═════════════════════════════════════════════════ */}
      <section className="sec-light" style={{ background: "#f1f3ff" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <FadeUp>
            <h2 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 600, color: "#064e3b", textAlign: "center", marginBottom: 64 }}>
              {h.reviewsTitle}
            </h2>
          </FadeUp>

          <div className="reviews-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
            {REVIEWS.map(({ initials, name, area, text }, i) => (
              <FadeUp key={name} delay={i * 0.1}>
                <div className="review-card" style={{ background: "#fff", borderRadius: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.04)", border: "1px solid rgba(191,201,195,0.3)" }}>
                  <div style={{ display: "flex", gap: 3, marginBottom: 18 }}>
                    {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={16} color="#fbbf24" fill="#fbbf24" />)}
                  </div>
                  <p style={{ fontSize: 16, color: "#141b2b", lineHeight: 1.72, fontStyle: "italic", marginBottom: 28 }}>
                    &ldquo;{text}&rdquo;
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#064e3b", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#141b2b" }}>{name}</div>
                      <div style={{ fontSize: 12, color: "#404944", marginTop: 2 }}>{area}</div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BAND ════════════════════════════════════════════════ */}
      <section id="contact" className="cta-pad" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <Image src="/home/footer/footer_bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(6,78,59,0.88)" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <FadeUp>
            <h2 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, color: "#fff", marginBottom: 36, lineHeight: 1.2 }}>
              {h.ctaTitlePart1}{" "}
              <span style={{ color: "#fbbf24" }}>{h.ctaTitleAccent}</span>
              {h.ctaTitlePart2 ? ` ${h.ctaTitlePart2}` : ""}
            </h2>
            <div className="cta-btns" style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/request" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "18px 40px", borderRadius: 9999, fontWeight: 700, fontSize: 16, background: "#fbbf24", color: "#064e3b", textDecoration: "none", boxShadow: "0 8px 32px rgba(251,191,36,0.4)", fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>
                <CalendarCheck2 size={18} /> {h.ctaBook}
              </Link>
              <a href="tel:+97141234567" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "18px 36px", borderRadius: 9999, fontWeight: 700, fontSize: 16, border: "2px solid #fbbf24", color: "#fbbf24", textDecoration: "none", fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>
                <Phone size={17} /> {h.ctaPhone}
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════ */}
      <footer className="footer-pad" style={{ background: "#064e3b" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "48px 40px", marginBottom: 56 }}>

            <div className="footer-brand">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <img src="/logo.png" alt="Al-Nuzha" width={44} height={44} style={{ borderRadius: "50%", objectFit: "cover", filter: "brightness(0) invert(1)" }} />
                <span style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontWeight: 700, fontSize: 20, color: "#fff" }}>Al-Nuzha</span>
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.75, maxWidth: 260, marginBottom: 24 }}>
                {h.footerDesc}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {["W", "in"].map(s => (
                  <div key={s} style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", marginBottom: 20, letterSpacing: "0.04em", fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>{h.footerTechTitle}</div>
              {h.footerTechLinks.map(l => <a key={l} href="#" className="ftr-link">{l}</a>)}
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", marginBottom: 20, letterSpacing: "0.04em", fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>{h.footerCompanyTitle}</div>
              {h.footerCompanyLinks.map(l => <a key={l} href="#" className="ftr-link">{l}</a>)}
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", marginBottom: 20, letterSpacing: "0.04em", fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>{h.footerComplianceTitle}</div>
              {h.footerComplianceLinks.map(l => <a key={l} href="#" className="ftr-link">{l}</a>)}
            </div>
          </div>

          <div className="footer-bottom" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>{h.footerCopy}</span>
            <span style={{ fontSize: 11, color: "rgba(251,191,36,0.6)", fontWeight: 700, letterSpacing: "0.15em", fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>{h.footerEstablished}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
