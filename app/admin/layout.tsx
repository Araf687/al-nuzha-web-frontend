"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";

const ADMIN_CSS = `
  /* Desktop: topbar hidden, sidebar always visible */
  .admin-topbar  { display: none; }
  .sidebar-close { display: none !important; }

  /* Mobile: drawer behaviour */
  @media (max-width: 900px) {
    .admin-topbar {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 56px;
      padding: 0 16px;
      background: #fff;
      border-bottom: 1px solid #e8ebe6;
      position: sticky;
      top: 0;
      z-index: 100;
      flex-shrink: 0;
    }

    .admin-sidebar {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      height: 100vh !important;
      min-height: 100vh !important;
      z-index: 200 !important;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
      box-shadow: 4px 0 32px rgba(0,0,0,0.15);
    }

    .admin-sidebar.sidebar-open {
      transform: translateX(0) !important;
    }

    .sidebar-close {
      display: flex !important;
      align-items: center;
      justify-content: center;
    }

    .admin-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 199;
    }

    table th, table td {
      padding: 8px 10px !important;
      font-size: 11px !important;
    }
  }

  @media (max-width: 500px) {
    table th, table td {
      padding: 6px 8px !important;
      font-size: 10px !important;
    }
  }
`;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const isLogin  = pathname === "/admin/login";
  const [ready, setReady]             = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("alnuzha_token");
    if (!token && !isLogin) {
      router.replace("/admin/login");
    } else {
      setReady(true);
    }
  }, [pathname, isLogin, router]);

  // Close drawer on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (isLogin) return <>{children}</>;
  if (!ready)  return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#F7F8F6" }}>
      <style>{ADMIN_CSS}</style>

      {/* Mobile sticky topbar */}
      <div className="admin-topbar">
        <button
          onClick={() => setSidebarOpen(true)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#555", display: "flex", alignItems: "center" }}
        >
          <Menu size={22} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <img src="/logo.png" alt="Al-Nuzha" width={24} height={24} style={{ borderRadius: 5, objectFit: "cover" }} />
          <span style={{ fontFamily: "var(--font-display, Syne, sans-serif)", fontWeight: 700, fontSize: 15, color: "#1a1a18" }}>
            Al-Nuzha <span style={{ color: "var(--brand, #0a4a35)" }}>Tech</span>
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {sidebarOpen && <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />}
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
