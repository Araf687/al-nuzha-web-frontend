"use client";
import { useEffect, useRef, useState } from "react";
import { Search, Plus, Loader2, RefreshCw, X, Upload, Pencil, Trash2, ImageIcon } from "lucide-react";
import { api, assetUrl } from "@/lib/api";

interface Service {
  id: string;
  title: string;
  startingPrice: number | null;
  isCustomQuote: boolean;
  priority: number;
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alnuzha_token") ?? "";
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", border: "1.5px solid #d4e8e0",
  borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif",
};

const SERVICES_CSS = `
  @keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
  .svc-wrap        { padding: 32px; }
  .svc-hdr         { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .svc-btns        { display: flex; gap: 8px; }
  .svc-search      { display: flex; align-items: center; gap: 8px; border: 1px solid #e0e0dc; border-radius: 8px; padding: 8px 12px; background: #fff; margin-bottom: 16px; max-width: 300px; }
  .svc-table-wrap  { display: block; overflow-x: auto; }
  .svc-card-list   { display: none; flex-direction: column; gap: 10px; padding: 12px; }
  @media (max-width: 640px) {
    .svc-wrap        { padding: 16px 14px 40px; }
    .svc-hdr         { flex-wrap: wrap; gap: 12px; }
    .svc-btns        { width: 100%; }
    .svc-btns button { flex: 1; justify-content: center; }
    .svc-search      { max-width: 100%; }
    .svc-table-wrap  { display: none !important; }
    .svc-card-list   { display: flex !important; }
  }
`;

const btnPrimary = (busy: boolean): React.CSSProperties => ({
  padding: "12px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0F6E56,#1a9e75)",
  color: "#fff", fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
});

const btnCancel: React.CSSProperties = {
  padding: "12px", borderRadius: 50, border: "1.5px solid #e8ebe6", background: "#fff",
  color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
};

const modalBox = (maxWidth: number): React.CSSProperties => ({
  background: "#fff", borderRadius: 20, width: "100%", maxWidth, padding: "32px 32px 28px",
  position: "relative", maxHeight: "90vh", overflowY: "auto",
});

const formatPrice = (n: number) => `AED ${Number(n).toFixed(2)}`;

// Same order as the API: priority ascending, then newest first
const byPriority = (a: Service, b: Service) =>
  a.priority - b.priority || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

function CustomQuoteBadge() {
  return (
    <span style={{ fontSize: 11, background: "#FAEEDA", color: "#633806", padding: "3px 9px", borderRadius: 10, fontWeight: 600, whiteSpace: "nowrap" }}>
      Custom quote
    </span>
  );
}

function PriceCell({ s }: { s: Service }) {
  return s.isCustomQuote || s.startingPrice === null ? <CustomQuoteBadge /> : <>{formatPrice(s.startingPrice)}</>;
}

function Thumb({ src, size }: { src: string; size: number }) {
  const [broken, setBroken] = useState(false);
  const box: React.CSSProperties = { width: size, height: size, borderRadius: 8, flexShrink: 0, border: "1px solid #e8ebe6" };
  if (!src || broken) {
    return (
      <div style={{ ...box, background: "#F7F8F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ImageIcon size={size * 0.4} color="#ccc" />
      </div>
    );
  }
  return <img src={src} alt="" onError={() => setBroken(true)} style={{ ...box, objectFit: "cover" }} />;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");

  // Add / Edit modal (editing === null means "add")
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Service | null>(null);
  const [form, setForm]         = useState({ title: "", startingPrice: "", isCustomQuote: false, priority: "0" });
  const [file, setFile]         = useState<File | null>(null);
  const [preview, setPreview]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [formErr, setFormErr]   = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef            = useRef<HTMLInputElement>(null);

  // Delete modal
  const [toDelete, setToDelete] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  function fetchServices() {
    return api.listServices()
      .then(res => setServices(res as Service[]))
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load services"))
      .finally(() => setLoading(false));
  }

  function load() {
    setLoading(true);
    setError("");
    fetchServices();
  }

  // Initial load: `loading` already starts true, so state is only set in the promise callbacks
  useEffect(() => { fetchServices(); }, []);

  // Free the object URL for a locally picked image when it changes or the page unmounts
  useEffect(() => {
    if (!preview.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const filtered = services
    .filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()))
    .sort(byPriority);

  function openAdd() {
    setEditing(null);
    setForm({ title: "", startingPrice: "", isCustomQuote: false, priority: "0" });
    setFile(null);
    setPreview("");
    setFormErr("");
    setShowForm(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({
      title: s.title,
      startingPrice: s.startingPrice === null ? "" : String(s.startingPrice),
      isCustomQuote: s.isCustomQuote,
      priority: String(s.priority ?? 0),
    });
    setFile(null);
    setPreview(assetUrl(s.thumbnail));
    setFormErr("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setDragOver(false);
  }

  function pickFile(f: File) {
    if (!IMAGE_TYPES.includes(f.type)) { setFormErr("Thumbnail must be a JPG, PNG, WEBP or GIF image."); return; }
    if (f.size > MAX_IMAGE_BYTES)      { setFormErr("Thumbnail must be 5 MB or smaller."); return; }
    setFormErr("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault();
    const title    = form.title.trim();
    const price    = Number(form.startingPrice);
    const priority = Number(form.priority);
    if (!title) { setFormErr("Title is required."); return; }
    if (!form.isCustomQuote && (form.startingPrice === "" || !(price >= 0))) {
      setFormErr("Starting price must be 0 or more (or mark this service as a custom quote)."); return;
    }
    if (form.priority === "" || !Number.isInteger(priority) || priority < 0) {
      setFormErr("Priority must be a whole number, 0 or more."); return;
    }
    if (!editing && !file) { setFormErr("Thumbnail image is required."); return; }

    // On edit, only send what changed
    const body = new FormData();
    if (!editing || title !== editing.title)                  body.append("title", title);
    if (!editing || form.isCustomQuote !== editing.isCustomQuote) body.append("isCustomQuote", String(form.isCustomQuote));
    if (!form.isCustomQuote && (!editing || price !== editing.startingPrice)) body.append("startingPrice", String(price));
    if (!editing || priority !== editing.priority)            body.append("priority", String(priority));
    if (file)                                                 body.append("thumbnail", file);

    setSaving(true);
    setFormErr("");
    try {
      if (editing) {
        const updated = await api.updateService(editing.id, body, getToken()) as Service;
        setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
      } else {
        const created = await api.createService(body, getToken()) as Service;
        setServices(prev => [created, ...prev]);
      }
      setShowForm(false);
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : "Failed to save service");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteErr("");
    try {
      await api.deleteService(toDelete.id, getToken());
      setServices(prev => prev.filter(s => s.id !== toDelete.id));
      setToDelete(null);
    } catch (err: unknown) {
      setDeleteErr(err instanceof Error ? err.message : "Failed to delete service");
    } finally {
      setDeleting(false);
    }
  }

  const actionBtn = (color: string, border: string): React.CSSProperties => ({
    fontSize: 12, padding: "4px 10px", border: `1px solid ${border}`, borderRadius: 6, background: "transparent",
    cursor: "pointer", color, display: "flex", alignItems: "center", gap: 4,
  });

  return (
    <div className="svc-wrap">
      <style>{SERVICES_CSS}</style>

      {/* Header */}
      <div className="svc-hdr">
        <div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Services</h1>
          <p style={{ color: "#888", fontSize: 13 }}>
            {loading ? "Loading…" : `${services.length} service${services.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="svc-btns">
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: "1px solid #e8ebe6", background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={14} /> Add Service
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="svc-search">
        <Search size={13} color="#aaa" />
        <input
          type="text"
          placeholder="Search services…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: "none", outline: "none", fontSize: 13, background: "transparent", width: "100%", color: "#1a1a18" }}
        />
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#888", fontSize: 14, marginTop: 32 }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading…
        </div>
      )}

      {error && !loading && (
        <div style={{ background: "#FCEBEB", border: "1px solid #f5c6c6", borderRadius: 10, padding: "14px 18px", color: "#791F1F", fontSize: 13 }}>{error}</div>
      )}

      {!loading && !error && (
        <div style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 12, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 14 }}>
              {search ? "No services match your search." : "No services yet. Click “Add Service” to create one."}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="svc-table-wrap">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
                  <thead>
                    <tr style={{ background: "#F7F8F6" }}>
                      {["Priority", "Thumbnail", "Title", "Starting price", "Last updated", ""].map(h => (
                        <th key={h} style={{ padding: "12px 24px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, borderBottom: "1px solid #e8ebe6", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr key={s.id} style={{ borderBottom: "1px solid #f0f0ec" }}>
                        <td style={{ padding: "10px 24px", width: 80, color: "#555", fontWeight: 700 }}>{s.priority}</td>
                        <td style={{ padding: "10px 24px", width: 88 }}><Thumb src={assetUrl(s.thumbnail)} size={52} /></td>
                        <td style={{ padding: "10px 24px", fontWeight: 600, color: "#1a1a18" }}>{s.title}</td>
                        <td style={{ padding: "10px 24px", color: "#333", whiteSpace: "nowrap" }}><PriceCell s={s} /></td>
                        <td style={{ padding: "10px 24px", color: "#aaa", whiteSpace: "nowrap" }}>{new Date(s.updatedAt).toLocaleDateString()}</td>
                        <td style={{ padding: "10px 24px" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button onClick={() => openEdit(s)} style={actionBtn("#0F6E56", "#d4e8e0")}>
                              <Pencil size={11} /> Edit
                            </button>
                            <button onClick={() => { setToDelete(s); setDeleteErr(""); }} style={actionBtn("#A32D2D", "#f5c6c6")}>
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="svc-card-list">
                {filtered.map(s => (
                  <div key={s.id} style={{ background: "#fff", border: "1px solid #e8ebe6", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                      <Thumb src={assetUrl(s.thumbnail)} size={60} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a18", overflowWrap: "anywhere" }}>{s.title}</div>
                        <div style={{ fontSize: 13, color: "#333", marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {s.isCustomQuote || s.startingPrice === null ? <CustomQuoteBadge /> : <>From {formatPrice(s.startingPrice)}</>}
                          <span style={{ fontSize: 11, color: "#888" }}>Priority {s.priority}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEdit(s)} style={{ ...actionBtn("#0F6E56", "#d4e8e0"), flex: 1, padding: 8, borderRadius: 8, justifyContent: "center", fontWeight: 600 }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => { setToDelete(s); setDeleteErr(""); }} style={{ ...actionBtn("#A32D2D", "#f5c6c6"), flex: 1, padding: 8, borderRadius: 8, justifyContent: "center", fontWeight: 600 }}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Add / Edit Modal ────────────────────────────────── */}
      {showForm && (
        <div style={overlay}>
          <div style={modalBox(460)}>
            <button onClick={closeForm} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {editing ? "Edit Service" : "Add Service"}
            </h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 22 }}>
              {editing ? editing.title : "Shown on the website with its thumbnail and starting price."}
            </p>

            <form onSubmit={handleSave} noValidate>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 }}>
                  Title <span style={{ color: "#e05252" }}>*</span>
                </label>
                <input
                  type="text"
                  maxLength={150}
                  placeholder="e.g. AC Repair"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  style={inp}
                />
              </div>

              {/* Custom quote toggle */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14, padding: "12px 14px", border: "1.5px solid #d4e8e0", borderRadius: 10, background: form.isCustomQuote ? "#e8f5f0" : "#fff", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.isCustomQuote}
                  onChange={e => setForm(p => ({ ...p, isCustomQuote: e.target.checked }))}
                  style={{ width: 16, height: 16, marginTop: 2, accentColor: "#0F6E56", flexShrink: 0 }}
                />
                <span>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1a1a18" }}>Custom quote</span>
                  <span style={{ display: "block", fontSize: 12, color: "#888", marginTop: 2 }}>No starting price — the price is calculated after the order.</span>
                </span>
              </label>

              {/* Starting price + priority on one row; priority takes the full row for custom quotes */}
              <div style={{ display: "grid", gridTemplateColumns: form.isCustomQuote ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 }}>
                {!form.isCustomQuote && (
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 }}>
                      Starting price (AED) <span style={{ color: "#e05252" }}>*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="e.g. 150.00"
                      value={form.startingPrice}
                      onChange={e => setForm(p => ({ ...p, startingPrice: e.target.value }))}
                      style={inp}
                    />
                  </div>
                )}

                <div style={{ minWidth: 0 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 }}>
                    Priority <span style={{ color: "#e05252" }}>*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    placeholder="e.g. 1"
                    value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    style={inp}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1", fontSize: 11, color: "#aaa", marginTop: -6 }}>
                  Priority: lower number is shown first (1 before 2).
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d5a4e", marginBottom: 5 }}>
                  Thumbnail image {!editing && <span style={{ color: "#e05252" }}>*</span>}
                </label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? "#0F6E56" : "#d4e8e0"}`, borderRadius: 12,
                    background: dragOver ? "#e8f5f0" : "#fafafa", cursor: "pointer", transition: "all 0.15s",
                    padding: preview ? 10 : "28px 20px", textAlign: "center",
                  }}
                >
                  {preview ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
                      <img src={preview} alt="Thumbnail preview" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#333", overflowWrap: "anywhere" }}>
                          {file ? file.name : "Current image"}
                        </div>
                        <div style={{ fontSize: 12, color: "#0F6E56", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <Upload size={12} /> Click or drop to replace
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload size={22} color={dragOver ? "#0F6E56" : "#aaa"} style={{ margin: "0 auto 8px" }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: dragOver ? "#0F6E56" : "#555", marginBottom: 4 }}>
                        Drop image here or click to browse
                      </div>
                      <div style={{ fontSize: 12, color: "#aaa" }}>JPG, PNG, WEBP or GIF · max 5 MB</div>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={IMAGE_TYPES.join(",")}
                    style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }}
                  />
                </div>
              </div>

              {formErr && <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 14 }}>{formErr}</div>}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={closeForm} style={btnCancel}>Cancel</button>
                <button type="submit" disabled={saving} style={btnPrimary(saving)}>
                  {saving
                    ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
                    : editing ? "Save Changes" : "Add Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Modal ────────────────────────────────────── */}
      {toDelete && (
        <div style={overlay}>
          <div style={modalBox(400)}>
            <button onClick={() => !deleting && setToDelete(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
              <X size={20} />
            </button>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Delete Service</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 18 }}>
              Delete <strong style={{ color: "#333" }}>{toDelete.title}</strong>? Its thumbnail image is removed too. This cannot be undone.
            </p>
            {deleteErr && <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "10px 14px", color: "#791F1F", fontSize: 13, marginBottom: 14 }}>{deleteErr}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <button type="button" onClick={() => setToDelete(null)} disabled={deleting} style={btnCancel}>Cancel</button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{ ...btnPrimary(deleting), background: "#C23B3B" }}
              >
                {deleting ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Deleting…</> : "Delete Service"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
