import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBoxOpen,
  FaAlignLeft,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaImage,
  FaEnvelope,
} from "react-icons/fa";
import { aiApi, fileToDataUrl } from "../services/aiApi";
import { checkAndNotifyForNewLostItem, getCurrentUserEmail } from "../services/notify";
import "./ReportLostItem.css";

function ReportLostItem() {
  const navigate = useNavigate();
  const [item, setItem] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    dateLost: "",
    imageDataUrl: "",
    reporterEmail: getCurrentUserEmail() || "",
  });
  
  const [analysis, setAnalysis] = useState(null);
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [verificationAnswers, setVerificationAnswers] = useState({});
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setItem((current) => ({ ...current, [e.target.name]: e.target.value }));
    setError("");
  };

  async function runPhotoAnalysis(dataUrl) {
    if (!dataUrl) return;
    setAnalysing(true);
    setAnalysis(null);
    setAnalysisNotice("");
    setVerificationAnswers({});
    setError("");
    try {
      const result = await aiApi.analyseItem(dataUrl, item, "lost");
      const nextAnalysis = result.analysis;
      setAnalysis(nextAnalysis);
      setAnalysisNotice(result.fallback ? result.message : "");
      setItem((current) => ({
        ...current,
        title: current.title || nextAnalysis?.suggestedTitle || "",
        description: current.description || nextAnalysis?.searchDescription || "",
        category: current.category || nextAnalysis?.category || "",
      }));
    } catch (err) {
      setError(`AI image analysis failed: ${err.message}`);
    } finally {
      setAnalysing(false);
    }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];

    setAnalysis(null);
    setAnalysisNotice("");
    setVerificationAnswers({});
    setError("");

    if (!file) {
      setItem((current) => ({
        ...current,
        imageDataUrl: "",
      }));
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      
      setItem((current) => ({
        ...current,
        imageDataUrl: dataUrl,
      }));

      await runPhotoAnalysis(dataUrl);
    } catch (err) {
      console.error("IMAGE UPLOAD ERROR:", err);
      setError(`Image upload failed: ${err.message}`);
    }
  };

  const simpleQuestions = Array.isArray(analysis?.privateVerificationQuestions)
    ? analysis.privateVerificationQuestions
    : [];

  // ==========================================
  // CORRECTED SUBMIT FUNCTION
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError("");

    // Read current user session
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

    const payload = {
      ...item,
      userId: currentUser?.id || null,
      aiAnalysis: analysis || {},
      privateVerification: Object.entries(verificationAnswers).map(([q, a]) => ({
        question: q,
        answer: a,
      })),
    };

    try {
      const response = await fetch("http://localhost:3001/api/lost-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), 
      });

      if (response.ok) {
        const savedItem = await response.json();
        checkAndNotifyForNewLostItem(savedItem, aiApi.matchItems);

        alert("Lost item reported successfully!");
        navigate("/view-lost-items"); 
      } else {
        const errorData = await response.json();
        setError("Failed to report item: " + errorData.error);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setError("Server error. Ensure your Node.js backend is running.");
    }
  };

  return (
    <div className="lost-item-container">
      <div className="lost-item-card">
        <h1><FaBoxOpen /> Report Lost Item</h1>
        <p>Provide details about your lost item.</p>

        {error && <p style={{ color: "crimson", marginBottom: 12 }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <label>📦 Item title</label>
          <div className="input-group">
            <FaBoxOpen className="icon" />
            <input type="text" name="title" placeholder="Item Title" value={item.title} onChange={handleChange} required />
          </div>

          <label>📝 Description</label>
          <div className="input-group textarea-group">
            <FaAlignLeft className="icon" />
            <textarea name="description" placeholder="Item Description" value={item.description} onChange={handleChange} />
          </div>

          <label>🏷️ Category</label>
          <select name="category" value={item.category} onChange={handleChange} required>
            <option value="">Select Category</option>
            <option value="Electronics">Electronics</option>
            <option value="Documents">Documents</option>
            <option value="Clothing">Clothing</option>
            <option value="Bags">Bags</option>
            <option value="Keys">Keys</option>
            <option value="Other">Other</option>
          </select>

          <label>📧 Your email (for match notifications)</label>
          <div className="input-group">
            <FaEnvelope className="icon" />
            <input type="email" name="reporterEmail" placeholder="you@example.com" value={item.reporterEmail} onChange={handleChange} required />
          </div>

          <label>📍 Location lost</label>
          <div className="input-group">
            <FaMapMarkerAlt className="icon" />
            <input type="text" name="location" placeholder="Location Lost" value={item.location} onChange={handleChange} required />
          </div>

          <label>📅 Date lost</label>
          <div className="input-group">
            <FaCalendarAlt className="icon" />
            <input type="date" name="dateLost" value={item.dateLost} onChange={handleChange} max={new Date().toISOString().split("T")[0]} required />
          </div>

          <label>📷 Upload item photo</label>
          <div className="file-upload">
            <FaImage />
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </div>

          {item.imageDataUrl && (
            <img src={item.imageDataUrl} alt="Lost item preview" style={{ width: "100%", maxHeight: 260, objectFit: "contain", marginTop: 12, borderRadius: 10 }} />
          )}

          {analysing && <p style={{ marginTop: 12 }}>OpenAI is automatically analysing the uploaded photo…</p>}
          {analysisNotice && <p style={{ marginTop: 12, color: "#8a6d1d" }}>{analysisNotice}</p>}

          {analysis && (
            <section style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
              <h3>AI Image Analysis</h3>
              <p><strong>Detected item:</strong> {analysis.object || "Not identified"}</p>
              <p><strong>Colour:</strong> {[analysis.primaryColour, ...(analysis.secondaryColours || [])].filter(Boolean).join(", ") || "Unclear"}</p>
              <p><strong>Brand:</strong> {analysis.brand || "Not visible"}</p>
              <p><strong>Material:</strong> {analysis.material || "Unclear"}</p>
              <p><strong>Condition:</strong> {analysis.condition || "Unclear"}</p>
              <p><strong>Distinctive features:</strong> {(analysis.distinctiveFeatures || []).join(", ") || "None detected"}</p>

              {simpleQuestions.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4>Private ownership verification</h4>
                  <p>Answer these 3 private questions with a little detail. You will need the same answers later to verify ownership.</p>
                  {simpleQuestions.map((question) => (
                    <div key={question} style={{ marginTop: 10 }}>
                      <label>{question}</label>
                      <input
                        type="text"
                        value={verificationAnswers[question] || ""}
                        onChange={(e) => setVerificationAnswers((current) => ({ ...current, [question]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <button type="submit" disabled={analysing}>{analysing ? "🤖 Analysing Photo…" : "✅ Submit Lost Item Report"}</button>
        </form>
      </div>
    </div>
  );
}

export default ReportLostItem;