import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaEdit,
  FaTrash,
  FaMapMarkerAlt,
} from "react-icons/fa";

import "./ViewFoundItems.css";

function ViewFoundItems() {
  const navigate = useNavigate();

  const [foundItems, setFoundItems] = useState([]);

  useEffect(() => {
    const storedItems = JSON.parse(
      localStorage.getItem("foundItems") || "[]"
    );

    setFoundItems(storedItems);
  }, []);

  const handleDelete = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this found item?"
    );

    if (!confirmed) {
      return;
    }

    const updatedItems = foundItems.filter(
      (item) => String(item.id) !== String(id)
    );

    setFoundItems(updatedItems);

    localStorage.setItem(
      "foundItems",
      JSON.stringify(updatedItems)
    );
  };

  return (
    <main className="view-container">

      <div className="view-header">

        <div>
          <p className="view-eyebrow">
            LOST & FOUND
          </p>

          <h1>
            <FaBoxOpen />
            Found Items
          </h1>

          <p>
            Items reported as found and reported to the system. Items awaiting drop-off are not used for AI matching.
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

      {foundItems.length === 0 ? (

        <div className="empty-found-state">

          <FaBoxOpen />

          <h2>
            No found items yet
          </h2>

          <p>
            Report a found item to make it available
            for AI matching.
          </p>

          <button
            onClick={() =>
              navigate("/report-found-item")
            }
          >
            Report Found Item
          </button>

        </div>

      ) : (

        <div className="found-items-list">

          {foundItems.map((item) => (

            <article
              className="found-item-card-list"
              key={item.id}
            >

              {item.imageDataUrl ? (

                <img
                  src={item.imageDataUrl}
                  alt={item.title}
                  className="found-item-image"
                />

              ) : (

                <div className="found-item-image-placeholder">
                  <FaBoxOpen />
                </div>

              )}

              <div className="found-item-details">

                <div className="found-item-title-row">

                  <div>
                    <span className="found-item-label">
                      FOUND ITEM
                    </span>

                    <h2>
                      {item.title}
                    </h2>
                  </div>

                  <span className="found-status">
                    {item.status || "Found"}
                  </span>

                </div>

                <p className="found-description">
                  {item.description}
                </p>

                <div className="found-meta">

                  <span>
                    <strong>
                      Category:
                    </strong>{" "}
                    {item.category}
                  </span>

                  <span>
                    <strong>
                      Location:
                    </strong>{" "}
                    {item.location}
                  </span>

                  <span>
                    <strong>
                      Date:
                    </strong>{" "}
                    {item.dateFound}
                  </span>

                </div>

                <div className="found-actions">

                  {item.status === "Awaiting Drop-off" && (
                    <button className="edit-btn" onClick={() => navigate(`/found-dropoff/${item.id}`)}>
                      <FaMapMarkerAlt /> Drop-off Details
                    </button>
                  )}

                  <button
                    className="edit-btn"
                    onClick={() =>
                      navigate(
                        `/edit-found-item/${item.id}`
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

export default ViewFoundItems;