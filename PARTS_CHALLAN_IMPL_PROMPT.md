# Implementation Prompt — Parts Catalogue, Purchase Challan & Month-End Reconciliation

## Stack & Conventions (read before touching any file)

- **Framework**: Next.js 16 App Router · React 19 · TypeScript 5 · pnpm
- **Styling**: Inline `style={{}}` props are the dominant pattern. Tailwind is imported but used sparingly. Use CSS variables for all colors (see palette below).
- **Fonts**: `font-family: var(--font-display)` (Fraunces, serif) on every heading/title. `var(--font-body)` (Plus Jakarta Sans) on body/UI text.
- **Auth token**: `localStorage.getItem("alnuzha_token")` — pass as third arg to `apiFetch` / as `token` to all `api.*` calls.
- **API client**: `lib/api.ts` exports `apiFetch<T>(path, options?, token?)` and the `api` object.
- **Every new page**: must begin with `"use client";`.
- **No new comments** unless the WHY is non-obvious.

### CSS variable palette
```
--brand        #0a4a35   dark brand
--brand-mid    #0f6e56   primary brand (buttons, active states)
--brand-light  #1a9e75   lighter brand
--brand-pale   #e8f5f0   tinted background / active sidebar bg
--brand-dark   #062b1f   footer / dark bg
--accent       #e8a045   amber CTA
--text-1       #0f1a15   primary text
--text-2       #3d5a4e   secondary text
--text-3       #7a9b8e   muted text
--border       #d4e8e0   card / input borders
--surface      #f5faf8   page surface tint
```

---

## Step 1 — Add API methods to `lib/api.ts`

Inside the `api` object, after the existing Parts block, add:

```ts
// Challans
getChallans:      (token: string)                              => apiFetch("/parts/challans",           {}, token),
getChallan:       (id: string, token: string)                  => apiFetch(`/parts/challans/${id}`,     {}, token),
createChallan:    (body: object, token: string)                => apiFetch("/parts/challans",           { method: "POST", body: JSON.stringify(body) }, token),
setRemainingQty:  (id: string, body: object, token: string)   => apiFetch(`/parts/${id}/set-remaining`,{ method: "PATCH", body: JSON.stringify(body) }, token),
```

---

## Step 2 — Update `app/components/AdminSidebar.tsx`

Change the Inventory nav item:

```ts
// BEFORE
{ href: "/admin/inventory", label: "Inventory", icon: Package },

// AFTER
{ href: "/admin/parts", label: "Parts", icon: Package },
```

Also update the active highlight logic — the sidebar uses `path === href` which is exact match. The parts sub-pages (`/admin/parts/challans`, etc.) will NOT highlight "Parts" unless you change the check to `path.startsWith(href)`. Update the active condition:

```ts
// BEFORE
const active = path === href;

// AFTER
const active = href === "/admin" ? path === href : path.startsWith(href);
```

---

## Step 3 — Create `app/admin/parts/page.tsx` (Parts Catalogue)

### What it does
- Two tabs: **All Parts** | **Pending Review**
- Month-End banner always visible at the top
- Top-bar buttons: **Add Part** (opens modal) · **New Challan** (`router.push("/admin/parts/challans/new")`) · **View Challans** (`router.push("/admin/parts/challans")`)

### Data fetching
On mount fetch both:
- `api.getParts(token)` → `Part[]` for the All Parts tab
- `api.getPendingReview(token)` → `Part[]` for Pending Review tab

### Part interface
```ts
interface Part {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;      // may come as string from API — always use Number(p.unitPrice)
  stockQty: number;       // same — Number(p.stockQty)
  minStockLevel: number;  // same — Number(p.minStockLevel)
  needsReview: boolean;
  updatedAt: string;
}
```

### All Parts tab — table columns
| Column | Note |
|---|---|
| Part name | Bold. Show `Review` amber chip if `needsReview` |
| SKU | Monospace, muted. `p.sku ?? "—"` |
| Unit price | `AED ${Number(p.unitPrice).toFixed(2)}` |
| In stock | Bold. Red `#A32D2D` if `Number(p.stockQty) <= Number(p.minStockLevel)`, else green `#27500A` |
| Min. level | Muted |
| Status | `<Badge variant={isLow ? "low" : "ok"} label={isLow ? "Low stock" : "In stock"} />` — import from `../../components/Badge` |
| Actions | "Set Remaining" button (opens Set Remaining modal) |

### Set Remaining modal
```
Title: "Set Remaining — {part.name}"
Subtitle: "currently {part.stockQty} in stock"
Field: number input, min 0, label "Physical count (actual qty in storeroom)"
On submit: api.setRemainingQty(part.id, { qty: Number(value) }, token)
On success: update that row's stockQty in local state (no full refetch needed)
Warning: if submitted qty < Number(part.minStockLevel), show amber inline warning:
  "Stock below minimum — consider ordering more"
```

### Add Part modal
```
Fields: name (text, required), SKU (text, required), unitPrice (number, required),
        minStockLevel (number, default 5)
Note under form: "Initial stock is 0. Use a Purchase Challan to add stock."
On submit: api.createPart({ name, sku, unitPrice: parseFloat(v), stockQty: 0,
           minStockLevel: parseInt(v) }, token)
On success: prepend new part to local state, close modal
```

### Pending Review tab
Same table structure but only parts where `needsReview === true`.
Replace "Set Remaining" button with **"Approve"** button.

**Approve modal:**
```
Title: "Approve — {part.name}"
Fields: SKU (text, pre-filled with part.sku), Unit price (number, pre-filled),
        Min. stock level (number, pre-filled with part.minStockLevel)
On submit: api.approvePart(part.id, { sku, unitPrice: parseFloat(v),
           minStockLevel: parseInt(v) }, token)
On success: remove the part from pendingReview list in local state
```

### Month-End banner
Always visible above the table (not a conditional). Style as an info-teal card:
```
background: #e8f5f0, border: 1px solid #b2dfd0, borderRadius: 12
Title: "Month-End Stock Check"
Body: "Count physical stock in the storeroom and click Set Remaining on each part to record the actual remaining quantity."
```

---

## Step 4 — Create `app/admin/parts/challans/page.tsx` (Challan List)

### Data fetching
`api.getChallans(token)` → `PartChallan[]`

### PartChallan interface
```ts
interface ChallanItem {
  id: string;
  quantity: number;
  unitPrice: number;
  part: { id: string; name: string; sku: string };
}
interface PartChallan {
  id: string;
  challanNumber: string;
  purchaseDate: string;      // YYYY-MM-DD
  supplierName: string | null;
  createdAt: string;
  items: ChallanItem[];
}
```

### Table columns
| Column | Note |
|---|---|
| Challan # | Bold, monospace |
| Purchase Date | Format as `DD MMM YYYY` |
| Supplier | `challan.supplierName ?? "—"` |
| Items | `challan.items.length` parts |
| Created | Relative or absolute date |
| Action | "View" button → `router.push("/admin/parts/challans/" + challan.id)` |

### Top bar
- Page title: "Purchase Challans" (Fraunces heading)
- Buttons: **Refresh** | **← Back to Parts** (`router.push("/admin/parts")`) | **New Challan** (`router.push("/admin/parts/challans/new")`)

---

## Step 5 — Create `app/admin/parts/challans/new/page.tsx` (Create Challan)

### Form layout
**Header section:**
- Challan Number — text input, required. Placeholder: `CH-2026-06-001`
- Purchase Date — `<input type="date">`, required, default to today (`new Date().toISOString().split("T")[0]`)
- Supplier Name — text input, optional

**Line items section** (dynamic, managed as an array in state):

Each row:
- Part — `<select>` populated from `api.getParts(token)` on mount. Option text: `{part.name} ({part.sku ?? "no SKU"})`
- Qty — number input, min 1
- Unit Price (AED) — number input, min 0, step 0.01

Buttons: **+ Add item** (appends a blank row) | **× Remove** on each row (disabled when only 1 row remains)

### Submission
```ts
const payload = {
  challanNumber,
  purchaseDate,
  supplierName: supplierName || undefined,
  items: rows.map(r => ({
    partId: r.partId,
    quantity: parseInt(r.qty, 10),
    unitPrice: parseFloat(r.unitPrice),
  })),
};
await api.createChallan(payload, token);
router.push("/admin/parts/challans");
```

On error: show red error banner above the submit button.

### Top bar
- Back link: `← Challans` → `/admin/parts/challans`
- Title: "New Purchase Challan" (Fraunces heading)

---

## Step 6 — Create `app/admin/parts/challans/[id]/page.tsx` (Challan Detail)

### Data fetching
`api.getChallan(params.id, token)` → `PartChallan`

Use `useParams()` from `next/navigation` to get `id`.

### Layout
**Header card:**
- Challan Number (large, Fraunces)
- Purchase Date · Supplier · Created At (3-column info row)

**Items table columns:**
| Column | Note |
|---|---|
| Part name | `item.part.name` |
| SKU | `item.part.sku ?? "—"`, monospace |
| Qty | `item.quantity` |
| Unit price | `AED ${Number(item.unitPrice).toFixed(2)}` |
| Subtotal | `AED ${(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}` |

**Footer row:** Total value = sum of all subtotals, right-aligned, bold.

**Top bar buttons:** `← Back to Challans` → `/admin/parts/challans`

---

## File structure to create

```
app/admin/parts/
  page.tsx                         ← Parts catalogue (Step 3)
  challans/
    page.tsx                       ← Challan list (Step 4)
    new/
      page.tsx                     ← Create challan form (Step 5)
    [id]/
      page.tsx                     ← Challan detail (Step 6)
```

Modify:
- `lib/api.ts` — add 4 methods (Step 1)
- `app/components/AdminSidebar.tsx` — update nav link + active logic (Step 2)

---

## Reusable input style (copy from existing inventory page)

```ts
const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", border: "1.5px solid #d4e8e0",
  borderRadius: 10, fontSize: 14, outline: "none",
  fontFamily: "Plus Jakarta Sans, sans-serif",
};
```

## Modal overlay pattern (copy from existing inventory page)

```tsx
<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
  <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480,
                padding: "32px 32px 28px", position: "relative" }}>
    {/* X close button top-right */}
    {/* content */}
  </div>
</div>
```

## Spinner pattern

```tsx
import { Loader2 } from "lucide-react";
<style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
<Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
```

---

## Business rules to enforce in UI

1. Stock only goes UP via a purchase challan — never via a direct "Add Stock" button.
2. "Set Remaining" is month-end physical count, not a delta — it SETS the absolute value.
3. Workers submitting job reports do NOT affect stock — never show a stock-deduction UI.
4. A part with `needsReview: true` was created by a technician in the field — keep it in the Pending Review tab until approved.
5. Low stock = `Number(p.stockQty) <= Number(p.minStockLevel)` — always coerce to Number before comparing.
