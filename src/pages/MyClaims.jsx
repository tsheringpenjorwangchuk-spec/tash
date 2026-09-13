import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaTimesCircle,
} from "react-icons/fa";
import { claimStage, readList, readValue, repairApprovedClaimsMissingCodes } from "../services/store";
import "./Claims.css";

function statusIcon(status) {
  if (["Ready for Collection", "Approved", "Collected"].includes(status)) return <FaCheckCircle />;
  if (status === "Rejected") return <FaTimesCircle />;
  return <FaClock />;
}

function MyClaims() {
  const navigate = useNavigate();
  const currentUser = readValue("currentUser", null);
  const currentEmail = String(currentUser?.email || "").trim().toLowerCase();
  const claims = useMemo(() => repairApprovedClaimsMissingCodes().filter((claim) => !currentEmail || String(claim.claimantEmail || "").toLowerCase() === currentEmail).slice().reverse(), [currentEmail]);
  const lostItems = useMemo(() => readList("lostItems"), []);
  const foundItems = useMemo(() => readList("foundItems"), []);
  const getLost = (id) => lostItems.find((item) => String(item.id) === String(id));
  const getFound = (id) => foundItems.find((item) => String(item.id) === String(id));

  return (
    <main className="claims-page">
      <div className="claims-shell">
        <header className="claims-header">
          <div>
            <p className="claims-eyebrow">CLAIM CENTRE</p>
            <h1><FaClipboardList /> My Claims</h1>
            <p>Follow each claim from AI verification to admin approval and physical collection.</p>
          </div>
          <button className="secondary-action" onClick={() => navigate("/dashboard")}><FaArrowLeft /> Dashboard</button>
        </header>

        {!claims.length ? (
          <section className="claims-empty">
            <FaClipboardList />
            <h2>No claims submitted yet</h2>
            <p>Run AI matching and complete ownership verification to submit a claim.</p>
            <button className="primary-action" onClick={() => navigate("/ai-matches")}>Find AI Matches</button>
          </section>
        ) : (
          <div className="claims-list">
            {claims.map((claim) => {
              const lost = getLost(claim.lostItemId);
              const found = getFound(claim.foundItemId);
              const stage = claimStage(claim.status);
              const ready = ["Ready for Collection", "Approved", "Collected"].includes(claim.status);
              return (
                <article className="claim-card" key={claim.id}>
                  <div className="claim-card-top">
                    <div>
                      <span className="claim-ref">{claim.id}</span>
                      <h2>{lost?.title || claim.searchItem?.title || "Lost item"}</h2>
                      <p>Potential match: <strong>{found?.title || "Found item"}</strong></p>
                    </div>
                    <span className={`claim-status ${claim.status.toLowerCase().replace(/\s+/g, "-")}`}>
                      {statusIcon(claim.status)} {claim.status}
                    </span>
                  </div>

                  <div className={`claim-progress ${claim.status === "Rejected" ? "is-rejected" : ""}`}>
                    {["Verified", "Admin review", "Ready", "Collected"].map((label, index) => (
                      <div className={`progress-step ${stage >= index + 1 ? "done" : ""}`} key={label}>
                        <span>{stage > index + 1 || (stage === 4 && index === 3) ? "✓" : index + 1}</span>
                        <small>{label}</small>
                      </div>
                    ))}
                  </div>

                  <div className="claim-meta-grid">
                    <div><span>AI score</span><strong>{claim.score ?? "—"}%</strong></div>
                    <div><span>Submitted</span><strong>{new Date(claim.submittedAt).toLocaleString()}</strong></div>
                    <div><span>Verification</span><strong>{claim.verificationPassed ? "Passed" : "Not passed"}</strong></div>
                  </div>

                  {claim.status === "Pending Admin Review" && (
                    <div className="claims-note"><FaClock /> Waiting for admin approval. Your collection code will be issued only after the claim is approved.</div>
                  )}

                  {claim.adminNote && <div className="admin-note"><strong>Admin note:</strong> {claim.adminNote}</div>}

                  {ready && (
                    <div className="claims-actions">
                      <button className="primary-action" onClick={() => navigate(`/collection/${claim.id}`)}>
                        <FaBoxOpen /> {claim.status === "Collected" ? "View Handover Record" : "View Collection Details"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default MyClaims;
