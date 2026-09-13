import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft, FaBrain, FaCheckCircle, FaExclamationTriangle, FaSearch,
  FaShieldAlt, FaSpinner, FaTimesCircle, FaBoxOpen, FaArrowRight,
  FaChartLine, FaEquals, FaNotEqual
} from "react-icons/fa";
import { aiApi } from "../services/aiApi";
import { getCurrentUserEmail } from "../services/notify";
import "./AIMatches.css";

function AIMatches() {
  const navigate = useNavigate();
  const foundItems = useMemo(
    () => JSON.parse(localStorage.getItem("foundItems") || "[]").filter((item) => item.status === "Available for Matching"),
    []
  );

  const [searchTitle, setSearchTitle] = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const lostItems = useMemo(() => JSON.parse(localStorage.getItem("lostItems") || "[]"), []);

  function normaliseWords(value) {
    return new Set(String(value || "").toLowerCase().match(/[a-z0-9]+/g) || []);
  }

  function findPrivateOwnerReport(title, description) {
    const email = String(getCurrentUserEmail() || "").trim().toLowerCase();
    const queryWords = normaliseWords(`${title} ${description}`);
    const candidates = lostItems.filter((item) => {
      const itemEmail = String(item.reporterEmail || "").trim().toLowerCase();
      const hasPrivateAnswers = Array.isArray(item.privateOwnerVerification) && item.privateOwnerVerification.length === 3;
      return hasPrivateAnswers && (!email || !itemEmail || itemEmail === email);
    });

    let best = null;
    let bestScore = 0;
    for (const item of candidates) {
      const itemWords = normaliseWords(`${item.title || ""} ${item.description || ""}`);
      if (!queryWords.size || !itemWords.size) continue;
      let shared = 0;
      queryWords.forEach((word) => { if (itemWords.has(word)) shared += 1; });
      const score = shared / Math.max(1, Math.min(queryWords.size, itemWords.size));
      const exactTitle = String(item.title || "").trim().toLowerCase() === String(title || "").trim().toLowerCase();
      const weighted = score + (exactTitle ? 0.6 : 0);
      if (weighted > bestScore) { bestScore = weighted; best = item; }
    }
    return bestScore >= 0.35 ? best : null;
  }

  const canSearch = searchTitle.trim().length >= 3 && manualSearch.trim().length >= 12;

  async function runMatching() {
    if (!searchTitle.trim()) {
      setError("Enter the name or title of the item you are looking for.");
      return;
    }
    if (!manualSearch.trim() || manualSearch.trim().length < 12) {
      setError("Add a useful description of the item before running AI matching.");
      return;
    }
    if (!foundItems.length) {
      setError("No office-received items are currently available for matching.");
      return;
    }

    const searchItem = {
      id: `SEARCH-${Date.now()}`,
      title: searchTitle.trim(),
      description: manualSearch.trim(),
      source: "manual-ai-search",
    };

    setLoading(true);
    setError("");
    setHasSearched(true);
    setMatches([]);

    try {
      const result = await aiApi.matchItems(searchItem, foundItems, manualSearch.trim());
      const strongMatches = (result.matches || []).filter((match) => Number(match.score || 0) >= 60);
      setMatches(strongMatches);
      localStorage.setItem("latestManualSearch", JSON.stringify(searchItem));
      localStorage.setItem("latestManualMatches", JSON.stringify(strongMatches));
    } catch (err) {
      setError(err.message || "Unable to run AI matching.");
    } finally {
      setLoading(false);
    }
  }

  async function startClaim(match) {
    const foundItem = foundItems.find((item) => String(item.id) === String(match.candidateId));
    if (!foundItem) return;

    const searchItem = {
      id: `SEARCH-${Date.now()}`,
      title: searchTitle.trim(),
      description: manualSearch.trim(),
      source: "manual-ai-search",
    };

    try {
      setLoading(true);
      // Keep lost reports private: link the manual search to the user's best matching
      // lost report silently, only so its original private-owner questions can be reused.
      const linkedLostReport = findPrivateOwnerReport(searchItem.title, searchItem.description);

      // Verification must reuse the private questions answered before a match was shown.
      if (!linkedLostReport?.privateOwnerVerification?.length || linkedLostReport.privateOwnerVerification.length !== 3) {
        setError("No matching lost report with private owner questions was found. Please report the lost item first and complete its Private Owner Questions, then search again using a similar title and description.");
        return;
      }

      const privateOwnerBaseline = linkedLostReport.privateOwnerVerification.map((entry) => ({
        question: String(entry.question || "").trim(),
        answer: String(entry.answer || "").trim(),
      }));
      const questions = privateOwnerBaseline.map((entry) => entry.question);

      localStorage.setItem("activeClaim", JSON.stringify({
        lostItemId: linkedLostReport?.id || searchItem.id,
        linkedLostItemId: linkedLostReport?.id || null,
        foundItemId: match.candidateId,
        score: match.score,
        searchItem,
        comparison: {
          similarities: match.similarities || [],
          differences: match.differences || [],
          summary: match.safeSummary || "Potential match found.",
        },
        verificationQuestions: questions,
        privateOwnerBaseline,
        verificationQuestionSource: "original-private-owner-questions",
      }));
      navigate("/verify-claim");
    } catch (err) {
      setError(err.message || "Could not prepare ownership verification.");
    } finally {
      setLoading(false);
    }
  }

  function scoreClass(score) {
    return score >= 80 ? "high" : "medium";
  }

  return (
    <main className="ai-match-page">
      <div className="ai-match-shell">
        <header className="ai-match-hero">
          <div className="ai-hero-main">
            <div className="ai-hero-icon"><FaBrain /><span className="ai-pulse-dot" /></div>
            <div className="ai-hero-copy">
              <div className="ai-hero-kicker"><span>PRIVATE AI SEARCH</span><span className="ai-status"><i />READY</span></div>
              <h1>Describe it. Match it. Verify it.</h1>
              <p>Your search is compared privately against office-received items. The system never shows a browseable list of found property.</p>
            </div>
          </div>
          <button className="ai-back-button" onClick={() => navigate("/dashboard")}><FaArrowLeft /><span>Dashboard</span></button>
        </header>

        <section className="matching-workspace">
          <aside className="matching-control-panel">
            <div className="panel-heading">
              <span className="panel-kicker">YOUR SEARCH</span>
              <h2>What did you lose?</h2>
              <p>Enter the item yourself. Found-item records stay hidden until a strong match is detected.</p>
            </div>

            <div className="report-selector">
              <label htmlFor="search-title"><FaSearch /> Item title <span aria-hidden="true" style={{color:"#ef4444"}}>*</span></label>
              <div className="select-control">
                <input
                  id="search-title"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  placeholder="e.g. Louis Vuitton black sunglasses"
                  autoComplete="off"
                  style={{width:"100%", padding:12, border:0, outline:0, background:"transparent", color:"inherit"}}
                />
              </div>
            </div>

            <div className="report-selector" style={{marginTop:18}}>
              <label htmlFor="manual-search"><FaSearch /> Description <span aria-hidden="true" style={{color:"#ef4444"}}>*</span></label>
              <div className="select-control">
                <textarea
                  id="manual-search"
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  placeholder="Describe colour, brand, material, shape, accessories, marks or damage you remember..."
                  required rows={5}
                  style={{width:"100%", resize:"vertical", padding:12, border:0, outline:0, background:"transparent", color:"inherit"}}
                />
              </div>
              <p style={{marginTop:8,fontSize:13}}>Required. Add details you genuinely remember; they are used to calculate the match.</p>
            </div>

            <button className="run-match-button" onClick={runMatching} disabled={loading || !canSearch}>
              {loading ? <><FaSpinner className="spinner" />Checking securely</> : <><FaBrain />Find AI Matches<FaArrowRight /></>}
            </button>

            <div className="matching-method">
              <div className="method-icon"><FaShieldAlt /></div>
              <div><strong>Private by design</strong><p>No category list, location list, or catalogue of found items is exposed during search.</p></div>
            </div>
          </aside>

          <div className="matching-overview">
            <div className="overview-heading"><div><span className="panel-kicker">HOW IT WORKS</span><h2>Secure matching workspace</h2></div><div className="overview-status"><span />Ready</div></div>
            <div className="overview-explanation">
              <div className="explanation-icon"><FaChartLine /></div>
              <div><strong>Title + description are both checked</strong><p>AI compares your words with protected records and only returns candidates scoring 60% or higher.</p></div>
            </div>
            <div className="overview-explanation" style={{marginTop:16}}>
              <div className="explanation-icon"><FaShieldAlt /></div>
              <div><strong>No found-item browsing</strong><p>Users cannot view the available inventory, locations, categories, or exact identifying details before matching.</p></div>
            </div>
          </div>
        </section>

        {error && <div className="match-error"><span className="error-icon"><FaTimesCircle /></span><div><strong>Unable to complete matching</strong><p>{error}</p></div></div>}

        {loading && <section className="loading-state"><div className="loading-orbit"><FaBrain /></div><div className="loading-copy"><span className="panel-kicker">AI ANALYSIS IN PROGRESS</span><h2>Comparing your description privately</h2><p>Only strong candidates will be returned.</p></div><div className="loading-track"><div /></div></section>}

        {!hasSearched && !loading && !error && <section className="empty-match-state"><div className="empty-state-visual"><FaSearch /></div><div className="empty-state-copy"><span className="panel-kicker">START WITH WHAT YOU REMEMBER</span><h2>No catalogue to browse</h2><p>Enter the item title and a detailed description. Matching happens against protected office records in the background.</p></div></section>}

        {hasSearched && !matches.length && !loading && !error && <section className="empty-match-state"><div className="empty-state-visual"><FaShieldAlt /></div><div className="empty-state-copy"><span className="panel-kicker">NO STRONG MATCH FOUND</span><h2>No result reached 60%</h2><p>Try adding more specific details such as colour, brand, material, accessories, damage, markings or a distinctive feature.</p></div></section>}

        {matches.length > 0 && !loading && (
          <section className="results-section">
            <div className="results-header"><div><span className="panel-kicker">MATCHING COMPLETE</span><h2>Potential matches</h2><p>Only results at 60% or above are shown. Review the image and comparison, then verify ownership.</p></div><div className="results-count"><strong>{matches.length}</strong><span>strong results</span></div></div>
            <div className="match-list">
              {matches.map((match,index) => {
                const found = foundItems.find((item) => String(item.id) === String(match.candidateId));
                const cls = scoreClass(match.score);
                return <article className={`match-card ${cls}`} key={`${match.candidateId}-${index}`}>
                  <div className="match-image-column"><div className="match-image-wrapper">{found?.imageDataUrl ? <img src={found.imageDataUrl} alt={`Potential match ${index+1}`} /> : <div className="image-placeholder"><FaBoxOpen /></div>}<span className="matched-image-badge">POTENTIAL MATCH</span></div></div>
                  <div className="match-content">
                    <div className="match-content-header"><div><span className="match-result-label">RESULT #{index+1}</span><h3>Potential matching item</h3></div><div className={`match-score ${cls}`}><div><strong>{match.score}%</strong><span>{match.confidence || "medium"} confidence</span></div></div></div>
                    <div className="ai-reason"><div className="reason-heading"><span><FaBrain /></span><div><small>AI COMPARISON</small><strong>{match.safeSummary || "The title and description are consistent with this record."}</strong></div></div></div>
                    <div className="verified-comparison-grid" style={{marginTop:16}}>
                      <div className="verified-comparison-card similarities"><div className="verified-comparison-title"><FaEquals/><strong>Similarities</strong></div>{match.similarities?.length ? <ul>{match.similarities.map((x,i)=><li key={i}><FaCheckCircle/>{x}</li>)}</ul> : <p>Strong overall description similarity.</p>}</div>
                      <div className="verified-comparison-card differences"><div className="verified-comparison-title"><FaNotEqual/><strong>Differences</strong></div>{match.differences?.length ? <ul>{match.differences.map((x,i)=><li key={i}><FaExclamationTriangle/>{x}</li>)}</ul> : <p>No important non-sensitive differences identified.</p>}</div>
                    </div>
                    <div className="match-action"><div className="verification-note"><FaShieldAlt/><span>Ownership questions use protected details that a genuine owner should know.</span></div><button className="claim-button" onClick={()=>startClaim(match)}><span><FaShieldAlt/></span>Verify Ownership<FaArrowRight/></button></div>
                  </div>
                </article>;
              })}
            </div>
          </section>
        )}

        <footer className="ai-disclaimer"><span><FaShieldAlt /></span><p><strong>Privacy-first matching.</strong> The search does not reveal the full found-item inventory, exact locations, dates, or protected identifying details.</p></footer>
      </div>
    </main>
  );
}

export default AIMatches;
