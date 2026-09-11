import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Menu,
  MessageCircle,
  Plus,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { api } from "./api";

type Conversation = { id: string; title: string; updated_at: string };
type Health = {
  mode: "live" | "demo" | "backend";
  database: string;
  model: string;
  backend?: { collections: string[]; documentCount: number };
};
const suggestions = [
  {
    icon: BookOpen,
    title: "Understand the essentials",
    text: "Explain compound interest with a simple example.",
  },
  {
    icon: MessageCircle,
    title: "Decode the terminology",
    text: "What do risk, return and diversification mean in plain English?",
  },
  {
    icon: Sparkles,
    title: "See the bigger picture",
    text: "What is the difference between saving and investing?",
  },
];

export function App() {
  const [conversation, setConversation] = useState<{
    id: string;
    messages: UIMessage[];
  }>(() => ({ id: crypto.randomUUID(), messages: [] }));
  const [history, setHistory] = useState<Conversation[]>([]);
  const [health, setHealth] = useState<Health>();
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [nextHistory, nextHealth] = await Promise.all([
        api<Conversation[]>("/api/conversations"),
        api<Health>("/api/health"),
      ]);
      setHistory(nextHistory);
      setHealth(nextHealth);
      setNotice("");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not connect to the server.",
      );
    }
  }, []);
  useEffect(() => {
    void refresh();
    const savedId = window.location.hash.slice(1);
    if (savedId) {
      setLoading(true);
      void api<{ messages: UIMessage[] }>(
        `/api/conversations/${encodeURIComponent(savedId)}`,
      )
        .then((data) =>
          setConversation({ id: savedId, messages: data.messages }),
        )
        .catch(() =>
          setNotice(
            "Could not reopen this conversation. Choose one from the sidebar or start a new chat.",
          ),
        )
        .finally(() => setLoading(false));
    }
  }, [refresh]);

  async function openConversation(id: string) {
    setLoading(true);
    try {
      const data = await api<{ messages: UIMessage[] }>(
        `/api/conversations/${id}`,
      );
      setConversation({ id, messages: data.messages });
      window.history.replaceState(null, "", `#${id}`);
      setSidebarOpen(false);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not open this chat.",
      );
    } finally {
      setLoading(false);
    }
  }

  function newConversation() {
    window.history.replaceState(null, "", window.location.pathname);
    setConversation({ id: crypto.randomUUID(), messages: [] });
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <a className="brand" href="/" aria-label="Plainly home">
          <span className="brand-mark">
            <MessageCircle size={25} strokeWidth={1.7} />
          </span>
          <span className="brand-name">
            Plainly<span>.</span>
          </span>
        </a>
        <div className="masthead-context">
          Bank of Ireland <span>Hackathon</span>
        </div>
        <span className="prototype-label">PROTOTYPE</span>
      </header>
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside id="sidebar" className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className="icon-button sidebar-close"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={18} />
        </button>
        <div className="workspace-heading">A clearer conversation.</div>
        <button
          type="button"
          className="new-chat"
          onClick={newConversation}
          disabled={busy || loading}
        >
          <Plus size={18} /> New conversation <ArrowRight size={17} />
        </button>
        <div className="sidebar-label">
          RECENT CONVERSATIONS{" "}
          <span>{history.length.toString().padStart(2, "0")}</span>
        </div>
        <nav className="history" aria-label="Conversations">
          {history.length === 0 ? (
            <div className="history-empty">
              <MessageCircle size={19} />
              <p>
                Your next question starts here.
                <br />
                We’ll save the conversation for you.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <button
                type="button"
                className={`history-item ${item.id === conversation.id ? "active" : ""}`}
                key={item.id}
                disabled={busy || loading}
                onClick={() => void openConversation(item.id)}
              >
                <MessageCircle size={16} />
                <span>{item.title}</span>
                <ChevronRight size={13} />
              </button>
            ))
          )}
        </nav>
        <div className="knowledge-card">
          <div className="knowledge-icon">
            <BookOpen size={19} />
          </div>
          <h3>
            {health?.backend
              ? "Your knowledge, closer."
              : "Room for your documents."}
          </h3>
          <p>
            {health?.backend
              ? health.backend.collections.length
                ? `${health.backend.documentCount} documents in ${health.backend.collections.length} default collections. Answers use BOI staging’s sources.`
                : "Your chat is connected. Document collections haven’t been selected yet."
              : "Bring your documents into the conversation."}
          </p>
          <span className="coming-soon">
            {health?.backend ? "BOI WORKSPACE CONNECTED" : "COMING NEXT"}
          </span>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">Y</span>
          <div>
            <strong>Your workspace</strong>
            <span>Your conversations, in one place</span>
          </div>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-title">
            <button
              type="button"
              className="icon-button menu-button"
              aria-label="Open navigation"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>Your workspace</span>
            <ChevronRight size={14} />
            <strong>Let’s talk</strong>
          </div>
          <span className="status">
            <i className={health ? "connected" : ""} />
            {health
              ? health.mode === "demo"
                ? "Demo mode"
                : "Sonnet 5"
              : "Connecting"}
          </span>
        </header>
        {notice && (
          <div className="notice" role="alert">
            <span>{notice}</span>
            <button type="button" onClick={() => void refresh()}>
              Reconnect
            </button>
          </div>
        )}
        {health?.mode === "demo" && (
          <div className="demo-banner">
            You’re trying a sample conversation. Connect Sonnet 5 for answers to
            your own questions.
          </div>
        )}
        {loading ? (
          <div className="conversation-scroll">
            <p className="conversation-start">Opening your conversation…</p>
          </div>
        ) : (
          <Chat
            key={conversation.id}
            id={conversation.id}
            initialMessages={conversation.messages}
            onSaved={refresh}
            onBusy={setBusy}
          />
        )}
      </main>
    </div>
  );
}

function Chat({
  id,
  initialMessages,
  onSaved,
  onBusy,
}: {
  id: string;
  initialMessages: UIMessage[];
  onSaved: () => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [copyError, setCopyError] = useState("");
  const [showScroll, setShowScroll] = useState(false);
  const scrollArea = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const { messages, sendMessage, status, error, stop, clearError, regenerate } =
    useChat({
      id,
      messages: initialMessages,
      transport: new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({
          id: chatId,
          messages: outgoing,
          ...options
        }) => ({
          body: {
            ...options.body,
            id: chatId,
            messages: outgoing.map((message) => ({
              ...message,
              parts: message.parts.filter((part) => part.type === "text"),
            })),
          },
        }),
      }),
      onFinish: () => {
        window.history.replaceState(null, "", `#${id}`);
        void onSaved();
      },
    });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);
  useEffect(() => {
    if (messages.length && nearBottom.current)
      scrollArea.current?.scrollTo({
        top: scrollArea.current.scrollHeight,
        behavior: "instant",
      });
  }, [messages]);
  useEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = "auto";
      textarea.current.style.height = input
        ? `${Math.min(textarea.current.scrollHeight, 160)}px`
        : "auto";
    }
  }, [input]);

  function send(text: string, sourceId?: string) {
    if (!text.trim() || busy) return;
    clearError();
    nearBottom.current = true;
    setInput("");
    void sendMessage({
      text: text.trim(),
      ...(sourceId ? { metadata: { simplifyMessageId: sourceId } } : {}),
    });
    textarea.current?.focus();
  }

  async function copy(message: UIMessage) {
    try {
      await navigator.clipboard.writeText(
        message.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n"),
      );
      setCopiedId(message.id);
      setCopyError("");
    } catch {
      setCopyError(
        "Could not copy. You can select and copy the answer instead.",
      );
    }
  }

  return (
    <>
      <div
        className="conversation-scroll"
        ref={scrollArea}
        onScroll={() => {
          const node = scrollArea.current;
          if (node) {
            nearBottom.current =
              node.scrollHeight - node.scrollTop - node.clientHeight < 100;
            setShowScroll(!nearBottom.current);
          }
        }}
      >
        {messages.length === 0 ? (
          <div className="welcome">
            <div className="welcome-hero">
              <div className="welcome-copy">
                <div className="welcome-eyebrow">
                  <span /> A LITTLE UNDERSTANDING GOES A LONG WAY
                </div>
                <h1>
                  Your questions.
                  <br />
                  <span>Made clear.</span>
                </h1>
                <p className="welcome-description">
                  From the big picture to the small print. Ask a question,
                  explore an idea, and find an answer that makes sense to you.
                </p>
              </div>
              <div className="clarity-art" aria-hidden="true">
                <div className="art-orbit" />
                <div className="art-paper">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="art-answer">
                  <MessageCircle size={28} strokeWidth={1.5} />
                  <span>Less jargon.</span>
                  <strong>More clarity.</strong>
                  <div className="art-answer-lines">
                    <i />
                    <i />
                  </div>
                </div>
                <div className="art-badge">
                  <Check size={16} /> That makes sense.
                </div>
              </div>
            </div>
            <div className="suggestions-heading">
              <h2>A good place to start</h2>
              <span>Pick a question or ask your own</span>
            </div>
            <div className="suggestions">
              {suggestions.map(({ icon: Icon, title, text }) => (
                <button
                  type="button"
                  key={title}
                  className="suggestion"
                  onClick={() => send(text)}
                >
                  <span className="suggestion-icon">
                    <Icon size={20} strokeWidth={1.6} />
                  </span>
                  <span className="suggestion-copy">
                    <strong>{title}</strong>
                    <span className="suggestion-text">{text}</span>
                  </span>
                  <ArrowRight size={17} className="suggestion-arrow" />
                </button>
              ))}
            </div>
            <div className="simplify-hint">
              <span className="mini-simplify">
                <Sparkles size={13} /> Simplify
              </span>
              <span>
                A bit too much detail? Select Simplify below any answer.
              </span>
            </div>
          </div>
        ) : (
          <div className="messages">
            <div className="conversation-start">
              Your questions. A little clearer, one answer at a time.
            </div>
            {messages.map((message, index) => (
              <article key={message.id} className={`message ${message.role}`}>
                <div className="message-label">
                  {message.role === "assistant" ? (
                    <>
                      <span className="assistant-avatar">
                        <MessageCircle size={15} />
                      </span>
                      Plainly
                    </>
                  ) : (
                    <>
                      You<span className="small-avatar">Y</span>
                    </>
                  )}
                </div>
                <div className="message-content">
                  <Markdown>
                    {message.parts
                      .filter((part) => part.type === "text")
                      .map((part) => part.text)
                      .join("\n")}
                  </Markdown>
                </div>
                {message.role === "assistant" &&
                  !(busy && index === messages.length - 1) &&
                  !error && (
                    <div className="message-actions">
                      <button
                        type="button"
                        className="simplify-button"
                        disabled={busy}
                        onClick={() =>
                          send(
                            "Make this answer easier to understand.",
                            message.id,
                          )
                        }
                      >
                        <Sparkles size={14} />
                        Simplify
                      </button>
                      <button
                        type="button"
                        className="copy-button"
                        aria-label={
                          copiedId === message.id
                            ? "Answer copied"
                            : "Copy answer"
                        }
                        onClick={() => void copy(message)}
                      >
                        {copiedId === message.id ? (
                          <Check size={15} />
                        ) : (
                          <Copy size={15} />
                        )}
                      </button>
                    </div>
                  )}
              </article>
            ))}
            {busy &&
              (status === "submitted" ||
                !messages
                  .at(-1)
                  ?.parts.some(
                    (part) => part.type === "text" && part.text.trim(),
                  )) && (
                <div className="thinking" role="status">
                  <span />
                  <span />
                  <span />
                  Thinking it through
                </div>
              )}
          </div>
        )}
      </div>
      <div className="composer-area">
        {showScroll && (
          <button
            type="button"
            className="scroll-bottom"
            aria-label="Scroll to latest answer"
            onClick={() => {
              nearBottom.current = true;
              scrollArea.current?.scrollTo({
                top: scrollArea.current.scrollHeight,
                behavior: "smooth",
              });
            }}
          >
            <ArrowDown size={17} />
          </button>
        )}
        {error && (
          <div className="chat-error" role="alert">
            <span>{error.message}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                clearError();
                void regenerate();
              }}
            >
              Retry
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Dismiss error"
              onClick={clearError}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {copyError && (
          <p className="copy-error" role="status">
            {copyError}
          </p>
        )}
        <form
          className={`composer ${busy ? "is-busy" : ""}`}
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <label className="sr-only" htmlFor="message-input">
            Your message
          </label>
          <textarea
            ref={textarea}
            id="message-input"
            placeholder="What would you like to understand?"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={1}
            maxLength={20000}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                send(input);
              }
            }}
          />
          <div className="composer-bottom">
            <span>
              <MessageCircle size={14} /> Ask in your own words
            </span>
            {busy ? (
              <button
                type="button"
                className="send-button"
                aria-label="Stop generating"
                onClick={() => void stop()}
              >
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                className="send-button"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <ArrowUp size={20} />
              </button>
            )}
          </div>
        </form>
        <div className="composer-caption">
          <span>A little more understanding.</span>
          <span>AI can make mistakes. Check important details.</span>
        </div>
      </div>
    </>
  );
}
