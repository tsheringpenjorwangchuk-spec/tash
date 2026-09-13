import { useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaMobileAlt,
  FaTrashAlt,
  FaShieldAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./DeleteLostItem.css";

function DeleteLostItem() {
  const navigate = useNavigate();
  const [deleted, setDeleted] = useState(false);

  const handleDelete = () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this lost item?"
    );

    if (confirmDelete) {
      setDeleted(true);
      alert("Lost item deleted successfully!");
    }
  };

  return (
    <main className="delete-page">
      <section className="delete-workspace">
        {!deleted ? (
          <>
            {/* HEADER */}
            <header className="delete-header">
              <div>
                <button
                  className="delete-back-button"
                  onClick={() => navigate("/dashboard")}
                >
                  <FaArrowLeft />
                  Back to Dashboard
                </button>

                <div className="delete-eyebrow">
                  <span className="delete-eyebrow-icon">
                    <FaTrashAlt />
                  </span>
                  LOST ITEM MANAGEMENT
                </div>

                <h1>Delete lost item</h1>

                <p>
                  Review the report below before permanently removing it from
                  your lost item records.
                </p>
              </div>

              <div className="delete-security-badge">
                <FaShieldAlt />
                <span>Account protected</span>
              </div>
            </header>

            {/* MAIN CONTENT */}
            <div className="delete-content">
              {/* ITEM PREVIEW */}
              <section className="delete-item-panel">
                <div className="delete-panel-header">
                  <div>
                    <span className="delete-section-label">
                      REPORT TO DELETE
                    </span>
                    <h2>Lost Phone</h2>
                  </div>

                  <span className="delete-status-badge">
                    Active report
                  </span>
                </div>

                <div className="delete-item-visual">
                  <div className="delete-device-icon">
                    <FaMobileAlt />
                  </div>

                  <div>
                    <span>Lost item</span>
                    <strong>Lost Phone</strong>
                    <small>Electronics</small>
                  </div>
                </div>

                <div className="delete-details-grid">
                  <div className="delete-detail">
                    <span className="delete-detail-icon">
                      <FaMobileAlt />
                    </span>

                    <div>
                      <span>Category</span>
                      <strong>Electronics</strong>
                    </div>
                  </div>

                  <div className="delete-detail">
                    <span className="delete-detail-icon">
                      <FaMapMarkerAlt />
                    </span>

                    <div>
                      <span>Location</span>
                      <strong>Gold Coast</strong>
                    </div>
                  </div>

                  <div className="delete-detail">
                    <span className="delete-detail-icon">
                      <FaCalendarAlt />
                    </span>

                    <div>
                      <span>Date lost</span>
                      <strong>20/07/2026</strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* WARNING PANEL */}
              <aside className="delete-warning-panel">
                <div className="delete-warning-icon">
                  <FaExclamationTriangle />
                </div>

                <span className="delete-section-label">
                  DESTRUCTIVE ACTION
                </span>

                <h2>Remove this report?</h2>

                <p>
                  Deleting this report will remove it from your active lost
                  item records. Make sure you no longer need this report
                  before continuing.
                </p>

                <div className="delete-warning-list">
                  <div>
                    <span>01</span>
                    <p>The report will no longer appear in your records.</p>
                  </div>

                  <div>
                    <span>02</span>
                    <p>AI matching will no longer use this lost report.</p>
                  </div>

                  <div>
                    <span>03</span>
                    <p>Review the report carefully before confirming.</p>
                  </div>
                </div>

                <button
                  className="delete-confirm-button"
                  onClick={handleDelete}
                >
                  <FaTrashAlt />
                  Delete Report
                </button>

                <button
                  className="delete-cancel-button"
                  onClick={() => navigate("/dashboard")}
                >
                  Keep Report
                </button>
              </aside>
            </div>

            {/* FOOTER NOTE */}
            <div className="delete-footer-note">
              <FaShieldAlt />
              <div>
                <strong>Before you delete</strong>
                <span>
                  Deleting a report is a destructive action. If you simply
                  need to update information, edit the report instead.
                </span>
              </div>
            </div>
          </>
        ) : (
          /* DELETED STATE */
          <section className="delete-complete">
            <div className="delete-complete-icon">
              <FaTrashAlt />
            </div>

            <span className="delete-eyebrow">
              REPORT REMOVED
            </span>

            <h1>No lost item reports available</h1>

            <p>
              The lost item report has been removed successfully from your
              current records.
            </p>

            <div className="delete-complete-actions">
              <button
                className="delete-primary-action"
                onClick={() => navigate("/dashboard")}
              >
                <FaArrowLeft />
                Return to Dashboard
              </button>

              <button
                className="delete-secondary-action"
                onClick={() => setDeleted(false)}
              >
                View Report State
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default DeleteLostItem;