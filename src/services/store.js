// Demo data adapter.
// The app intentionally uses localStorage until the MongoDB teammate finishes the database.
// Keep page code behind this module so the storage implementation can later be replaced
// by REST API calls without changing the claim workflow or UI structure.

export const KEYS = {
  users: "users",
  currentUser: "currentUser",
  lostItems: "lostItems",
  foundItems: "foundItems",
  claims: "claims",
  activeClaim: "activeClaim",
  latestClaimVerification: "latestClaimVerification",
  latestSubmittedClaim: "latestSubmittedClaim",
};

export function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function writeList(key, value) {
  localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
  return value;
}

export function readValue(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeValue(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
}

export function updateListItem(key, id, updater) {
  const next = readList(key).map((item) =>
    String(item.id) === String(id)
      ? typeof updater === "function" ? updater(item) : { ...item, ...updater }
      : item
  );
  return writeList(key, next);
}

export function generateCollectionCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}


export function issueCollectionCodeForClaim(claim) {
  if (!claim) return claim;
  const approvedStatuses = ["Approved", "Ready for Collection"];
  if (!approvedStatuses.includes(claim.status)) return claim;
  if (String(claim.collectionCode || "").trim()) return claim;

  const issuedAt = claim.codeIssuedAt || claim.reviewedAt || new Date().toISOString();
  return {
    ...claim,
    status: "Ready for Collection",
    collectionCode: generateCollectionCode(),
    codeIssuedAt: issuedAt,
    reviewedAt: claim.reviewedAt || issuedAt,
    collectionLocation: claim.collectionLocation || "Lost & Found Office, Main Reception",
    collectionInstructions:
      claim.collectionInstructions ||
      "Bring your claim reference and collection code. The administrator will confirm the code before releasing the item.",
  };
}

export function repairApprovedClaimsMissingCodes() {
  const claims = readList(KEYS.claims);
  let changed = false;
  const repaired = claims.map((claim) => {
    const next = issueCollectionCodeForClaim(claim);
    if (next !== claim) changed = true;
    return next;
  });
  if (changed) writeList(KEYS.claims, repaired);
  return repaired;
}

export function claimStage(status) {
  if (status === "Collected") return 4;
  if (status === "Ready for Collection" || status === "Approved") return 3;
  if (status === "Pending Admin Review") return 2;
  if (status === "Rejected") return 2;
  return 1;
}
