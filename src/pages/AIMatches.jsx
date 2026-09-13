import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBrain,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaSearch,
  FaShieldAlt,
  FaSpinner,
  FaTimesCircle,
} from "react-icons/fa";

import { aiApi } from "../services/aiApi";
import { readValue } from "../services/store";
import "./AIMatches.css";

function AIMatches() {
  const navigate = useNavigate();

  const currentUser = readValue("currentUser", null);
  const currentEmail = String(currentUser?.email || "").trim().toLowerCase();
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedLostId, setSelectedLostId] = useState("");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      try {
        const fetchWithTimeout = async (url) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          try {
            return await fetch(url, { signal: controller.signal });
          } finally {
            clearTimeout(timeout);
          }
        };

        const [lostResponse, foundResponse] = await Promise.all([
          fetchWithTimeout("http://localhost:3001/api/lost-items?summary=true"),
          fetchWithTimeout("http://localhost:3001/api/found-items"),
        ]);

        if (!lostResponse.ok || !foundResponse.ok) {
          throw new Error("Could not load reports from the database.");
        }

        const [lostData, foundData] = await Promise.all([
          lostResponse.json(),
          foundResponse.json(),
        ]);

        if (cancelled) return;

        const availableLostItems = lostData
          .map((item) => ({
            ...item,
            dateLost: item.date_lost,
            imageDataUrl: item.image_data_url,
            reporterEmail: item.reporter_email,
          }))
          .filter((item) =>
            (!currentEmail || String(item.reporterEmail || "").toLowerCase() === currentEmail) &&
            !["Resolved", "Claim Approved"].includes(item.status)
          );
        setLostItems(availableLostItems);
        setFoundItems(foundData.filter((item) => item.status === "Available for Matching"));
        setSelectedLostId((currentId) => currentId || availableLostItems[0]?.id || "");
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.name === "AbortError"
            ? "Loading reports timed out. Please check that the backend is running."
            : loadError.message);
        }
      } finally {
        if (!cancelled) setLoadingReports(false);
      }
    }

    loadReports();
    return () => {
      cancelled = true;
    };
  }, [currentEmail]);

  if (loadingReports) {
    return <main className="ai-match-page"><div className="ai-match-shell"><p>Loading reports…</p></div></main>;
  }

  const selectedLost = lostItems.find(
    (item) => String(item.id) === String(selectedLostId)
  );

  async function runMatching() {
    if (!selectedLost) {
      setError("Create or select a lost-item report first.");
      return;
    }

    if (!foundItems.length) {
      setError("No office-received found items are available yet. A found item must be dropped off and marked received by admin before AI matching.");
      return;
    }

    setLoading(true);
    setError("");
    setMatches([]);

    try {
      const result = await aiApi.matchItems(
        selectedLost,
        foundItems
      );

      const enriched = (result.matches || []).map((match) => ({
        ...match,
        candidate: foundItems.find(
          (item) => String(item.id) === String(match.candidateId)
        ),
      }));

      setMatches(enriched);

      localStorage.setItem(
        `matches:${selectedLost.id}`,
        JSON.stringify(enriched)
      );
    } catch (err) {
      setError(err.message || "Unable to run AI matching.");
    } finally {
      setLoading(false);
    }
  }

  function startClaim(match) {
    localStorage.setItem(
      "activeClaim",
      JSON.stringify({
        lostItemId: selectedLost.id,
        foundItemId: match.candidateId,
        score: match.score,
        reason: match.reason,
      })
    );

    navigate("/verify-claim");
  }

  function getScoreClass(score) {
    if (score >= 80) return "high";
    if (score >= 60) return "medium";
    return "low";
  }

  function getScoreIcon(score) {
    if (score >= 80) return <FaCheckCircle />;
    if (score >= 60) return <FaShieldAlt />;
    return <FaExclamationTriangle />;
  }

  return (
    <main className="ai-match-page">
      <div className="ai-match-shell">

        {/* HEADER */}
        <header className="ai-match-header">
          <div className="ai-match-title">
            <div className="ai-icon">
              <FaBrain />
            </div>

            <div>
              <p className="ai-eyebrow">
                AI POWERED FEATURE
              </p>

              <h1>AI Item Matching</h1>

              <p className="ai-subtitle">
                Find potential matches between your lost item
                and reported found items.
              </p>
            </div>
          </div>

          <button
            className="back-button"
            onClick={() => navigate("/dashboard")}
          >
            <FaArrowLeft />
            Dashboard
          </button>
        </header>

        {/* HOW IT WORKS */}
        <section className="ai-info-banner">
          <div className="info-icon">
            <FaBrain />
          </div>

          <div>
            <h3>How AI matching works</h3>

            <p>
              The system compares item type, category, colour,
              brand, material, location, date and other available
              details to identify potential matches.
            </p>
          </div>
        </section>

        {/* CONTROLS */}
        <section className="match-control-card">

          <div className="section-heading">
            <span className="section-number">01</span>

            <div>
              <h2>Select a lost item</h2>
              <p>
                Choose the lost report you want to compare.
              </p>
            </div>
          </div>

          <div className="control-row">

            <div className="select-wrapper">
              <FaSearch />

              <select
                id="lost-item"
                value={selectedLostId}
                onChange={(event) =>
                  setSelectedLostId(event.target.value)
                }
              >
                {!lostItems.length && (
                  <option value="">
                    No lost reports available
                  </option>
                )}

                {lostItems.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="run-match-button"
              onClick={runMatching}
              disabled={loading || !selectedLost}
            >
              {loading ? (
                <>
                  <FaSpinner className="spinner" />
                  Comparing...
                </>
              ) : (
                <>
                  <FaBrain />
                  Find AI Matches
                </>
              )}
            </button>

          </div>

          {selectedLost && (
            <div className="selected-item-preview">
              <div>
                <span>Selected lost item</span>
                <strong>{selectedLost.title}</strong>
              </div>

              {selectedLost.category && (
                <div>
                  <span>Category</span>
                  <strong>{selectedLost.category}</strong>
                </div>
              )}

              {selectedLost.location && (
                <div>
                  <span>Location</span>
                  <strong>{selectedLost.location}</strong>
                </div>
              )}
            </div>
          )}

        </section>

        {/* STATISTICS */}
        <section className="match-statistics">

          <div className="stat-card">
            <div className="stat-icon lost">
              <FaSearch />
            </div>

            <div>
              <strong>{lostItems.length}</strong>
              <span>Lost Reports</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon found">
              <FaCheckCircle />
            </div>

            <div>
              <strong>{foundItems.length}</strong>
              <span>Office-Received Found Items</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon matches">
              <FaBrain />
            </div>

            <div>
              <strong>{matches.length}</strong>
              <span>AI Matches</span>
            </div>
          </div>

        </section>

        {/* ERROR */}
        {error && (
          <div className="match-error">
            <FaTimesCircle />

            <div>
              <strong>Unable to complete matching</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <section className="loading-card">

            <div className="loading-animation">
              <FaBrain />
            </div>

            <h2>AI is comparing the reports...</h2>

            <p>
              Checking item details, similarities,
              locations and dates.
            </p>

            <div className="loading-bar">
              <div></div>
            </div>

          </section>
        )}

        {/* EMPTY STATE */}
        {!matches.length && !loading && !error && (
          <section className="empty-match-state">

            <div className="empty-ai-icon">
              <FaBrain />
            </div>

            <h2>Ready to find a potential match?</h2>

            <p>
              Select one of your lost reports above and
              click <strong>Find AI Matches</strong>.
            </p>

            <div className="empty-tips">

              <div>
                <FaCheckCircle />
                <span>Compare item characteristics</span>
              </div>

              <div>
                <FaCheckCircle />
                <span>Analyse locations and dates</span>
              </div>

              <div>
                <FaCheckCircle />
                <span>Identify potential matches</span>
              </div>

            </div>

          </section>
        )}

        {/* RESULTS */}
        {matches.length > 0 && !loading && (
          <section className="results-section">

            <div className="results-header">
              <div>
                <p className="results-eyebrow">
                  AI ANALYSIS COMPLETE
                </p>

                <h2>Potential Matches</h2>

                <p>
                  The results below are potential matches only.
                  Ownership must still be verified.
                </p>
              </div>

              <div className="results-count">
                {matches.length}
                <span>matches</span>
              </div>
            </div>

            <div className="match-list">

              {matches.map((match, index) => {
                const scoreClass = getScoreClass(match.score);

                return (
                  <article
                    className={`match-card ${scoreClass}`}
                    key={`${match.candidateId}-${index}`}
                  >

                    {/* IMAGE */}
                    <div className="match-image-wrapper">

                      {match.candidate?.imageDataUrl ? (
                        <img
                          src={match.candidate.imageDataUrl}
                          alt={
                            match.candidate.title ||
                            "Found item"
                          }
                        />
                      ) : (
                        <div className="image-placeholder">
                          <FaBoxIcon />
                        </div>
                      )}

                      <div className="match-rank">
                        #{index + 1}
                      </div>

                    </div>

                    {/* CONTENT */}
                    <div className="match-content">

                      <div className="match-top">

                        <div>
                          <p className="found-label">
                            FOUND ITEM
                          </p>

                          <h3>
                            {match.candidate?.title ||
                              "Found item"}
                          </h3>
                        </div>

                        <div
                          className={`match-score ${scoreClass}`}
                        >
                          <div className="score-icon">
                            {getScoreIcon(match.score)}
                          </div>

                          <div>
                            <strong>
                              {match.score}%
                            </strong>

                            <span>
                              {match.confidence || "unknown"} confidence
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* LOCATION / DATE */}
                      <div className="match-meta">

                        <div>
                          <FaMapMarkerAlt />

                          <span>
                            {match.candidate?.location ||
                              "Unknown location"}
                          </span>
                        </div>

                        <div>
                          <FaCalendarAlt />

                          <span>
                            {match.candidate?.dateFound ||
                              "Unknown date"}
                          </span>
                        </div>

                      </div>

                      {/* REASON */}
                      <div className="ai-reason">

                        <div className="reason-heading">
                          <FaBrain />
                          <strong>Why AI thinks this may match</strong>
                        </div>

                        <p>
                          {match.reason ||
                            "The AI identified similarities between the reports."}
                        </p>

                      </div>

                      {/* FEATURES */}
                      <div className="feature-grid">

                        <div className="feature-box matching">

                          <h4>
                            <FaCheckCircle />
                            Matching Features
                          </h4>

                          {match.matchingFeatures?.length ? (
                            <ul>
                              {match.matchingFeatures.map(
                                (feature, featureIndex) => (
                                  <li key={featureIndex}>
                                    {feature}
                                  </li>
                                )
                              )}
                            </ul>
                          ) : (
                            <p className="no-features">
                              No specific features identified.
                            </p>
                          )}

                        </div>

                        <div className="feature-box differences">

                          <h4>
                            <FaExclamationTriangle />
                            Differences
                          </h4>

                          {match.differences?.length ? (
                            <ul>
                              {match.differences.map(
                                (difference, differenceIndex) => (
                                  <li key={differenceIndex}>
                                    {difference}
                                  </li>
                                )
                              )}
                            </ul>
                          ) : (
                            <p className="no-features">
                              No major differences identified.
                            </p>
                          )}

                        </div>

                      </div>

                      {/* ACTION */}
                      <div className="match-action">

                        {match.score >= 60 ? (
                          <>
                            <div className="verification-note">
                              <FaShieldAlt />

                              <span>
                                This match is eligible for
                                ownership verification.
                              </span>
                            </div>

                            <button
                              className="claim-button"
                              onClick={() =>
                                startClaim(match)
                              }
                            >
                              <FaShieldAlt />
                              Start Ownership Verification
                            </button>
                          </>
                        ) : (
                          <div className="low-match-note">
                            <FaExclamationTriangle />

                            <span>
                              Match confidence is below 60%.
                              Ownership verification is not
                              available for this result.
                            </span>
                          </div>
                        )}

                      </div>

                    </div>

                  </article>
                );
              })}

            </div>

          </section>
        )}

        {/* FOOTER NOTE */}
        <footer className="ai-disclaimer">
          <FaShieldAlt />

          <span>
            AI results are suggestions only. A potential match
            does not confirm ownership. Final ownership must be
            verified through the Lost & Found process.
          </span>
        </footer>

      </div>
    </main>
  );
}

/*
  Small icon component used for the image placeholder.
*/
function FaBoxIcon() {
  return (
    <span className="box-placeholder">
      📦
    </span>
  );
}

export default AIMatches;