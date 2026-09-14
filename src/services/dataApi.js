const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
export const databaseApiEnabled = String(import.meta.env.VITE_USE_DATABASE_API || "false").toLowerCase() === "true";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Database request failed.");
  return data;
}

export const dataApi = {
  health: () => request("/api/db/health"),
  listLostItems: () => request("/api/db/lost-items"),
  saveLostItem: (item) => request("/api/db/lost-items", { method: "POST", body: JSON.stringify({ item }) }),
  listFoundItems: () => request("/api/db/found-items"),
  saveFoundItem: (item) => request("/api/db/found-items", { method: "POST", body: JSON.stringify({ item }) }),
  listClaims: () => request("/api/db/claims"),
  saveClaim: (claim) => request("/api/db/claims", { method: "POST", body: JSON.stringify({ claim }) }),
};
