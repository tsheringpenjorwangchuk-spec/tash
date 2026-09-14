import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBoxOpen,
  FaClipboardList,
  FaFileAlt,
  FaProjectDiagram,
  FaRobot,
  FaSearch,
  FaShieldAlt,
  FaSignOutAlt,
  FaMagic,
  FaArrowRight,
  FaCheckCircle,
  FaPlus,
  FaClock,
  FaChevronRight,
} from "react-icons/fa";
import { readList } from "../services/store";
import "./UserDashboard.css";

function UserDashboard() {
  const navigate = useNavigate();

  const stats = useMemo(
    () => ({
      lost: readList("lostItems").filter(
        (x) => x.status !== "Resolved"
      ).length,

      found: readList("foundItems").filter(
        (x) => x.status !== "Collected"
      ).length,

      claims: readList("claims").filter(
        (x) =>
          x.status !== "Collected" &&
          x.status !== "Rejected"
      ).length,
    }),
    []
  );

  const cards = [
    {
      Icon: FaClipboardList,
      title: "Report a lost item",
      text: "Tell us what you lost and let AI help identify important details.",
      path: "/report-lost-item",
      badge: "AI analysis",
      type: "primary",
    },
    {
      Icon: FaBoxOpen,
      title: "Report a found item",
      text: "Register an item you've found and follow the secure office drop-off process.",
      path: "/report-found-item",
      badge: "AI + drop-off",
      type: "primary",
    },
    {
      Icon: FaProjectDiagram,
      title: "AI item matching",
      text: "Compare your active lost reports against available found items.",
      path: "/ai-matches",
      badge: "Smart match",
      type: "standard",
    },
    {
      Icon: FaShieldAlt,
      title: "My claims",
      text: "Track verification, review status, collection codes and handover.",
      path: "/my-claims",
      badge: "Claim centre",
      type: "standard",
    },
    {
      Icon: FaSearch,
      title: "Lost reports",
      text: "View and manage your active lost item reports.",
      path: "/view-lost-items",
      badge: "Reports",
      type: "standard",
    },
    {
      Icon: FaFileAlt,
      title: "Found reports",
      text: "Browse found item reports and monitor their current status.",
      path: "/view-found-items",
      badge: "Reports",
      type: "standard",
    },
    {
      Icon: FaRobot,
      title: "AI assistant",
      text: "Get help with reporting, matching, verification and claims.",
      path: "/ai-chatbot",
      badge: "AI support",
      type: "standard",
    },
  ];

  const workflow = [
    "Report",
    "Drop-off",
    "AI match",
    "Verify",
    "Admin review",
    "Collect",
  ];

  return (
    <main className="dashboard-container">

      {/* HERO */}

      <section className="dashboard-hero">

        <div className="dashboard-hero-glow" />

        <div className="dashboard-hero-content">

          <div className="dashboard-eyebrow">
            <span className="eyebrow-icon">
              <FaMagic />
            </span>

            <span>SMART RECOVERY CENTRE</span>
          </div>

          <h1>
            Find what matters.
            <span> Get it back.</span>
          </h1>

          <p>
            Report lost or found belongings, use AI-powered matching,
            verify ownership securely and complete collection through
            a guided recovery process.
          </p>

          <div className="dashboard-hero-actions">

            <button
              className="hero-primary-action"
              onClick={() => navigate("/report-lost-item")}
            >
              <span className="action-icon">
                <FaPlus />
              </span>

              <span className="hero-action-copy">
                <strong>Report lost item</strong>
                <small>Start a new recovery</small>
              </span>

              <FaArrowRight className="action-arrow" />
            </button>

            <button
              className="hero-secondary-action"
              onClick={() => navigate("/report-found-item")}
            >
              <FaBoxOpen />

              <span>
                Report found item
              </span>

              <FaChevronRight className="secondary-arrow" />
            </button>

          </div>

          <div className="dashboard-trust-line">
            <span>
              <FaShieldAlt />
              Secure ownership verification
            </span>

            <span>
              <FaRobot />
              AI-assisted recovery
            </span>
          </div>

        </div>


        {/* OVERVIEW PANEL */}

        <div className="dashboard-overview">

          <div className="overview-heading">
            <div>
              <span className="overview-label">
                YOUR OVERVIEW
              </span>

              <span className="overview-caption">
                Current activity
              </span>
            </div>

            <span className="overview-status">
              <span />
              Active
            </span>
          </div>


          <div className="overview-stat">

            <div className="overview-stat-icon">
              <FaSearch />
            </div>

            <div className="overview-stat-content">
              <strong>{stats.lost}</strong>
              <span>Active lost</span>
            </div>

          </div>


          <div className="overview-stat">

            <div className="overview-stat-icon">
              <FaBoxOpen />
            </div>

            <div className="overview-stat-content">
              <strong>{stats.found}</strong>
              <span>Found items</span>
            </div>

          </div>


          <div className="overview-stat">

            <div className="overview-stat-icon">
              <FaShieldAlt />
            </div>

            <div className="overview-stat-content">
              <strong>{stats.claims}</strong>
              <span>Open claims</span>
            </div>

          </div>


          <div className="overview-footer">
            <FaClock />
            <span>Activity updates automatically</span>
          </div>

        </div>

      </section>


      {/* RECOVERY JOURNEY */}

      <section className="workflow-section">

        <div className="section-heading">

          <div>
            <span className="section-kicker">
              HOW IT WORKS
            </span>

            <h2>
              Your recovery journey
            </h2>
          </div>

          <p>
            From the first report to secure collection,
            every stage is tracked through the platform.
          </p>

        </div>


        <div className="workflow-strip">

          {workflow.map((step, index) => (

            <div
              className={`workflow-step ${
                index === 0
                  ? "workflow-step-active"
                  : ""
              }`}
              key={step}
            >

              <span className="workflow-number">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="workflow-step-content">

                <strong>{step}</strong>

                {index < workflow.length - 1 && (
                  <small>
                    Next stage
                  </small>
                )}

              </div>

              {index < workflow.length - 1 && (
                <FaArrowRight className="workflow-arrow" />
              )}

            </div>

          ))}

        </div>

      </section>


      {/* FEATURES */}

      <section className="features-section">

        <div className="section-heading features-heading">

          <div>
            <span className="section-kicker">
              YOUR WORKSPACE
            </span>

            <h2>
              Everything you need
            </h2>
          </div>

          <p>
            Access reporting, matching, claims and AI tools
            from one central workspace.
          </p>

        </div>


        <div className="dashboard-grid">

          {cards.map(
            ({
              Icon,
              title,
              text,
              path,
              badge,
              type,
            }) => (

              <button
                className={`dashboard-card ${
                  type === "primary"
                    ? "dashboard-card-primary"
                    : ""
                }`}
                onClick={() => navigate(path)}
                key={title}
              >

                <div className="dashboard-card-top">

                  <span className="dashboard-card-icon">
                    <Icon />
                  </span>

                  <span className="dashboard-card-badge">
                    {badge}
                  </span>

                </div>


                <div className="dashboard-card-content">

                  <h3>
                    {title}
                  </h3>

                  <p>
                    {text}
                  </p>

                </div>


                <div className="dashboard-card-footer">

                  <span>
                    Open feature
                  </span>

                  <span className="card-arrow">
                    <FaArrowRight />
                  </span>

                </div>

              </button>

            )
          )}

        </div>

      </section>


      {/* LOGOUT */}

      <div className="dashboard-footer">

        <button
          className="logout-btn"
          onClick={() => navigate("/login")}
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>

      </div>

    </main>
  );
}

export default UserDashboard;