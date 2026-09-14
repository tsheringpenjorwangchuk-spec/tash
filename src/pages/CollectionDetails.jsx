import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaCheckCircle,
  FaClock,
  FaCopy,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaArrowRight,
} from "react-icons/fa";
import {
  readList,
  repairApprovedClaimsMissingCodes,
} from "../services/store";
import "./Claims.css";

function CollectionDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const claim = useMemo(
    () =>
      repairApprovedClaimsMissingCodes().find(
        (entry) => String(entry.id) === String(id)
      ),
    [id]
  );

  async function copyCode() {
    if (!claim?.collectionCode) return;

    try {
      await navigator.clipboard.writeText(claim.collectionCode);
      alert("Collection code copied.");
    } catch {
      alert(`Collection code: ${claim.collectionCode}`);
    }
  }

  if (!claim) {
    return (
      <main className="claims-page">
        <section className="claims-shell claims-empty collection-not-found">
          <div className="collection-empty-icon">
            <FaBoxOpen />
          </div>

          <p className="claims-eyebrow">COLLECTION</p>

          <h2>Claim not found</h2>

          <p>
            We couldn't find the claim associated with this collection
            reference. Return to My Claims and open a valid claim.
          </p>

          <button
            className="primary-action"
            onClick={() => navigate("/my-claims")}
          >
            <FaArrowLeft />
            My Claims
          </button>
        </section>
      </main>
    );
  }

  const ready = [
    "Ready for Collection",
    "Approved",
    "Collected",
  ].includes(claim.status);

  const collected = claim.status === "Collected";

  const eventDate = new Date(
    claim.collectedAt ||
      claim.codeIssuedAt ||
      claim.reviewedAt ||
      claim.submittedAt
  );

  return (
    <main className="claims-page">
      <div className="claims-shell collection-page-shell">
        {/* PAGE HEADER */}
        <header className="claims-header collection-page-header">
          <div>
            <button
              className="collection-back-link"
              onClick={() => navigate("/my-claims")}
            >
              <FaArrowLeft />
              Back to My Claims
            </button>

            <p className="claims-eyebrow">COLLECTION CENTRE</p>

            <h1>
              <span className="collection-title-icon">
                <FaBoxOpen />
              </span>
              Collection Details
            </h1>

            <p>
              Your collection information and secure collection code are
              available here after your claim has been approved.
            </p>
          </div>

          <div className="collection-header-status">
            <span className="collection-status-dot" />
            {collected ? "HANDOVER COMPLETE" : ready ? "READY" : "IN REVIEW"}
          </div>
        </header>

        {/* NOT READY */}
        {!ready ? (
          <section className="collection-pending-layout">
            <div className="collection-pending-main">
              <div className="collection-pending-icon">
                <FaClock />
              </div>

              <p className="claims-eyebrow">AWAITING APPROVAL</p>

              <h2>Collection is not ready yet</h2>

              <p>
                Your claim is currently{" "}
                <strong>{claim.status}</strong>. Collection details and a
                collection code will appear after an administrator approves
                your claim.
              </p>

              <button
                className="secondary-action"
                onClick={() => navigate("/my-claims")}
              >
                <FaArrowLeft />
                Return to My Claims
              </button>
            </div>

            <aside className="collection-process-card">
              <span className="claims-eyebrow">CLAIM JOURNEY</span>

              <h3>What happens next?</h3>

              <div className="collection-process">
                <div className="collection-process-step done">
                  <span>01</span>
                  <div>
                    <strong>Claim submitted</strong>
                    <small>Your ownership details were received.</small>
                  </div>
                </div>

                <div className="collection-process-step active">
                  <span>02</span>
                  <div>
                    <strong>Admin review</strong>
                    <small>Your claim is being checked.</small>
                  </div>
                </div>

                <div className="collection-process-step">
                  <span>03</span>
                  <div>
                    <strong>Collection approved</strong>
                    <small>A secure collection code is issued.</small>
                  </div>
                </div>

                <div className="collection-process-step">
                  <span>04</span>
                  <div>
                    <strong>Item collected</strong>
                    <small>Administrator confirms the handover.</small>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        ) : (
          /* READY / COLLECTED */
          <section className="collection-layout">
            <div className="collection-main">
              {/* SUCCESS HEADER */}
              <div className="collection-success-row">
                <div className="collection-icon">
                  <FaCheckCircle />
                </div>

                <div>
                  <p className="claims-eyebrow">
                    {collected ? "HANDOVER COMPLETE" : "CLAIM APPROVED"}
                  </p>

                  <h2>
                    {collected
                      ? "Item successfully collected"
                      : "Your item is ready for collection"}
                  </h2>

                  <p>
                    {collected
                      ? "The administrator has recorded the physical handover and completed this claim."
                      : "Take your collection code to the Lost & Found Office. The administrator will verify it before releasing the item."}
                  </p>
                </div>
              </div>

              {/* COLLECTION CODE */}
              <div className="collection-code-panel">
                <div className="collection-code-heading">
                  <span>SECURE COLLECTION CODE</span>
                  <FaShieldAlt />
                </div>

                <div className="collection-code-value">
                  <strong>{claim.collectionCode || "Not issued"}</strong>

                  {!collected && claim.collectionCode && (
                    <button
                      type="button"
                      onClick={copyCode}
                      aria-label="Copy collection code"
                    >
                      <FaCopy />
                      Copy code
                    </button>
                  )}
                </div>

                {!collected && (
                  <small>
                    Keep this code private. It is required to verify the
                    physical handover.
                  </small>
                )}
              </div>

              {/* DETAILS */}
              <div className="collection-details-heading">
                <div>
                  <span className="claims-eyebrow">COLLECTION INFORMATION</span>
                  <h3>Handover details</h3>
                </div>
              </div>

              <div className="collection-detail-grid">
                <div className="collection-detail-item">
                  <span className="collection-detail-icon">
                    <FaMapMarkerAlt />
                  </span>

                  <div>
                    <span>Collection location</span>
                    <strong>
                      {claim.collectionLocation || "Lost & Found Office"}
                    </strong>
                  </div>
                </div>

                <div className="collection-detail-item">
                  <span className="collection-detail-icon">
                    <FaShieldAlt />
                  </span>

                  <div>
                    <span>Claim reference</span>
                    <strong>{claim.id}</strong>
                  </div>
                </div>

                <div className="collection-detail-item">
                  <span className="collection-detail-icon">
                    <FaClock />
                  </span>

                  <div>
                    <span>
                      {collected ? "Collected at" : "Approved at"}
                    </span>

                    <strong>
                      {Number.isNaN(eventDate.getTime())
                        ? "Not available"
                        : eventDate.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* INSTRUCTIONS */}
              <div className="collection-instructions">
                <div className="collection-instructions-icon">
                  <FaShieldAlt />
                </div>

                <div>
                  <strong>Collection instructions</strong>

                  <p>
                    {claim.collectionInstructions ||
                      "Show your claim reference and collection code to the Lost & Found administrator. The item is released only after the code is confirmed."}
                  </p>
                </div>
              </div>

              {!collected && (
                <div className="claims-note collection-security-note">
                  <FaShieldAlt />

                  <div>
                    <strong>Keep your collection code private</strong>
                    <span>
                      Do not post or share the code publicly. It is used by
                      the administrator to confirm your handover.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDE STATUS */}
            <aside className="collection-status-panel">
              <div className="collection-status-panel-top">
                <span className="claims-eyebrow">CLAIM STATUS</span>

                <div className="collection-status-check">
                  <FaCheckCircle />
                </div>
              </div>

              <h3>
                {collected
                  ? "Collection complete"
                  : "Ready for collection"}
              </h3>

              <p>
                {collected
                  ? "This item has been handed over and the claim is now complete."
                  : "Everything required for collection has been approved by the administrator."}
              </p>

              <div className="collection-status-line">
                <span className="collection-status-line-dot active" />
                <div>
                  <strong>Claim approved</strong>
                  <small>Ownership verification completed</small>
                </div>
              </div>

              <div className="collection-status-line">
                <span
                  className={`collection-status-line-dot ${
                    claim.collectionCode ? "active" : ""
                  }`}
                />

                <div>
                  <strong>Collection code issued</strong>
                  <small>
                    {claim.collectionCode
                      ? "Secure code is available"
                      : "Waiting for code"}
                  </small>
                </div>
              </div>

              <div className="collection-status-line">
                <span
                  className={`collection-status-line-dot ${
                    collected ? "active" : ""
                  }`}
                />

                <div>
                  <strong>Physical handover</strong>
                  <small>
                    {collected
                      ? "Handover recorded"
                      : "Complete at the collection office"}
                  </small>
                </div>
              </div>

              {!collected && (
                <button
                  className="collection-my-claims-button"
                  onClick={() => navigate("/my-claims")}
                >
                  View My Claims
                  <FaArrowRight />
                </button>
              )}
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}

export default CollectionDetails;