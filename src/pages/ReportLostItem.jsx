
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

import {
  aiApi,
  fileToDataUrl,
} from "../services/aiApi";

import {
  checkAndNotifyForNewLostItem,
  notifyAdminAboutLostReport,
  getCurrentUserEmail,
} from "../services/notify";

import {
  dataApi,
  databaseApiEnabled,
} from "../services/dataApi";

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
    reporterEmail: getCurrentUserEmail(),
  });

  const [analysis, setAnalysis] = useState(null);
  const [verificationAnswers, setVerificationAnswers] = useState({});
  const [verificationQuestions, setVerificationQuestions] = useState([]);
  const [ownerAnswers, setOwnerAnswers] = useState({});
  const [ownerQuestions, setOwnerQuestions] = useState([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingOwnerQuestions, setGeneratingOwnerQuestions] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setItem((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));

    setError("");
  };

  async function runPhotoAnalysis(dataUrl) {
    if (!dataUrl) return;

    setAnalysing(true);
    setAnalysis(null);
    setVerificationAnswers({});
    setVerificationQuestions([]);
    setOwnerAnswers({});
    setOwnerQuestions([]);
    setError("");

    try {
      const result = await aiApi.analyseItem(
        dataUrl,
        item,
        "lost"
      );

      const nextAnalysis = result.analysis;

      setAnalysis(nextAnalysis);
      setVerificationQuestions(Array.isArray(nextAnalysis?.privateVerificationQuestions) ? nextAnalysis.privateVerificationQuestions : []);

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
    const file = e.target.files?.[0];

    setAnalysis(null);
    setVerificationAnswers({});
    setOwnerAnswers({});
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

      console.log("IMAGE SELECTED:", {
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrlLength: dataUrl?.length,
        startsCorrectly: dataUrl?.startsWith("data:image/"),
      });

      if (
        !dataUrl ||
        !dataUrl.startsWith("data:image/")
      ) {
        throw new Error(
          "The selected image could not be converted correctly."
        );
      }

      setItem((current) => ({
        ...current,
        imageDataUrl: dataUrl,
      }));

      await runPhotoAnalysis(dataUrl);
    } catch (err) {
      console.error("IMAGE UPLOAD ERROR:", err);

      setError(
        `Image upload failed: ${err.message}`
      );
    }
  };

  const simpleQuestions = verificationQuestions;
  const privateOwnerQuestions = ownerQuestions;

  async function generateVerificationQuestions() {
    if (!item.title.trim() || !item.description.trim() || !item.category) {
      setError("Complete the item title, description and category first.");
      return;
    }

    setGeneratingQuestions(true);
    setError("");
    setVerificationAnswers({});
    try {
      const result = await aiApi.generateVerificationQuestions(item, analysis);
      const questions = Array.isArray(result.questions) ? result.questions : [];
      if (questions.length !== 3) throw new Error("AI did not return three safe questions.");
      setVerificationQuestions(questions);
    } catch (err) {
      setError(`Unable to prepare verification questions: ${err.message}`);
    } finally {
      setGeneratingQuestions(false);
    }
  }

  async function generateOwnerQuestions() {
    if (!item.title.trim() || !item.description.trim()) {
      setError("Complete the item title and description first.");
      return;
    }

    setGeneratingOwnerQuestions(true);
    setError("");
    setOwnerAnswers({});

    try {
      const result = await aiApi.generateOwnerQuestions(item, analysis);
      const questions = Array.isArray(result.questions) ? result.questions : [];
      if (questions.length !== 3) throw new Error("AI did not return three safe owner questions.");
      setOwnerQuestions(questions);
    } catch (err) {
      setError(`Unable to prepare private owner questions: ${err.message}`);
    } finally {
      setGeneratingOwnerQuestions(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !item.title.trim() ||
      !item.description.trim() ||
      !item.category ||
      !item.location.trim() ||
      !item.dateLost ||
      !item.reporterEmail.trim()
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (analysing) {
      setError(
        "Please wait for AI image analysis to finish before submitting."
      );
      return;
    }

    if (item.imageDataUrl && !analysis) {
      setError(
        "Please complete AI image analysis before submitting this photo report."
      );
      return;
    }

    if (simpleQuestions.length !== 3) {
      setError("Prepare the item verification questions before submitting your report.");
      return;
    }

    if (simpleQuestions.some((question) => !verificationAnswers[question]?.trim())) {
      setError("Please answer all item verification questions.");
      return;
    }

    if (privateOwnerQuestions.length !== 3) {
      setError("Prepare the private owner questions before submitting your report.");
      return;
    }

    if (privateOwnerQuestions.some((question) => !ownerAnswers[question]?.trim())) {
      setError("Please answer all private owner questions.");
      return;
    }

    const existingItems = JSON.parse(
      localStorage.getItem("lostItems") || "[]"
    );

    const newItem = {
      ...item,

      title: item.title.trim(),

      description: item.description.trim(),

      location: item.location.trim(),

      reporterEmail: item.reporterEmail.trim(),

      id: Date.now().toString(),

      status: "Searching",

      aiAnalysis: analysis,

      itemVerification: simpleQuestions.map((question) => ({
        question,
        answer: verificationAnswers[question].trim(),
      })),

      privateOwnerVerification: privateOwnerQuestions.map((question) => ({
        question,
        answer: ownerAnswers[question].trim(),
      })),

      // Compatibility field used by the existing claim/admin flow.
      privateVerification: [
        ...simpleQuestions.map((question) => ({
          section: "item",
          question,
          answer: verificationAnswers[question].trim(),
        })),
        ...privateOwnerQuestions.map((question) => ({
          section: "owner",
          question,
          answer: ownerAnswers[question].trim(),
        })),
      ],

      createdAt: new Date().toISOString(),
    };

    existingItems.push(newItem);

    localStorage.setItem(
      "lostItems",
      JSON.stringify(existingItems)
    );

    if (databaseApiEnabled) {
      try {
        await dataApi.saveLostItem(newItem);
        console.log("LOST ITEM SAVED TO POSTGRESQL API:", newItem.id);
      } catch (databaseError) {
        console.error("POSTGRESQL SAVE FAILED; local prototype copy was kept:", databaseError);
      }
    }

    console.log("LOST ITEM SAVED:", newItem);

    /* =====================================================
       1. SEND ADMIN LOST-ITEM EMAIL
    ===================================================== */

    try {
      const adminEmailResult =
        await notifyAdminAboutLostReport(newItem);

      console.log(
        "ADMIN LOST EMAIL RESULT:",
        adminEmailResult
      );
    } catch (error) {
      console.error(
        "ADMIN LOST EMAIL ERROR:",
        error
      );
    }

    /* =====================================================
       2. CHECK AGAINST EXISTING FOUND ITEMS
    ===================================================== */

    try {
      const matchResults =
        await checkAndNotifyForNewLostItem(
          newItem,
          aiApi.matchItems
        );

      console.log(
        "LOST ITEM MATCH RESULTS:",
        matchResults
      );
    } catch (error) {
      console.error(
        "LOST ITEM MATCH NOTIFICATION ERROR:",
        error
      );
    }

    alert("Lost item reported successfully!");

    navigate("/view-lost-items");
  };

  return (
    <main className="lost-report-page">
      <div className="lost-report-shell">

        {/* =====================================================
            LEFT INFORMATION PANEL
        ===================================================== */}

        <aside className="lost-report-intro">

          <div className="intro-badge">
            <span className="intro-badge-icon">
              <FaBoxOpen />
            </span>

            <span>Lost & Found</span>
          </div>

          <div className="intro-content">

            <span className="intro-label">
              LOST ITEM REPORT
            </span>

            <h1>
              Help us bring
              <span>your item home.</span>
            </h1>

            <p className="intro-description">
              Tell us what you lost and where
              you last saw it. Your report will
              be used to search for matching
              found items.
            </p>

            <div className="intro-features">

              <div className="intro-feature">
                <div className="feature-icon">
                  <FaImage />
                </div>

                <div>
                  <strong>
                    AI photo analysis
                  </strong>

                  <span>
                    Upload a photo and our AI
                    identifies useful details.
                  </span>
                </div>
              </div>

              <div className="intro-feature">
                <div className="feature-icon">
                  <FaBoxOpen />
                </div>

                <div>
                  <strong>
                    Intelligent matching
                  </strong>

                  <span>
                    Your report is compared with
                    existing found items.
                  </span>
                </div>
              </div>

              <div className="intro-feature">
                <div className="feature-icon">
                  <FaEnvelope />
                </div>

                <div>
                  <strong>
                    Email notifications
                  </strong>

                  <span>
                    Receive an alert when a
                    potential match is detected.
                  </span>
                </div>
              </div>

            </div>
          </div>

          <div className="intro-bottom-card">
            <div className="intro-bottom-icon">
              ✓
            </div>

            <div>
              <strong>
                Private ownership verification
              </strong>

              <p>
                Your verification answers help
                confirm ownership if your item
                is located.
              </p>
            </div>
          </div>

        </aside>


        {/* =====================================================
            RIGHT FORM AREA
        ===================================================== */}

        <section className="lost-report-form-area">

          <div className="form-header">

            <div>
              <span className="form-eyebrow">
                NEW REPORT
              </span>

              <h2>
                Report a lost item
              </h2>

              <p>
                Provide the details below so
                we can begin the search.
              </p>
            </div>

            <div className="form-progress">
              <div className="progress-step active">
                <span>1</span>
                <small>Details</small>
              </div>

              <div className="progress-connector"></div>

              <div className="progress-step">
                <span>2</span>
                <small>Photo</small>
              </div>

              <div className="progress-connector"></div>

              <div className="progress-step">
                <span>3</span>
                <small>Submit</small>
              </div>
            </div>

          </div>


          {/* =====================================================
              ERROR
          ===================================================== */}

          {error && (
            <div className="form-error">

              <div className="error-icon">
                !
              </div>

              <div>
                <strong>
                  Something needs your attention
                </strong>

                <p>{error}</p>
              </div>

            </div>
          )}


          <form
            onSubmit={handleSubmit}
            className="lost-report-form"
          >

            {/* =================================================
                SECTION 01
            ================================================= */}

            <section className="form-section">

              <div className="section-heading">

                <div className="section-number">
                  01
                </div>

                <div>
                  <h3>
                    Item details
                  </h3>

                  <p>
                    Tell us what you lost.
                  </p>
                </div>

              </div>


              <div className="form-grid">

                <div className="field field-full">

                  <label htmlFor="title">
                    <FaBoxOpen />
                    Item title
                    <span>*</span>
                  </label>

                  <div className="input-shell">
                    <input
                      id="title"
                      type="text"
                      name="title"
                      placeholder="e.g. Black Samsung Galaxy phone"
                      value={item.title}
                      onChange={handleChange}
                    />
                  </div>

                </div>


                <div className="field field-full">

                  <label htmlFor="description">
                    <FaAlignLeft />
                    Description
                    <span>*</span>
                  </label>

                  <div className="input-shell textarea-shell">

                    <textarea
                      id="description"
                      name="description"
                      placeholder="Describe the item, including colour, brand, markings or other useful details..."
                      value={item.description}
                      onChange={handleChange}
                    />

                  </div>

                  <small className="field-hint">
                    Include distinctive details
                    that could help identify your
                    item.
                  </small>

                </div>


                <div className="field">

                  <label htmlFor="category">
                    <FaBoxOpen />
                    Category
                    <span>*</span>
                  </label>

                  <div className="input-shell select-shell">

                    <select
                      id="category"
                      name="category"
                      value={item.category}
                      onChange={handleChange}
                    >
                      <option value="">
                        Select a category
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

                </div>


                <div className="field">

                  <label htmlFor="reporterEmail">
                    <FaEnvelope />
                    Notification email
                    <span>*</span>
                  </label>

                  <div className="input-shell">

                    <input
                      id="reporterEmail"
                      type="email"
                      name="reporterEmail"
                      placeholder="you@example.com"
                      value={item.reporterEmail}
                      onChange={handleChange}
                    />

                  </div>

                  <small className="field-hint">
                    Used for potential match
                    notifications.
                  </small>

                </div>

              </div>

            </section>


            {/* =================================================
                SECTION 02
            ================================================= */}

            <section className="form-section">

              <div className="section-heading">

                <div className="section-number">
                  02
                </div>

                <div>
                  <h3>
                    Where & when
                  </h3>

                  <p>
                    Help narrow down where your
                    item may have been lost.
                  </p>
                </div>

              </div>


              <div className="form-grid">

                <div className="field">

                  <label htmlFor="location">
                    <FaMapMarkerAlt />
                    Location lost
                    <span>*</span>
                  </label>

                  <div className="input-shell">

                    <input
                      id="location"
                      type="text"
                      name="location"
                      placeholder="e.g. Shopping centre, campus, bus..."
                      value={item.location}
                      onChange={handleChange}
                    />

                  </div>

                </div>


                <div className="field">

                  <label htmlFor="dateLost">
                    <FaCalendarAlt />
                    Date lost
                    <span>*</span>
                  </label>

                  <div className="input-shell">

                    <input
                      id="dateLost"
                      type="date"
                      name="dateLost"
                      value={item.dateLost}
                      onChange={handleChange}
                      max={
                        new Date()
                          .toISOString()
                          .split("T")[0]
                      }
                    />

                  </div>

                </div>

              </div>

            </section>


            {/* =================================================
                SECTION 03
            ================================================= */}

            <section className="form-section">

              <div className="section-heading">

                <div className="section-number">
                  03
                </div>

                <div>
                  <h3>
                    Add a photo
                  </h3>

                  <p>
                    Optional, but recommended for
                    AI-powered analysis.
                  </p>
                </div>

              </div>


              <div className="photo-upload-area">

                <label
                  htmlFor="lost-item-photo"
                  className="photo-upload-box"
                >

                  <div className="upload-icon">
                    <FaImage />
                  </div>

                  <div className="upload-content">

                    <strong>
                      Upload an item photo
                    </strong>

                    <span>
                      Click to browse or choose an
                      image from your device
                    </span>

                    <small>
                      JPG, PNG, WEBP · Maximum 5 MB
                    </small>

                  </div>

                  <div className="upload-arrow">
                    +
                  </div>

                </label>

                <input
                  id="lost-item-photo"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden-file-input"
                />

              </div>


              {item.imageDataUrl && (
                <div className="image-preview-card">

                  <div className="preview-header">

                    <div>
                      <strong>
                        Uploaded image
                      </strong>

                      <span>
                        Ready for AI analysis
                      </span>
                    </div>

                    <span className="preview-status">
                      ✓ Added
                    </span>

                  </div>

                  <img
                    src={item.imageDataUrl}
                    alt="Lost item preview"
                  />

                </div>
              )}


              {analysing && (
                <div className="analysis-loading">

                  <div className="loading-spinner"></div>

                  <div>
                    <strong>
                      AI is analysing your photo
                    </strong>

                    <span>
                      Identifying item details,
                      appearance and useful
                      verification information...
                    </span>
                  </div>

                </div>
              )}


              {analysis && (
                <section className="ai-analysis-card">

                  <div className="ai-analysis-header">

                    <div className="ai-analysis-icon">
                      AI
                    </div>

                    <div>
                      <span>
                        AI ANALYSIS COMPLETE
                      </span>

                      <h3>
                        Detected item details
                      </h3>
                    </div>

                  </div>


                  <div className="analysis-grid">

                    <div className="analysis-item">
                      <span>
                        Detected item
                      </span>

                      <strong>
                        {analysis.object ||
                          "Not identified"}
                      </strong>
                    </div>


                    <div className="analysis-item">
                      <span>
                        Colour
                      </span>

                      <strong>
                        {[
                          analysis.primaryColour,
                          ...(analysis.secondaryColours ||
                            []),
                        ]
                          .filter(Boolean)
                          .join(", ") ||
                          "Unclear"}
                      </strong>
                    </div>


                    <div className="analysis-item">
                      <span>
                        Brand
                      </span>

                      <strong>
                        {analysis.brand ||
                          "Not visible"}
                      </strong>
                    </div>


                    <div className="analysis-item">
                      <span>
                        Material
                      </span>

                      <strong>
                        {analysis.material ||
                          "Unclear"}
                      </strong>
                    </div>


                    <div className="analysis-item">
                      <span>
                        Condition
                      </span>

                      <strong>
                        {analysis.condition ||
                          "Unclear"}
                      </strong>
                    </div>


                    <div className="analysis-item analysis-wide">
                      <span>
                        Distinctive features
                      </span>

                      <strong>
                        {(
                          analysis.distinctiveFeatures ||
                          []
                        ).join(", ") ||
                          "None detected"}
                      </strong>
                    </div>

                  </div>



                </section>
              )}



              <section className="ai-analysis-card verification-card" style={{ marginTop: 20 }}>
                <div className="ai-analysis-header">
                  <div className="ai-analysis-icon">01</div>
                  <div>
                    <span>ITEM VERIFICATION</span>
                    <h3>Confirm physical details about the item</h3>
                  </div>
                </div>

                <p className="verification-copy">
                  These three questions focus on physical details, condition, accessories or distinctive features. The answers stay private and help support a later ownership check.
                </p>

                <button
                  type="button"
                  className="submit-button verification-action"
                  onClick={generateVerificationQuestions}
                  disabled={generatingQuestions || analysing}
                >
                  {generatingQuestions ? "Preparing questions..." : simpleQuestions.length ? "Refresh item questions" : "Prepare item questions"}
                </button>

                {simpleQuestions.length > 0 && (
                  <div className="verification-area">
                    <div className="verification-header">
                      <div className="verification-icon">✓</div>
                      <div><span>PRIVATE</span><h4>Item detail questions</h4></div>
                    </div>
                    <div className="verification-list">
                      {simpleQuestions.map((question, index) => (
                        <div className="verification-question" key={question}>
                          <label htmlFor={`verification-${index}`}><span>{index + 1}</span>{question}</label>
                          <input
                            id={`verification-${index}`}
                            type="text"
                            value={verificationAnswers[question] || ""}
                            placeholder="Your private answer"
                            onChange={(e) => setVerificationAnswers((current) => ({ ...current, [question]: e.target.value }))}
                            autoComplete="off"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="ai-analysis-card verification-card owner-private-card" style={{ marginTop: 20 }}>
                <div className="ai-analysis-header">
                  <div className="ai-analysis-icon">02</div>
                  <div>
                    <span>PRIVATE OWNER KNOWLEDGE</span>
                    <h3>Answer details only the genuine owner should know</h3>
                  </div>
                </div>

                <p className="verification-copy">
                  This separate set asks about private ownership history or details that are not normally obvious from looking at the item, such as where it was bought, a hidden mark, a repair, a usual accessory or another owner-only detail.
                </p>

                <div className="owner-privacy-note">
                  <strong>Keep these answers private.</strong> They are used only as supporting ownership evidence and should never contain passwords, PINs, banking information or authentication codes.
                </div>

                <button
                  type="button"
                  className="submit-button verification-action"
                  onClick={generateOwnerQuestions}
                  disabled={generatingOwnerQuestions || analysing}
                >
                  {generatingOwnerQuestions ? "Preparing private questions..." : privateOwnerQuestions.length ? "Refresh private owner questions" : "Prepare private owner questions"}
                </button>

                {privateOwnerQuestions.length > 0 && (
                  <div className="verification-area owner-verification-area">
                    <div className="verification-header">
                      <div className="verification-icon">✓</div>
                      <div><span>OWNER ONLY</span><h4>Private owner questions</h4></div>
                    </div>
                    <div className="verification-list">
                      {privateOwnerQuestions.map((question, index) => (
                        <div className="verification-question" key={question}>
                          <label htmlFor={`owner-verification-${index}`}><span>{index + 1}</span>{question}</label>
                          <input
                            id={`owner-verification-${index}`}
                            type="text"
                            value={ownerAnswers[question] || ""}
                            placeholder="Your private owner answer"
                            onChange={(e) => setOwnerAnswers((current) => ({ ...current, [question]: e.target.value }))}
                            autoComplete="off"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

            </section>


            {/* =================================================
                SUBMIT AREA
            ================================================= */}

            <div className="submit-area">

              <div className="submit-info">

                <span className="submit-check">
                  ✓
                </span>

                <div>
                  <strong>
                    Ready to submit?
                  </strong>

                  <span>
                    Your report will be saved and
                    checked for potential matches.
                  </span>
                </div>

              </div>


              <button
                type="submit"
                disabled={analysing}
                className="submit-report-button"
              >

                {analysing
                  ? "Analysing photo..."
                  : "Submit lost item report"}

                {!analysing && (
                  <span className="submit-arrow">
                    →
                  </span>
                )}

              </button>

            </div>

          </form>

        </section>

      </div>
    </main>
  );
}

export default ReportLostItem;
