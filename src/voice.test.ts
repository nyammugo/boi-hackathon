import assert from "node:assert/strict";
import { test } from "node:test";
import type { Callbacks } from "@elevenlabs/client";
import {
  applyVoiceMessage,
  type CallState,
  idleCall,
  VoiceCall,
  type VoiceMessage,
} from "./voice";

function setup() {
  let state: CallState = idleCall;
  let options: Callbacks = {};
  let ended = 0;
  const mute: boolean[] = [];
  const context: string[] = [];
  const messages: VoiceMessage[] = [];
  const connection = {
    endSession: async () => {
      ended++;
    },
    setMicMuted: (muted: boolean) => {
      mute.push(muted);
    },
    sendContextualUpdate: (text: string) => {
      context.push(text);
    },
  };
  const call = new VoiceCall(
    async () => "wss://api.elevenlabs.io/test",
    async (callbacks) => {
      options = callbacks;
      callbacks.onConversationCreated(connection);
      callbacks.onConnect?.({ conversationId: "remote-id" });
      return connection;
    },
    (next) => {
      state = next;
    },
    (message) => {
      messages.push(message);
    },
  );
  return {
    call,
    connection,
    messages,
    mute,
    context,
    get options() {
      return options;
    },
    get state() {
      return state;
    },
    get ended() {
      return ended;
    },
  };
}

test("connects once, shares recent context, and ends audio", async () => {
  const session = setup();
  await session.call.start("Previous question");
  await session.call.start("Duplicate start");
  assert.equal(session.state.phase, "listening");
  assert.equal(session.context.length, 1);
  assert.ok(session.context[0].includes("Previous question"));
  await session.call.end();
  assert.equal(session.ended, 1);
  assert.equal(session.state.active, false);
});

test("user and agent transcripts have separate IDs, and corrections replace the same answer", async () => {
  const session = setup();
  await session.call.start("");
  session.options.onMessage?.({
    role: "user",
    source: "user",
    message: "Question",
    event_id: 1,
  });
  assert.equal(session.state.phase, "thinking");
  session.options.onMessage?.({
    role: "agent",
    source: "ai",
    message: "Full answer",
    event_id: 1,
  });
  session.options.onAgentResponseCorrection?.({
    event_id: 1,
    original_agent_response: "Full answer",
    corrected_agent_response: "Full",
  });
  const messages = session.messages.reduce(applyVoiceMessage, []);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, "user");
  assert.equal(messages[1].role, "assistant");
  assert.deepEqual(messages[1].parts, [{ type: "text", text: "Full" }]);
  await session.call.end();
});

test("mute controls the SDK microphone while mode updates continue", async () => {
  const session = setup();
  await session.call.start("");
  session.call.toggleMute();
  session.options.onModeChange?.({ mode: "speaking" });
  assert.equal(session.state.muted, true);
  assert.equal(session.state.phase, "speaking");
  session.call.toggleMute();
  assert.deepEqual(session.mute, [true, false]);
  await session.call.end();
});

test("late events from a finished call cannot alter a new call or its transcript", async () => {
  const session = setup();
  await session.call.start("");
  const old = session.options;
  await session.call.end();
  await session.call.start("");
  old.onMessage?.({
    role: "agent",
    source: "ai",
    message: "Stale answer",
    event_id: 1,
  });
  old.onModeChange?.({ mode: "speaking" });
  old.onError?.("stale error");
  assert.deepEqual(session.messages, []);
  assert.equal(session.state.phase, "listening");
  await session.call.end();
});

test("ending while requesting a signed URL aborts the request without opening audio", async () => {
  let connected = false;
  let request: AbortSignal | undefined;
  const call = new VoiceCall(
    (signal) =>
      new Promise((_resolve, reject) => {
        request = signal;
        signal.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    async () => {
      connected = true;
      return setup().connection;
    },
    () => {},
    () => {},
  );
  const started = call.start("");
  await call.end();
  await started;
  assert.equal(request?.aborted, true);
  assert.equal(connected, false);
});

test("ending during SDK setup closes a late connection and ignores its greeting", async () => {
  const session = setup();
  let state: CallState = idleCall;
  let finish = () => {};
  const call = new VoiceCall(
    async () => "signed",
    (options) =>
      new Promise((resolve) => {
        finish = () => {
          options.onConversationCreated(session.connection);
          options.onMessage?.({
            role: "agent",
            source: "ai",
            message: "Late greeting",
            event_id: 1,
          });
          resolve(session.connection);
        };
      }),
    (next) => {
      state = next;
    },
    () => {
      throw new Error("Must not receive late transcript");
    },
  );
  const started = call.start("");
  await Promise.resolve();
  await call.end();
  assert.equal(state.phase, "ending");
  finish();
  await started;
  assert.ok(session.ended >= 1);
  assert.equal(state.active, false);
});

test("permission failures and provider disconnects leave a useful error", async () => {
  let state = idleCall;
  const denied = new VoiceCall(
    async () => "signed",
    async () => {
      throw new DOMException("denied", "NotAllowedError");
    },
    (next) => {
      state = next;
    },
    () => {},
  );
  await denied.start("");
  assert.equal(state.active, false);
  assert.ok(state.error.includes("denied"));
  const session = setup();
  await session.call.start("");
  session.options.onDisconnect?.({
    reason: "error",
    message: "network",
    context: { type: "error" },
  });
  await Promise.resolve();
  assert.equal(session.state.active, false);
  assert.ok(session.state.error.includes("lost"));
});

test("transcript updates preserve typed history and enforce API limits", () => {
  const history = [
    {
      id: "typed",
      role: "user" as const,
      parts: [{ type: "text" as const, text: "Typed question" }],
    },
  ];
  const original = structuredClone(history);
  const next = applyVoiceMessage(history, {
    id: "voice-1",
    role: "assistant",
    text: "Spoken answer",
  });
  assert.deepEqual(history, original);
  assert.deepEqual(next[0], history[0]);
  assert.throws(() =>
    applyVoiceMessage(history, {
      id: "voice-1",
      role: "user",
      text: "x".repeat(20001),
    }),
  );
  assert.throws(() =>
    applyVoiceMessage(
      Array.from({ length: 100 }, (_, i) => ({ ...history[0], id: `${i}` })),
      { id: "new", role: "user", text: "Question" },
    ),
  );
});

test("transcript size includes UTF-8 bytes so saves cannot exceed the API body limit", () => {
  const history = Array.from({ length: 30 }, (_, i) => ({
    id: `${i}`,
    role: "assistant" as const,
    parts: [{ type: "text" as const, text: "€".repeat(6000) }],
  }));
  assert.throws(
    () =>
      applyVoiceMessage(history, { id: "new", role: "user", text: "Question" }),
    /size limit/,
  );
});
