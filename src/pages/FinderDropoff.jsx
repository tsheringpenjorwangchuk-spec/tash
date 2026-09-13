import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaBoxOpen, FaCheckCircle, FaClipboard, FaMapMarkerAlt, FaShieldAlt } from "react-icons/fa";
import "./Claims.css";

export default function FinderDropoff() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadItem() {
      try {
        const response = await fetch(`http://localhost:3001/api/found-items/${id}`);
        if (!response.ok) throw new Error("Found item could not be loaded.");
        const data = await response.json();
        if (!cancelled) setItem(data);
      } catch (error) {
        console.error("Could not load found report:", error);
        if (!cancelled) setItem(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadItem();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <main className="claims-page"><div className="claims-shell"><section className="claims-empty"><p>Loading found report…</p></section></div></main>;
  }

  if (!item) {
    return <main className="claims-page"><div className="claims-shell"><section className="claims-empty"><FaBoxOpen/><h2>Found report not found</h2><button className="secondary-action" onClick={() => navigate("/dashboard")}>Back to dashboard</button></section></div></main>;
  }

  const received = item.status === "Available for Matching" || ["Reserved for Collection", "Collected"].includes(item.status);
  return (
    <main className="claims-page">
      <div className="claims-shell">
        <header className="claims-header">
          <div><p className="claims-eyebrow">FOUND ITEM HANDOVER</p><h1><FaBoxOpen/> Drop-off Instructions</h1><p>The office must physically receive the item before it can be used for AI matching.</p></div>
          <button className="secondary-action" onClick={() => navigate("/view-found-items")}><FaArrowLeft/> Found Reports</button>
        </header>

        <article className="claim-card">
          <div className="claim-card-top">
            <div><span className="claim-ref">{item.dropoffReference || `FND-${String(item.id).slice(-6)}`}</span><h2>{item.title}</h2><p>{item.description}</p></div>
            <span className={`claim-status ${received ? "ready-for-collection" : "pending-admin-review"}`}>{received ? <FaCheckCircle/> : <FaShieldAlt/>} {received ? "Received by Office" : "Awaiting Drop-off"}</span>
          </div>

          {!received ? <>
            <div className="admin-review-panel">
              <h3><FaClipboard/> What to do next</h3>
              <p>Bring the physical item to the Lost & Found Office and show the reference above. Keep the item safe until it is handed to staff.</p>
              <div className="claim-meta-grid">
                <div><span>Drop-off location</span><strong><FaMapMarkerAlt/> Lost & Found Office, Main Reception</strong></div>
                <div><span>Reference</span><strong>{item.dropoffReference}</strong></div>
                <div><span>Status</span><strong>Awaiting Drop-off</strong></div>
              </div>
              <div className="admin-note"><strong>Important:</strong> AI matching will not use this found report until an administrator confirms the item has been received.</div>
            </div>
          </> : <div className="collected-banner"><FaCheckCircle/><div><strong>Item received by the Lost & Found Office</strong><p>This report is now available for AI matching. Received {item.receivedAt ? new Date(item.receivedAt).toLocaleString() : "by staff"}.</p></div></div>}
        </article>
      </div>
    </main>
  );
}
