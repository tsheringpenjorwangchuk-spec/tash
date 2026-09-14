import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaArrowLeft,
  FaBoxOpen,
  FaEdit,
  FaTrash,
} from "react-icons/fa";

import "./ViewLostItems.css";

function ViewLostItems() {
  const navigate = useNavigate();

  const [lostItems, setLostItems] = useState([]);

  // Load saved lost items
  useEffect(() => {
    const savedItems =
      JSON.parse(localStorage.getItem("lostItems") || "[]");

    setLostItems(savedItems);
  }, []);

  // Delete lost item
  const handleDelete = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this lost item?"
    );

    if (!confirmed) {
      return;
    }

    const updatedItems = lostItems.filter(
      (item) => String(item.id) !== String(id)
    );

    setLostItems(updatedItems);

    localStorage.setItem(
      "lostItems",
      JSON.stringify(updatedItems)
    );
  };

  return (
    <main className="view-container">

      {/* =========================================
          PAGE HEADER
          ========================================= */}

      <div className="view-header">

        <div>

          <p className="view-eyebrow">
            LOST & FOUND
          </p>

          <h1>
            <FaBoxOpen />
            Lost Items
          </h1>

          <p>
            Items reported as lost and available
            for potential matching.
          </p>

        </div>

        <button
          className="back-btn"
          onClick={() => navigate("/dashboard")}
        >
          <FaArrowLeft />
          Dashboard
        </button>

      </div>


      {/* =========================================
          EMPTY STATE
          ========================================= */}

      {lostItems.length === 0 ? (

        <div className="empty-found-state">

          <FaBoxOpen />

          <h2>
            No lost items yet
          </h2>

          <p>
            Report a lost item to make it available
            for AI matching.
          </p>

          <button
            onClick={() =>
              navigate("/report-lost-item")
            }
          >
            Report Lost Item
          </button>

        </div>

      ) : (

        /* =========================================
           LOST ITEMS LIST
           ========================================= */

        <div className="found-items-list">

          {lostItems.map((item) => (

            <article
              className="found-item-card-list"
              key={item.id}
            >

              {/* =====================================
                  IMAGE
                  ===================================== */}

              {item.imageDataUrl ? (

                <img
                  src={item.imageDataUrl}
                  alt={item.title || "Lost item"}
                  className="found-item-image"
                />

              ) : (

                <div className="found-item-image-placeholder">
                  <FaBoxOpen />
                </div>

              )}


              {/* =====================================
                  DETAILS
                  ===================================== */}

              <div className="found-item-details">

                {/* TITLE + STATUS */}

                <div className="found-item-title-row">

                  <div>

                    <span className="found-item-label">
                      LOST ITEM
                    </span>

                    <h2>
                      {item.title}
                    </h2>

                  </div>

                  <span className="found-status">
                    {item.status || "Lost"}
                  </span>

                </div>


                {/* DESCRIPTION */}

                <p className="found-description">
                  {item.description ||
                    "No description provided."}
                </p>


                {/* META INFORMATION */}

                <div className="found-meta">

                  <span>
                    <strong>
                      Category:
                    </strong>{" "}
                    {item.category || "Not specified"}
                  </span>

                  <span>
                    <strong>
                      Location:
                    </strong>{" "}
                    {item.location || "Not specified"}
                  </span>

                  <span>
                    <strong>
                      Date:
                    </strong>{" "}
                    {item.dateLost || "Not specified"}
                  </span>

                </div>


                {/* ACTIONS */}

                <div className="found-actions">

                  <button
                    className="edit-btn"
                    onClick={() =>
                      navigate(
                        `/edit-lost-item/${item.id}`
                      )
                    }
                  >
                    <FaEdit />
                    Edit
                  </button>


                  <button
                    className="delete-btn"
                    onClick={() =>
                      handleDelete(item.id)
                    }
                  >
                    <FaTrash />
                    Delete
                  </button>

                </div>

              </div>

            </article>

          ))}

        </div>

      )}

    </main>
  );
}

export default ViewLostItems;