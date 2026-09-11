import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { idleCall, VoiceCall, type VoiceMessage } from "./voice";

type AgentInfo = {
  available: boolean;
  name?: string;
  model?: string;
  error?: string;
};

export function useVoiceCall({
  onMessage,
  visible,
}: {
  onMessage: (message: VoiceMessage) => void;
  visible: boolean;
}) {
  const [state, setState] = useState(idleCall);
  const [supported, setSupported] = useState(false);
  const [agent, setAgent] = useState<AgentInfo>();
  const [seconds, setSeconds] = useState(0);
  const call = useRef<VoiceCall | null>(null);
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const refreshAgent = useCallback(async () => {
    try {
      setAgent(await api<AgentInfo>("/api/voice/status"));
    } catch {
      setAgent({
        available: false,
        error: "Could not connect to the voice service. Try again.",
      });
    }
  }, []);

  useEffect(() => {
    setSupported(
      Boolean(
        window.isSecureContext &&
          typeof navigator.mediaDevices?.getUserMedia === "function" &&
          typeof window.AudioContext === "function",
      ),
    );
    void refreshAgent();
    const session = new VoiceCall(
      async (signal) => {
        const response = await fetch("/api/voice/session", {
          method: "POST",
          signal,
        });
        if (!response.ok)
          throw new Error("Could not connect to the voice agent.");
        const data = (await response.json()) as { signedUrl: string };
        return data.signedUrl;
      },
      async (options) => {
        const { Conversation } = await import("@elevenlabs/client");
        return Conversation.startSession({
          ...options,
          connectionType: "websocket",
          textOnly: false,
        });
      },
      setState,
      (message) => onMessageRef.current(message),
    );
    call.current = session;
    const end = () => {
      void session.end();
    };
    const visibility = () => {
      if (document.hidden) end();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", end);
    return () => {
      end();
      call.current = null;
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", end);
    };
  }, [refreshAgent]);

  useEffect(() => {
    if (!visible) void call.current?.end();
  }, [visible]);
  useEffect(() => {
    setSeconds(0);
    if (!state.active) return;
    const started = Date.now();
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [state.active]);

  return {
    ...state,
    supported,
    agent,
    seconds,
    refreshAgent,
    start: (context: string) => {
      void call.current?.start(context);
    },
    end: (error?: string) => {
      void call.current?.end(error);
    },
    toggleMute: () => call.current?.toggleMute(),
  };
}
