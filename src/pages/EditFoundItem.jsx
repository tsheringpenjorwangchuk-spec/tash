import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaCalendarAlt,
  FaCheckCircle,
  FaFileAlt,
  FaImage,
  FaMapMarkerAlt,
  FaSave,
  FaShieldAlt,
  FaTag,
  FaTimes,
  FaUpload,
} from "react-icons/fa";

import "./EditFoundItem.css";

function EditFoundItem() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [item, setItem] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    dateFound: "",
    imageDataUrl: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const foundItems = JSON.parse(
      localStorage.getItem("foundItems") || "[]"
    );

    const existingItem = foundItems.find(
      (foundItem) => String(foundItem.id) === String(id)
    );

    if (!existingItem) {
      setError("Found item could not be found.");
      setLoading(false);
      return;
    }

    setItem({
      title: existingItem.title || "",
      description: existingItem.description || "",
      category: existingItem.category || "",
      location: existingItem.location || "",
      dateFound: existingItem.dateFound || "",
      imageDataUrl: existingItem.imageDataUrl || "",
    });

    setLoading(false);
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setItem((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Please select an image smaller than 5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setItem((previous) => ({
        ...previous,
        imageDataUrl: reader.result,
      }));

      setError("");
    };

    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setItem((previous) => ({
      ...previous,
      imageDataUrl: "",
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

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

    const foundItems = JSON.parse(
      localStorage.getItem("foundItems") || "[]"
    );

    const itemExists = foundItems.some(
      (foundItem) => String(foundItem.id) === String(id)
    );

    if (!itemExists) {
      setError("This found item no longer exists.");
      return;
    }

    const updatedItems = foundItems.map((foundItem) => {
      if (String(foundItem.id) !== String(id)) {
        return foundItem;
      }

      return {
        ...foundItem,
        title: item.title.trim(),
        description: item.description.trim(),
        category: item.category,
        location: item.location.trim(),
        dateFound: item.dateFound,
        imageDataUrl: item.imageDataUrl,
        updatedAt: new Date().toISOString(),
      };
    });

    localStorage.setItem(
      "foundItems",
      JSON.stringify(updatedItems)
    );

    alert("Found item updated successfully!");

    navigate("/view-found-items");
  };

  if (loading) {
    return (
      <main className="edit-found-page">
        <section className="edit-state-card">
          <div className="edit-state-icon loading">
            <FaBoxOpen />
          </div>

          <span className="edit-state-label">
            FOUND ITEM
          </span>

          <h1>Loading report</h1>

          <p>
            Please wait while the found-item report is being loaded.
          </p>
        </section>
      </main>
    );
  }

  if (error && !item.title) {
    return (
      <main className="edit-found-page">
        <section className="edit-state-card">
          <div className="edit-state-icon">
            <FaBoxOpen />
          </div>

          <span className="edit-state-label">
            LOST & FOUND
          </span>

          <h1>Found item not found</h1>

          <p className="edit-state-message">
            {error}
          </p>

          <button
            type="button"
            className="edit-state-button"
            onClick={() => navigate("/view-found-items")}
          >
            <FaArrowLeft />
            Back to Found Items
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="edit-found-page">
      <section className="edit-found-workspace">

        {/* =====================================================
            TOP BAR
            ===================================================== */}

        <header className="edit-topbar">
          <button
            type="button"
            className="edit-back-button"
            onClick={() => navigate("/view-found-items")}
          >
            <FaArrowLeft />
            <span>Found Items</span>
          </button>

          <div className="edit-topbar-title">
            <span>REPORT EDITOR</span>
            <strong>Edit found item</strong>
          </div>

          <div className="edit-topbar-status">
            <span className="status-dot" />
            Editing report
          </div>
        </header>


        {/* =====================================================
            PAGE INTRO
            ===================================================== */}

        <section className="edit-page-intro">
          <div className="edit-intro-copy">
            <div className="edit-eyebrow">
              <span>
                <FaBoxOpen />
              </span>

              FOUND ITEM MANAGEMENT
            </div>

            <h1>Edit found item</h1>

            <p>
              Keep this report accurate and useful by updating the
              item details, discovery information and image.
            </p>
          </div>

          <div className="edit-intro-meta">
            <div>
              <FaCheckCircle />

              <span>
                <strong>Existing report</strong>
                Changes will update this item
              </span>
            </div>
          </div>
        </section>


        {/* =====================================================
            ERROR
            ===================================================== */}

        {error && (
          <div className="edit-found-error">
            <FaShieldAlt />
            <span>{error}</span>
          </div>
        )}


        {/* =====================================================
            MAIN EDITOR
            ===================================================== */}

        <div className="edit-editor-layout">

          {/* ===================================================
              FORM PANEL
              =================================================== */}

          <form
            className="edit-form-panel"
            onSubmit={handleSubmit}
          >

            {/* =================================================
                SECTION 01
                ================================================= */}

            <section className="edit-section">

              <div className="edit-section-header">
                <div className="edit-section-index">
                  01
                </div>

                <div>
                  <span>REPORT INFORMATION</span>

                  <h2>Item details</h2>

                  <p>
                    Describe the found item clearly so it can be
                    identified accurately.
                  </p>
                </div>
              </div>


              <div className="edit-field-grid two">

                {/* ITEM TITLE */}

                <div className="edit-field">
                  <label htmlFor="title">
                    Item title
                  </label>

                  <div className="edit-input">
                    <span className="edit-input-icon">
                      <FaTag />
                    </span>

                    <input
                      id="title"
                      type="text"
                      name="title"
                      placeholder="e.g. Blue Umbrella"
                      value={item.title}
                      onChange={handleChange}
                    />
                  </div>
                </div>


                {/* CATEGORY */}

                <div className="edit-field">
                  <label htmlFor="category">
                    Category
                  </label>

                  <div className="edit-input">
                    <span className="edit-input-icon">
                      <FaBoxOpen />
                    </span>

                    <select
                      id="category"
                      name="category"
                      value={item.category}
                      onChange={handleChange}
                    >
                      <option value="">
                        Select Category
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

              </div>


              {/* DESCRIPTION */}

              <div className="edit-field">
                <label htmlFor="description">
                  Description
                </label>

                <div className="edit-input textarea">
                  <span className="edit-input-icon textarea-icon">
                    <FaFileAlt />
                  </span>

                  <textarea
                    id="description"
                    name="description"
                    placeholder="Describe the item you found..."
                    value={item.description}
                    onChange={handleChange}
                  />
                </div>

                <small>
                  Include colour, brand, markings, condition or other
                  identifying details.
                </small>
              </div>

            </section>


            {/* =================================================
                SECTION 02
                ================================================= */}

            <section className="edit-section">

              <div className="edit-section-header">
                <div className="edit-section-index">
                  02
                </div>

                <div>
                  <span>DISCOVERY DETAILS</span>

                  <h2>Where and when</h2>

                  <p>
                    Add the location and date where the item was found.
                  </p>
                </div>
              </div>


              <div className="edit-field-grid two">

                {/* LOCATION */}

                <div className="edit-field">
                  <label htmlFor="location">
                    Location found
                  </label>

                  <div className="edit-input">
                    <span className="edit-input-icon">
                      <FaMapMarkerAlt />
                    </span>

                    <input
                      id="location"
                      type="text"
                      name="location"
                      placeholder="e.g. Main Hall"
                      value={item.location}
                      onChange={handleChange}
                    />
                  </div>
                </div>


                {/* DATE */}

                <div className="edit-field">
                  <label htmlFor="dateFound">
                    Date found
                  </label>

                  <div className="edit-input">
                    <span className="edit-input-icon">
                      <FaCalendarAlt />
                    </span>

                    <input
                      id="dateFound"
                      type="date"
                      name="dateFound"
                      value={item.dateFound}
                      onChange={handleChange}
                    />
                  </div>
                </div>

              </div>

            </section>


            {/* =================================================
                SECTION 03
                ================================================= */}

            <section className="edit-section">

              <div className="edit-section-header">
                <div className="edit-section-index">
                  03
                </div>

                <div>
                  <span>VISUAL INFORMATION</span>

                  <h2>Item image</h2>

                  <p>
                    Replace the current image or remove it from the
                    report.
                  </p>
                </div>
              </div>


              {/* UPLOAD */}

              <div className="edit-upload-area">
                <input
                  id="found-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />

                <label htmlFor="found-image">

                  <div className="upload-icon">
                    <FaUpload />
                  </div>

                  <strong>
                    Upload a new image
                  </strong>

                  <span>
                    Use a clear image that helps identify the item.
                  </span>

                  <small>
                    Maximum file size: 5 MB
                  </small>

                  <em>
                    Browse files
                  </em>

                </label>
              </div>


              {/* CURRENT IMAGE */}

              {item.imageDataUrl && (
                <div className="edit-image-card">

                  <div className="image-card-header">

                    <div>
                      <span>CURRENT IMAGE</span>
                      <strong>Report image</strong>
                    </div>

                    <button
                      type="button"
                      className="remove-image-button"
                      onClick={removeImage}
                    >
                      <FaTimes />
                      Remove
                    </button>

                  </div>

                  <div className="image-preview">
                    <img
                      src={item.imageDataUrl}
                      alt="Found item preview"
                    />
                  </div>

                </div>
              )}

            </section>


            {/* =================================================
                ACTIONS
                ================================================= */}

            <footer className="edit-actions">

              <button
                type="button"
                className="cancel-edit-button"
                onClick={() => navigate("/view-found-items")}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="edit-save-button"
              >
                <FaSave />
                Save Changes
              </button>

            </footer>

          </form>


          {/* ===================================================
              LIVE PREVIEW
              =================================================== */}

          <aside className="edit-preview-panel">

            <div className="preview-panel-header">

              <div>
                <span>LIVE PREVIEW</span>
                <h2>Found item</h2>
              </div>

              <div className="preview-status">
                <span />
                Draft
              </div>

            </div>


            {/* PREVIEW IMAGE */}

            <div className="preview-image">

              {item.imageDataUrl ? (
                <img
                  src={item.imageDataUrl}
                  alt="Found item"
                />
              ) : (
                <div className="preview-empty">
                  <FaImage />
                  <span>No image</span>
                </div>
              )}

            </div>


            {/* PREVIEW CONTENT */}

            <div className="preview-content">

              <span className="preview-category">
                {item.category || "CATEGORY"}
              </span>

              <h3>
                {item.title || "Found item title"}
              </h3>

              <p>
                {item.description ||
                  "Your item description will appear here as you update the report."}
              </p>


              {/* INFO */}

              <div className="preview-info-list">

                <div>
                  <span className="preview-info-icon">
                    <FaMapMarkerAlt />
                  </span>

                  <span>
                    <small>LOCATION</small>

                    <strong>
                      {item.location || "Not provided"}
                    </strong>
                  </span>
                </div>


                <div>
                  <span className="preview-info-icon">
                    <FaCalendarAlt />
                  </span>

                  <span>
                    <small>DATE FOUND</small>

                    <strong>
                      {item.dateFound || "Not provided"}
                    </strong>
                  </span>
                </div>

              </div>

            </div>


            {/* PREVIEW NOTE */}

            <div className="preview-note">

              <FaShieldAlt />

              <div>
                <strong>
                  Before you save
                </strong>

                <span>
                  Check that the title, location and image accurately
                  describe the found item.
                </span>
              </div>

            </div>

          </aside>

        </div>
      </section>
    </main>
  );
}

export default EditFoundItem;