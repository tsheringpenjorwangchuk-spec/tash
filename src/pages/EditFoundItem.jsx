import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaCalendarAlt,
  FaFileAlt,
  FaMapMarkerAlt,
  FaSave,
  FaTag,
  FaImage,
  FaTimes,
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

// Fetch existing item from Database
  useEffect(() => {
    async function loadItem() {
      try {
        const res = await fetch(`http://localhost:3001/api/found-items/${id}`);
        if (res.ok) {
          const data = await res.json();
          setItem({
            title: data.title || "",
            description: data.description || "",
            category: data.category || "",
            location: data.location || "",
            dateFound: data.dateFound ? data.dateFound.split("T")[0] : "",
            imageDataUrl: data.imageDataUrl || "",
          });
        } else {
          setError("Found item could not be found.");
        }
      } catch (err) {
        setError("Error connecting to database.");
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  // Submit updates to Database
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!item.title.trim() || !item.category || !item.location.trim() || !item.dateFound) {
      setError("Please complete all required fields.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/found-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });

      if (response.ok) {
        alert("Found item updated successfully in the database!");
        navigate("/view-found-items");
      } else {
        const err = await response.json();
        setError(err.error || "Failed to update item.");
      }
    } catch (err) {
      setError("Network error when updating database.");
    }
  };

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

  if (loading) {
    return (
      <main className="edit-found-page">
        <div className="edit-found-card edit-loading-card">
          <FaBoxOpen className="edit-loading-icon" />
          <h1>Loading Found Item...</h1>
          <p>Please wait while the report is loaded.</p>
        </div>
      </main>
    );
  }

  if (error && !item.title) {
    return (
      <main className="edit-found-page">
        <div className="edit-found-card error-card">
          <FaBoxOpen className="error-icon" />

          <p className="edit-found-eyebrow">
            LOST & FOUND
          </p>

          <h1>Found Item Not Found</h1>

          <p className="error-message">
            {error}
          </p>

          <button
            type="button"
            className="error-back-button"
            onClick={() => navigate("/view-found-items")}
          >
            <FaArrowLeft />
            Back to Found Items
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="edit-found-page">

      <div className="edit-found-card">

        {/* HEADER */}
        <header className="edit-found-header">

          <div className="edit-title-area">

            <p className="edit-found-eyebrow">
              LOST & FOUND
            </p>

            <h1>
              <FaBoxOpen />
              Edit Found Item
            </h1>

            <p className="edit-subtitle">
              Update the details of your found-item report.
            </p>

          </div>

          <button
            type="button"
            className="edit-back-button"
            onClick={() => navigate("/view-found-items")}
          >
            <FaArrowLeft />
            Back to Found Items
          </button>

        </header>

        {/* ERROR */}
        {error && (
          <div className="edit-found-error">
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit}>

          {/* ITEM TITLE */}
          <div className="edit-field">

            <label htmlFor="title">
              Item Title
            </label>

            <div className="edit-input-group">

              <FaTag className="edit-input-icon" />

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

          {/* DESCRIPTION */}
          <div className="edit-field">

            <label htmlFor="description">
              Description
            </label>

            <div className="edit-input-group textarea-group">

              <FaFileAlt className="edit-input-icon" />

              <textarea
                id="description"
                name="description"
                placeholder="Describe the item you found..."
                value={item.description}
                onChange={handleChange}
              />

            </div>

          </div>

          {/* CATEGORY */}
          <div className="edit-field">

            <label htmlFor="category">
              Category
            </label>

            <div className="edit-input-group select-group">

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

          {/* LOCATION + DATE */}
          <div className="edit-two-column">

            <div className="edit-field">

              <label htmlFor="location">
                Location Found
              </label>

              <div className="edit-input-group">

                <FaMapMarkerAlt className="edit-input-icon" />

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

            <div className="edit-field">

              <label htmlFor="dateFound">
                Date Found
              </label>

              <div className="edit-input-group">

                <FaCalendarAlt className="edit-input-icon" />

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

          {/* IMAGE */}
          <div className="edit-image-section">

            <div className="edit-image-heading">

              <div>
                <label>
                  <FaImage />
                  Item Image
                </label>

                <p>
                  Replace the existing image if required.
                </p>
              </div>

            </div>

            <div className="edit-file-upload">

              <input
                id="found-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />

              <label htmlFor="found-image">
                <FaImage />
                Choose New Image
              </label>

            </div>

            {item.imageDataUrl && (
              <div className="edit-image-preview">

                <img
                  src={item.imageDataUrl}
                  alt="Found item preview"
                />

                <button
                  type="button"
                  className="remove-image-button"
                  onClick={removeImage}
                >
                  <FaTimes />
                  Remove Image
                </button>

              </div>
            )}

          </div>

          {/* ACTIONS */}
          <div className="edit-form-actions">

            <button
              type="button"
              className="cancel-edit-button"
              onClick={() => navigate("/view-found-items")}
            >
              <FaArrowLeft />
              Cancel
            </button>

            <button
              type="submit"
              className="edit-save-button"
            >
              <FaSave />
              Save Changes
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}

export default EditFoundItem;