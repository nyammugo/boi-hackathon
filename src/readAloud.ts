const blockSelector =
  "p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, div, figcaption, th, td";

type WordTiming = {
  start: number;
  end: number;
  startTime: number;
  endTime: number;
};
type SpeechAudio = { audioBase64: string; words: WordTiming[] };

export function wordAtTime(words: WordTiming[], time: number) {
  return words.find((word) => time >= word.startTime && time < word.endTime);
}

export function readAloud(
  element: HTMLElement,
  onFinish: (error?: string) => void,
  onState: (state: "loading" | "ready" | "playing") => void,
) {
  const nodes: { node: Text; start: number; end: number }[] = [];
  let text = "";
  function visit(node: Node) {
    // Citation controls and collapsed chart/source details are not answer text.
    if (
      node instanceof Element &&
      node.matches(
        '[hidden], [aria-hidden="true"], button, svg, summary, details:not([open])',
      )
    )
      return;
    if (node.nodeType === Node.TEXT_NODE) {
      const start = text.length;
      text += node.textContent;
      nodes.push({ node: node as Text, start, end: text.length });
      return;
    }
    const block =
      node instanceof Element && node.matches(`${blockSelector}, br`);
    if (block) text += "\n";
    for (const child of node.childNodes) visit(child);
    if (block) text += "\n";
  }
  visit(element);
  const highlights =
    typeof CSS !== "undefined" &&
    "highlights" in CSS &&
    typeof Highlight !== "undefined"
      ? CSS.highlights
      : undefined;
  let fallback: Element | null = null;
  let finished = false;

  function clearHighlight() {
    highlights?.delete("read-aloud");
    fallback?.classList.remove("read-aloud-current");
    fallback = null;
  }

  function highlight(start: number, end: number) {
    clearHighlight();
    const first = nodes.find((entry) => entry.end > start);
    const last = nodes.find((entry) => entry.end >= end);
    if (!first || !last) return;
    if (highlights) {
      const range = document.createRange();
      range.setStart(first.node, Math.max(0, start - first.start));
      range.setEnd(last.node, end - last.start);
      highlights.set("read-aloud", new Highlight(range));
    } else {
      fallback = first.node.parentElement?.closest(blockSelector) ?? element;
      fallback.classList.add("read-aloud-current");
    }
  }

  const controller = new AbortController();
  const audio = new Audio();
  let audioUrl: string | undefined;
  let frame = 0;
  let words: WordTiming[] = [];
  let previousWord: WordTiming | undefined;

  function finish(error?: string) {
    if (finished) return;
    finished = true;
    controller.abort();
    cancelAnimationFrame(frame);
    audio.onended = null;
    audio.onerror = null;
    audio.onplaying = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    clearHighlight();
    onFinish(error);
  }

  function followAudio() {
    if (finished) return;
    const word = wordAtTime(words, audio.currentTime);
    if (word !== previousWord) {
      if (word) highlight(word.start, word.end);
      else clearHighlight();
      previousWord = word;
    }
    frame = requestAnimationFrame(followAudio);
  }

  async function play() {
    if (finished || !audioUrl) return;
    try {
      await audio.play();
    } catch (error) {
      if (finished) return;
      // Some browsers require another user gesture after audio is downloaded.
      if (error instanceof DOMException && error.name === "NotAllowedError")
        onState("ready");
      else finish("Could not play this answer aloud. Please try again.");
    }
  }

  audio.onplaying = () => {
    if (finished) return;
    onState("playing");
    cancelAnimationFrame(frame);
    followAudio();
  };
  audio.onended = () => finish();
  audio.onerror = () =>
    finish("Could not play this answer aloud. Please try again.");

  onState("loading");
  void (async () => {
    try {
      const response = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || "Could not generate audio. Please try again.",
        );
      }
      const data: SpeechAudio = await response.json();
      if (finished) return;
      words = data.words;
      const bytes = Uint8Array.from(atob(data.audioBase64), (character) =>
        character.charCodeAt(0),
      );
      audioUrl = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
      audio.src = audioUrl;
      await play();
    } catch (error) {
      if (!finished)
        finish(
          error instanceof Error
            ? error.message
            : "Could not read this answer aloud. Please try again.",
        );
    }
  })();
  return { stop: () => finish(), play: () => void play() };
}
