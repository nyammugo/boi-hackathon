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
  FileText,
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

export function App({ embedded = false }: { embedded?: boolean }) {
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
              : "No reference documents selected"}
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadController = useRef<AbortController | null>(null);
  useEffect(() => () => uploadController.current?.abort(), []);
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
  const generating = status === "submitted" || status === "streaming";
  const busy = generating || uploading;

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
    clearError();
    nearBottom.current = true;
    setInput("");
    void sendMessage({
      text: text.trim(),
      ...(sourceId ? { metadata: { simplifyMessageId: sourceId } } : {}),
    });
    textarea.current?.focus();
  }

  async function explainLetter(file: File) {
    if (busy || uploadController.current) return;
    setUploadError("");
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
      setUploadError("Choose a PDF, Word (.docx), or text (.txt) file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024 || file.size === 0) {
      setUploadError(
        file.size === 0
          ? "This file is empty. Choose another letter."
          : "Choose a file under 5 MB.",
      );
      return;
    }
    const controller = new AbortController();
    uploadController.current = controller;
    setUploading(true);
    clearError();
    try {
      const query = new URLSearchParams({
        conversationId: id,
        name: file.name,
      });
      const response = await fetch(`/api/documents?${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not read this letter. Try again.");
      nearBottom.current = true;
      void sendMessage({
        text: `Explain this letter: ${data.name}`,
        metadata: { documentId: data.id },
      });
    } catch (error) {
      if (!controller.signal.aborted)
        setUploadError(
          error instanceof Error
            ? error.message
            : "Could not upload the letter. Try again.",
        );
    } finally {
      uploadController.current = null;
      setUploading(false);
    }
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
      <input
        ref={fileInput}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose a letter"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void explainLetter(file);
        }}
      />
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
              <button
                type="button"
                className="suggestion"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <span className="suggestion-icon">
                  <FileText size={20} strokeWidth={1.6} />
                </span>
                <span className="suggestion-text">
                  <strong>Explain this letter</strong>
                  <span className="letter-hint">
                    Choose a PDF, Word or text file. I’ll explain it simply.
                  </span>
                </span>
                <ArrowRight size={17} className="suggestion-arrow" />
              </button>
              {suggestions.map(({ icon: Icon, text }) => (
                <button
                  type="button"
                  key={text}
                  className="suggestion"
                  disabled={busy}
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
                  <Markdown>
                    {message.parts
                      .filter((part) => part.type === "text")
                      .map((part) => part.text)
                      .join("\n")}
                  </Markdown>
                </div>
                {message.role === "user" &&
                  typeof (
                    message.metadata as { documentId?: unknown } | undefined
                  )?.documentId === "string" && (
                    <LetterVerification
                      documentId={
                        (message.metadata as { documentId: string }).documentId
                      }
                      conversationId={id}
                    />
                  )}
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
            {generating &&
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
        {(uploading || uploadError) && (
          <div
            className="chat-error letter-status"
            role={uploadError ? "alert" : "status"}
          >
            <FileText size={17} aria-hidden="true" />
            <span>{uploading ? "Reading your letter…" : uploadError}</span>
            <button
              type="button"
              onClick={() => {
                if (uploading) uploadController.current?.abort();
                else setUploadError("");
              }}
            >
              {uploading ? "Cancel" : "Dismiss"}
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
            <button
              type="button"
              className="letter-button"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              title="PDF, Word (.docx) or text (.txt), up to 5 MB"
            >
              <FileText size={16} /> Explain this letter
            </button>
            {generating ? (
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
                disabled={busy || !input.trim()}
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

function LetterVerification({
  documentId,
  conversationId,
}: {
  documentId: string;
  conversationId: string;
}) {
  const [result, setResult] = useState<{
    status: string;
    title: string;
    detail: string;
  }>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: The retry counter intentionally reruns this read-only request.
  useEffect(() => {
    let active = true;
    setFailed(false);
    setResult(undefined);
    void api<{ status: string; title: string; detail: string }>(
      `/api/documents/${encodeURIComponent(documentId)}/verification?${new URLSearchParams({ conversationId })}`,
    )
      .then((data) => {
        if (active) setResult(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [documentId, conversationId, attempt]);
  return (
    <div
      className={`letter-verification ${result?.status === "matched" ? "is-matched" : ""}`}
      role="status"
    >
      <strong>
        {failed
          ? "Demo check unavailable"
          : result?.title || "Checking demo record…"}
      </strong>
      <p>
        {failed
          ? "We could not check this letter. Its origin has not been verified."
          : result?.detail ||
            "Matching the footer code and letter text against the stored sample."}
      </p>
      {failed && (
        <button
          type="button"
          className="letter-button"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Retry check
        </button>
      )}
      <small>
        Demo only · Checks extracted text, not images or bank signatures.
      </small>
    </div>
  );
}
