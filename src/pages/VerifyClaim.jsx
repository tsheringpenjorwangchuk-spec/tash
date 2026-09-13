import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaShieldAlt, FaEquals, FaNotEqual, FaSpinner } from "react-icons/fa";
import { readList, readValue, writeList, writeValue } from "../services/store";
import { getCurrentUserEmail, sendClaimSubmittedEmail } from "../services/notify";
import { aiApi } from "../services/aiApi";
import "./VerifyClaim.css";

function VerifyClaim() {
  const navigate = useNavigate();
  const claim = useMemo(() => readValue("activeClaim", null), []);
  const foundItems = useMemo(() => readList("foundItems"), []);
  const foundItem = foundItems.find((item) => claim && String(item.id) === String(claim.foundItemId));
  const searchItem = claim?.searchItem || null;
  const lostItems = useMemo(() => readList("lostItems"), []);
  const linkedLostReport = lostItems.find((item) => claim?.linkedLostItemId && String(item.id) === String(claim.linkedLostItemId));
  const privateOwnerBaseline =
    Array.isArray(claim?.privateOwnerBaseline) && claim.privateOwnerBaseline.length === 3
      ? claim.privateOwnerBaseline
      : (Array.isArray(linkedLostReport?.privateOwnerVerification) ? linkedLostReport.privateOwnerVerification : []);
  const questions = Array.isArray(claim?.verificationQuestions) ? claim.verificationQuestions : [];
  const [answers, setAnswers] = useState(questions.map(() => ""));
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);

  async function verifyOwnership(event) {
    event.preventDefault();
    if (!questions.length) return setResult({ passed:false, message:"No ownership questions are available for this match." });
    if (answers.some((a) => !a.trim())) return setResult({ passed:false, message:"Please answer every ownership question." });
    setChecking(true);
    try {
      const verified = await aiApi.verifyClaimAnswers(foundItem, searchItem, questions, answers, privateOwnerBaseline);
      const next = { ...claim, ...verified, verifiedAt:new Date().toISOString() };
      writeValue("latestClaimVerification", next);
      setResult({ ...verified, message: verified.passed ? "Ownership verification passed. You can now submit this claim for admin review." : `Verification did not pass. ${verified.correctAnswers} of ${verified.totalQuestions} answers were consistent; ${verified.requiredCorrect} are required.` });
    } catch (err) {
      setResult({ passed:false, message:err.message || "Unable to verify ownership answers." });
    } finally { setChecking(false); }
  }

  async function submitVerifiedClaim() {
    if (!result?.passed) return;
    const claims = readList("claims");
    const createdClaim = {
      id:`CLM-${Date.now()}`,
      ...claim,
      lostItemId: searchItem?.id || claim?.lostItemId,
      claimantEmail:getCurrentUserEmail() || "",
      verificationPassed:true,
      correctAnswers:result.correctAnswers,
      totalQuestions:result.totalQuestions,
      requiredCorrect:result.requiredCorrect,
      verificationEvidence: questions.map((question, index) => ({
        question,
        answer: String(answers[index] || "").trim(),
        referenceAnswer: String(privateOwnerBaseline[index]?.answer || "").trim(),
        source: privateOwnerBaseline.length === 3 ? "Original private owner answer from lost report" : "Protected found-item record",
        feedback: result.feedback?.[index] || "Answer reviewed against protected ownership evidence.",
        consistent: /consistent/i.test(result.feedback?.[index] || "") && !/not consistent|not enough/i.test(result.feedback?.[index] || ""),
      })),
      verificationMethod: result.method || "ai",
      verifiedAt:new Date().toISOString(),
      submittedAt:new Date().toISOString(),
      status:"Pending Admin Review",
      adminNote:"",
    };
    writeList("claims", [...claims, createdClaim]);
    writeValue("latestSubmittedClaim", createdClaim);
    try { await sendClaimSubmittedEmail({ claim:createdClaim, lostItem:searchItem, foundItem }); } catch {}
    navigate("/claim-submitted");
  }

  if (!claim || !foundItem || !searchItem) {
    return <main className="verify-page"><div className="verify-shell"><section className="verify-card empty-claim-card"><FaExclamationTriangle className="empty-claim-icon"/><h1>No active match found</h1><p>Run AI matching and choose a result first.</p><button onClick={()=>navigate("/ai-matches")}>Back to AI Matching</button></section></div></main>;
  }

  return <main className="verify-page"><div className="verify-shell">
    <header className="verify-header">
      <div className="verify-title-wrap"><div className="verify-icon"><FaShieldAlt/></div><div><p className="verify-eyebrow">PRIVATE OWNERSHIP CHECK</p><h1>Prove the item is yours</h1><p className="verify-subtitle">Answer details a genuine owner should know. The system never shows the expected answers.</p></div></div>
      <button className="verify-back" onClick={()=>navigate("/ai-matches")}><FaArrowLeft/> AI Matching</button>
    </header>

    <section className="claim-summary-card"><div><span>Your search</span><strong>{searchItem.title}</strong></div><div><span>Potential match</span><strong>Protected office record</strong></div><div><span>Match score</span><strong>{claim.score ?? "—"}%</strong></div></section>

    <section className="verify-card">
      <div className="verify-card-heading"><FaShieldAlt/><div><h2>Private Owner Verification</h2><p>These are the same private owner questions from your lost-item report. Answer them again from memory. The saved answers remain hidden, and at least 2 of 3 answers must be consistent.</p></div></div>
      <form onSubmit={verifyOwnership} className="verification-form">
        {questions.map((question,index)=><label className="verification-question" key={`${question}-${index}`}><span>{index+1}. {question}</span><input type="text" value={answers[index] || ""} onChange={(e)=>setAnswers((current)=>current.map((value,i)=>i===index?e.target.value:value))} placeholder="Answer from memory" autoComplete="off" disabled={Boolean(result?.passed)}/>{result?.feedback?.[index] && <small style={{opacity:.75}}>{result.feedback[index]}</small>}</label>)}
        {!result?.passed && <button className="verify-submit" type="submit" disabled={checking}>{checking ? <><FaSpinner className="spinner"/>Checking answers</> : <><FaShieldAlt/>Verify Ownership</>}</button>}
      </form>

      {result && <div className={`verification-result ${result.passed ? "success" : "failed"}`}>{result.passed ? <FaCheckCircle/> : <FaExclamationTriangle/>}<div><strong>{result.passed ? "Verification passed" : "Verification not passed"}</strong><p>{result.message}</p></div></div>}

      {result?.passed && <section className="verified-match-reveal">
        <div className="verified-match-media">{foundItem.imageDataUrl ? <img src={foundItem.imageDataUrl} alt="Verified potential match"/> : <div className="verified-match-placeholder"><FaShieldAlt/></div>}<span>VERIFIED VIEW</span></div>
        <div className="verified-match-content">
          <div className="verified-match-heading"><div><p className="verify-eyebrow">POTENTIAL MATCH</p><h2>{foundItem.title || "Potential matching item"}</h2></div><div className="verified-score"><strong>{claim.score ?? "—"}%</strong><span>match score</span></div></div>
          <div className="verified-ai-explanation"><div className="verified-comparison-grid">
            <div className="verified-comparison-card similarities"><div className="verified-comparison-title"><FaEquals/><strong>Similarities</strong></div>{claim.comparison?.similarities?.length ? <ul>{claim.comparison.similarities.map((x,i)=><li key={i}><FaCheckCircle/>{x}</li>)}</ul> : <p>Strong overall match based on your title and description.</p>}</div>
            <div className="verified-comparison-card differences"><div className="verified-comparison-title"><FaNotEqual/><strong>Differences</strong></div>{claim.comparison?.differences?.length ? <ul>{claim.comparison.differences.map((x,i)=><li key={i}><FaExclamationTriangle/>{x}</li>)}</ul> : <p>No important non-sensitive differences were identified.</p>}</div>
          </div></div>
          <div className="verified-privacy-note"><FaShieldAlt/><span>Exact collection and office handling details remain protected until administrator approval.</span></div>
        </div>
      </section>}

      {result?.passed && <button className="verify-submit" type="button" style={{marginTop:16}} onClick={submitVerifiedClaim}><FaCheckCircle/>Submit Claim for Admin Review</button>}
    </section>
  </div></main>;
}

export default VerifyClaim;
