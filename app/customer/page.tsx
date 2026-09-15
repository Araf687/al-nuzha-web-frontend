"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "../components/Navbar";
import {
  Wind, Wrench, Refrigerator, Sparkles, Package, CalendarCheck2,
  Clock, ArrowRight, CheckCircle2, Loader2,
} from "lucide-react";
import { api, assetUrl } from "@/lib/api";
import { type LucideIcon } from "lucide-react";
import { useLang } from "@/lib/i18n";

/* ── Types ─────────────────────────────────────────────────── */
interface Service {
  id: string;
  title: string;
  startingPrice: number | null;
  isCustomQuote: boolean;
  priority: number;
  thumbnail: string;
  createdAt: string;
}

// Same order as the API / home page: priority ascending, then newest first
const byPriority = (a: Service, b: Service) =>
  a.priority - b.priority || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

const formatAmount = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/* ── Icon + image map (keyed by service name fragment) ─────── */
const ASSET_MAP: { match: RegExp; Icon: LucideIcon; img: string; time: string }[] = [
  { match: /gas|refill/i,      Icon: Wind,          img: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80&auto=format&fit=crop",  time: "1–2 hrs" },
  { match: /ac repair|repair/i,Icon: Wrench,        img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format&fit=crop",  time: "1–3 hrs" },
  { match: /fridge|refriger/i, Icon: Refrigerator,  img: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&q=80&auto=format&fit=crop", time: "1–3 hrs" },
  { match: /install/i,         Icon: Package,       img: "https://images.unsplash.com/photo-1631700611307-37dbcb89ef7e?w=600&q=80&auto=format&fit=crop", time: "2–4 hrs" },
  { match: /clean/i,           Icon: Sparkles,      img: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&auto=format&fit=crop", time: "1–2 hrs" },
  { match: /contract|amc/i,    Icon: CalendarCheck2,img: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80&auto=format&fit=crop", time: "Scheduled" },
];

const DEFAULT_ASSET = { Icon: Wind, img: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80&auto=format&fit=crop", time: "On visit" };

function assetFor(name: string) {
  return ASSET_MAP.find(a => a.match.test(name)) ?? DEFAULT_ASSET;
}

const brands = ["Samsung","LG","Gree","Carrier","Midea","Daikin","Panasonic","Hitachi","Toshiba","Fujitsu","Haier","Sharp"];

/* ── Fade hook ─────────────────────────────────────────────── */
function useFade() {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.08 });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return { ref, v };
}
function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, v } = useFade();
  return <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "none" : "translateY(28px)", transition: `opacity .65s ${delay}s ease, transform .65s ${delay}s ease` }}>{children}</div>;
}

/* ── Responsive CSS ────────────────────────────────────────── */
const PAGE_CSS = `
  .svc-hero       { padding: 130px 32px 90px; }
  .svc-hero-h1    { font-size: 56px; }
  .svc-hero-body  { font-size: 17px; }
  .svc-filter     { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
  .svc-grid-sec   { padding: 80px 32px; }
  .svc-img-h      { height: 220px; }
  .includes-sec   { padding: 80px 32px; }
  .includes-grid  { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
  .includes-h2    { font-size: 38px; }
  .brands-sec     { padding: 60px 32px; }
  .cta-sec        { padding: 90px 32px; }
  .cta-h2         { font-size: 44px; }
  .cta-body       { font-size: 16px; }
  .svc-footer     { padding: 24px 32px; }

  @media (max-width: 768px) {
    .svc-hero       { padding: 90px 24px 60px !important; }
    .svc-hero-inner { margin-top: 24px !important; }
    .svc-hero-h1    { font-size: 38px !important; }
    .svc-hero-body  { font-size: 15px !important; margin-bottom: 24px !important; }
    .svc-grid-sec   { padding: 52px 24px !important; }
    .svc-img-h      { height: 190px !important; }
    .includes-sec   { padding: 52px 24px !important; }
    .includes-grid  { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
    .includes-h2    { font-size: 28px !important; margin-bottom: 28px !important; }
    .brands-sec     { padding: 44px 24px !important; }
    .cta-sec        { padding: 64px 24px !important; }
    .cta-h2         { font-size: 32px !important; margin-bottom: 12px !important; }
    .cta-body       { font-size: 14px !important; margin-bottom: 24px !important; }
    .svc-footer     { padding: 20px 24px !important; }
  }

  @media (max-width: 500px) {
    .svc-hero       { padding: 76px 16px 48px !important; }
    .svc-hero-inner { margin-top: 36px !important; }
    .svc-hero-h1    { font-size: 30px !important; letter-spacing: 0 !important; }
    .svc-hero-body  { font-size: 14px !important; }
    .svc-filter button { font-size: 13px !important; padding: 8px 16px !important; }
    .svc-grid-sec   { padding: 40px 16px !important; }
    .svc-img-h      { height: 170px !important; }
    .includes-sec   { padding: 40px 16px !important; }
    .includes-grid  { grid-template-columns: 1fr !important; }
    .includes-h2    { font-size: 24px !important; }
    .brands-sec     { padding: 36px 16px !important; }
    .cta-sec        { padding: 48px 16px !important; }
    .cta-h2         { font-size: 26px !important; }
    .svc-footer     { padding: 16px !important; }
  }
`;

/* ── Page ──────────────────────────────────────────────────── */
export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [filter, setFilter]     = useState("all");
  const { tx } = useLang();
  const c = tx.customer;
  const h = tx.home;

  useEffect(() => {
    api.listServices()
      .then(data => setServices(data as Service[]))
      .catch(() => setError(h.servicesError))
      .finally(() => setLoading(false));
  }, [h.servicesError]);

  const sorted    = [...services].sort(byPriority);
  const displayed = filter === "popular" ? sorted.slice(0, 2) : sorted;

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <style>{PAGE_CSS}</style>
      <Navbar />

      {/* Hero */}
      <section className="svc-hero" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <Image src="https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=1400&q=85&auto=format&fit=crop" alt="AC service professional Abu Dhabi" fill style={{ objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(6,43,31,0.94) 0%,rgba(10,74,53,0.78) 60%,rgba(15,110,86,0.50) 100%)" }} />
        </div>
        <div className="svc-hero-inner" style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.14)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 700, padding: "5px 16px", borderRadius: 50, marginBottom: 20, letterSpacing: "0.09em", textTransform: "uppercase" as const }}>{c.heroLabel}</div>
          <h1 className="svc-hero-h1" style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontWeight: 900, color: "#fff", marginBottom: 16, letterSpacing: "-0.5px" }}>{c.heroTitle}</h1>
          <p className="svc-hero-body" style={{ color: "rgba(255,255,255,0.68)", marginBottom: 36, lineHeight: 1.72 }}>{c.heroBody}</p>
          <div className="svc-filter">
            {[{ val: "all", label: c.filterAll }, { val: "popular", label: c.filterPopular }].map(f => (
              <button key={f.val} onClick={() => setFilter(f.val)} style={{ padding: "10px 24px", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none", transition: "all .2s", background: filter === f.val ? "#e8a045" : "rgba(255,255,255,0.14)", color: "#fff" }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="svc-grid-sec" style={{ background: "#f5faf8" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#7a9b8e", fontSize: 15, padding: "60px 0" }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> {c.loadingServices}
            </div>
          )}
          {error && !loading && (
            <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 12, padding: "16px 20px", color: "#791F1F", fontSize: 14, textAlign: "center" }}>{error}</div>
          )}
          {!loading && !error && displayed.length === 0 && (
            <p style={{ textAlign: "center", color: "#3d5a4e", fontSize: 15, padding: "40px 0" }}>{h.servicesEmpty}</p>
          )}
          {!loading && !error && displayed.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(340px,100%),1fr))", gap: 24 }}>
              {displayed.map((svc, i) => {
                const { Icon, img, time } = assetFor(svc.title);
                const popular = i < 2;
                const custom  = svc.isCustomQuote || svc.startingPrice === null;
                const price   = custom ? h.serviceCustomQuote : h.servicePriceFrom.replace("{price}", formatAmount(Number(svc.startingPrice)));
                return (
                  <FadeUp key={svc.id} delay={i * 0.08}>
                    <div style={{ background: "#fff", borderRadius: 22, overflow: "hidden", border: popular ? "2px solid #0f6e56" : "1px solid #d4e8e0", position: "relative", transition: "transform .28s, box-shadow .28s" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-8px)"; el.style.boxShadow = "0 24px 56px rgba(10,74,53,0.14)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ""; el.style.boxShadow = ""; }}
                    >
                      {popular && <div style={{ position: "absolute", top: 0, right: 20, background: "linear-gradient(135deg,#0f6e56,#1a9e75)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 14px", borderRadius: "0 0 12px 12px", letterSpacing: "0.06em", zIndex: 2 }}>{c.popularBadge}</div>}
                      <div className="svc-img-h" style={{ position: "relative", overflow: "hidden" }}>
                        {svc.thumbnail ? (
                          // Plain <img>: thumbnails are served by the API host, which next/image does not whitelist
                          <img src={assetUrl(svc.thumbnail)} alt={svc.title} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform .5s" }}
                            onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.transform = "scale(1.07)"}
                            onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.transform = ""}
                          />
                        ) : (
                          <Image src={img} alt={svc.title} fill style={{ objectFit: "cover", transition: "transform .5s" }}
                            onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.transform = "scale(1.07)"}
                            onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.transform = ""}
                          />
                        )}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(6,43,31,0.65) 0%,transparent 55%)" }} />
                        <div style={{ position: "absolute", top: 14, left: 14, width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.25)" }}>
                          <Icon size={18} color="#fff" strokeWidth={1.8} />
                        </div>
                      </div>
                      <div style={{ padding: "22px 24px 26px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <h3 style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontSize: 21, fontWeight: 700 }}>{svc.title}</h3>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#7a9b8e", whiteSpace: "nowrap", marginLeft: 8, marginTop: 4 }}><Clock size={12} />{time}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "#0f6e56" }}>{price}</span>
                          <Link href="/request" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "9px 18px", borderRadius: 50, background: popular ? "linear-gradient(135deg,#0f6e56,#1a9e75)" : "#e8f5f0", color: popular ? "#fff" : "#0f6e56", textDecoration: "none", fontWeight: 600, fontSize: 13, boxShadow: popular ? "0 4px 14px rgba(15,110,86,0.32)" : "none" }}>
                            {custom ? h.serviceQuoteCta : c.bookNow} <ArrowRight size={12} className="arrow-icon" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </FadeUp>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* What's included */}
      <section className="includes-sec" style={{ background: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <FadeUp>
            <div style={{ display: "inline-block", background: "#e8f5f0", color: "#0f6e56", fontSize: 11, fontWeight: 700, padding: "5px 16px", borderRadius: 50, marginBottom: 16, letterSpacing: "0.09em", textTransform: "uppercase" as const }}>{c.includesLabel}</div>
            <h2 className="includes-h2" style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontWeight: 800, marginBottom: 40 }}>{c.includesTitle}</h2>
            <div className="includes-grid">
              {c.includesItems.map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f5faf8", borderRadius: 12, padding: "14px 16px", textAlign: "left" }}>
                  <CheckCircle2 size={18} color="#0f6e56" strokeWidth={2} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#3d5a4e" }}>{item}</span>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Brands */}
      <section className="brands-sec" style={{ background: "#f5faf8" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <FadeUp>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7a9b8e", letterSpacing: "0.12em", marginBottom: 28, textTransform: "uppercase" as const }}>{c.brandsTitle}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {brands.map(b => (
                <div key={b} style={{ padding: "6px 14px", border: "1px solid #d4e8e0", borderRadius: 50, fontSize: 12, color: "#3d5a4e", fontWeight: 500, background: "#fff", cursor: "default", transition: "all .18s" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "#e8f5f0"; el.style.borderColor = "#0f6e56"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "#fff"; el.style.borderColor = "#d4e8e0"; }}
                >{b}</div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-sec" style={{ position: "relative", overflow: "hidden", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <Image src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&q=80&auto=format&fit=crop" alt="Book a service" fill style={{ objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(6,43,31,0.91)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto" }}>
          <FadeUp>
            <h2 className="cta-h2" style={{ fontFamily: "'Fraunces', var(--font-arabic), Georgia, serif", fontWeight: 800, color: "#fff", marginBottom: 14 }}>{c.ctaTitle}</h2>
            <p className="cta-body" style={{ color: "rgba(255,255,255,0.58)", marginBottom: 32, lineHeight: 1.72 }}>{c.ctaBody}</p>
            <Link href="/request" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 40px", borderRadius: 50, fontWeight: 700, fontSize: 15, background: "linear-gradient(135deg,#e8a045,#f5c060)", color: "#fff", textDecoration: "none", boxShadow: "0 8px 28px rgba(232,160,69,0.45)" }}>
              <CalendarCheck2 size={17} /> {c.ctaBtn}
            </Link>
          </FadeUp>
        </div>
      </section>

      <footer className="svc-footer" style={{ background: "#062b1f", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.28)" }}>{c.footerCopy}</div>
      </footer>
    </div>
  );
}
