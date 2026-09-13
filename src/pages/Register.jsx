
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaUserPlus,
  FaShieldAlt,
  FaArrowLeft,
  FaCheckCircle,
  FaRobot,
} from "react-icons/fa";

import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [user, setUser] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!user.name || !user.email || !user.password) {
      alert("Please fill in all fields");
      return;
    }

    if (user.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    const users = JSON.parse(
      localStorage.getItem("users") || "[]"
    );

    if (
      users.some(
        (existing) =>
          existing.email.toLowerCase() ===
          user.email.trim().toLowerCase()
      )
    ) {
      alert("An account with this email already exists.");
      return;
    }

    const savedUser = {
      id: `USR-${Date.now()}`,
      name: user.name.trim(),
      email: user.email.trim(),
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "users",
      JSON.stringify([...users, savedUser])
    );

    alert("Registration Successful!");

    navigate("/login");
  };

  return (
    <main className="register-page">
      <div className="register-background-grid" />

      <div className="register-layout">
        {/* LEFT SIDE */}
        <section className="register-intro">
          <button
            className="register-back-link"
            onClick={() => navigate("/")}
          >
            <FaArrowLeft />
            <span>Back to home</span>
          </button>

          <div className="register-brand">
            <div className="register-brand-mark">
              <FaShieldAlt />
            </div>

            <div>
              <strong>Lost & Found</strong>
              <span>Management System</span>
            </div>
          </div>

          <div className="register-intro-content">
            <span className="register-eyebrow">
              <span className="register-eyebrow-dot" />
              JOIN THE PLATFORM
            </span>

            <h1>
              Find it.
              <br />
              <span>Recover it.</span>
            </h1>

            <p>
              Create your account and get access to a smarter
              way of reporting, matching and recovering lost
              belongings.
            </p>
          </div>

          <div className="register-feature-list">
            <div className="register-feature">
              <div className="register-feature-icon">
                <FaCheckCircle />
              </div>

              <div>
                <strong>Report with ease</strong>
                <span>
                  Keep your lost and found reports organised.
                </span>
              </div>
            </div>

            <div className="register-feature">
              <div className="register-feature-icon">
                <FaRobot />
              </div>

              <div>
                <strong>Smart AI matching</strong>
                <span>
                  Let AI help identify potential item matches.
                </span>
              </div>
            </div>

            <div className="register-feature">
              <div className="register-feature-icon">
                <FaShieldAlt />
              </div>

              <div>
                <strong>Secure recovery</strong>
                <span>
                  Ownership verification supports safer claims.
                </span>
              </div>
            </div>
          </div>

          <div className="register-intro-footer">
            <span className="register-footer-line" />
            <span>Smart recovery. Better outcomes.</span>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="register-form-area">
          <div className="register-card">
            <div className="register-card-top">
              <div className="register-role-icon">
                <FaUserPlus />
              </div>

              <span className="register-form-label">
                NEW USER
              </span>

              <h2>Create your account</h2>

              <p>
                Set up your account to start using the system.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* NAME */}
              <div className="register-field">
                <label className="register-label">
                  Full name
                </label>

                <div className="register-input-group">
                  <FaUser className="register-input-icon" />

                  <input
                    type="text"
                    name="name"
                    placeholder="Your full name"
                    value={user.name}
                    onChange={handleChange}
                    autoComplete="name"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="register-field">
                <label className="register-label">
                  Email address
                </label>

                <div className="register-input-group">
                  <FaEnvelope className="register-input-icon" />

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

              {/* PASSWORD */}
              <div className="register-field">
                <label className="register-label">
                  Password
                </label>

                <div className="register-input-group">
                  <FaLock className="register-input-icon" />

                  <input
                    type="password"
                    name="password"
                    placeholder="At least 6 characters"
                    value={user.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="register-password-note">
                <FaShieldAlt />
                <span>
                  Use at least 6 characters for your password.
                </span>
              </div>

              <button
                type="submit"
                className="register-submit-btn"
              >
                <span>Create account</span>
                <FaUserPlus />
              </button>
            </form>

            <div className="register-login-link">
              <p>Already have an account?</p>

              <button
                onClick={() => navigate("/login")}
              >
                Sign in to your account
                <span>→</span>
              </button>
            </div>

            <div className="register-security-note">
              <FaShieldAlt />
              <span>
                Your account details are stored locally by the application.
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Register;
