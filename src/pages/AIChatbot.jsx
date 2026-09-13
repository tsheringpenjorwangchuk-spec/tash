import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaRobot,
  FaArrowLeft,
  FaPaperPlane,
  FaUser,
  FaBolt,
  FaSearch,
  FaShieldAlt,
  FaBoxOpen,
  FaCircle,
} from "react-icons/fa";
import { aiApi } from "../services/aiApi";
import "./AIChatbot.css";

export default function AIChatbot() {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your Lost & Found AI Assistant. I can help you report, search, match, or claim a lost item.",
    },
  ]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const suggestedQuestions = [
    {
      icon: FaBoxOpen,
      title: "Report a lost item",
      question: "How do I report a lost item?",
    },
    {
      icon: FaSearch,
      title: "Search for an item",
      question: "How can I search for my item?",
    },
    {
      icon: FaBolt,
      title: "AI matching",
      question: "How does AI matching work?",
    },
    {
      icon: FaShieldAlt,
      title: "Claim an item",
      question: "How do I claim a found item?",
    },
  ];

  async function sendMessage(text) {
    const cleanMessage = text.trim();

    if (!cleanMessage || loading) return;

    const nextMessages = [
      ...messages,
      {
        role: "user",
        content: cleanMessage,
      },
    ];

    setMessages(nextMessages);
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const { reply } = await aiApi.chat(
        cleanMessage,
        messages
      );

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: reply,
        },
      ]);
    } catch (err) {
      const errorMessage =
        err.message ||
        "Unable to contact the AI service.";

      setError(errorMessage);

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "I'm temporarily unable to connect to the AI service. Please try again later or continue using the Lost & Found system.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await sendMessage(message);
  }

  function handleSuggestion(question) {
    sendMessage(question);
  }

  return (
    <main className="chat-page">

      <section className="chat-shell">

        {/* =================================================
            LEFT AI INTRO PANEL
            ================================================= */}

        <aside className="chat-intro">

          <button
            className="chat-back-button"
            onClick={() => navigate("/dashboard")}
            aria-label="Back to dashboard"
          >
            <FaArrowLeft />
            <span>Back to dashboard</span>
          </button>

          <div className="chat-intro-content">

            <div className="ai-hero-icon">
              <FaRobot />

              <span className="ai-pulse">
                <FaCircle />
              </span>
            </div>

            <p className="chat-eyebrow">
              AI RECOVERY ASSISTANT
            </p>

            <h1>
              Find answers.
              <br />
              Recover faster.
            </h1>

            <p className="chat-intro-description">
              Get guidance through the Lost &amp; Found
              process, from reporting an item to matching,
              verification and collection.
            </p>

            <div className="ai-capabilities">

              <div className="capability">
                <span>
                  <FaSearch />
                </span>

                <div>
                  <strong>Search guidance</strong>
                  <small>
                    Find the right next step
                  </small>
                </div>
              </div>

              <div className="capability">
                <span>
                  <FaBolt />
                </span>

                <div>
                  <strong>AI matching</strong>
                  <small>
                    Understand how matches work
                  </small>
                </div>
              </div>

              <div className="capability">
                <span>
                  <FaShieldAlt />
                </span>

                <div>
                  <strong>Claim support</strong>
                  <small>
                    Understand verification
                  </small>
                </div>
              </div>

            </div>

          </div>

          <div className="chat-intro-footer">
            <span className="ai-status-indicator">
              <span />
              AI service available
            </span>

            <span className="ai-powered">
              Smart recovery
            </span>
          </div>

        </aside>


        {/* =================================================
            CHAT WORKSPACE
            ================================================= */}

        <section className="chat-workspace">

          {/* HEADER */}

          <header className="chat-header">

            <div className="chat-title-area">

              <div className="ai-avatar">
                <FaRobot />

                <span className="online-dot" />
              </div>

              <div>
                <p className="chat-eyebrow">
                  LOST &amp; FOUND AI
                </p>

                <h2>
                  AI Assistant
                </h2>

                <span className="online-status">
                  <FaCircle />
                  Ready to help
                </span>
              </div>

            </div>

            <div className="chat-header-status">
              <span>
                <FaCircle />
                Online
              </span>
            </div>

          </header>


          {/* CHAT CONTENT */}

          <div
            className="messages"
            aria-live="polite"
          >

            {messages.map((entry, index) => (
              <div
                key={`${entry.role}-${index}`}
                className={`message-row ${entry.role}`}
              >

                {entry.role === "assistant" && (
                  <div className="small-avatar ai-small-avatar">
                    <FaRobot />
                  </div>
                )}

                <div className="message-content">

                  <span className="message-author">
                    {entry.role === "assistant"
                      ? "AI Assistant"
                      : "You"}
                  </span>

                  <div
                    className={`message ${entry.role}`}
                  >
                    {entry.content}
                  </div>

                </div>

                {entry.role === "user" && (
                  <div className="small-avatar user-small-avatar">
                    <FaUser />
                  </div>
                )}

              </div>
            ))}

            {/* TYPING INDICATOR */}

            {loading && (
              <div className="message-row assistant">

                <div className="small-avatar ai-small-avatar">
                  <FaRobot />
                </div>

                <div className="message-content">

                  <span className="message-author">
                    AI Assistant
                  </span>

                  <div className="message assistant typing-message">
                    <span />
                    <span />
                    <span />
                  </div>

                </div>

              </div>
            )}

          </div>


          {/* =================================================
              SUGGESTIONS
              ================================================= */}

          {messages.length === 1 && !loading && (
            <div className="suggestions">

              <div className="suggestions-heading">
                <div>
                  <span>
                    GET STARTED
                  </span>

                  <strong>
                    What can I help with?
                  </strong>
                </div>
              </div>

              <div className="suggestion-list">

                {suggestedQuestions.map(
                  ({
                    icon: Icon,
                    title,
                    question,
                  }) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() =>
                        handleSuggestion(question)
                      }
                    >
                      <span className="suggestion-icon">
                        <Icon />
                      </span>

                      <span className="suggestion-copy">
                        <strong>{title}</strong>
                        <small>{question}</small>
                      </span>

                      <span className="suggestion-arrow">
                        →
                      </span>
                    </button>
                  )
                )}

              </div>

            </div>
          )}


          {/* ERROR */}

          {error && (
            <div className="chat-error">

              <span className="error-icon">
                !
              </span>

              <div>
                <strong>
                  AI service unavailable
                </strong>

                <span>
                  The AI service may have reached
                  its usage limit.
                </span>
              </div>

            </div>
          )}


          {/* =================================================
              COMPOSER
              ================================================= */}

          <div className="composer-area">

            <form
              className="chat-form"
              onSubmit={handleSubmit}
            >

              <div className="input-wrapper">

                <input
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  placeholder="Ask about reporting, matching, claims..."
                  aria-label="Chat message"
                  disabled={loading}
                />

                <span className="input-status">
                  {loading
                    ? "Thinking..."
                    : "AI powered"}
                </span>

              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  !message.trim()
                }
                aria-label="Send message"
              >
                <FaPaperPlane />
              </button>

            </form>

            <div className="privacy-note">
              <span>
                <FaShieldAlt />
              </span>

              <p>
                Don't share passwords, banking details,
                authentication codes or full
                identification numbers.
              </p>
            </div>

          </div>

        </section>

      </section>

    </main>
  );
}