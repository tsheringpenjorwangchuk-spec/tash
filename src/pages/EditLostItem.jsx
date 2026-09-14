import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaCalendarAlt,
  FaEnvelope,
  FaFileAlt,
  FaImage,
  FaMapMarkerAlt,
  FaSave,
  FaTag,
  FaUpload,
  FaTimes,
} from "react-icons/fa";

import "./EditLostItem.css";

function EditLostItem() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [item, setItem] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    dateLost: "",
    imageDataUrl: "",
    reporterEmail: "",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    const lostItems = JSON.parse(
      localStorage.getItem("lostItems") || "[]"
    );

    const existingItem = lostItems.find(
      (lostItem) => String(lostItem.id) === String(id)
    );

    if (!existingItem) {
      setError("Lost item could not be found.");
      return;
    }

    setItem({
      title: existingItem.title || "",
      description: existingItem.description || "",
      category: existingItem.category || "",
      location: existingItem.location || "",
      dateLost: existingItem.dateLost || "",
      imageDataUrl: existingItem.imageDataUrl || "",
      reporterEmail: existingItem.reporterEmail || "",
    });
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
      !item.dateLost
    ) {
      setError("Please complete all required fields.");
      return;
    }

    const lostItems = JSON.parse(
      localStorage.getItem("lostItems") || "[]"
    );

    const itemExists = lostItems.some(
      (lostItem) => String(lostItem.id) === String(id)
    );

    if (!itemExists) {
      setError("This lost item no longer exists.");
      return;
    }

    const updatedItems = lostItems.map((lostItem) => {
      if (String(lostItem.id) !== String(id)) {
        return lostItem;
      }

      return {
        ...lostItem,
        title: item.title.trim(),
        description: item.description.trim(),
        category: item.category,
        location: item.location.trim(),
        dateLost: item.dateLost,
        imageDataUrl: item.imageDataUrl,
        reporterEmail: item.reporterEmail.trim(),
        updatedAt: new Date().toISOString(),
      };
    });

    localStorage.setItem(
      "lostItems",
      JSON.stringify(updatedItems)
    );

    alert("Lost item updated successfully!");

    navigate("/view-lost-items");
  };

  if (error && !item.title) {
    return (
      <main className="edit-lost-page">
        <section className="edit-lost-state-card">
          <div className="edit-lost-state-icon">
            <FaTag />
          </div>

          <span className="edit-lost-state-label">
            LOST & FOUND
          </span>

          <h1>Lost item not found</h1>

          <p>{error}</p>

          <button
            type="button"
            onClick={() => navigate("/view-lost-items")}
          >
            <FaArrowLeft />
            Back to Lost Items
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="edit-lost-page">
      <div className="edit-lost-workspace">
        {/* TOP BAR */}
        <header className="edit-lost-topbar">
          <button
            type="button"
            className="edit-lost-back"
            onClick={() => navigate("/view-lost-items")}
          >
            <FaArrowLeft />
            <span>Lost Items</span>
          </button>

          <div className="edit-lost-topbar-title">
            <span>REPORT EDITOR</span>
            <strong>Edit lost item</strong>
          </div>

          <div className="edit-lost-status">
            <span />
            Editing
          </div>
        </header>

        {/* INTRO */}
        <section className="edit-lost-intro">
          <span className="edit-lost-kicker">
            LOST ITEM MANAGEMENT
          </span>

          <h1>Update your report</h1>

          <p>
            Keep your lost-item information accurate so the system can
            identify potential matches more effectively.
          </p>
        </section>

        {/* ERROR */}
        {error && (
          <div className="edit-lost-error">
            <span>!</span>
            <p>{error}</p>
          </div>
        )}

        <form
          className="edit-lost-form"
          onSubmit={handleSubmit}
        >
          {/* MAIN CONTENT */}
          <section className="edit-lost-main-card">
            {/* IMAGE PANEL */}
            <div className="edit-lost-image-panel">
              <div className="edit-lost-section-heading">
                <div>
                  <span>01</span>
                  <h2>Item image</h2>
                </div>

                <FaImage />
              </div>

              <div className="edit-lost-image-area">
                {item.imageDataUrl ? (
                  <div className="edit-lost-existing-image">
                    <img
                      src={item.imageDataUrl}
                      alt="Lost item preview"
                    />

                    <div className="edit-lost-image-overlay">
                      <label
                        htmlFor="lost-image"
                        className="edit-lost-replace-button"
                      >
                        <FaUpload />
                        Replace image
                      </label>

                      <button
                        type="button"
                        className="edit-lost-remove-button"
                        onClick={removeImage}
                      >
                        <FaTimes />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="lost-image"
                    className="edit-lost-empty-image"
                  >
                    <span className="edit-lost-upload-icon">
                      <FaUpload />
                    </span>

                    <strong>Add item image</strong>

                    <small>
                      Upload a clear photo of the lost item
                    </small>

                    <span className="edit-lost-browse">
                      Browse files
                    </span>
                  </label>
                )}

                <input
                  id="lost-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>

              <div className="edit-lost-image-meta">
                <FaImage />
                <span>JPG, PNG or other image format</span>
                <b>Max 5 MB</b>
              </div>
            </div>

            {/* INFORMATION PANEL */}
            <div className="edit-lost-information-panel">
              <div className="edit-lost-section-heading">
                <div>
                  <span>02</span>
                  <h2>Item information</h2>
                </div>

                <FaBoxOpen />
              </div>

              {/* TITLE */}
              <div className="edit-lost-field">
                <label htmlFor="title">
                  Item title
                </label>

                <div className="edit-lost-input">
                  <span className="edit-lost-input-icon">
                    <FaTag />
                  </span>

                  <input
                    id="title"
                    type="text"
                    name="title"
                    placeholder="e.g. Black Samsung Galaxy S25"
                    value={item.title}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* CATEGORY */}
              <div className="edit-lost-field">
                <label htmlFor="category">
                  Category
                </label>

                <div className="edit-lost-input">
                  <span className="edit-lost-input-icon">
                    <FaBoxOpen />
                  </span>

                  <select
                    id="category"
                    name="category"
                    value={item.category}
                    onChange={handleChange}
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
              </div>

              {/* LOCATION + DATE */}
              <div className="edit-lost-field-row">
                <div className="edit-lost-field">
                  <label htmlFor="location">
                    Location lost
                  </label>

                  <div className="edit-lost-input">
                    <span className="edit-lost-input-icon">
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

                <div className="edit-lost-field">
                  <label htmlFor="dateLost">
                    Date lost
                  </label>

                  <div className="edit-lost-input">
                    <span className="edit-lost-input-icon">
                      <FaCalendarAlt />
                    </span>

                    <input
                      id="dateLost"
                      type="date"
                      name="dateLost"
                      value={item.dateLost}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* EMAIL */}
              <div className="edit-lost-field">
                <label htmlFor="reporterEmail">
                  Notification email
                </label>

                <div className="edit-lost-input">
                  <span className="edit-lost-input-icon">
                    <FaEnvelope />
                  </span>

                  <input
                    id="reporterEmail"
                    type="email"
                    name="reporterEmail"
                    placeholder="Your email for match notifications"
                    value={item.reporterEmail}
                    onChange={handleChange}
                  />
                </div>

                <small>
                  This email is used for lost-item match notifications.
                </small>
              </div>
            </div>
          </section>

          {/* DESCRIPTION */}
          <section className="edit-lost-description-card">
            <div className="edit-lost-section-heading">
              <div>
                <span>03</span>
                <h2>Description</h2>
              </div>

              <FaFileAlt />
            </div>

            <textarea
              id="description"
              name="description"
              placeholder="Describe the item you lost..."
              value={item.description}
              onChange={handleChange}
            />

            <div className="edit-lost-description-footer">
              <span>
                Include colour, brand, markings, identifying features
                or condition.
              </span>

              <span>
                {item.description.length} characters
              </span>
            </div>
          </section>

          {/* ACTION BAR */}
          <footer className="edit-lost-action-bar">
            <div className="edit-lost-action-info">
              <div>
                <FaSave />
              </div>

              <section>
                <strong>Ready to update?</strong>

                <span>
                  Your changes will update the existing lost-item report.
                </span>
              </section>
            </div>

            <div className="edit-lost-actions">
              <button
                type="button"
                className="edit-lost-cancel"
                onClick={() => navigate("/view-lost-items")}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="edit-lost-save"
              >
                <FaSave />
                Save changes
              </button>
            </div>
          </footer>
        </form>
      </div>
    </main>
  );
}

export default EditLostItem;