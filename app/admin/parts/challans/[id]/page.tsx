"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface ChallanItem {
  id: string;
  quantity: number;
  unitPrice: number;
  part: { id: string; name: string; sku: string };
}
interface PartChallan {
  id: string;
  challanNumber: string;
  purchaseDate: string;
  supplierName: string | null;
  createdAt: string;
  items: ChallanItem[];
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alnuzha_token") ?? "";
}

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const CSS = `
  .cdet-wrap      { padding: 32px; max-width: 860px; }
  .cdet-meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  @media (max-width: 640px) {
    .cdet-wrap      { padding: 16px 14px 40px; }
    .cdet-meta-grid { grid-template-columns: 1fr 1fr !important; gap: 14px !important; }
  }
`;

export default function ChallanDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [challan, setChallan] = useState<PartChallan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    api.getChallan(id, getToken())
      .then(d => setChallan(d as PartChallan))
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load challan"))
      .finally(() => setLoading(false));
  }, [id]);

  const total = challan
    ? challan.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0)
    : 0;

  return (
    <div className="cdet-wrap">
      <style>{CSS}</style>
      <button onClick={() => router.push("/admin/parts/challans")} style={{ fontSize: 12, color: "#888", background: "none", border: "none", cursor: "pointer", marginBottom: 6, padding: 0 }}>
        ← Back to Challans
      </button>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#888", fontSize: 14, marginTop: 32 }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading…
        </div>
      )}

      {error && !loading && (
        <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 10, padding: "14px 18px", color: "#791F1F", fontSize: 13 }}>{error}</div>
      )}

      {challan && !loading && (
        <>
          {/* Header card */}
          <div style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 14, padding: "24px 28px", marginBottom: 20, marginTop: 8 }}>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#0f1a15" }}>
              {challan.challanNumber}
            </h1>
            <div className="cdet-meta-grid">
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Purchase Date</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a18" }}>{fmtDate(challan.purchaseDate)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Supplier</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a18" }}>{challan.supplierName ?? "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Created</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a18" }}>{fmtDate(challan.createdAt)}</div>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 14, overflow: "hidden", overflowX: "auto" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e8ebe6" }}>
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, fontWeight: 700, color: "#3d5a4e" }}>
                Items — {challan.items.length} {challan.items.length === 1 ? "part" : "parts"}
              </span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
              <thead>
                <tr style={{ background: "#F7F8F6" }}>
                  {["Part name", "SKU", "Qty", "Unit price", "Subtotal"].map(h => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, borderBottom: "1px solid #e8ebe6" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {challan.items.map(item => {
                  const subtotal = Number(item.quantity) * Number(item.unitPrice);
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f0f0ec" }}>
                      <td style={{ padding: "12px 20px", fontWeight: 600, color: "#1a1a18" }}>{item.part.name}</td>
                      <td style={{ padding: "12px 20px", color: "#888", fontFamily: "monospace", fontSize: 12 }}>{item.part.sku ?? "—"}</td>
                      <td style={{ padding: "12px 20px", color: "#333" }}>{item.quantity}</td>
                      <td style={{ padding: "12px 20px", color: "#333" }}>AED {Number(item.unitPrice).toFixed(2)}</td>
                      <td style={{ padding: "12px 20px", fontWeight: 600, color: "#1a1a18" }}>AED {subtotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Total footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid #e8ebe6", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16, background: "#F7F8F6" }}>
              <span style={{ fontSize: 13, color: "#888", fontWeight: 500 }}>Total value</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#0F6E56" }}>AED {total.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
