"use client";

import { useEffect, useState, useRef } from "react";
import { ref, onValue, query, orderByKey } from "firebase/database";
import { db } from "@/lib/firebase";
import { MapPin, Clock, History, Navigation, ChevronRight, Loader2 } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */
interface LiveLocation { lat: number; lng: number; timestamp: number; }
interface DwellRecord {
  key: string; lat: number; lng: number;
  startTime: number; endTime: number; durationMinutes: number;
  address?: string;
}

/* ── Helpers ────────────────────────────────────────────────────── */
function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}
function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
function fmtDateLabel(key: string): string {
  // key = "YYYY-MM-DD"
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("en-AE", { weekday: "short", month: "short", day: "numeric" });
}
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ── Reverse geocode cache ──────────────────────────────────────── */
const geoCache = new Map<string, string>();
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geoCache.has(key)) return geoCache.get(key)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } },
    );
    const data = await res.json();
    const a = data.address ?? {};
    const name =
      a.amenity ?? a.building ?? a.road ?? a.neighbourhood ??
      a.suburb ?? a.quarter ?? a.district ?? "Unknown location";
    const city = a.city ?? a.town ?? a.village ?? a.county ?? "";
    const label = city ? `${name}, ${city}` : name;
    geoCache.set(key, label);
    return label;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

/* ── Leaflet Map ────────────────────────────────────────────────── */
function LeafletMap({ center, zoom, livePin, dwellPins, onDwellClick, highlightKey, recenterTick }: {
  center: [number, number]; zoom: number;
  livePin: [number, number] | null;
  dwellPins: DwellRecord[];
  onDwellClick: (d: DwellRecord) => void;
  highlightKey: string | null;
  recenterTick?: number;
}) {
  const mapRef    = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    let cancelled = false;
    if ((mapRef.current as any)._leaflet_id) (mapRef.current as any)._leaflet_id = null;

    import("leaflet").then((mod) => {
      if (cancelled || !mapRef.current || leafletRef.current) return;
      const L = mod.default;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors", maxZoom: 19,
      }).addTo(map);
      map.setView(center, zoom);
      leafletRef.current = { map, L };
    });

    return () => {
      cancelled = true;
      if (leafletRef.current) { leafletRef.current.map.remove(); leafletRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { leafletRef.current?.map.setView(center, zoom); }, [center, zoom]);
  useEffect(() => { if (recenterTick) leafletRef.current?.map.setView(center, zoom); }, [recenterTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live marker
  useEffect(() => {
    const inst = leafletRef.current;
    if (!inst) return;
    const { map, L } = inst;
    if ((inst as any)._liveMarker) {
      if (livePin) (inst as any)._liveMarker.setLatLng(livePin);
      else { map.removeLayer((inst as any)._liveMarker); delete (inst as any)._liveMarker; }
      return;
    }
    if (!livePin) return;
    const icon = L.divIcon({
      html: `<div style="width:16px;height:16px;border-radius:50%;background:#0F6E56;border:3px solid #fff;box-shadow:0 0 0 4px rgba(15,110,86,0.3)"></div>`,
      className: "", iconSize: [16, 16], iconAnchor: [8, 8],
    });
    (inst as any)._liveMarker = L.marker(livePin, { icon }).addTo(map).bindPopup("<b>Current location</b>");
  }, [livePin]);

  // Dwell markers
  useEffect(() => {
    const inst = leafletRef.current;
    if (!inst) return;
    const { map, L } = inst;
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    dwellPins.forEach((d, i) => {
      const isHighlighted = highlightKey === d.key;
      const bg = isHighlighted ? "#e05252" : "#0F6E56";
      const size = isHighlighted ? 32 : 26;
      const icon = L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">${i + 1}</div>`,
        className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2],
      });
      const popup = `<div style="font-family:sans-serif;min-width:150px">
        <div style="font-weight:700;color:#0F6E56;margin-bottom:3px">${d.address ?? "Loading…"}</div>
        <div style="font-size:12px;color:#0F6E56;margin-bottom:2px">${fmtDuration(d.durationMinutes)}</div>
        <div style="font-size:11px;color:#546e7a">${fmtTime(d.startTime)} – ${fmtTime(d.endTime)}</div>
      </div>`;
      const marker = L.marker([d.lat, d.lng], { icon }).addTo(map).bindPopup(popup)
        .on("click", () => onDwellClick(d));
      if (isHighlighted) setTimeout(() => marker.openPopup(), 100);
      markersRef.current.push(marker);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dwellPins, highlightKey]);

  return <div ref={mapRef} style={{ width: "100%", height: 360 }} />;
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function TechnicianMap({ techId }: { techId: string }) {
  const [live, setLive]                   = useState<LiveLocation | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate]   = useState<string>(todayKey());
  const [dwells, setDwells]               = useState<DwellRecord[]>([]);
  const [geocoding, setGeocoding]         = useState(false);
  const [activeTab, setActiveTab]         = useState<"live" | "history">("live");
  const [highlightKey, setHighlightKey]   = useState<string | null>(null);
  const [, tick] = useState(0);
  const [recenterTick, setRecenterTick] = useState(0);

  // Live location
  useEffect(() => {
    return onValue(ref(db, `technicians/${techId}/current_location`), (snap) => {
      if (snap.exists()) setLive(snap.val() as LiveLocation);
    });
  }, [techId]);

  // Available dates (keys under dwell_history)
  useEffect(() => {
    return onValue(ref(db, `technicians/${techId}/dwell_history`), (snap) => {
      if (!snap.exists()) { setAvailableDates([]); return; }
      const dates = Object.keys(snap.val()).sort().reverse(); // newest first
      setAvailableDates(dates);
    });
  }, [techId]);

  // Dwell records for selected date
  useEffect(() => {
    return onValue(
      query(ref(db, `technicians/${techId}/dwell_history/${selectedDate}`), orderByKey()),
      async (snap) => {
        if (!snap.exists()) { setDwells([]); return; }
        const records: DwellRecord[] = [];
        snap.forEach((child) => {
          records.push({ key: child.key as string, ...(child.val() as Omit<DwellRecord, "key">) });
        });
        records.sort((a, b) => a.startTime - b.startTime);
        setDwells(records);

        // Reverse geocode all records
        setGeocoding(true);
        const withAddresses = await Promise.all(
          records.map(async (r) => ({ ...r, address: await reverseGeocode(r.lat, r.lng) })),
        );
        setDwells(withAddresses);
        setGeocoding(false);
      },
    );
  }, [techId, selectedDate]);

  // Tick for "X ago" refresh
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const defaultCenter: [number, number] = [25.2048, 55.2708];
  const liveCenter: [number, number] | null = live ? [live.lat, live.lng] : null;
  const highlighted = dwells.find((d) => d.key === highlightKey);
  const mapCenter: [number, number] =
    activeTab === "live"
      ? (liveCenter ?? defaultCenter)
      : highlighted
        ? [highlighted.lat, highlighted.lng]
        : dwells.length
          ? [dwells[0].lat, dwells[0].lng]
          : (liveCenter ?? defaultCenter);

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      <style>{`
        @keyframes _pulse{0%,100%{opacity:1}50%{opacity:.35}}
        .tm-tab{padding:9px 18px;border-radius:50px;border:none;font-size:13px;font-weight:600;
          cursor:pointer;transition:background .15s,color .15s;display:flex;align-items:center;gap:6px}
        .tm-tab.on{background:#0F6E56;color:#fff}
        .tm-tab.off{background:#F0F7F4;color:#0F6E56}
        .date-chip{padding:6px 14px;border-radius:50px;border:1.5px solid #d4e8e0;font-size:12px;
          font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;background:#fff;color:#3d5a4e}
        .date-chip.on{background:#0F6E56;color:#fff;border-color:#0F6E56}
        .date-chip:hover:not(.on){background:#F0F7F4}
        .dwell-row{display:flex;align-items:flex-start;gap:12px;padding:13px 16px;
          cursor:pointer;transition:background .12s;border-bottom:1px solid #f0f4f2}
        .dwell-row:hover,.dwell-row.active{background:#F0F7F4}
        .dwell-row:last-child{border-bottom:none}
        .leaflet-container{z-index:0}
      `}</style>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 8, padding: "14px 20px", borderBottom: "1px solid #e8ebe6", background: "#fff" }}>
        <button className={`tm-tab ${activeTab === "live" ? "on" : "off"}`} onClick={() => setActiveTab("live")}>
          <Navigation size={13} /> Live Location
        </button>
        <button className={`tm-tab ${activeTab === "history" ? "on" : "off"}`} onClick={() => setActiveTab("history")}>
          <History size={13} /> Location History
        </button>
      </div>

      {/* ── HISTORY view ─────────────────────────────────────────── */}
      {activeTab === "history" && (
        <>
          {/* Date chips row */}
          <div style={{ padding: "12px 20px", background: "#F7F8F6", borderBottom: "1px solid #e8ebe6" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7a9b8e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Select a date
            </div>
            {availableDates.length === 0 ? (
              <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>No history recorded yet.</p>
            ) : (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {availableDates.map((d) => (
                  <button
                    key={d}
                    className={`date-chip ${selectedDate === d ? "on" : ""}`}
                    onClick={() => { setSelectedDate(d); setHighlightKey(null); }}
                  >
                    {d === todayKey() ? "Today" : fmtDateLabel(d)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <LeafletMap
            center={mapCenter}
            zoom={dwells.length ? 14 : 12}
            livePin={null}
            dwellPins={dwells}
            onDwellClick={(d) => setHighlightKey(d.key)}
            highlightKey={highlightKey}
          />

          {/* Dwell list */}
          <div style={{ background: "#fff" }}>
            {/* Header */}
            <div style={{ padding: "12px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#3d5a4e", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {selectedDate === todayKey() ? "Today" : fmtDateLabel(selectedDate)} — stays of 30+ min
              </span>
              {geocoding && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#7a9b8e" }}>
                  <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> resolving addresses
                  <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
                </span>
              )}
            </div>

            {dwells.length === 0 ? (
              <div style={{ padding: "24px 20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>
                No 30+ min stays recorded on this date.
              </div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {dwells.map((d, i) => (
                  <div
                    key={d.key}
                    className={`dwell-row ${highlightKey === d.key ? "active" : ""}`}
                    onClick={() => setHighlightKey(highlightKey === d.key ? null : d.key)}
                  >
                    {/* Number badge */}
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: highlightKey === d.key ? "#e05252" : "#0F6E56",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 12,
                    }}>
                      {i + 1}
                    </div>

                    {/* Location info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0d1b2a", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {d.address
                          ? <><MapPin size={12} color="#0F6E56" style={{ marginRight: 4, verticalAlign: "middle" }} />{d.address}</>
                          : <span style={{ color: "#aaa" }}>Resolving address…</span>
                        }
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#7a9b8e", fontSize: 12 }}>
                        <Clock size={11} />
                        {fmtTime(d.startTime)} – {fmtTime(d.endTime)}
                      </div>
                    </div>

                    {/* Duration + arrow */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>{fmtDuration(d.durationMinutes)}</div>
                        <div style={{ fontSize: 10, color: "#aaa" }}>stayed</div>
                      </div>
                      <ChevronRight size={14} color="#ccc" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── LIVE view ────────────────────────────────────────────── */}
      {activeTab === "live" && (
        <>
          <LeafletMap
            center={mapCenter}
            zoom={16}
            livePin={liveCenter}
            dwellPins={[]}
            onDwellClick={() => {}}
            highlightKey={null}
            recenterTick={recenterTick}
          />
          <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 8, background: "#fff", borderTop: "1px solid #e8ebe6" }}>
            {live ? (
              <>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a9e75", display: "inline-block", animation: "_pulse 2s infinite", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0f1a15" }}>Live</span>
                <span style={{ fontSize: 12, color: "#7a9b8e" }}>Updated {timeAgo(live.timestamp)}</span>
                <span style={{ fontSize: 11, color: "#bbb", marginLeft: "auto" }}>{live.lat.toFixed(5)}, {live.lng.toFixed(5)}</span>
                <button
                  onClick={() => setRecenterTick(n => n + 1)}
                  style={{ marginLeft: 8, padding: "4px 10px", borderRadius: 7, border: "1px solid #d4e8e0", background: "#f0faf6", color: "#0F6E56", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Re-center
                </button>
              </>
            ) : (
              <span style={{ fontSize: 13, color: "#7a9b8e" }}>Waiting for technician location…</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
