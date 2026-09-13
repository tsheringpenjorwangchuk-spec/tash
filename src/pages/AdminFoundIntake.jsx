import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { FaBoxOpen, FaCheckCircle, FaClock, FaInbox, FaSearch } from "react-icons/fa";
import { aiApi } from "../services/aiApi";
import { checkAndNotifyForNewFoundItem } from "../services/notify";
import "./Claims.css";

export default function AdminFoundIntake() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [notifyingId, setNotifyingId] = useState(null);

  useEffect(() => {
    async function loadItems() {
      try {
        const response = await fetch("http://localhost:3001/api/found-items?summary=true");
        if (!response.ok) throw new Error("Could not load found reports.");
        setItems((await response.json()).slice().reverse());
      } catch (error) {
        console.error("Could not load found reports:", error);
      } finally {
        setLoading(false);
      }
    }
    loadItems();
  }, []);

  const visible = useMemo(() => items.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [item.title, item.dropoffReference, item.category, item.location].some((v) => String(v || "").toLowerCase().includes(q));
  }), [items, query]);

  async function markReceived(id) {
    const receivedAt = new Date().toISOString();
    const response = await fetch(`http://localhost:3001/api/found-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Available for Matching", receivedAt, receivedBy: "Admin" }),
    });
    if (!response.ok) {
      console.error("Could not mark found item as received.");
      return;
    }
    const updatedItem = await response.json();
    const next = items.map((item) => String(item.id) === String(id) ? updatedItem : item);
    setItems(next);

    // Now that this item is available for AI matching, check every active lost
    // report for a match and email the reporter if the AI thinks it's a good fit.
    const receivedItem = updatedItem;
    if (receivedItem) {
      setNotifyingId(id);
      try {
        await checkAndNotifyForNewFoundItem(receivedItem, aiApi.matchItems);
      } finally {
        setNotifyingId(null);
      }
    }
  }

  return <><Navbar admin/><main className="claims-page claims-with-nav"><div className="claims-shell">
    <header className="claims-header"><div><p className="claims-eyebrow">ADMIN INTAKE DESK</p><h1><FaInbox/> Found Item Drop-off</h1><p>Confirm the physical handover before a found item becomes available to AI matching.</p></div><button className="secondary-action" onClick={() => navigate("/admin-dashboard")}>Admin Dashboard</button></header>
    <div className="admin-review-panel" style={{marginBottom:18}}><label><span><FaSearch/> Search report/reference</span><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="FND reference, title, category or location"/></label></div>
    {loading ? <section className="claims-empty"><p>Loading found reports…</p></section> : !visible.length ? <section className="claims-empty"><FaBoxOpen/><h2>No found reports</h2><p>New found-item reports will appear here for physical intake.</p></section> : <div className="claims-list">
      {visible.map((item) => {
        const waiting = item.status === "Awaiting Drop-off" || item.status === "Found";
        return <article className="claim-card" key={item.id}>
          <div className="claim-card-top"><div><span className="claim-ref">{item.dropoffReference || `FND-${String(item.id).slice(-6)}`}</span><h2>{item.title}</h2><p>Reported found at {item.location} on {item.dateFound}</p></div><span className={`claim-status ${waiting ? "pending-admin-review" : "ready-for-collection"}`}>{waiting ? <FaClock/> : <FaCheckCircle/>} {waiting ? "Awaiting Drop-off" : item.status}</span></div>
          <div className="claim-meta-grid"><div><span>Category</span><strong>{item.category}</strong></div><div><span>Finder reference</span><strong>{item.dropoffReference}</strong></div><div><span>Reported</span><strong>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}</strong></div></div>
          {waiting ? <div className="admin-review-panel"><h3>Physical intake</h3><p>Only click received when the finder has physically handed the item to the Lost & Found Office.</p><button className="approve-action" onClick={() => markReceived(item.id)} disabled={notifyingId === item.id}>{notifyingId === item.id ? "Checking for matches…" : <><FaCheckCircle/> Mark Item Received</>}</button></div> : <div className="collected-banner"><FaCheckCircle/><div><strong>Office custody confirmed</strong><p>{item.status === "Available for Matching" ? "This item is available for AI matching. Matching lost-item owners are notified by email automatically." : `Current status: ${item.status}`}</p></div></div>}
        </article>;
      })}
    </div>}
  </div></main></>;
}
