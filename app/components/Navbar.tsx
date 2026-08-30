"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarPlus, ShieldCheck, MessageCircle, Menu, X, Globe, ChevronDown, Check } from "lucide-react";
import { useLang, type Lang } from "@/lib/i18n";

const CSS = `
  .nav-root {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 100;
    height: 80px;
    display: flex;
    align-items: center;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition: background .3s, box-shadow .3s;
  }
  .nav-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 64px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .nav-link {
    padding: 8px 0;
    font-size: 16px;
    font-weight: 400;
    text-decoration: none;
    color: #404944;
    transition: color .15s;
    font-family: "Plus Jakarta Sans", sans-serif;
  }
  .nav-link:hover { color: #064e3b; }
  .nav-link.active {
    color: #064e3b;
    font-weight: 700;
    border-bottom: 2px solid #064e3b;
  }
  .nav-desktop { display: flex; align-items: center; gap: 32px; }
  .nav-ctas    { display: flex; align-items: center; gap: 16px; }
  .nav-hamburger { display: none; background: none; border: none; cursor: pointer; color: #141b2b; padding: 4px; }

  /* ── Language dropdown ── */
  .lang-trigger {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: 50px;
    border: 1.5px solid #d4e8e0;
    background: transparent;
    font-size: 13px;
    font-weight: 600;
    color: #064e3b;
    cursor: pointer;
    font-family: "Plus Jakarta Sans", var(--font-arabic), sans-serif;
    transition: background .18s, border-color .18s;
    white-space: nowrap;
  }
  .lang-trigger:hover { background: #e8f5f0; border-color: #064e3b; }
  .lang-trigger svg { flex-shrink: 0; }

  .lang-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    inset-inline-end: 0;
    background: #fff;
    border: 1px solid #e8ebe6;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    overflow: hidden;
    min-width: 148px;
    z-index: 300;
    animation: ddFade .15s ease;
  }
  @keyframes ddFade { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }

  .lang-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 14px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #0f1a15;
    font-family: "Plus Jakarta Sans", var(--font-arabic), sans-serif;
    transition: background .14s;
    text-align: start;
  }
  .lang-option:hover { background: #f5faf8; }
  .lang-option.active { font-weight: 700; color: #064e3b; background: #edf7f2; }
  .lang-option .check { margin-inline-start: auto; color: #0f6e56; }

  .nav-mobile-drawer {
    position: fixed;
    top: 80px; left: 0; right: 0;
    background: rgba(249,249,255,0.99);
    backdrop-filter: blur(16px);
    z-index: 99;
    padding: 20px 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-bottom: 1px solid #e1e8fd;
  }
  .nav-mobile-drawer a {
    padding: 13px 0;
    font-size: 16px;
    font-weight: 600;
    color: #0f1a15;
    text-decoration: none;
    border-bottom: 1px solid #f0f2ee;
    font-family: "Plus Jakarta Sans", var(--font-arabic), sans-serif;
  }
  .nav-mobile-book {
    margin-top: 12px;
    padding: 13px 0 !important;
    border-radius: 50px !important;
    background: #064e3b;
    color: #fff !important;
    font-weight: 700 !important;
    text-align: center;
    border-bottom: none !important;
  }

  @media (max-width: 900px) {
    .nav-inner     { padding: 0 20px; }
    .nav-desktop   { display: none !important; }
    .nav-ctas      { display: none !important; }
    .nav-hamburger { display: flex !important; }
  }
`;

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇦🇪" },
];

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [open, setOpen]           = useState(false);
  const [langOpen, setLangOpen]   = useState(false);
  const langRef                   = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const { lang, setLang, tx } = useLang();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const navLinks = [
    { href: "/",         label: tx.nav.home },
    { href: "/customer", label: tx.nav.services },
    { href: "/#about",   label: tx.nav.about },
    { href: "/#contact", label: tx.nav.contact },
  ];

  const navBg = scrolled ? "rgba(249,249,255,0.98)" : "rgba(249,249,255,0.82)";
  const currentLang = LANGUAGES.find(l => l.code === lang)!;

  return (
    <>
      <style>{CSS}</style>

      <nav className="nav-root" style={{ background: navBg, boxShadow: scrolled ? "0 1px 24px rgba(0,0,0,0.08)" : "0 1px 0 rgba(0,0,0,0.04)" }}>
        <div className="nav-inner">

          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/logo.png" alt="Al Nuzha Electrical Repairs" width={52} height={52} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, fontSize: 20, color: "#064e3b", letterSpacing: "-0.2px" }}>
              Al Nuzha Electrical Repairs
            </span>
          </Link>

          {/* Desktop links */}
          <div className="nav-desktop">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={`nav-link${path === href ? " active" : ""}`}>{label}</Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="nav-ctas">
            <Link href="/admin/login" style={{ fontSize: 14, fontWeight: 600, textDecoration: "none", color: "#404944", fontFamily: "Plus Jakarta Sans, sans-serif", display: "flex", alignItems: "center", gap: 5 }}>
              <ShieldCheck size={14} /> {tx.nav.admin}
            </Link>

            {/* Language dropdown */}
            <div ref={langRef} style={{ position: "relative" }}>
              <button onClick={() => setLangOpen(v => !v)} className="lang-trigger">
                <Globe size={14} />
                {currentLang.flag} {currentLang.label}
                <ChevronDown size={12} style={{ transition: "transform .2s", transform: langOpen ? "rotate(180deg)" : "none" }} />
              </button>
              {langOpen && (
                <div className="lang-dropdown">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      className={`lang-option${lang === l.code ? " active" : ""}`}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                    >
                      <span style={{ fontSize: 18 }}>{l.flag}</span>
                      {l.label}
                      {lang === l.code && <Check size={14} className="check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href="/request" style={{ display: "flex", alignItems: "center", gap: 7, padding: "12px 24px", borderRadius: 9999, background: "#064e3b", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              <CalendarPlus size={14} /> {tx.nav.bookNow}
            </Link>
          </div>

          {/* Hamburger */}
          <button className="nav-hamburger" onClick={() => setOpen(v => !v)}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="nav-mobile-drawer" onClick={() => setOpen(false)}>
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
          <Link href="/admin/login" style={{ color: "#404944" }}>{tx.nav.adminPanel}</Link>

          {/* Mobile language switcher */}
          <div style={{ padding: "10px 0", borderBottom: "1px solid #f0f2ee" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7a9b8e", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <Globe size={12} /> Language / اللغة
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={e => { e.stopPropagation(); setLang(l.code); setOpen(false); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 10, border: lang === l.code ? "2px solid #064e3b" : "1.5px solid #e8ebe6", background: lang === l.code ? "#edf7f2" : "#fff", color: lang === l.code ? "#064e3b" : "#555", fontWeight: lang === l.code ? 700 : 500, fontSize: 14, cursor: "pointer", fontFamily: "Plus Jakarta Sans, var(--font-arabic), sans-serif" }}
                >
                  <span>{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
          </div>

          <Link href="/request" className="nav-mobile-book">{tx.nav.bookNow}</Link>
        </div>
      )}

      {/* WhatsApp float */}
      <a href="https://wa.me/971500000000" aria-label="Chat on WhatsApp" className="whatsapp-float">
        <MessageCircle size={28} color="#fff" fill="#fff" />
      </a>
    </>
  );
}
