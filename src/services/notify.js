// Email + in-app notification helper.
// Handles:
// 1. Lost-item match notifications
// 2. Found-item match notifications
// 3. Claimant notifications
// 4. Admin notifications for new lost reports
// 5. Admin notifications for new found reports
// 6. Admin notifications for new claims

import { readList, readValue, writeList } from "./store";
import { addNotification } from "./notifications";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// Administrator email address.
const ADMIN_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL || "admin-demo@example.com";

// AI match score required before sending a match email.
export const MATCH_ALERT_THRESHOLD = 60;

const NOTIFIED_MATCHES_KEY = "notifiedMatches";

async function post(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Notification request failed.");
  }

  return data;
}

export function getCurrentUserEmail() {
  const currentUser = readValue("currentUser", null);
  return currentUser?.email || "";
}

export function getAdminEmail() {
  return ADMIN_EMAIL;
}

function alreadyNotified(lostItemId, foundItemId) {
  const sent = readList(NOTIFIED_MATCHES_KEY);

  return sent.includes(`${lostItemId}:${foundItemId}`);
}

function markNotified(lostItemId, foundItemId) {
  const sent = readList(NOTIFIED_MATCHES_KEY);

  writeList(NOTIFIED_MATCHES_KEY, [
    ...sent,
    `${lostItemId}:${foundItemId}`,
  ]);
}

/* =========================================================
   ADMIN - NEW LOST ITEM
========================================================= */

export async function notifyAdminAboutLostReport(lostItem) {
  if (!lostItem) {
    return { skipped: "no-lost-item" };
  }

  const adminEmail = ADMIN_EMAIL;

  addNotification({
    userEmail: adminEmail,
    type: "ADMIN_LOST_REPORT",
    title: "New lost item report",
    message: `${lostItem.title || "A lost item"} has been reported and requires administrator review.`,
    relatedId: lostItem.id,
  });

  try {
    const result = await post(
      "/api/notify/admin-lost-report",
      {
        to: adminEmail,
        lostItem,
      }
    );

    console.log(
      "Admin lost-item email notification sent:",
      adminEmail
    );

    console.log(
      "Admin lost-item email result:",
      result
    );

    return {
      sent: true,
      ...result,
    };
  } catch (error) {
    console.warn(
      "Admin lost-item email not sent:",
      error.message
    );

    return {
      error: error.message,
    };
  }
}

/* =========================================================
   ADMIN - NEW FOUND ITEM
========================================================= */

export async function notifyAdminAboutFoundReport(foundItem) {
  if (!foundItem) {
    return { skipped: "no-found-item" };
  }

  const adminEmail = ADMIN_EMAIL;

  addNotification({
    userEmail: adminEmail,
    type: "ADMIN_FOUND_REPORT",
    title: "New found item report",
    message: `${foundItem.title || "A found item"} has been reported and requires administrator review.`,
    relatedId: foundItem.id,
  });

  try {
    const result = await post(
      "/api/notify/admin-found-report",
      {
        to: adminEmail,
        foundItem,
      }
    );

    console.log(
      "Admin found-item email notification sent:",
      adminEmail
    );

    console.log(
      "Admin found-item email result:",
      result
    );

    return {
      sent: true,
      ...result,
    };
  } catch (error) {
    console.warn(
      "Admin found-item email not sent:",
      error.message
    );

    return {
      error: error.message,
    };
  }
}

/* =========================================================
   ADMIN - NEW CLAIM
========================================================= */

export async function notifyAdminAboutClaim(
  claim,
  lostItem,
  foundItem
) {
  if (!claim) {
    return { skipped: "no-claim" };
  }

  const adminEmail = ADMIN_EMAIL;

  addNotification({
    userEmail: adminEmail,
    type: "ADMIN_CLAIM_SUBMITTED",
    title: "New claim requires review",
    message: `Claim ${claim.id || ""} has been submitted and requires administrator review.`,
    relatedId: claim.id,
  });

  try {
    const result = await post(
      "/api/notify/admin-claim-submitted",
      {
        to: adminEmail,
        claim,
        lostItem,
        foundItem,
      }
    );

    console.log(
      "Admin claim email notification sent:",
      adminEmail
    );

    console.log(
      "Admin claim email result:",
      result
    );

    return {
      sent: true,
      ...result,
    };
  } catch (error) {
    console.warn(
      "Admin claim email not sent:",
      error.message
    );

    return {
      error: error.message,
    };
  }
}

/* =========================================================
   USER - MATCH ALERT
========================================================= */

export async function sendMatchAlert({
  lostItem,
  foundItem,
  score,
  reason,
}) {
  if (!lostItem?.reporterEmail) {
    return {
      skipped: "no-reporter-email",
    };
  }

  if ((score ?? 0) < MATCH_ALERT_THRESHOLD) {
    return {
      skipped: "below-threshold",
    };
  }

  if (alreadyNotified(lostItem.id, foundItem.id)) {
    return {
      skipped: "already-notified",
    };
  }

  try {
    const result = await post(
      "/api/notify/match-alert",
      {
        to: lostItem.reporterEmail,
        lostItem,
        foundItem,
        score,
        reason,
      }
    );

    markNotified(
      lostItem.id,
      foundItem.id
    );

    addNotification({
      userEmail: lostItem.reporterEmail,
      type: "MATCH_FOUND",
      title: "Potential match found",
      message: `${foundItem.title || "A found item"} may match your lost report (${score}%).`,
      relatedId: foundItem.id,
    });

    console.log(
      "Match alert email sent:",
      lostItem.reporterEmail
    );

    console.log(
      "Match alert result:",
      result
    );

    return {
      sent: true,
      ...result,
    };
  } catch (error) {
    console.warn(
      "Match alert email not sent:",
      error.message
    );

    addNotification({
      userEmail: lostItem.reporterEmail,
      type: "MATCH_FOUND",
      title: "Potential match found",
      message: `${foundItem.title || "A found item"} may match your lost report (${score}%). Email delivery failed: ${error.message}`,
      relatedId: foundItem.id,
    });

    return {
      error: error.message,
    };
  }
}

/* =========================================================
   NEW FOUND ITEM
   Check against existing lost reports
========================================================= */

export async function checkAndNotifyForNewFoundItem(
  foundItem,
  matchItemsFn
) {
  if (!foundItem) {
    return [];
  }

  const activeLostItems = readList("lostItems").filter(
    (item) =>
      !["Resolved", "Claim Approved"].includes(
        item.status
      ) &&
      item.reporterEmail
  );

  const results = [];

  for (const lostItem of activeLostItems) {
    try {
      const { matches = [] } =
        await matchItemsFn(
          lostItem,
          [foundItem]
        );

      const bestMatch = matches.find(
        (match) =>
          String(match.candidateId) ===
          String(foundItem.id)
      );

      if (bestMatch) {
        const result = await sendMatchAlert({
          lostItem,
          foundItem,
          score: bestMatch.score,
          reason: bestMatch.reason,
        });

        results.push(result);
      }
    } catch (error) {
      console.warn(
        `AI matching failed for lost item ${lostItem.id}:`,
        error.message
      );
    }
  }

  return results;
}

/* =========================================================
   NEW LOST ITEM
   Check against existing found reports
========================================================= */

export async function checkAndNotifyForNewLostItem(
  lostItem,
  matchItemsFn
) {
  if (!lostItem?.reporterEmail) {
    return [];
  }

  const availableFoundItems =
    readList("foundItems").filter(
      (item) =>
        item.status ===
        "Available for Matching"
    );

  if (!availableFoundItems.length) {
    return [];
  }

  try {
    const { matches = [] } =
      await matchItemsFn(
        lostItem,
        availableFoundItems
      );

    const results = [];

    for (const match of matches) {
      const foundItem =
        availableFoundItems.find(
          (item) =>
            String(item.id) ===
            String(match.candidateId)
        );

      if (foundItem) {
        const result =
          await sendMatchAlert({
            lostItem,
            foundItem,
            score: match.score,
            reason: match.reason,
          });

        results.push(result);
      }
    }

    return results;
  } catch (error) {
    console.warn(
      "AI matching failed for new lost item:",
      error.message
    );

    return [];
  }
}

/* =========================================================
   USER - CLAIM SUBMITTED
========================================================= */

export async function sendClaimSubmittedEmail({
  claim,
  lostItem,
  foundItem,
}) {
  const to =
    claim?.claimantEmail ||
    lostItem?.reporterEmail;

  if (!to) {
    return {
      skipped: "no-recipient-email",
    };
  }

  addNotification({
    userEmail: to,
    type: "CLAIM_SUBMITTED",
    title: "Claim submitted",
    message: `Your ownership claim ${claim.id || ""} is waiting for admin review.`,
    relatedId: claim.id,
  });

  try {
    const result = await post(
      "/api/notify/claim-submitted",
      {
        to,
        claim,
        lostItem,
        foundItem,
      }
    );

    console.log(
      "Claim submitted email sent:",
      to
    );

    return {
      sent: true,
      ...result,
    };
  } catch (error) {
    console.warn(
      "Claim submitted email not sent:",
      error.message
    );

    return {
      error: error.message,
    };
  }
}

/* =========================================================
   USER - CLAIM STATUS
========================================================= */

export async function sendClaimStatusEmail({
  status,
  claim,
  lostItem,
  foundItem,
}) {
  const to =
    claim?.claimantEmail ||
    lostItem?.reporterEmail;

  if (!to) {
    return {
      skipped: "no-recipient-email",
    };
  }

  const titles = {
    "Ready for Collection":
      "Claim approved — ready for collection",

    Rejected:
      "Claim update",

    Collected:
      "Item collected — case closed",
  };

  const messages = {
    "Ready for Collection":
      `Your claim ${claim?.id || ""} was approved. Your collection code is ${claim?.collectionCode || "available in My Claims"}.`,

    Rejected:
      `Your claim ${claim?.id || ""} was rejected. ${
        claim?.adminNote ||
        "Please review the claim details."
      }`,

    Collected:
      `Your item has been marked as collected. Claim ${claim?.id || ""} is now closed.`,
  };

  addNotification({
    userEmail: to,
    type: `CLAIM_${String(status || "UPDATE")
      .toUpperCase()
      .replace(/\s+/g, "_")}`,
    title:
      titles[status] ||
      "Claim status updated",
    message:
      messages[status] ||
      `Your claim status changed to ${status}.`,
    relatedId: claim?.id,
  });

  try {
    const result = await post(
      "/api/notify/claim-status",
      {
        to,
        status,
        claim,
        lostItem,
        foundItem,
      }
    );

    console.log(
      "Claim status email sent:",
      to
    );

    return {
      sent: true,
      ...result,
    };
  } catch (error) {
    console.warn(
      "Claim status email not sent:",
      error.message
    );

    return {
      error: error.message,
    };
  }
}