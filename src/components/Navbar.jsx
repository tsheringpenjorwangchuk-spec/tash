import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  FaBoxOpen,
  FaHome,
  FaSignOutAlt,
  FaUserShield,
  FaInbox,
  FaBell,
  FaCheck,
  FaSuitcase,
  FaRobot,
  FaShieldAlt,
  FaChevronDown,
  FaCircle,
} from "react-icons/fa";

import {
  getNotificationsForCurrentUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications";

import "./Navbar.css";

function Navbar({ admin = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState(
    () => getNotificationsForCurrentUser()
  );

  const [open, setOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /* =====================================================
     REFRESH NOTIFICATIONS
     ===================================================== */

  useEffect(() => {
    const refresh = () => {
      setNotifications(getNotificationsForCurrentUser());
    };

    window.addEventListener(
      "lostfound:notifications",
      refresh
    );

    window.addEventListener(
      "storage",
      refresh
    );

    return () => {
      window.removeEventListener(
        "lostfound:notifications",
        refresh
      );

      window.removeEventListener(
        "storage",
        refresh
      );
    };
  }, []);

  /* =====================================================
     CLOSE MENUS WHEN ROUTE CHANGES
     ===================================================== */

  useEffect(() => {
    setOpen(false);
    setMobileNavOpen(false);
  }, [location.pathname]);

  /* =====================================================
     NAVIGATION
     ===================================================== */

  const go = (path) => {
    setOpen(false);
    setMobileNavOpen(false);
    navigate(path);
  };

  /* =====================================================
     ACTIVE ROUTE
     ===================================================== */

  const isActive = (path) => {
    if (
      path === "/dashboard" ||
      path === "/admin-dashboard"
    ) {
      return location.pathname === path;
    }

    return location.pathname.startsWith(path);
  };

  /* =====================================================
     LOGOUT
     ===================================================== */

  const handleLogout = () => {
    localStorage.removeItem("currentUser");

    setOpen(false);
    setMobileNavOpen(false);

    alert("Logged out successfully");

    navigate("/login");
  };

  /* =====================================================
     UNREAD COUNT
     ===================================================== */

  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  /* =====================================================
     CURRENT SECTION
     ===================================================== */

  const currentSection = admin
    ? isActive("/admin-found-intake")
      ? "Found Intake"
      : isActive("/admin-claims")
      ? "Claim Reviews"
      : "Admin workspace"
    : isActive("/report-lost-item")
    ? "Report Lost"
    : isActive("/report-found-item")
    ? "Report Found"
    : isActive("/ai-matches")
    ? "AI Matching"
    : isActive("/my-claims")
    ? "My Claims"
    : "Dashboard";

  return (
    <nav
      className={`navbar ${
        admin ? "navbar-admin" : "navbar-user"
      }`}
    >
      {/* =================================================
          BRAND
          ================================================= */}

      <button
        className="navbar-logo"
        onClick={() =>
          go(
            admin
              ? "/admin-dashboard"
              : "/dashboard"
          )
        }
        aria-label="Go to dashboard"
      >
        <span className="brand-mark">
          <FaBoxOpen />
        </span>

        <span className="brand-copy">
          <strong>Lost &amp; Found</strong>

          <small>
            {admin
              ? "Operations centre"
              : "Smart recovery"}
          </small>
        </span>
      </button>

      {/* =================================================
          MOBILE CURRENT SECTION
          ================================================= */}

      <button
        className="mobile-section-button"
        onClick={() =>
          setMobileNavOpen((value) => !value)
        }
        aria-expanded={mobileNavOpen}
      >
        <span>
          <FaCircle />
          {currentSection}
        </span>

        <FaChevronDown
          className={
            mobileNavOpen
              ? "mobile-chevron-open"
              : ""
          }
        />
      </button>

      {/* =================================================
          MAIN NAVIGATION
          ================================================= */}

      <div
        className={`navbar-navigation ${
          mobileNavOpen
            ? "navbar-navigation-open"
            : ""
        }`}
      >
        <div className="nav-section">
          <span className="nav-section-label">
            {admin ? "OPERATIONS" : "WORKSPACE"}
          </span>

          {/* Dashboard */}

          <button
            className={
              isActive(
                admin
                  ? "/admin-dashboard"
                  : "/dashboard"
              )
                ? "active-nav"
                : ""
            }
            onClick={() =>
              go(
                admin
                  ? "/admin-dashboard"
                  : "/dashboard"
              )
            }
          >
            <FaHome />
            <span>Dashboard</span>
          </button>

          {/* USER NAVIGATION */}

          {!admin && (
            <>
              <button
                className={
                  isActive("/report-lost-item")
                    ? "active-nav"
                    : ""
                }
                onClick={() =>
                  go("/report-lost-item")
                }
              >
                <FaSuitcase />
                <span>Report Lost</span>
              </button>

              <button
                className={
                  isActive("/report-found-item")
                    ? "active-nav"
                    : ""
                }
                onClick={() =>
                  go("/report-found-item")
                }
              >
                <FaBoxOpen />
                <span>Report Found</span>
              </button>

              <button
                className={
                  isActive("/ai-matches")
                    ? "active-nav"
                    : ""
                }
                onClick={() =>
                  go("/ai-matches")
                }
              >
                <FaRobot />
                <span>AI Matching</span>
              </button>

              <button
                className={
                  isActive("/my-claims")
                    ? "active-nav"
                    : ""
                }
                onClick={() =>
                  go("/my-claims")
                }
              >
                <FaShieldAlt />
                <span>My Claims</span>
              </button>
            </>
          )}

          {/* ADMIN NAVIGATION */}

          {admin && (
            <>
              <button
                className={
                  isActive(
                    "/admin-found-intake"
                  )
                    ? "active-nav"
                    : ""
                }
                onClick={() =>
                  go("/admin-found-intake")
                }
              >
                <FaInbox />
                <span>Found Intake</span>
              </button>

              <button
                className={
                  isActive("/admin-claims")
                    ? "active-nav"
                    : ""
                }
                onClick={() =>
                  go("/admin-claims")
                }
              >
                <FaUserShield />
                <span>Claim Reviews</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* =================================================
          RIGHT ACTIONS
          ================================================= */}

      <div className="navbar-actions">
        {/* Notifications */}

        {!admin && (
          <div className="notification-wrap">
            <button
              className={`notification-button ${
                open
                  ? "notification-active"
                  : ""
              }`}
              onClick={() =>
                setOpen((value) => !value)
              }
              aria-label="Notifications"
              aria-expanded={open}
            >
              <FaBell />

              {unreadCount > 0 && (
                <span className="notification-count">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </button>

            {open && (
              <div className="notification-panel">
                <div className="notification-header">
                  <div>
                    <span>ACTIVITY</span>

                    <strong>
                      Notifications
                    </strong>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      onClick={() =>
                        markAllNotificationsRead()
                      }
                    >
                      <FaCheck />
                      Mark all read
                    </button>
                  )}
                </div>

                {!notifications.length ? (
                  <div className="notification-empty">
                    <span className="notification-empty-icon">
                      <FaBell />
                    </span>

                    <strong>
                      You're all caught up
                    </strong>

                    <p>
                      New activity will appear
                      here.
                    </p>
                  </div>
                ) : (
                  <div className="notification-list">
                    {notifications
                      .slice(0, 8)
                      .map((item) => (
                        <button
                          key={item.id}
                          className={`notification-item ${
                            item.read
                              ? "read"
                              : "unread"
                          }`}
                          onClick={() =>
                            markNotificationRead(
                              item.id
                            )
                          }
                        >
                          <span className="notification-item-icon">
                            <FaBell />
                          </span>

                          <span className="notification-item-content">
                            <strong>
                              {item.title}
                            </strong>

                            <span>
                              {item.message}
                            </span>

                            <small>
                              {new Date(
                                item.createdAt
                              ).toLocaleString()}
                            </small>
                          </span>

                          {!item.read && (
                            <span className="notification-unread-dot" />
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Admin indicator */}

        {admin && (
          <div className="admin-mode">
            <span className="admin-mode-dot" />
            <span>Admin</span>
          </div>
        )}

        {/* Logout */}

        <button
          className="logout-nav"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <FaSignOutAlt />

          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;