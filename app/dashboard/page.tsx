"use client";
import { useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import {
  Download, RefreshCw, Plus, X, CheckCircle, Clock,
  MapPin, Wrench, User, DollarSign, AlertTriangle,
} from "lucide-react";
import { useLang } from "@/lib/i18n";

type Status = "completed"|"inprogress"|"pending"|"recurring";

const orders = [
  { id:"JOB-2051", date:"28 Apr 2026", service:"AC repair",           equipment:"Gree 2 ton",      tech:"Rajan Kumar",  status:"inprogress" as Status, amount:"TBD",      address:"Al Zahiyah, Abu Dhabi" },
  { id:"JOB-2047", date:"15 Apr 2026", service:"AC gas refill",       equipment:"Samsung 1.5 ton", tech:"Rajan Kumar",  status:"completed"  as Status, amount:"AED 210",  address:"Al Zahiyah, Abu Dhabi" },
  { id:"JOB-1983", date:"10 Mar 2026", service:"Refrigerator repair", equipment:"LG 500L",          tech:"Sami Hassan",  status:"completed"  as Status, amount:"AED 380",  address:"Al Zahiyah, Abu Dhabi" },
  { id:"JOB-1901", date:"20 Jan 2026", service:"AC deep cleaning",    equipment:"Samsung 1.5 ton", tech:"Rajan Kumar",  status:"completed"  as Status, amount:"AED 130",  address:"Al Zahiyah, Abu Dhabi" },
];

export default function DashboardPage() {
  const [recurFor, setRecurFor] = useState<typeof orders[0]|null>(null);
  const [recurText, setRecurText] = useState("");
  const [recurDone, setRecurDone] = useState(false);
  const { tx } = useLang();
  const d = tx.dashboard;

  const BADGE: Record<Status, { bg:string; color:string; label:string }> = {
    completed:  { bg:"#e8f5f0", color:"#0a4a35", label: d.statusCompleted  },
    inprogress: { bg:"#e6f1fb", color:"#0c447c", label: d.statusInProgress },
    pending:    { bg:"#faeeda", color:"#633806", label: d.statusPending     },
    recurring:  { bg:"#fbeaf0", color:"#72243E", label: d.statusRecurring  },
  };

  function submitRecur() {
    setRecurDone(true);
    setTimeout(() => { setRecurFor(null); setRecurDone(false); setRecurText(""); }, 2200);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#f5faf8" }}>
      <Navbar />

      {recurFor && (
        <div style={{ position:"fixed", inset:0, background:"rgba(6,43,31,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24, backdropFilter:"blur(4px)" }}>
          <div style={{ background:"#fff", borderRadius:22, padding:"32px 28px", maxWidth:500, width:"100%", position:"relative", boxShadow:"0 32px 80px rgba(6,43,31,0.2)" }}>
            <button onClick={() => setRecurFor(null)} style={{ position:"absolute", top:16, right:16, background:"#f5faf8", border:"none", cursor:"pointer", width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <X size={16} strokeWidth={2.5} color="#7a9b8e" />
            </button>
            {recurDone ? (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#0f6e56,#1a9e75)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
                  <CheckCircle size={30} color="#fff" strokeWidth={2} />
                </div>
                <h3 style={{ fontFamily:"'Fraunces', var(--font-arabic), serif", fontSize:22, fontWeight:700, marginBottom:8 }}>{d.recurDoneTitle}</h3>
                <p style={{ fontSize:14, color:"#7a9b8e" }}>{d.recurDoneBody}</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontFamily:"'Fraunces', var(--font-arabic), serif", fontSize:22, fontWeight:700, marginBottom:4 }}>{d.recurTitle}</h3>
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#7a9b8e", marginBottom:22 }}>
                  <RefreshCw size={12} strokeWidth={2} /> {d.recurLinked} {recurFor.id} — {recurFor.service}
                </div>
                <div style={{ background:"#fef3e2", borderRadius:10, padding:"10px 14px", marginBottom:20, fontSize:13, color:"#854f0b", display:"flex", gap:8 }}>
                  <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink:0, marginTop:1 }} />
                  {d.recurNote}
                </div>
                {[
                  { label: d.recurLabelAddress,   val: recurFor.address   },
                  { label: d.recurLabelEquipment, val: recurFor.equipment },
                  { label: d.recurLabelService,   val: recurFor.service   },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom:12 }}>
                    <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#7a9b8e", marginBottom:5 }}>{f.label}</label>
                    <input readOnly defaultValue={f.val} style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #d4e8e0", borderRadius:10, fontSize:14, background:"#f5faf8", color:"#7a9b8e", cursor:"default" }} />
                  </div>
                ))}
                <div style={{ marginBottom:22 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#3d5a4e", marginBottom:5 }}>
                    {d.recurLabelDesc} <span style={{ color:"#e05252" }}>*</span>
                  </label>
                  <textarea rows={3} value={recurText} onChange={e => setRecurText(e.target.value)} placeholder={d.recurPhDesc} style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #d4e8e0", borderRadius:10, fontSize:14, resize:"none", background:"#fff", color:"#0f1a15", outline:"none", fontFamily:"Plus Jakarta Sans, var(--font-arabic), sans-serif" }} />
                  <div style={{ fontSize:11, color: recurText.length >= 20 ? "#0f6e56" : "#aaa", marginTop:4, fontWeight:500 }}>{recurText.length}{d.recurMinChars}</div>
                </div>
                <button onClick={submitRecur} disabled={recurText.length < 20} style={{ width:"100%", padding:"13px", background:recurText.length>=20?"linear-gradient(135deg,#0f6e56,#1a9e75)":"#e8e8e8", color:recurText.length>=20?"#fff":"#aaa", border:"none", borderRadius:50, fontSize:14, fontWeight:700, cursor:recurText.length>=20?"pointer":"not-allowed", fontFamily:"Plus Jakarta Sans, var(--font-arabic), sans-serif", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                  <RefreshCw size={14} strokeWidth={2.5} /> {d.recurSubmit}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ maxWidth:720, margin:"0 auto", padding:"120px 24px 60px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:32, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"#7a9b8e", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{d.welcomeBack}</div>
            <h1 style={{ fontFamily:"'Fraunces', var(--font-arabic), serif", fontSize:32, fontWeight:800 }}>Ahmed Al-Rashidi</h1>
          </div>
          <Link href="/request" style={{ display:"inline-flex", alignItems:"center", gap:7, background:"linear-gradient(135deg,#0f6e56,#1a9e75)", color:"#fff", padding:"11px 22px", borderRadius:50, textDecoration:"none", fontWeight:700, fontSize:14, boxShadow:"0 4px 16px rgba(15,110,86,0.35)" }}>
            <Plus size={15} strokeWidth={2.5} /> {d.newRequest}
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:36 }}>
          {[
            { label: d.statJobs,      val:"4",       Icon:Wrench,      color:"#e8f5f0", textColor:"#0f6e56" },
            { label: d.statCompleted, val:"3",        Icon:CheckCircle, color:"#e8f5f0", textColor:"#0f6e56" },
            { label: d.statSpent,     val:"AED 720",  Icon:DollarSign,  color:"#fef3e2", textColor:"#854f0b" },
          ].map(s => (
            <div key={s.label} style={{ background:"#fff", border:"1px solid #d4e8e0", borderRadius:16, padding:"18px 16px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:s.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <s.Icon size={20} color={s.textColor} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize:11, color:"#7a9b8e", fontWeight:500, marginBottom:2 }}>{s.label}</div>
                <div style={{ fontSize:20, fontWeight:800, color:"#0f1a15", fontFamily:"'Fraunces', var(--font-arabic), serif" }}>{s.val}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontFamily:"'Fraunces', var(--font-arabic), serif", fontSize:20, fontWeight:700, marginBottom:18 }}>{d.serviceHistory}</h2>

        {orders.map(o => {
          const b = BADGE[o.status];
          return (
            <div key={o.id} style={{ background:"#fff", border:"1px solid #d4e8e0", borderRadius:18, padding:"20px 22px", marginBottom:14, boxShadow:"0 2px 12px rgba(10,74,53,0.04)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:"#0f1a15", fontFamily:"Plus Jakarta Sans, sans-serif", marginBottom:3 }}>{o.id}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:"#7a9b8e" }}><Clock size={11} strokeWidth={2} /> {o.date}</div>
                </div>
                <span style={{ display:"inline-flex", alignItems:"center", background:b.bg, color:b.color, fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:50 }}>{b.label}</span>
              </div>
              <div style={{ fontSize:14, color:"#3d5a4e", fontWeight:500, marginBottom:4, display:"flex", alignItems:"center", gap:6 }}>
                <Wrench size={13} strokeWidth={2} color="#7a9b8e" /> {o.service} — {o.equipment}
              </div>
              <div style={{ fontSize:13, color:"#7a9b8e", marginBottom:16, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <span style={{ display:"flex", alignItems:"center", gap:4 }}><User size={11} strokeWidth={2} /> {o.tech}</span>
                <span style={{ display:"flex", alignItems:"center", gap:4 }}><DollarSign size={11} strokeWidth={2} /> {o.amount}</span>
                <span style={{ display:"flex", alignItems:"center", gap:4 }}><MapPin size={11} strokeWidth={2} /> {o.address}</span>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {o.status === "completed" && (
                  <>
                    <button style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 16px", fontSize:13, border:"1.5px solid #d4e8e0", borderRadius:50, background:"#fff", cursor:"pointer", color:"#3d5a4e", fontWeight:500, fontFamily:"Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>
                      <Download size={13} strokeWidth={2.2} /> {d.btnInvoice}
                    </button>
                    <button onClick={() => setRecurFor(o)} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 16px", fontSize:13, border:"1.5px solid #d4537e", borderRadius:50, background:"#fbeaf0", cursor:"pointer", color:"#72243e", fontWeight:600, fontFamily:"Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>
                      <RefreshCw size={13} strokeWidth={2.2} /> {d.btnRecurring}
                    </button>
                  </>
                )}
                {o.status === "inprogress" && (
                  <button style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 16px", fontSize:13, border:"1.5px solid #185fa5", borderRadius:50, background:"#e6f1fb", cursor:"pointer", color:"#0c447c", fontWeight:600, fontFamily:"Plus Jakarta Sans, var(--font-arabic), sans-serif" }}>
                    <MapPin size={13} strokeWidth={2.2} /> {d.btnTrack}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
