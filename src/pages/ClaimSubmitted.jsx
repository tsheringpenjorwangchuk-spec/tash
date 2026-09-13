import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaCheck,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaHome,
  FaShieldAlt,
} from "react-icons/fa";
import "./Claims.css";

function ClaimSubmitted() {
  const navigate = useNavigate();

  const claim = useMemo(
    () => JSON.parse(localStorage.getItem("latestSubmittedClaim") || "null"),
    []
  );

  return (
    <main className="claims-page claim-submitted-page">
      <section className="claim-submitted-shell">

        {/* TOP STATUS */}
        <div className="claim-confirmation-hero">
          <div className="claim-confirmation-icon">
            <FaCheckCircle />
          </div>

          <div className="claim-confirmation-copy">
            <p className="claims-eyebrow">CLAIM SUBMITTED</p>

            <h1>Your ownership claim is in review.</h1>

            <p className="claims-lead">
              Your verification details have been submitted successfully.
              An administrator will review the claim before the item can be
              released for collection.
            </p>

            <div className="claim-status-pill">
              <span className="status-pulse" />
              <span>Pending admin review</span>
            </div>
          </div>
        </div>

        {/* CLAIM OVERVIEW */}
        {claim && (
          <section className="claim-submitted-overview">

            <div className="submitted-section-heading">
              <div>
                <span>CLAIM OVERVIEW</span>
                <h2>Submission details</h2>
              </div>

              <FaClipboardList />
            </div>

            <div className="claim-reference-modern">
              <div className="reference-item">
                <span>Claim reference</span>
                <strong>{claim.id}</strong>
              </div>

              <div className="reference-item">
                <span>Current status</span>
                <strong className="reference-status">
                  <FaClock />
                  {claim.status}
                </strong>
              </div>

              <div className="reference-item">
                <span>AI match score</span>
                <strong>
                  {claim.score ?? "—"}
                  {claim.score != null ? "%" : ""}
                </strong>
              </div>
            </div>
          </section>
        )}

        {/* PROGRESS */}
        <section className="claim-submitted-progress">

          <div className="submitted-section-heading">
            <div>
              <span>RECOVERY JOURNEY</span>
              <h2>What happens next</h2>
            </div>
          </div>

          <div className="submitted-timeline">

            <div className="timeline-step completed">
              <div className="timeline-marker">
                <FaCheck />
              </div>

              <div className="timeline-content">
                <span>STEP 01</span>
                <strong>Claim submitted</strong>
                <p>
                  Your ownership verification has been successfully received.
                </p>
              </div>
            </div>

            <div className="timeline-line" />

            <div className="timeline-step active">
              <div className="timeline-marker">
                <FaClock />
              </div>

              <div className="timeline-content">
                <span>STEP 02</span>
                <strong>Admin review</strong>
                <p>
                  An administrator will review your claim and supporting
                  information.
                </p>
              </div>
            </div>

            <div className="timeline-line" />

            <div className="timeline-step">
              <div className="timeline-marker">
                <FaShieldAlt />
              </div>

              <div className="timeline-content">
                <span>STEP 03</span>
                <strong>Ownership approval</strong>
                <p>
                  If approved, the claim will move forward to collection.
                </p>
              </div>
            </div>

            <div className="timeline-line" />

            <div className="timeline-step">
              <div className="timeline-marker">
                <FaCheckCircle />
              </div>

              <div className="timeline-content">
                <span>STEP 04</span>
                <strong>Collect your item</strong>
                <p>
                  A collection code will be issued once your claim is approved.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ACTIONS */}
        <section className="claim-submitted-actions">

          <div className="submitted-action-copy">
            <span>MANAGE YOUR CLAIM</span>
            <h2>Keep track of the review</h2>
            <p>
              You can return to your claims at any time to see the latest
              status and any administrator updates.
            </p>
          </div>

          <div className="claims-actions">
            <button
              className="primary-action"
              onClick={() => navigate("/my-claims")}
            >
              <FaClipboardList />
              View My Claims
              <FaArrowRight className="action-arrow" />
            </button>

            <button
              className="secondary-action"
              onClick={() => navigate("/dashboard")}
            >
              <FaHome />
              Dashboard
            </button>
          </div>

        </section>

        {/* SECURITY NOTE */}
        <footer className="claims-note claim-submitted-note">
          <div className="note-icon">
            <FaShieldAlt />
          </div>

          <div>
            <strong>Ownership verification is not automatic</strong>

            <p>
              AI matching and verification questions help support the process,
              but they do not confirm ownership. Final approval remains an
              administrator decision. No collection code is issued until the
              claim has been approved.
            </p>
          </div>
        </footer>

      </section>
    </main>
  );
}

export default ClaimSubmitted;