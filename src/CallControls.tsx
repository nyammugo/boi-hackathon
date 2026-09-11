import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";

export function CallControls({
  active,
  supported,
  available,
  agentName,
  onReconnect,
  busy,
  muted,
  phase,
  error,
  seconds,
  onStart,
  onEnd,
  onMute,
}: {
  active: boolean;
  supported: boolean;
  available: boolean;
  agentName: string;
  onReconnect: () => void;
  busy: boolean;
  muted: boolean;
  phase:
    | "idle"
    | "connecting"
    | "listening"
    | "thinking"
    | "speaking"
    | "ending";
  error: string;
  seconds: number;
  onStart: () => void;
  onEnd: () => void;
  onMute: () => void;
}) {
  const label =
    phase === "ending"
      ? "Ending call…"
      : phase === "thinking"
        ? "Thinking it through…"
        : phase === "speaking"
          ? "Your agent is speaking"
          : muted
            ? "Microphone muted"
            : phase === "connecting"
              ? "Connecting microphone…"
              : "Listening to you";

  return (
    <div className={`call-controls ${active ? "is-active" : ""}`}>
      {error && (
        <p className="call-error" role="alert">
          {error}
        </p>
      )}
      {active ? (
        <>
          <div className="call-summary">
            <span
              className={`call-signal ${muted ? "is-muted" : phase}`}
              aria-hidden="true"
            >
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <div className="call-description">
              <strong role="status">{label}</strong>
              <span>{agentName} · ElevenLabs</span>
            </div>
            <time className="call-duration" dateTime={`PT${seconds}S`}>
              <span className="sr-only">Call duration: </span>
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </time>
          </div>
          <p className="call-hint">
            Speak naturally. You can interrupt by speaking.
          </p>
          <div className="call-actions">
            <button
              type="button"
              className="call-action"
              onClick={onMute}
              aria-pressed={muted}
              disabled={phase === "connecting" || phase === "ending"}
            >
              {muted ? <MicOff size={17} /> : <Mic size={17} />}
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              className="call-end"
              onClick={onEnd}
              disabled={phase === "ending"}
            >
              <PhoneOff size={17} /> End call
            </button>
          </div>
        </>
      ) : (
        <div className="call-start-row">
          <button
            type="button"
            className="call-start"
            onClick={onStart}
            disabled={busy || !supported || !available}
            aria-describedby="call-help"
          >
            <Phone size={16} /> Start voice call
          </button>
          <span id="call-help">
            {supported
              ? available
                ? `Talk with ${agentName}. Your chat stays visible.`
                : "Voice agent unavailable."
              : "Voice calls need microphone support and HTTPS or localhost."}
          </span>
          {!available && (
            <button type="button" className="call-action" onClick={onReconnect}>
              Reconnect voice
            </button>
          )}
        </div>
      )}
    </div>
  );
}
