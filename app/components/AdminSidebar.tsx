"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ClipboardList, Users, UserCheck, Package, FileText, LogOut, ReceiptText, X } from "lucide-react";

const items = [
  { href: "/admin",                label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/jobs",           label: "All jobs",  icon: ClipboardList },
  { href: "/admin/customers",      label: "Customers", icon: Users },
  { href: "/admin/staff",          label: "Staff",     icon: UserCheck },
  { href: "/admin/parts",          label: "Parts",     icon: Package },
  { href: "/admin/parts/challans", label: "Challans",  icon: ReceiptText },
  { href: "/admin/invoices",       label: "Invoices",  icon: FileText },
];

export default function AdminSidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const path   = usePathname();
  const router = useRouter();

  function logout() {
    localStorage.removeItem("alnuzha_token");
    localStorage.removeItem("alnuzha_user");
    router.replace("/admin/login");
  }

  return (
    <aside
      className={`admin-sidebar${open ? " sidebar-open" : ""}`}
      style={{ width: 220, background: "#fff", borderRight: "1px solid #e8ebe6", height: "100%", overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column", position: "relative" }}
    >
      {/* Mobile close button */}
      <button
        className="sidebar-close"
        onClick={onClose}
        style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#aaa", padding: 4, display: "flex", alignItems: "center" }}
      >
        <X size={20} />
      </button>

      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #e8ebe6" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/logo.png" alt="Al-Nuzha" width={28} height={28} style={{ borderRadius: 6, objectFit: "cover" }} />
          <span style={{ fontFamily: "var(--font-display, Syne, sans-serif)", fontWeight: 700, fontSize: 16, color: "#1a1a18" }}>
            Al-Nuzha <span style={{ color: "var(--brand)" }}>Tech</span>
          </span>
        </Link>
        <div style={{ marginTop: 4, fontSize: 11, color: "#888", paddingLeft: 2 }}>Admin panel</div>
      </div>

      <nav style={{ padding: "12px 8px", flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#aaa", letterSpacing: "0.08em", padding: "4px 12px 8px", textTransform: "uppercase" }}>Management</div>
        {items.map(({ href, label, icon: Icon }) => {
          const active = (href === "/admin" || href === "/admin/parts") ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                textDecoration: "none", fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? "var(--brand)" : "#555",
                background: active ? "var(--brand-pale, #E1F5EE)" : "transparent",
                borderLeft: active ? "3px solid var(--brand)" : "3px solid transparent",
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "12px 12px 16px", borderTop: "1px solid #e8ebe6", display: "flex", flexDirection: "column", gap: 4 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, fontSize: 12, color: "#888", textDecoration: "none" }}>
          ← Back to website
        </Link>
        <button
          onClick={logout}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#e05252", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}
