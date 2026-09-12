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
  const [isLoading, setIsLoading] = useState(true);

  // Load saved lost items from the Neon Database via backend API
  useEffect(() => {
    const fetchLostItems = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/lost-items");
        if (response.ok) {
          const data = await response.json();
          
          // Map database snake_case columns to frontend camelCase expectations
          const formattedItems = data.map(item => ({
            ...item,
            dateLost: item.date_lost,
            imageDataUrl: item.image_data_url
          }));
          
          setLostItems(formattedItems);
        } else {
          console.error("Failed to fetch items");
        }
      } catch (error) {
        console.error("Error fetching lost items:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLostItems();
  }, []);

  // Delete lost item from the Neon Database via backend API
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this lost item?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/lost-items/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove item from UI state only after database confirms deletion
        const updatedItems = lostItems.filter(
          (item) => String(item.id) !== String(id)
        );
        setLostItems(updatedItems);
      } else {
        alert("Failed to delete the item from the database.");
      }
    } catch (error) {
      console.error("Error deleting lost item:", error);
      alert("An error occurred while deleting the item.");
    }
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
          STATE HANDLING (LOADING / EMPTY / LIST)
          ========================================= */}

      {isLoading ? (
        <div className="empty-found-state">
          <h2>Loading items...</h2>
        </div>
      ) : lostItems.length === 0 ? (
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