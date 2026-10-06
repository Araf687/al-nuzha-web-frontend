// ── CoolDesk API client ────────────────────────────────────────────
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  // Let the browser set the multipart boundary for FormData bodies
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message: string }).message ?? "API error");
  }
  return res.json() as Promise<T>;
}

// Uploaded files (e.g. /uploads/services/x.jpg) are served from the API origin, without /api/v1
export function assetUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE.replace(/\/api\/v\d+\/?$/, "")}${path}`;
}

interface StaffPerformanceRow {
  technicianId: string;
  name: string;
  jobsCompleted: number | string | null;
  totalRevenue: number | string | null;
  avgDurationHours: number | string | null;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeStaffPerformance(rows: StaffPerformanceRow[]) {
  return rows.map((row) => ({
    ...row,
    jobsCompleted: toNumber(row.jobsCompleted),
    totalRevenue: toNumber(row.totalRevenue),
    avgDurationHours: toNumber(row.avgDurationHours),
  }));
}

export const api = {
  // Auth
  loginCustomer:    (body: object) => apiFetch("/auth/customer/login",    { method: "POST", body: JSON.stringify(body) }),
  registerCustomer: (body: object) => apiFetch("/auth/customer/register", { method: "POST", body: JSON.stringify(body) }),
  loginTechnician:  (body: object) => apiFetch("/auth/technician/login",  { method: "POST", body: JSON.stringify(body) }),

  // Customers
  getCustomers:  (token: string) => apiFetch("/customers", {}, token),
  getCustomer:   (id: string, token: string) => apiFetch(`/customers/${id}`, {}, token),

  // Technicians
  getTechnicians:   (token: string) => apiFetch("/technicians", {}, token),
  createTechnician: (body: object, token: string) => apiFetch("/technicians", { method: "POST", body: JSON.stringify(body) }, token),
  updateTechnician:         (id: string, body: object, token: string) => apiFetch(`/technicians/${id}`,                { method: "PATCH", body: JSON.stringify(body) }, token),
  resetTechnicianPassword:  (id: string, body: object, token: string) => apiFetch(`/technicians/${id}/reset-password`, { method: "PATCH", body: JSON.stringify(body) }, token),
  resetCustomerPassword:    (id: string, body: object, token: string) => apiFetch(`/customers/${id}/reset-password`,   { method: "PATCH", body: JSON.stringify(body) }, token),

  // Service requests
  createRequest:   (body: object)                    => apiFetch("/service-requests",                           { method: "POST", body: JSON.stringify(body) }),
  getRequests:     (token: string, params = "")      => apiFetch(`/service-requests${params}`,                  {}, token),
  getMonthlyStats: (token: string)                   => apiFetch("/service-requests/stats/monthly",             {}, token),
  myOrders:        (token: string)                   => apiFetch("/service-requests/my-orders",                 {}, token),
  assignTechnician:(id: string, body: object, token: string) => apiFetch(`/service-requests/${id}/assign`,     { method: "PATCH", body: JSON.stringify(body) }, token),
  updateStatus:    (id: string, body: object, token: string) => apiFetch(`/service-requests/${id}/status`,     { method: "PATCH", body: JSON.stringify(body) }, token),
  createRecurring: (id: string, body: object, token: string) => apiFetch(`/service-requests/${id}/recurring`,  { method: "POST",  body: JSON.stringify(body) }, token),

  // Job reports
  getStaffPerformance: async (token: string) => normalizeStaffPerformance(
    await apiFetch<StaffPerformanceRow[]>("/job-reports/staff-performance", {}, token),
  ),
  getMyJobs:           (token: string) => apiFetch("/job-reports/my-jobs",            {}, token),

  // Parts
  getParts:          (token: string)                              => apiFetch("/parts",                    {}, token),
  getLowStock:       (token: string)                              => apiFetch("/parts/low-stock",           {}, token),
  getPendingReview:  (token: string)                              => apiFetch("/parts/pending-review",      {}, token),
  createPart:        (body: object, token: string)                => apiFetch("/parts",                    { method: "POST",  body: JSON.stringify(body) }, token),
  bulkCreateParts:   (body: object, token: string)                => apiFetch("/parts/bulk",               { method: "POST",  body: JSON.stringify(body) }, token),
  updatePart:        (id: string, body: object, token: string)   => apiFetch(`/parts/${id}`,              { method: "PATCH", body: JSON.stringify(body) }, token),
  restockPart:       (id: string, body: object, token: string)   => apiFetch(`/parts/${id}/restock`,      { method: "PATCH", body: JSON.stringify(body) }, token),
  approvePart:       (id: string, body: object, token: string)   => apiFetch(`/parts/${id}/approve`,      { method: "PATCH", body: JSON.stringify(body) }, token),
  setRemainingQty:   (id: string, body: object, token: string)   => apiFetch(`/parts/${id}/set-remaining`,{ method: "PATCH", body: JSON.stringify(body) }, token),

  // Challans
  getChallans:    (token: string)                  => apiFetch("/parts/challans",         {}, token),
  getChallan:     (id: string, token: string)      => apiFetch(`/parts/challans/${id}`,   {}, token),
  createChallan:      (body: object, token: string) => apiFetch("/parts/challans",         { method: "POST", body: JSON.stringify(body) }, token),
  bulkCreateChallans: (body: object, token: string) => apiFetch("/parts/challans/bulk",    { method: "POST", body: JSON.stringify(body) }, token),

  // Invoices
  getInvoices:        (token: string, params = "") => apiFetch(`/invoices${params}`,          {}, token),
  getRevenueSummary:  (token: string)              => apiFetch("/invoices/revenue-summary",   {}, token),
  markInvoicePaid:    (id: string, body: object, token: string) => apiFetch(`/invoices/${id}/mark-paid`, { method: "PATCH", body: JSON.stringify(body) }, token),
  updateInvoicePayment: (id: string, body: object, token: string) => apiFetch(`/invoices/${id}/payment`, { method: "PATCH", body: JSON.stringify(body) }, token),
  myInvoices:         (token: string)              => apiFetch("/invoices/my-invoices",       {}, token),

  // Service request by ID
  getServiceRequest:  (id: string, token: string)  => apiFetch(`/service-requests/${id}`,    {}, token),

  // Invoice by ID
  getInvoice: (id: string, token: string) => apiFetch(`/invoices/${id}`, {}, token),

  // Dashboard — pass "?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD" to scope the window
  getDashboard: (token: string, params = "") => apiFetch(`/dashboard${params}`, {}, token),

  // Services catalogue
  getServices:      () => apiFetch("/services-catalogue"),

  // Services (title, startingPrice, thumbnail) — create/update take FormData
  listServices:  ()                                          => apiFetch("/services"),
  createService: (body: FormData, token: string)             => apiFetch("/services",       { method: "POST",   body }, token),
  updateService: (id: string, body: FormData, token: string) => apiFetch(`/services/${id}`, { method: "PATCH",  body }, token),
  deleteService: (id: string, token: string)                 => apiFetch(`/services/${id}`, { method: "DELETE" }, token),
  getReviews:       () => apiFetch("/reviews"),

  // Fuel logs — pass "?from=YYYY-MM-DD&to=YYYY-MM-DD&technicianId=" to filter
  getFuelLogs:    (token: string, params = "")              => apiFetch(`/fuel-logs${params}`,         {}, token),
  getFuelSummary: (token: string, params = "")              => apiFetch(`/fuel-logs/summary${params}`, {}, token),
  createFuelLog:  (body: object, token: string)             => apiFetch("/fuel-logs",       { method: "POST",   body: JSON.stringify(body) }, token),
  updateFuelLog:  (id: string, body: object, token: string) => apiFetch(`/fuel-logs/${id}`, { method: "PATCH",  body: JSON.stringify(body) }, token),
  deleteFuelLog:  (id: string, token: string)               => apiFetch(`/fuel-logs/${id}`, { method: "DELETE" }, token),
};
