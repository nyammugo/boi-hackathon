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
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { MessageContent, type SourceFile } from "./MessageContent";
import { canReadAloud, readAloud } from "./readAloud";

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
    text: "Explain compound interest with a simple example.",
  },
  {
    icon: MessageCircle,
    text: "What do risk, return and diversification mean in plain English?",
  },
  {
    icon: Sparkles,
    text: "What is the difference between saving and investing?",
  },
];

export function App({
  embedded = false,
  active = true,
}: {
  embedded?: boolean;
  active?: boolean;
}) {
  const [conversation, setConversation] = useState<{
    id: string;
    messages: UIMessage[];
  }>(() => ({ id: crypto.randomUUID(), messages: [] }));
  const [history, setHistory] = useState<Conversation[]>([]);
  const [health, setHealth] = useState<Health>();
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [nextHistory, nextHealth, nextSources] = await Promise.all([
        api<Conversation[]>("/api/conversations"),
        api<Health>("/api/health"),
        api<SourceFile[]>("/api/sources"),
      ]);
      setHistory(nextHistory);
      setHealth(nextHealth);
      setSources(nextSources);
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
    <div className={`app-shell ${embedded ? "is-embedded" : ""}`}>
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
        <button
          type="button"
          className="new-chat"
          onClick={newConversation}
          disabled={busy || loading}
        >
          <Plus size={18} /> New conversation <ArrowRight size={17} />
        </button>
        <div className="sidebar-label">Conversations</div>
        <nav className="history" aria-label="Conversations">
          {history.length === 0 ? (
            <div className="history-empty">
              <MessageCircle size={19} />
              <p>No conversations yet.</p>
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
        <div className="source-summary">
          <BookOpen size={16} />
          <span>
            {health?.backend?.documentCount
              ? `${health.backend.documentCount} documents connected`
              : "No documents selected"}
          </span>
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
            <strong>Chat</strong>
          </div>
          <span className="status">
            <i className={health ? "connected" : ""} />
            {health
              ? health.mode === "demo"
                ? "Demo mode"
                : "Sonnet 5"
              : "Connecting"}
          </span>
          {embedded && (
            <button
              type="button"
              className="widget-new-chat"
              onClick={newConversation}
              disabled={busy || loading}
            >
              <Plus size={14} /> New chat
            </button>
          )}
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
            sources={sources}
            onSaved={refresh}
            onBusy={setBusy}
            active={active}
          />
        )}
      </main>
    </div>
  );
}

function Chat({
  sources,
  id,
  initialMessages,
  onSaved,
  onBusy,
  active,
}: {
  id: string;
  initialMessages: UIMessage[];
  sources: SourceFile[];
  onSaved: () => Promise<void>;
  onBusy: (busy: boolean) => void;
  active: boolean;
}) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [copyError, setCopyError] = useState("");
  const [readingId, setReadingId] = useState("");
  const [readError, setReadError] = useState("");
  const cancelReading = useRef<(() => void) | null>(null);
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

  useEffect(() => () => cancelReading.current?.(), []);
  useEffect(() => {
    if (!active) cancelReading.current?.();
  }, [active]);

  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Finishing a stream adds answer controls; scroll again when busy changes so they stay visible.
  useEffect(() => {
    if (messages.length && nearBottom.current)
      scrollArea.current?.scrollTo({
        top: scrollArea.current.scrollHeight,
        behavior: "instant",
      });
  }, [messages, busy]);
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
    cancelReading.current?.();
    clearError();
    nearBottom.current = true;
    if (!sourceId) setInput("");
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

  function toggleReading(messageId: string, button: HTMLButtonElement) {
    const wasReading = readingId === messageId;
    cancelReading.current?.();
    setReadError("");
    if (wasReading) return;
    const content = button
      .closest(".message")
      ?.querySelector<HTMLElement>(".message-content");
    if (!content || !canReadAloud()) return;
    setReadingId(messageId);
    cancelReading.current = readAloud(content, (error) => {
      setReadingId("");
      setReadError(error ?? "");
      cancelReading.current = null;
    });
  }

  return (
    <>
      <div
        className={`conversation-scroll ${messages.length === 0 ? "is-empty" : ""}`}
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
                <h1>How can I help?</h1>
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
            <div className="suggestions">
              {suggestions.map(({ icon: Icon, text }) => (
                <button
                  type="button"
                  key={text}
                  className="suggestion"
                  onClick={() => send(text)}
                >
                  <span className="suggestion-icon">
                    <Icon size={20} strokeWidth={1.6} />
                  </span>
                  <span className="suggestion-text">{text}</span>
                  <ArrowRight size={17} className="suggestion-arrow" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages">
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
                  <MessageContent
                    messageId={message.id}
                    streaming={busy && index === messages.length - 1}
                    sources={sources}
                    text={message.parts
                      .filter((part) => part.type === "text")
                      .map((part) => part.text)
                      .join("\n")}
                  />
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
                        className="read-aloud-button"
                        disabled={!canReadAloud()}
                        title={
                          canReadAloud()
                            ? undefined
                            : "Read aloud is not available in this browser."
                        }
                        aria-pressed={readingId === message.id}
                        onClick={(event) =>
                          toggleReading(message.id, event.currentTarget)
                        }
                      >
                        {readingId === message.id ? (
                          <Square size={14} />
                        ) : (
                          <Volume2 size={15} />
                        )}
                        {readingId === message.id
                          ? "Stop reading"
                          : "Read aloud"}
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
      <div
        className={`composer-area ${messages.length === 0 ? "is-empty" : ""}`}
      >
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
                cancelReading.current?.();
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
        {readError && (
          <p className="copy-error" role="status">
            {readError}
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
            placeholder="Ask a question…"
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
          AI can make mistakes. Check important details.
        </div>
      </div>
    </>
  );
}
