
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaEnvelope,
  FaLock,
  FaSignInAlt,
  FaShieldAlt,
  FaArrowLeft,
  FaUserCircle,
  FaCheckCircle,
  FaRobot,
} from "react-icons/fa";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [user, setUser] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) =>
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!user.email || !user.password) {
      return alert("Please enter your email and password.");
    }

    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        email: user.email.trim(),
        role: "user",
        loggedInAt: new Date().toISOString(),
      })
    );

    navigate("/dashboard");
  };

  return (
    <main className="login-page">
      <div className="login-background-grid" />

      <section className="login-layout">
        {/* LEFT — BRAND / PRODUCT INTRO */}
        <div className="login-intro">
          <button
            className="login-back-link"
            onClick={() => navigate("/")}
          >
            <FaArrowLeft />
            <span>Back to home</span>
          </button>

          <div className="login-brand">
            <div className="login-brand-mark">
              <FaShieldAlt />
            </div>

            <div>
              <strong>Lost & Found</strong>
              <span>Management System</span>
            </div>
          </div>

          <div className="login-intro-content">
            <span className="login-eyebrow">
              <span className="login-eyebrow-dot" />
              SECURE USER ACCESS
            </span>

            <h1>
              Welcome
              <br />
              <span>back.</span>
            </h1>

            <p>
              Sign in to manage your lost and found reports,
              discover AI-powered matches, and track your claims
              from one secure workspace.
            </p>
          </div>

          <div className="login-feature-list">
            <div className="login-feature">
              <div className="login-feature-icon">
                <FaCheckCircle />
              </div>
              <div>
                <strong>Track your reports</strong>
                <span>Manage lost and found items in one place.</span>
              </div>
            </div>

            <div className="login-feature">
              <div className="login-feature-icon">
                <FaRobot />
              </div>
              <div>
                <strong>AI-powered matching</strong>
                <span>Discover potential matches automatically.</span>
              </div>
            </div>

            <div className="login-feature">
              <div className="login-feature-icon">
                <FaShieldAlt />
              </div>
              <div>
                <strong>Protected claims</strong>
                <span>Ownership verification supports safer returns.</span>
              </div>
            </div>
          </div>

          <div className="login-intro-footer">
            <span className="login-footer-line" />
            <span>Smart recovery. Secure access.</span>
          </div>
        </div>

        {/* RIGHT — LOGIN CARD */}
        <div className="login-form-area">
          <div className="login-card">
            <div className="login-card-top">
              <div className="auth-role-icon">
                <FaUserCircle />
              </div>

              <span className="login-form-label">
                USER ACCOUNT
              </span>

              <h2>Sign in to your account</h2>

              <p>
                Enter your details to continue to your dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="login-field">
                <label className="auth-label">
                  Email address
                </label>

                <div className="input-group">
                  <FaEnvelope className="icon" />

                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={user.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="login-field">
                <label className="auth-label">
                  Password
                </label>

                <div className="input-group">
                  <FaLock className="icon" />

                  <input
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    value={user.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="auth-login-btn"
              >
                <span>Sign in</span>
                <FaSignInAlt />
              </button>
            </form>

            <div className="register-link">
              <p>Don't have an account?</p>

              <button
                className="register-btn"
                onClick={() => navigate("/register")}
              >
                Create an account
                <span>→</span>
              </button>
            </div>

            <div className="login-divider">
              <span />
              <small>OR</small>
              <span />
            </div>

            <button
              className="switch-auth"
              onClick={() => navigate("/admin-login")}
            >
              <FaShieldAlt />
              <span>Administrator access</span>
              <strong>→</strong>
            </button>

            <div className="login-security-note">
              <FaShieldAlt />
              <span>Your session is protected by the Lost & Found system.</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;