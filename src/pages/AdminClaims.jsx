import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  FaBoxOpen,
  FaCheckCircle,
  FaClock,
  FaKey,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaTimesCircle,
} from "react-icons/fa";
import { generateCollectionCode, readList, repairApprovedClaimsMissingCodes, writeList } from "../services/store";
import { sendClaimStatusEmail } from "../services/notify";
import "./Claims.css";

function AdminClaims() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState(() => repairApprovedClaimsMissingCodes().slice().reverse());
  const [approvalDrafts, setApprovalDrafts] = useState({});
  const [collectionCodes, setCollectionCodes] = useState({});
  const lostItems = useMemo(() => readList("lostItems"), [claims]);
  const foundItems = useMemo(() => readList("foundItems"), [claims]);
  const getLost = (id) => lostItems.find((item) => String(item.id) === String(id));
  const getFound = (id) => foundItems.find((item) => String(item.id) === String(id));

  function refresh(nextClaims) {
    writeList("claims", nextClaims);
    setClaims(nextClaims.slice().reverse());
  }

  function updateDraft(id, field, value) {
    setApprovalDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  function approveClaim(id) {
    const draft = approvalDrafts[id] || {};
    const location = (draft.location || "Lost & Found Office, Main Reception").trim();
    const instructions = (draft.instructions || "Bring your claim reference and collection code. The administrator will confirm the code before releasing the item.").trim();
    if (!location) return alert("Enter a collection location.");

    const allClaims = readList("claims");
    const target = allClaims.find((claim) => claim.id === id);
    if (!target) return;
    const reviewedAt = new Date().toISOString();
    // Collection code is intentionally created only at the moment the admin approves the claim.
    const code = generateCollectionCode();

    const updatedClaims = allClaims.map((claim) => {
      if (claim.id === id) {
        return {
          ...claim,
          status: "Ready for Collection",
          adminNote: draft.note?.trim() || "Ownership verified and claim approved.",
          collectionLocation: location,
          collectionInstructions: instructions,
          collectionCode: code,
          codeIssuedAt: reviewedAt,
          reviewedAt,
        };
      }
      if (claim.status === "Pending Admin Review" && String(claim.foundItemId) === String(target.foundItemId)) {
        return {
          ...claim,
          status: "Rejected",
          adminNote: "Another verified claim for this found item was approved.",
          reviewedAt,
        };
      }
      return claim;
    });

    writeList("foundItems", readList("foundItems").map((item) =>
      String(item.id) === String(target.foundItemId) ? { ...item, status: "Reserved for Collection" } : item
    ));
    writeList("lostItems", readList("lostItems").map((item) =>
      String(item.id) === String(target.lostItemId) ? { ...item, status: "Claim Approved" } : item
    ));
    refresh(updatedClaims);

    const approvedClaim = updatedClaims.find((claim) => claim.id === id);
    sendClaimStatusEmail({
      status: "Ready for Collection",
      claim: approvedClaim,
      lostItem: getLost(target.lostItemId),
      foundItem: getFound(target.foundItemId),
    });

    // Also notify any competing pending claimant that their claim was closed.
    updatedClaims
      .filter((claim) => claim.status === "Rejected" && String(claim.foundItemId) === String(target.foundItemId) && String(claim.id) !== String(id))
      .forEach((rejectedClaim) => {
        sendClaimStatusEmail({
          status: "Rejected",
          claim: rejectedClaim,
          lostItem: getLost(rejectedClaim.lostItemId),
          foundItem: getFound(rejectedClaim.foundItemId),
        });
      });
  }

  function rejectClaim(id) {
    const reason = window.prompt("Reason for rejection:", "Ownership evidence was not sufficient for release.");
    if (reason === null) return;
    const reviewedAt = new Date().toISOString();
    const target = readList("claims").find((claim) => claim.id === id);
    const updatedClaims = readList("claims").map((claim) =>
      claim.id === id ? { ...claim, status: "Rejected", adminNote: reason.trim(), reviewedAt } : claim
    );
    refresh(updatedClaims);

    if (target) {
      sendClaimStatusEmail({
        status: "Rejected",
        claim: { ...target, adminNote: reason.trim() },
        lostItem: getLost(target.lostItemId),
        foundItem: getFound(target.foundItemId),
      });
    }
  }

  function markCollected(claim) {
    const entered = (collectionCodes[claim.id] || "").trim().toUpperCase();
    if (!entered) return alert("Enter the user's collection code first.");
    if (entered !== String(claim.collectionCode || "").toUpperCase()) {
      return alert("Collection code does not match. Do not release the item.");
    }

    const collectedAt = new Date().toISOString();
    const updatedClaims = readList("claims").map((entry) =>
      entry.id === claim.id ? { ...entry, status: "Collected", collectedAt } : entry
    );
    writeList("foundItems", readList("foundItems").map((item) =>
      String(item.id) === String(claim.foundItemId) ? { ...item, status: "Collected", collectedAt } : item
    ));
    writeList("lostItems", readList("lostItems").map((item) =>
      String(item.id) === String(claim.lostItemId) ? { ...item, status: "Resolved", resolvedAt: collectedAt } : item
    ));
    refresh(updatedClaims);
    setCollectionCodes((current) => ({ ...current, [claim.id]: "" }));

    sendClaimStatusEmail({
      status: "Collected",
      claim: { ...claim, collectedAt },
      lostItem: getLost(claim.lostItemId),
      foundItem: getFound(claim.foundItemId),
    });
  }

  return (
    <>
      <Navbar admin />
      <main className="claims-page claims-with-nav">
        <div className="claims-shell">
          <header className="claims-header">
            <div>
              <p className="claims-eyebrow">ADMIN CLAIM DESK</p>
              <h1><FaShieldAlt /> Claim & Collection Management</h1>
              <p>Review verified claims, issue collection details, and confirm the physical handover.</p>
            </div>
            <button className="secondary-action" onClick={() => navigate("/admin-dashboard")}>Admin Dashboard</button>
          </header>

          {!claims.length ? (
            <section className="claims-empty"><FaClock /><h2>No claims yet</h2><p>Ownership-verified claims will appear here.</p></section>
          ) : (
            <div className="claims-list">
              {claims.map((claim) => {
                const lost = getLost(claim.lostItemId);
                const found = getFound(claim.foundItemId);
                const draft = approvalDrafts[claim.id] || {};
                return (
                  <article className="claim-card" key={claim.id}>
                    <div className="claim-card-top">
                      <div>
                        <span className="claim-ref">{claim.id}</span>
                        <h2>{lost?.title || claim.searchItem?.title || "Lost item"} ↔ {found?.title || "Found item"}</h2>
                        <p>{claim.reason || "AI identified this as a potential match."}</p>
                      </div>
                      <span className={`claim-status ${claim.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {claim.status === "Collected" || claim.status === "Ready for Collection" ? <FaCheckCircle /> : claim.status === "Rejected" ? <FaTimesCircle /> : <FaClock />} {claim.status}
                      </span>
                    </div>

                    <div className="claim-meta-grid">
                      <div><span>AI match</span><strong>{claim.score ?? "—"}%</strong></div>
                      <div><span>Private questions</span><strong>{claim.correctAnswers ?? "—"}/{claim.totalQuestions ?? "—"} correct</strong></div>
                      <div><span>Submitted</span><strong>{claim.submittedAt ? new Date(claim.submittedAt).toLocaleString() : "—"}</strong></div>
                    </div>

                    <section className="admin-evidence-panel">
                      <div className="admin-evidence-header">
                        <div>
                          <span className="admin-evidence-kicker">VERIFICATION EVIDENCE</span>
                          <h3>Review before approval</h3>
                          <p>Check the AI comparison and the claimant's private ownership answers before issuing a collection code.</p>
                        </div>
                        <span className={`evidence-verdict ${claim.verificationPassed ? "passed" : "pending"}`}>
                          {claim.verificationPassed ? <><FaCheckCircle /> Ownership check passed</> : <><FaClock /> Review required</>}
                        </span>
                      </div>

                      <div className="admin-match-evidence">
                        <div className="admin-match-photo">
                          {found?.imageDataUrl ? <img src={found.imageDataUrl} alt="Matched found item" /> : <div className="admin-photo-placeholder"><FaBoxOpen /></div>}
                          <span>Matched office item</span>
                        </div>
                        <div className="admin-match-summary">
                          <div className="admin-score-row"><span>AI match score</span><strong>{claim.score ?? "—"}%</strong></div>
                          <p>{claim.comparison?.summary || claim.reason || "AI identified this record as a potential match."}</p>
                        </div>
                      </div>

                      <div className="admin-comparison-grid">
                        <div className="admin-comparison-card good">
                          <h4><FaCheckCircle /> Similarities</h4>
                          {claim.comparison?.similarities?.length ? (
                            <ul>{claim.comparison.similarities.map((item, index) => <li key={`sim-${index}`}>{item}</li>)}</ul>
                          ) : <p>No stored similarity details are available for this older claim.</p>}
                        </div>
                        <div className="admin-comparison-card caution">
                          <h4><FaTimesCircle /> Differences</h4>
                          {claim.comparison?.differences?.length ? (
                            <ul>{claim.comparison.differences.map((item, index) => <li key={`diff-${index}`}>{item}</li>)}</ul>
                          ) : <p>No important differences were recorded.</p>}
                        </div>
                      </div>

                      <div className="admin-qa-section">
                        <div className="admin-qa-heading">
                          <div><FaShieldAlt /><span>Ownership question review</span></div>
                          <strong>{claim.correctAnswers ?? "—"}/{claim.totalQuestions ?? "—"} consistent</strong>
                        </div>
                        {Array.isArray(claim.verificationEvidence) && claim.verificationEvidence.length ? (
                          <div className="admin-qa-list">
                            {claim.verificationEvidence.map((entry, index) => (
                              <article className="admin-qa-card" key={`${claim.id}-qa-${index}`}>
                                <div className="admin-qa-number">{index + 1}</div>
                                <div className="admin-qa-content">
                                  <h4>{entry.question}</h4>
                                  {entry.referenceAnswer && <div className="admin-answer-box"><span>Original private answer from lost report</span><p>{entry.referenceAnswer}</p></div>}
                                  <div className="admin-answer-box"><span>Ownership verification answer</span><p>{entry.answer || "No answer recorded"}</p></div>
                                  <div className={`admin-answer-result ${entry.consistent ? "consistent" : "review"}`}>
                                    {entry.consistent ? <FaCheckCircle /> : <FaTimesCircle />}
                                    <span>{entry.feedback || (entry.consistent ? "Consistent with protected record." : "Requires admin review.")}</span>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="admin-evidence-empty">Detailed question answers were not stored for this older claim. New claims will show all three questions and claimant answers here.</p>
                        )}
                      </div>
                    </section>

                    {claim.status === "Pending Admin Review" && (
                      <div className="admin-review-panel">
                        <h3>Approval & collection setup</h3><p className="approval-helper">No collection code exists yet. A new code will be generated only when you approve this claim.</p>
                        <div className="admin-form-grid">
                          <label><span><FaMapMarkerAlt /> Collection location</span><input value={draft.location || ""} onChange={(e) => updateDraft(claim.id, "location", e.target.value)} placeholder="e.g. Main Reception, Level 1" /></label>
                          <label><span>Admin note</span><input value={draft.note || ""} onChange={(e) => updateDraft(claim.id, "note", e.target.value)} placeholder="Optional note for claimant" /></label>
                        </div>
                        <label className="admin-textarea-label"><span>Collection instructions</span><textarea value={draft.instructions || ""} onChange={(e) => updateDraft(claim.id, "instructions", e.target.value)} placeholder="What should the user bring or do at collection?" /></label>
                        <div className="claims-actions">
                          <button className="approve-action" onClick={() => approveClaim(claim.id)}><FaCheckCircle /> Approve Claim & Issue Code</button>
                          <button className="reject-action" onClick={() => rejectClaim(claim.id)}><FaTimesCircle /> Reject Claim</button>
                        </div>
                      </div>
                    )}

                    {claim.adminNote && <div className="admin-note"><strong>Admin note:</strong> {claim.adminNote}</div>}

                    {claim.status === "Ready for Collection" && (
                      <div className="handover-panel">
                        <div>
                          <p className="claims-eyebrow">PHYSICAL HANDOVER</p>
                          <h3><FaBoxOpen /> Confirm collection</h3>
                          <p>Ask the claimant for the six-character collection code shown in My Claims. Do not release the item if it does not match.</p>
                        </div>
                        <div className="handover-code-row">
                          <div className="issued-code"><FaKey /><span>Issued code</span><strong>{claim.collectionCode}</strong></div>
                          <input value={collectionCodes[claim.id] || ""} onChange={(e) => setCollectionCodes((current) => ({ ...current, [claim.id]: e.target.value.toUpperCase() }))} placeholder="Enter claimant code" maxLength={6} />
                          <button className="approve-action" onClick={() => markCollected(claim)}><FaCheckCircle /> Mark as Collected</button>
                        </div>
                      </div>
                    )}

                    {claim.status === "Collected" && (
                      <div className="collected-banner"><FaCheckCircle /><div><strong>Handover completed</strong><p>Collected on {new Date(claim.collectedAt).toLocaleString()}.</p></div></div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default AdminClaims;
