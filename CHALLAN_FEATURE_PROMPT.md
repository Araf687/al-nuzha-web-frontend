# Frontend Integration Prompt — Parts Purchase Challan & Month-End Stock Reconciliation

## Context

This is the admin panel of CoolDesk (Next.js). The backend is a NestJS REST API at `http://localhost:3001/api/v1`. All parts/challan endpoints require a Bearer token in the `Authorization` header.

The parts inventory works on a manual admin-controlled cycle, NOT auto-deduction:

1. **Admin buys parts** → creates a purchase challan → stock goes up
2. **Workers use parts** on jobs (stock does NOT auto-change when workers submit job forms)
3. **End of month** → admin physically counts remaining stock → sets the exact remaining qty per part

---

## What to build

### 1. Parts Catalogue Page — `/admin/parts`

Show a table of all parts. Each row:

| Column | Source |
|--------|--------|
| Name | `part.name` |
| SKU | `part.sku` |
| Unit Price | `part.unitPrice` (AED) |
| In Stock | `part.stockQty` — highlight red if `stockQty <= minStockLevel` |
| Min Level | `part.minStockLevel` |
| Status | Badge: "Low Stock" if `stockQty <= minStockLevel`, else "OK" |
| Actions | "Set Remaining" button |

**"Set Remaining" button** — opens a modal/inline input:
- Label: "Enter actual remaining qty (physical count)"
- Input: number field, min 0
- Submit calls `PATCH /parts/:id/set-remaining` with body `{ "qty": <number> }`
- On success: refresh the row's stockQty in the UI

**Top bar buttons:**
- "Add Part" → simple form: name, SKU, unitPrice, minStockLevel (stockQty starts at 0 — use challan to add stock)
- "New Purchase Challan" → navigate to `/admin/parts/challans/new`
- "View Challans" → navigate to `/admin/parts/challans`

---

### 2. Create Challan Page — `/admin/parts/challans/new`

Form to record a new purchase batch.

**Header fields:**
- Challan Number (text, required) — e.g. `CH-2026-06-001`
- Purchase Date (date picker, required)
- Supplier Name (text, optional)

**Line items (dynamic — add/remove rows):**

Each row:
- Part (dropdown/searchable select — fetch from `GET /parts`, show name + SKU)
- Qty Purchased (number, min 1)
- Unit Price Paid (decimal)

Minimum 1 row required.

**Submit** calls `POST /parts/challans`:

```json
{
  "challanNumber": "CH-2026-06-001",
  "purchaseDate": "2026-06-10",
  "supplierName": "Dubai HVAC Supplies LLC",
  "items": [
    { "partId": "<uuid>", "quantity": 20, "unitPrice": 35.00 },
    { "partId": "<uuid>", "quantity": 10, "unitPrice": 85.00 }
  ]
}
```

On success: each part's `stockQty` is already updated by the backend. Show success toast and redirect to `/admin/parts/challans`.

---

### 3. Challan List Page — `/admin/parts/challans`

Table of all purchase challans ordered newest first.

Fetch: `GET /parts/challans`

| Column | Source |
|--------|--------|
| Challan # | `challan.challanNumber` |
| Purchase Date | `challan.purchaseDate` |
| Supplier | `challan.supplierName` |
| Items Count | `challan.items.length` |
| Created At | `challan.createdAt` |
| Action | "View" button |

Click "View" → `/admin/parts/challans/:id` (detail view showing all items with part name, qty, unitPrice).

---

### 4. Month-End Reconciliation Flow

On the Parts Catalogue page (`/admin/parts`), add a prominent section or banner when the month is ending (or always visible):

> **Month-End Stock Check**
> Count the physical stock in the storeroom and update remaining quantities below.

Each part row has a "Set Remaining" button (described in section 1 above).

UX notes:
- After admin clicks "Set Remaining" and submits, show the updated `stockQty` immediately (optimistic or refetch)
- If the submitted qty is less than `minStockLevel`, show a warning: "Stock below minimum — consider ordering more"

---

## API Reference

**Base URL:** `http://localhost:3001/api/v1`
**Auth:** `Authorization: Bearer <token>` on all requests

### Parts endpoints

```
GET    /parts                         → Part[]
GET    /parts/low-stock               → Part[]  (where stockQty <= minStockLevel)
GET    /parts/pending-review          → Part[]  (custom parts from technicians)
GET    /parts/:id                     → Part
POST   /parts                         → Part    body: { name, sku, unitPrice, stockQty, minStockLevel? }
PATCH  /parts/:id                     → Part    body: partial Part fields
PATCH  /parts/:id/set-remaining       → Part    body: { qty: number }
PATCH  /parts/:id/approve             → Part    body: { sku?, unitPrice?, minStockLevel? }
```

### Challan endpoints

```
GET    /parts/challans                → PartChallan[]
GET    /parts/challans/:id            → PartChallan
POST   /parts/challans                → PartChallan   (also increments stockQty for each item)
```

### Part shape

```typescript
{
  id: string;           // UUID
  name: string;
  sku: string;
  unitPrice: number;
  stockQty: number;     // current stock — updated by challan creation and set-remaining
  minStockLevel: number;
  needsReview: boolean; // true = custom part added by technician, needs admin approval
  updatedAt: string;    // ISO datetime
}
```

### PartChallan shape

```typescript
{
  id: string;
  challanNumber: string;
  purchaseDate: string;   // YYYY-MM-DD
  supplierName: string | null;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    part: Part;           // nested part object
  }[];
}
```

---

## Key business rules to reflect in UI

- Stock only goes UP when admin creates a challan
- Stock only gets corrected when admin uses "Set Remaining" (month-end physical count)
- Workers submitting job reports do NOT affect stock
- A part with `needsReview: true` was added by a technician in the field — show these in a separate "Pending Review" tab and allow admin to approve with proper SKU/price via `PATCH /parts/:id/approve`
- Low stock = `stockQty <= minStockLevel` — highlight these clearly
