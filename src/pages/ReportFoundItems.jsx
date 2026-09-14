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

import { aiApi, fileToDataUrl, compressImageDataUrl } from "../services/aiApi";

import {
  checkAndNotifyForNewFoundItem,
  notifyAdminAboutFoundReport,
} from "../services/notify";

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

    setItem((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  async function runPhotoAnalysis(dataUrl) {
    if (!dataUrl) return;

    setAnalysing(true);
    setAnalysis(null);
    setError("");

    try {
      const result = await aiApi.analyseItem(
        dataUrl,
        item,
        "found"
      );

      const nextAnalysis = result.analysis;

      setAnalysis(nextAnalysis);

      setItem((current) => ({
        ...current,
        title:
          current.title ||
          nextAnalysis?.suggestedTitle ||
          "",
        description:
          current.description ||
          nextAnalysis?.searchDescription ||
          "",
        category:
          current.category ||
          nextAnalysis?.category ||
          "",
      }));
    } catch (err) {
      setError(
        `AI image analysis failed: ${err.message}`
      );
    } finally {
      setAnalysing(false);
    }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0] || null;

    setAnalysis(null);
    setError("");

    if (!file) {
      setItem((previous) => ({
        ...previous,
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

      setItem((previous) => ({
        ...previous,
        imageDataUrl: dataUrl,
      }));

      await runPhotoAnalysis(dataUrl);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    // Validate required fields
    if (
      !item.title.trim() ||
      !item.description.trim() ||
      !item.category ||
      !item.location.trim() ||
      !item.dateFound
    ) {
      setError("Please complete all required fields.");
      return;
    }

    // Prevent future dates
    const today = new Date()
      .toISOString()
      .split("T")[0];

    if (item.dateFound > today) {
      setError(
        "The found date cannot be in the future."
      );
      return;
    }

    // Don't submit while AI is analysing
    if (analysing) {
      setError(
        "Please wait for AI image analysis to finish before submitting."
      );
      return;
    }

    // If an image was uploaded, require AI analysis
    if (item.imageDataUrl && !analysis) {
      setError(
        "Please complete AI image analysis before submitting this photo report."
      );
      return;
    }

    try {
      // Get existing found items
      const existingItems = JSON.parse(
        localStorage.getItem("foundItems") || "[]"
      );

      // Create new found item
      const newItem = {
        id: Date.now().toString(),

        title: item.title.trim(),

        description:
          item.description.trim(),

        category: item.category,

        location:
          item.location.trim(),

        dateFound:
          item.dateFound,

        imageDataUrl:
          item.imageDataUrl,

        aiAnalysis:
          analysis,

        status:
          "Awaiting Drop-off",

        dropoffReference:
          `FND-${Date.now()
            .toString()
            .slice(-8)}`,

        createdAt:
          new Date().toISOString(),
      };

      // Save compact image data. Browser localStorage is intentionally only a
      // temporary prototype store and has a small quota. If older demo records
      // contain full-size Base64 photos, compact them automatically before
      // failing the submission.
      const nextItems = [...existingItems, newItem];
      try {
        localStorage.setItem("foundItems", JSON.stringify(nextItems));
      } catch (storageError) {
        const isQuotaError =
          storageError?.name === "QuotaExceededError" ||
          storageError?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
          String(storageError?.message || "").toLowerCase().includes("quota");

        if (!isQuotaError) throw storageError;

        const compactedItems = [];
        for (const existing of nextItems) {
          let compactImage = existing.imageDataUrl || "";
          if (compactImage?.startsWith("data:image/")) {
            try {
              compactImage = await compressImageDataUrl(compactImage, {
                maxDimension: 700,
                quality: 0.46,
              });
            } catch {
              // Keep metadata even if an old invalid demo image cannot be compacted.
              compactImage = "";
            }
          }
          compactedItems.push({ ...existing, imageDataUrl: compactImage });
        }

        try {
          localStorage.setItem("foundItems", JSON.stringify(compactedItems));
        } catch {
          throw new Error(
            "Browser demo storage is full. Existing photos have used the local storage limit. Clear old demo found-item records or enable the PostgreSQL API for persistent storage."
          );
        }
      }

      console.log(
        "Found item saved:",
        newItem
      );

      // ------------------------------------------------
      // ADMIN EMAIL NOTIFICATION
      // ------------------------------------------------
      //
      // This sends the new found-item report to the
      // configured administrator through the backend.
      //
      try {
        const notificationResult =
          await notifyAdminAboutFoundReport(
            newItem
          );

        console.log(
          "Admin found-item notification result:",
          notificationResult
        );
      } catch (notificationError) {
        console.warn(
          "Admin found-item notification failed:",
          notificationError
        );

        // Don't stop the found-item submission
        // if email notification fails.
      }

      // ------------------------------------------------
      // CHECK FOR POSSIBLE LOST-ITEM MATCHES
      // ------------------------------------------------
      //
      // Only check against lost items after the
      // found item has been saved.
      //
      try {
        const matchResults =
          await checkAndNotifyForNewFoundItem(
            newItem,
            aiApi.matchItems
          );

        console.log(
          "Found-item matching results:",
          matchResults
        );
      } catch (matchError) {
        console.warn(
          "Found-item matching notification failed:",
          matchError
        );
      }

      alert(
        "Found item reported successfully. Please hand the physical item to the Lost & Found Office."
      );

      navigate(
        `/found-dropoff/${newItem.id}`
      );
    } catch (err) {
      console.error(
        "Found item submission failed:",
        err
      );

      setError(
        `Unable to submit found item: ${err.message}`
      );
    }
  };

  return (
    <main className="found-item-container">
      <div className="found-item-card">

        {/* HEADER */}
        <div className="found-item-header">
          <div>
            <p className="found-eyebrow">
              LOST & FOUND
            </p>

            <h1>
              <FaBoxOpen /> Report Found Item
            </h1>

            <p>
              Help reunite an item with its owner
              by providing accurate information.
            </p>
          </div>

          <button
            type="button"
            className="found-back-button"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <FaArrowLeft /> Dashboard
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="found-error">
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit}>

          <div className="form-intro-badge">
            📥 Found item intake starts here
          </div>

          {/* TITLE */}
          <div className="found-input-group">
            <FaTag className="found-input-icon" />

            <input
              type="text"
              name="title"
              placeholder="Item title"
              value={item.title}
              onChange={handleChange}
              maxLength={100}
              required
            />
          </div>

          {/* CATEGORY */}
          <div className="found-input-group">
            <select
              name="category"
              value={item.category}
              onChange={handleChange}
              required
            >
              <option value="">
                Select category
              </option>

              <option value="Electronics">
                Electronics
              </option>

              <option value="Documents">
                Documents
              </option>

              <option value="Clothing">
                Clothing
              </option>

              <option value="Bags">
                Bags
              </option>

              <option value="Keys">
                Keys
              </option>

              <option value="Other">
                Other
              </option>
            </select>
          </div>

          {/* DESCRIPTION */}
          <div className="found-input-group textarea-group">
            <FaFileAlt className="found-input-icon" />

            <textarea
              name="description"
              placeholder="Describe the item — include colour, brand, size, identifying marks or other useful details"
              value={item.description}
              onChange={handleChange}
              maxLength={500}
              required
            />
          </div>

          {/* LOCATION */}
          <div className="found-input-group">
            <FaMapMarkerAlt className="found-input-icon" />

            <input
              type="text"
              name="location"
              placeholder="Location where the item was found"
              value={item.location}
              onChange={handleChange}
              maxLength={150}
              required
            />
          </div>

          {/* DATE */}
          <div className="found-input-group">
            <FaCalendarAlt className="found-input-icon" />

            <input
              type="date"
              name="dateFound"
              value={item.dateFound}
              onChange={handleChange}
              max={
                new Date()
                  .toISOString()
                  .split("T")[0]
              }
              required
            />
          </div>

          {/* IMAGE */}
          <div className="found-file-upload">
            <label>
              <FaImage /> Item Image
            </label>

            <p>
              Upload a clear photo. AI image
              analysis starts automatically
              after upload.
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>

          {/* IMAGE PREVIEW */}
          {item.imageDataUrl && (
            <div className="found-image-preview">
              <img
                src={item.imageDataUrl}
                alt="Found item preview"
              />
            </div>
          )}

          {/* AI ANALYSING */}
          {analysing && (
            <p style={{ marginTop: 12 }}>
              OpenAI is automatically analysing
              the uploaded photo…
            </p>
          )}

          {/* AI RESULTS */}
          {analysis && (
            <section
              style={{
                marginTop: 16,
                padding: 16,
                border: "1px solid #ddd",
                borderRadius: 12,
              }}
            >
              <h3>
                AI Image Analysis
              </h3>

              <p>
                <strong>
                  Detected item:
                </strong>{" "}
                {analysis.object ||
                  "Not identified"}
              </p>

              <p>
                <strong>
                  Colour:
                </strong>{" "}
                {[
                  analysis.primaryColour,
                  ...(analysis.secondaryColours ||
                    []),
                ]
                  .filter(Boolean)
                  .join(", ") ||
                  "Unclear"}
              </p>

              <p>
                <strong>
                  Brand:
                </strong>{" "}
                {analysis.brand ||
                  "Not visible"}
              </p>

              <p>
                <strong>
                  Material:
                </strong>{" "}
                {analysis.material ||
                  "Unclear"}
              </p>

              <p>
                <strong>
                  Visible text:
                </strong>{" "}
                {analysis.visibleText ||
                  "None detected"}
              </p>

              <p>
                <strong>
                  Distinctive features:
                </strong>{" "}
                {(
                  analysis.distinctiveFeatures ||
                  []
                ).join(", ") ||
                  "None detected"}
              </p>
            </section>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            className="found-submit-button"
            disabled={analysing}
          >
            <FaPaperPlane />

            {analysing
              ? "Analysing Photo…"
              : "✅ Submit Found Item & Get Drop-off Reference"}
          </button>

        </form>
      </div>
    </main>
  );
}

export default ReportFoundItems;