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
import { CallControls } from "./CallControls";
import { useVoiceCall } from "./useVoiceCall";
import { applyVoiceMessage } from "./voice";

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
  visible = true,
}: {
  embedded?: boolean;
  visible?: boolean;
}) {
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
  const [calling, setCalling] = useState(false);

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
            <strong>{calling ? "Voice call" : "Chat"}</strong>
          </div>
          <span className="status">
            <i className={health ? "connected" : ""} />
            {calling
              ? "ElevenLabs"
              : health
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
        {health?.mode === "demo" && !calling && (
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
            onCalling={setCalling}
            visible={visible}
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
  onCalling,
  visible,
}: {
  id: string;
  initialMessages: UIMessage[];
  onSaved: () => Promise<void>;
  onBusy: (busy: boolean) => void;
  onCalling: (calling: boolean) => void;
  visible: boolean;
}) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [copyError, setCopyError] = useState("");
  const [showScroll, setShowScroll] = useState(false);
  const scrollArea = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const currentMessages = useRef(initialMessages);
  const saveQueue = useRef(Promise.resolve());
  const saveVersion = useRef(0);
  const [saveError, setSaveError] = useState("");
  const [savingVoice, setSavingVoice] = useState(false);
  const {
    messages,
    setMessages,
    sendMessage,
    status,
    error,
    stop,
    clearError,
    regenerate,
  } = useChat({
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
    currentMessages.current = messages;
  }, [messages]);

  function saveVoice(next: UIMessage[]) {
    const version = ++saveVersion.current;
    setSavingVoice(true);
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        const response = await fetch(`/api/conversations/${id}/voice`, {
          method: "PUT",
          signal: AbortSignal.timeout(15000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next }),
        });
        if (!response.ok)
          throw new Error(
            "Could not save the call transcript. Keep this chat open and retry saving.",
          );
        if (version === saveVersion.current) setSaveError("");
        window.history.replaceState(null, "", `#${id}`);
        void onSaved();
      } catch {
        setSaveError(
          "Could not save the call transcript. Keep this chat open and retry saving.",
        );
      } finally {
        if (version === saveVersion.current) setSavingVoice(false);
      }
    });
  }

  const voice = useVoiceCall({
    visible,
    onMessage: (message) => {
      const next = applyVoiceMessage(currentMessages.current, message);
      currentMessages.current = next;
      setMessages(next);
      saveVoice(next);
    },
  });
  useEffect(() => {
    onBusy(busy || voice.active || savingVoice || Boolean(saveError));
    onCalling(voice.active);
  }, [busy, voice.active, savingVoice, saveError, onBusy, onCalling]);
  useEffect(() => {
    if (!savingVoice && !saveError) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [savingVoice, saveError]);
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
    if (!text.trim() || busy || voice.active || savingVoice || saveError)
      return;
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
                <h1>{voice.active ? "Let’s talk." : "How can I help?"}</h1>
                {voice.active && (
                  <p className="call-welcome">
                    Ask your question out loud. Your conversation will appear
                    here.
                  </p>
                )}
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
            {!voice.active && (
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
            )}
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
                      {message.id.startsWith("voice-")
                        ? "Voice agent"
                        : "Plainly"}
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
                        disabled={
                          busy ||
                          voice.active ||
                          savingVoice ||
                          Boolean(saveError)
                        }
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
              disabled={
                busy || voice.active || savingVoice || Boolean(saveError)
              }
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
        {saveError && (
          <div className="chat-error" role="alert">
            <span>{saveError}</span>
            <button
              type="button"
              disabled={savingVoice}
              onClick={() => saveVoice(currentMessages.current)}
            >
              Retry saving
            </button>
          </div>
        )}
        <CallControls
          {...voice}
          busy={busy || savingVoice || Boolean(saveError)}
          available={Boolean(voice.agent?.available)}
          agentName={voice.agent?.name || "your agent"}
          error={voice.error || voice.agent?.error || ""}
          onReconnect={() => void voice.refreshAgent()}
          onStart={() => {
            clearError();
            nearBottom.current = true;
            const context = messages.slice(-20).map((message) => ({
              role: message.role,
              text: message.parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("\n")
                .slice(0, 1000),
            }));
            voice.start(JSON.stringify(context));
          }}
          onEnd={() => voice.end()}
          onMute={voice.toggleMute}
        />
        {!voice.active && (
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
                  disabled={!input.trim() || savingVoice || Boolean(saveError)}
                  aria-label="Send message"
                >
                  <ArrowUp size={20} />
                </button>
              )}
            </div>
          </form>
        )}
        {!voice.active && voice.supported && (
          <p className="voice-disclosure">
            Calls use ElevenLabs. Your voice and recent chat are shared with
            your agent.
          </p>
        )}
        <div className="composer-caption">
          AI can make mistakes. Check important details.
        </div>
      </div>
    </>
  );
}
