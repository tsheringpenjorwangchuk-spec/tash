import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaSignInAlt } from "react-icons/fa";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user.email || !user.password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      const data = await response.json();

      if (response.ok) {
        // Persist session user from database
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            loggedInAt: new Date().toISOString(),
          })
        );
        navigate("/dashboard");
      } else {
        setError(data.error || "Login failed. Please verify credentials.");
      }
    } catch (err) {
      console.error("Login network error:", err);
      setError("Cannot reach backend server. Make sure the Node server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container auth-shell">
      <div className="login-card auth-card">
        <button className="auth-back" onClick={() => navigate("/")}>
          ← Back to home
        </button>
        <div className="auth-role-icon">👤</div>
        <h1>User Login</h1>
        <p>Access your reports, AI matches and claims.</p>

        {error && <p style={{ color: "#ef4444", marginBottom: 12, fontWeight: 600 }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <label className="auth-label">Email address</label>
          <div className="input-group">
            <FaEnvelope className="icon" />
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={user.email}
              onChange={handleChange}
              required
            />
          </div>

          <label className="auth-label">Password</label>
          <div className="input-group">
            <FaLock className="icon" />
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={user.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="auth-login-btn" disabled={loading}>
            <FaSignInAlt /> {loading ? "Signing in…" : "Login as User"}
          </button>
        </form>

        <div className="register-link">
          <p>Don't have an account?</p>
          <button className="register-btn" onClick={() => navigate("/register")}>
            ✨ Create Account
          </button>
        </div>
        <button className="switch-auth" onClick={() => navigate("/admin-login")}>
          🛡️ Administrator? Use Admin Login
        </button>
      </div>
    </div>
  );
}

export default Login;