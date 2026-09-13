import { Link } from "react-router-dom";
import {
  FaSearch,
  FaShieldAlt,
  FaUser,
  FaUserShield,
  FaBoxOpen,
  FaRobot,
  FaClipboardCheck,
  FaKey,
  FaArrowRight,
  FaCheck,
  FaMapMarkerAlt,
  FaChevronRight,
} from "react-icons/fa";
import "./LandingPage.css";

function Home() {
  return (
    <div className="public-landing">
      {/* NAVIGATION */}
      <header className="public-header">
        <Link
          to="/"
          className="public-logo"
          aria-label="Lost and Found home"
        >
          <span className="public-logo-icon">
            <FaSearch />
          </span>

          <span>
            Lost & <strong>Found</strong>
          </span>
        </Link>

        <nav className="public-nav-links" aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#contact">Contact</a>
        </nav>

        <div className="public-nav-actions">
          <Link to="/login" className="public-btn public-btn-outline">
            User Login
          </Link>

          <Link to="/admin-login" className="public-btn public-btn-admin">
            Admin Login
          </Link>

          <Link to="/register" className="public-btn public-btn-primary">
            Register
          </Link>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="public-hero" id="home">
          <div className="public-hero-content">
            <div className="public-badge">
              <span className="public-badge-dot" />
              SMART <span>•</span> SECURE <span>•</span> RELIABLE
            </div>

            <h1>
              Lost something?
              <br />
              <span>We'll help find it.</span>
            </h1>

            <p>
              A smarter lost and found platform that connects reports,
              physical item intake, AI matching, ownership verification and
              secure collection in one streamlined workflow.
            </p>

            <div className="public-hero-actions">
              <Link
                to="/login"
                className="public-btn public-btn-primary public-btn-large"
              >
                <FaUser />
                Login as User
                <FaArrowRight className="public-button-arrow" />
              </Link>

              <Link
                to="/register"
                className="public-btn public-btn-light public-btn-large"
              >
                Create Account
              </Link>
            </div>

            <div className="public-security-note">
              <span className="public-security-icon">
                <FaShieldAlt />
              </span>

              <div>
                <strong>Secure recovery workflow</strong>
                <span>
                  Verification and admin approval before collection.
                </span>
              </div>
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="public-hero-visual">
            <div className="public-visual-glow" />
            <div className="public-visual-ring public-ring-one" />
            <div className="public-visual-ring public-ring-two" />

            <div className="public-dashboard-card">
              <div className="public-dashboard-top">
                <div>
                  <span className="public-mini-label">RECOVERY CENTRE</span>
                  <h3>Find your item</h3>
                </div>

                <span className="public-live-status">
                  <span />
                  LIVE
                </span>
              </div>

              <div className="public-search-box">
                <FaSearch />
                <span>Search active reports...</span>
                <FaChevronRight />
              </div>

              <div className="public-match-card">
                <div className="public-match-icon">
                  <FaBoxOpen />
                </div>

                <div className="public-match-info">
                  <span>AI MATCH FOUND</span>
                  <strong>Possible match detected</strong>
                  <small>87% similarity</small>
                </div>

                <div className="public-match-score">87%</div>
              </div>

              <div className="public-dashboard-footer">
                <div>
                  <FaShieldAlt />
                  <span>Verified workflow</span>
                </div>

                <span>AI assisted</span>
              </div>
            </div>

            <div className="public-floating-card public-search-card">
              <FaSearch />
              <span>Smart Search</span>
            </div>

            <div className="public-floating-card public-shield-card">
              <FaShieldAlt />
              <span>Secure</span>
            </div>

            <div className="public-floating-card public-ai-card">
              <FaRobot />
              <span>AI Matching</span>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="public-trust-strip">
          <div>
            <FaShieldAlt />
            <span>Secure reporting</span>
          </div>

          <div>
            <FaRobot />
            <span>AI-assisted matching</span>
          </div>

          <div>
            <FaClipboardCheck />
            <span>Verified ownership</span>
          </div>

          <div>
            <FaKey />
            <span>Safe collection</span>
          </div>
        </section>

        {/* FEATURES */}
        <section className="public-features" id="features">
          <div className="public-section-heading">
            <span>CORE CAPABILITIES</span>

            <h2>
              Everything needed to
              <br />
              recover what matters.
            </h2>

            <p>
              One connected workflow for users, finders and administrators —
              from the first report to the final handover.
            </p>
          </div>

          <div className="public-feature-grid">
            <article className="public-feature-card public-feature-card-large">
              <div className="public-feature-number">01</div>

              <div className="public-feature-icon">
                <FaBoxOpen />
              </div>

              <h3>Report Lost Items</h3>

              <p>
                Submit detailed lost-item reports with photos, descriptions,
                categories and locations. AI can assist with item information.
              </p>

              <span className="public-feature-link">
                Smart reporting <FaArrowRight />
              </span>
            </article>

            <article className="public-feature-card">
              <div className="public-feature-number">02</div>

              <div className="public-feature-icon">
                <FaClipboardCheck />
              </div>

              <h3>Found Item Intake</h3>

              <p>
                Report found belongings, receive a reference and safely hand
                physical items to the Lost & Found Office.
              </p>
            </article>

            <article className="public-feature-card">
              <div className="public-feature-number">03</div>

              <div className="public-feature-icon">
                <FaRobot />
              </div>

              <h3>AI Matching</h3>

              <p>
                AI compares eligible lost and found reports to identify
                potential matches and rank likely results.
              </p>
            </article>

            <article className="public-feature-card">
              <div className="public-feature-number">04</div>

              <div className="public-feature-icon">
                <FaShieldAlt />
              </div>

              <h3>Ownership Verification</h3>

              <p>
                Private verification questions help confirm that a claimant
                can provide item-specific ownership information.
              </p>
            </article>

            <article className="public-feature-card">
              <div className="public-feature-number">05</div>

              <div className="public-feature-icon">
                <FaUserShield />
              </div>

              <h3>Admin Review</h3>

              <p>
                Administrators review verified claims before an item can be
                approved for collection.
              </p>
            </article>

            <article className="public-feature-card public-feature-card-accent">
              <div className="public-feature-number">06</div>

              <div className="public-feature-icon">
                <FaKey />
              </div>

              <h3>Safe Collection</h3>

              <p>
                Approved users receive a collection code that staff verify
                before the item is released.
              </p>

              <span className="public-feature-link">
                Secure handover <FaArrowRight />
              </span>
            </article>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="public-how" id="how-it-works">
          <div className="public-section-heading public-section-heading-left">
            <span>THE RECOVERY JOURNEY</span>

            <h2>
              From lost report
              <br />
              to safe return.
            </h2>

            <p>
              Every stage is connected so that users and administrators always
              know what happens next.
            </p>
          </div>

          <div className="public-steps">
            <div className="public-step">
              <div className="public-step-number">01</div>

              <div className="public-step-icon">
                <FaClipboardCheck />
              </div>

              <h3>Report</h3>

              <p>
                Create a detailed lost or found item report.
              </p>
            </div>

            <div className="public-step">
              <div className="public-step-number">02</div>

              <div className="public-step-icon">
                <FaMapMarkerAlt />
              </div>

              <h3>Drop-off</h3>

              <p>
                Found items are physically received by staff.
              </p>
            </div>

            <div className="public-step">
              <div className="public-step-number">03</div>

              <div className="public-step-icon">
                <FaRobot />
              </div>

              <h3>Match</h3>

              <p>
                AI identifies possible lost and found matches.
              </p>
            </div>

            <div className="public-step">
              <div className="public-step-number">04</div>

              <div className="public-step-icon">
                <FaShieldAlt />
              </div>

              <h3>Verify</h3>

              <p>
                The claimant completes private ownership questions.
              </p>
            </div>

            <div className="public-step">
              <div className="public-step-number">05</div>

              <div className="public-step-icon">
                <FaUserShield />
              </div>

              <h3>Approve</h3>

              <p>
                An administrator reviews and approves the claim.
              </p>
            </div>

            <div className="public-step">
              <div className="public-step-number">06</div>

              <div className="public-step-icon">
                <FaKey />
              </div>

              <h3>Collect</h3>

              <p>
                Staff verify the collection code during handover.
              </p>
            </div>
          </div>
        </section>

        {/* PORTALS */}
        <section className="public-portals">
          <div className="public-portal-card public-user-portal">
            <div className="public-portal-content">
              <span className="public-portal-label">FOR USERS</span>

              <h2>
                Your lost item journey,
                <br />
                all in one place.
              </h2>

              <p>
                Report items, discover AI matches, verify ownership, track
                claims and manage collection details from your dashboard.
              </p>

              <Link to="/login" className="public-btn public-btn-primary">
                Open User Portal
                <FaArrowRight />
              </Link>
            </div>

            <div className="public-portal-visual">
              <FaUser />
            </div>
          </div>

          <div className="public-portal-card public-admin-portal">
            <div className="public-portal-content">
              <span className="public-portal-label">FOR ADMINISTRATORS</span>

              <h2>
                Keep the recovery process
                <br />
                organised and secure.
              </h2>

              <p>
                Manage found-item intake, review claims, approve ownership and
                confirm final collection through the administration portal.
              </p>

              <Link to="/admin-login" className="public-btn public-btn-admin">
                Open Admin Portal
                <FaArrowRight />
              </Link>
            </div>

            <div className="public-portal-visual">
              <FaUserShield />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="public-final-cta">
          <div className="public-final-cta-glow" />

          <span>READY TO GET STARTED?</span>

          <h2>
            Lost something?
            <br />
            Start your recovery today.
          </h2>

          <p>
            Create an account and take the first step toward finding your
            missing item.
          </p>

          <div className="public-final-actions">
            <Link
              to="/register"
              className="public-btn public-btn-primary public-btn-large"
            >
              Create Account
              <FaArrowRight />
            </Link>

            <Link
              to="/login"
              className="public-btn public-btn-outline public-btn-large"
            >
              Already registered? Login
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="public-footer" id="contact">
        <div className="public-footer-brand">
          <Link to="/" className="public-logo">
            <span className="public-logo-icon">
              <FaSearch />
            </span>

            <span>
              Lost & <strong>Found</strong>
            </span>
          </Link>

          <p>Smart. Secure. Reliable.</p>
        </div>

        <div className="public-footer-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <Link to="/login">Login</Link>
        </div>

        <div className="public-footer-copy">
          <FaCheck />
          <span>© 2026 Lost & Found Management System</span>
        </div>
      </footer>
    </div>
  );
}

export default Home;