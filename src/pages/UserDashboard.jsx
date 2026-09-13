import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBoxOpen, FaClipboardList, FaFileAlt, FaProjectDiagram, FaRobot,
  FaSearch, FaShieldAlt, FaSignOutAlt, FaMagic
} from "react-icons/fa";
import { readValue, writeValue } from "../services/store";
import "./UserDashboard.css";

function UserDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(() => readValue("dashboardStats", null));

  useEffect(() => {
    async function fetchStats() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch("http://localhost:3001/api/stats", {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          const nextStats = { lost: data.lost, found: data.found, claims: data.claims };
          setStats(nextStats);
          writeValue("dashboardStats", nextStats);
        }
      } catch (e) {
        console.warn("Could not fetch database stats.", e);
      }
    }
    fetchStats();
  }, []);

  const cards = [
    [FaClipboardList, "🔴 Report Lost Item", "Upload a photo and let AI identify useful item details.", "/report-lost-item", "AI analysis"],
    [FaBoxOpen, "🟢 Report Found Item", "Report it, then hand the physical item to the Lost & Found Office.", "/report-found-item", "AI + drop-off"],
    [FaProjectDiagram, "🤖 AI Item Matching", "Compare your active lost reports with available found items.", "/ai-matches", "Smart match"],
    [FaShieldAlt, "🛡️ My Claims", "Track verification, admin review, collection code and handover.", "/my-claims", "Claim centre"],
    [FaSearch, "🔎 Lost Reports", "View and manage lost item reports currently in the system.", "/view-lost-items", "Reports"],
    [FaFileAlt, "📦 Found Reports", "View found item reports and their current status.", "/view-found-items", "Reports"],
    [FaRobot, "💬 AI Assistant", "Ask for help with reporting, matching, verification and claims.", "/ai-chatbot", "AI support"],
  ];

  return (
    <main className="dashboard-container">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow"><FaMagic /> SMART LOST & FOUND</p>
          <h1>👋 Welcome to Smart Lost & Found</h1>
          <p>Report items, use AI matching, verify ownership securely and collect approved items with a unique code.</p>
        </div>
        <div className="dashboard-stats">
          <div><strong>{stats?.lost ?? "…"}</strong><span>Active lost</span></div>
          <div><strong>{stats?.found ?? "…"}</strong><span>Found items</span></div>
          <div><strong>{stats?.claims ?? "…"}</strong><span>Open claims</span></div>
        </div>
      </section>

      <div className="dashboard-grid">
        {cards.map(([Icon, title, text, path, badge]) => (
          <button className="dashboard-card" onClick={() => navigate(path)} key={title}>
            <div className="dashboard-card-top"><Icon /><span>{badge}</span></div>
            <h3>{title}</h3><p>{text}</p><small>Open feature →</small>
          </button>
        ))}
      </div>

      <button className="logout-btn" onClick={() => navigate("/login")}>
        <FaSignOutAlt /> Logout
      </button>
    </main>
  );
}
export default UserDashboard;