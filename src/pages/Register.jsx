import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaUserPlus,
} from "react-icons/fa";
import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [user, setUser] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    });
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!user.name.trim() || !user.email.trim() || !user.password) {
      alert("Please fill in all fields.");
      return;
    }

    if (user.password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      // Send directly to the Neon backend — ZERO local storage used
      const response = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.name.trim(),
          email: user.email.trim().toLowerCase(),
          password: user.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Registration failed.");
        alert(data.error || "Registration failed.");
        return;
      }

      alert("Registration Successful! User record created directly in Neon database.");
      navigate("/login");
    } catch (error) {
      console.error("Registration error:", error);
      setErrorMessage("Could not connect to backend server. Make sure node server/server.mjs is running.");
      alert("Could not connect to backend server. Make sure node server/server.mjs is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>Create Account</h1>
        <p>Join the Lost & Found community</p>

        {errorMessage && (
          <div style={{ color: "#ef4444", marginBottom: 16, fontSize: "14px", fontWeight: 600 }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <FaUser className="icon" />
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={user.name}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="input-group">
            <FaEnvelope className="icon" />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={user.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="input-group">
            <FaLock className="icon" />
            <input
              type="password"
              name="password"
              placeholder="Password (min 6 characters)"
              value={user.password}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            <FaUserPlus />
            {loading ? "Creating Account in Neon…" : "Register"}
          </button>
        </form>

        <div className="login-link">
          <p>Already have an account?</p>
          <button type="button" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;