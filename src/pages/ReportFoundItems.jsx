import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaTag,
  FaFileAlt,
  FaImage,
  FaPaperPlane,
} from "react-icons/fa";
import { aiApi, fileToDataUrl } from "../services/aiApi";
import "./ReportFoundItems.css";

function ReportFoundItems() {
  const navigate = useNavigate();
  const [item, setItem] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    dateFound: "",
    imageDataUrl: "",
  });
  const [analysis, setAnalysis] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem((previous) => ({ ...previous, [name]: value }));
    setError("");
  };

  async function runPhotoAnalysis(dataUrl) {
    if (!dataUrl) return;
    setAnalysing(true);
    setAnalysis(null);
    setError("");
    try {
      const result = await aiApi.analyseItem(dataUrl, item, "found");
      const nextAnalysis = result.analysis;
      setAnalysis(nextAnalysis);
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
    const file = e.target.files?.[0] || null;
    setAnalysis(null);
    setError("");

    if (!file) {
      setItem((previous) => ({ ...previous, imageDataUrl: "" }));
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
      setItem((previous) => ({ ...previous, imageDataUrl: dataUrl }));
      await runPhotoAnalysis(dataUrl);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!item.title.trim() || !item.description.trim() || !item.category || !item.location.trim() || !item.dateFound) {
      setError("Please complete all required fields.");
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    if (item.dateFound > today) {
      setError("The found date cannot be in the future.");
      return;
    }
    if (analysing) {
      setError("Please wait for AI image analysis to finish before submitting.");
      return;
    }
    if (item.imageDataUrl && !analysis) {
      setError("Please complete AI image analysis before submitting this photo report.");
      return;
    }

    const payload = {
      title: item.title.trim(),
      description: item.description.trim(),
      category: item.category,
      location: item.location.trim(),
      dateFound: item.dateFound,
      imageDataUrl: item.imageDataUrl,
      status: "Awaiting Drop-off",
      dropoffReference: `FND-${Date.now().toString().slice(-8)}`,
    };

    try {
      const response = await fetch("http://localhost:3001/api/found-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const savedItem = await response.json();
        alert("Found item reported successfully. Please hand the physical item to the Lost & Found Office.");
        navigate(`/found-dropoff/${savedItem.id}`);
      } else {
        const errorData = await response.json();
        setError("Failed to report found item: " + errorData.error);
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("Server error. Ensure your backend server is running.");
    }
  };

  return (
    <main className="found-item-container">
      <div className="found-item-card">
        <div className="found-item-header">
          <div>
            <p className="found-eyebrow">LOST & FOUND</p>
            <h1><FaBoxOpen /> Report Found Item</h1>
            <p>Help reunite an item with its owner by providing accurate information.</p>
          </div>
          <button type="button" className="found-back-button" onClick={() => navigate("/dashboard")}>
            <FaArrowLeft /> Dashboard
          </button>
        </div>

        {error && <div className="found-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-intro-badge">📥 Found item intake starts here</div>
          <div className="found-input-group">
            <FaTag className="found-input-icon" />
            <input type="text" name="title" placeholder="Item title" value={item.title} onChange={handleChange} maxLength={100} required />
          </div>

          <div className="found-input-group">
            <select name="category" value={item.category} onChange={handleChange} required>
              <option value="">Select category</option>
              <option value="Electronics">Electronics</option>
              <option value="Documents">Documents</option>
              <option value="Clothing">Clothing</option>
              <option value="Bags">Bags</option>
              <option value="Keys">Keys</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="found-input-group textarea-group">
            <FaFileAlt className="found-input-icon" />
            <textarea name="description" placeholder="Describe the item — include colour, brand, size, identifying marks or other useful details" value={item.description} onChange={handleChange} maxLength={500} required />
          </div>

          <div className="found-input-group">
            <FaMapMarkerAlt className="found-input-icon" />
            <input type="text" name="location" placeholder="Location where the item was found" value={item.location} onChange={handleChange} maxLength={150} required />
          </div>

          <div className="found-input-group">
            <FaCalendarAlt className="found-input-icon" />
            <input type="date" name="dateFound" value={item.dateFound} onChange={handleChange} max={new Date().toISOString().split("T")[0]} required />
          </div>

          <div className="found-file-upload">
            <label><FaImage /> Item Image</label>
            <p>Upload a clear photo. AI image analysis starts automatically after upload.</p>
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </div>

          {item.imageDataUrl && (
            <div className="found-image-preview">
              <img src={item.imageDataUrl} alt="Found item preview" />
            </div>
          )}

          {analysing && <p style={{ marginTop: 12 }}>OpenAI is automatically analysing the uploaded photo…</p>}

          {analysis && (
            <section style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
              <h3>AI Image Analysis</h3>
              <p><strong>Detected item:</strong> {analysis.object || "Not identified"}</p>
              <p><strong>Colour:</strong> {[analysis.primaryColour, ...(analysis.secondaryColours || [])].filter(Boolean).join(", ") || "Unclear"}</p>
              <p><strong>Brand:</strong> {analysis.brand || "Not visible"}</p>
              <p><strong>Material:</strong> {analysis.material || "Unclear"}</p>
              <p><strong>Visible text:</strong> {analysis.visibleText || "None detected"}</p>
              <p><strong>Distinctive features:</strong> {(analysis.distinctiveFeatures || []).join(", ") || "None detected"}</p>
            </section>
          )}

          <button type="submit" className="found-submit-button" disabled={analysing}>
            <FaPaperPlane /> {analysing ? "Analysing Photo…" : "✅ Submit Found Item & Get Drop-off Reference"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default ReportFoundItems;