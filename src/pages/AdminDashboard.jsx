import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  FaBoxOpen,
  FaClipboardList,
  FaInbox,
  FaRobot,
  FaShieldAlt,
  FaUsers,
  FaArrowRight,
  FaExclamationCircle,
  FaCheckCircle,
  FaChartLine,
} from "react-icons/fa";
import { readList } from "../services/store";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const stats = useMemo(
    () => ({
      waitingDropoff: readList("foundItems").filter((x) =>
        ["Awaiting Drop-off", "Found"].includes(x.status)
      ).length,

      users: readList("users").length,

      review: readList("claims").filter(
        (x) => x.status === "Pending Admin Review"
      ).length,

      collection: readList("claims").filter(
        (x) => x.status === "Ready for Collection"
      ).length,
    }),
    []
  );

  const cards = [
    {
      Icon: FaInbox,
      title: "Found Item Intake",
      text: "Receive physical drop-offs and release verified items for AI matching.",
      path: "/admin-found-intake",
      label: "Priority workflow",
      priority: true,
    },
    {
      Icon: FaShieldAlt,
      title: "Claim & Collection Desk",
      text: "Review ownership claims, issue collection codes and confirm handovers.",
      path: "/admin-claims",
      label: "Requires attention",
      priority: true,
    },
    {
      Icon: FaClipboardList,
      title: "Lost Reports",
      text: "Review active and resolved lost item reports across the platform.",
      path: "/view-lost-items",
      label: "Reports",
    },
    {
      Icon: FaBoxOpen,
      title: "Found Reports",
      text: "Review found, reserved and collected item records.",
      path: "/view-found-items",
      label: "Reports",
    },
    {
      Icon: FaRobot,
      title: "AI Matching",
      text: "Review the AI-powered matching experience used to connect reports.",
      path: "/ai-matches",
      label: "AI tools",
    },
    {
      Icon: FaUsers,
      title: "Manage Users",
      text: "View registered users and manage account records.",
      path: "/admin-users",
      label: "Administration",
    },
  ];

  return (
    <>
      <Navbar admin />

      <main className="admin-container">

        {/* =====================================================
            ADMIN HEADER
            ===================================================== */}

        <section className="admin-hero">

          <div className="admin-hero-content">

            <div className="admin-eyebrow">
              <span className="admin-status-dot" />
              ADMIN OPERATIONS
            </div>

            <h1>
              Control centre
            </h1>

            <p>
              Monitor reports, manage ownership claims and coordinate
              secure item handovers from one operational workspace.
            </p>

            <div className="admin-hero-meta">
              <span>
                <FaChartLine />
                Live workspace
              </span>

              <span>
                <FaCheckCircle />
                System operational
              </span>
            </div>

          </div>


          {/* =================================================
              OPERATIONAL SNAPSHOT
              ================================================= */}

          <div className="admin-overview">

            <div className="admin-overview-header">
              <div>
                <span>OPERATIONAL SNAPSHOT</span>
                <strong>Today's queues</strong>
              </div>

              <FaChartLine />
            </div>


            <div className="admin-overview-grid">

              <div className="admin-stat admin-stat-warning">
                <span className="admin-stat-icon">
                  <FaInbox />
                </span>

                <div>
                  <strong>{stats.waitingDropoff}</strong>
                  <span>Awaiting drop-off</span>
                </div>
              </div>


              <div className="admin-stat admin-stat-review">
                <span className="admin-stat-icon">
                  <FaShieldAlt />
                </span>

                <div>
                  <strong>{stats.review}</strong>
                  <span>Need review</span>
                </div>
              </div>


              <div className="admin-stat admin-stat-ready">
                <span className="admin-stat-icon">
                  <FaCheckCircle />
                </span>

                <div>
                  <strong>{stats.collection}</strong>
                  <span>Ready to collect</span>
                </div>
              </div>


              <div className="admin-stat">
                <span className="admin-stat-icon">
                  <FaUsers />
                </span>

                <div>
                  <strong>{stats.users}</strong>
                  <span>Registered users</span>
                </div>
              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            PRIORITY QUEUES
            ===================================================== */}

        <section className="admin-priority-section">

          <div className="admin-section-heading">

            <div>
              <span className="admin-section-kicker">
                PRIORITY QUEUES
              </span>

              <h2>
                What needs attention
              </h2>
            </div>

            <p>
              Start with the operational workflows that require
              administrator action.
            </p>

          </div>


          <div className="priority-grid">

            <button
              className="priority-card"
              onClick={() => navigate("/admin-found-intake")}
            >

              <div className="priority-card-top">

                <span className="priority-icon">
                  <FaInbox />
                </span>

                <span className="priority-label">
                  {stats.waitingDropoff > 0
                    ? "Action required"
                    : "No pending items"}
                </span>

              </div>

              <div>
                <strong>
                  {stats.waitingDropoff}
                </strong>

                <span>
                  items awaiting intake
                </span>
              </div>

              <footer>
                <span>
                  Open found item intake
                </span>

                <FaArrowRight />
              </footer>

            </button>


            <button
              className="priority-card"
              onClick={() => navigate("/admin-claims")}
            >

              <div className="priority-card-top">

                <span className="priority-icon">
                  <FaShieldAlt />
                </span>

                <span className="priority-label">
                  {stats.review > 0
                    ? "Review required"
                    : "Queue clear"}
                </span>

              </div>

              <div>
                <strong>
                  {stats.review}
                </strong>

                <span>
                  claims awaiting review
                </span>
              </div>

              <footer>
                <span>
                  Open claim desk
                </span>

                <FaArrowRight />
              </footer>

            </button>

          </div>

        </section>


        {/* =====================================================
            ADMIN WORKSPACE
            ===================================================== */}

        <section className="admin-workspace">

          <div className="admin-section-heading">

            <div>
              <span className="admin-section-kicker">
                ADMIN WORKSPACE
              </span>

              <h2>
                Management tools
              </h2>
            </div>

            <p>
              Access reporting, matching and account management
              tools from one place.
            </p>

          </div>


          <div className="admin-grid">

            {cards.map(
              ({
                Icon,
                title,
                text,
                path,
                label,
                priority,
              }) => (

                <button
                  className={`admin-card ${
                    priority
                      ? "admin-card-priority"
                      : ""
                  }`}
                  onClick={() => navigate(path)}
                  key={title}
                >

                  <div className="admin-card-top">

                    <span className="admin-card-icon">
                      <Icon />
                    </span>

                    <span className="admin-card-label">
                      {label}
                    </span>

                  </div>


                  <div className="admin-card-content">

                    <h3>
                      {title}
                    </h3>

                    <p>
                      {text}
                    </p>

                  </div>


                  <div className="admin-card-footer">

                    <span>
                      Open workspace
                    </span>

                    <span className="admin-card-arrow">
                      <FaArrowRight />
                    </span>

                  </div>

                </button>

              )
            )}

          </div>

        </section>

      </main>
    </>
  );
}

export default AdminDashboard;