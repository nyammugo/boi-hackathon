const blockSelector = "p, li, h1, h2, h3, h4, h5, h6, pre, blockquote";

// Keep utterances short for speech engines that stop during long answers.
// Offsets always refer to the original rendered text, including whitespace.
export function speechChunks(text: string) {
  const chunks: { text: string; start: number; end: number }[] = [];
  let start = -1;
  let end = 0;
  function flush() {
    if (start < 0) return;
    chunks.push({ text: text.slice(start, end), start, end });
    start = -1;
  }
  for (const match of text.matchAll(/\S+/g)) {
    if (
      start >= 0 &&
      (match.index + match[0].length - start > 220 ||
        text.slice(end, match.index).includes("\n"))
    )
      flush();
    if (start < 0) start = match.index;
    end = match.index + match[0].length;
    if (/[.!?]["”')\]]*$/.test(match[0])) flush();
  }
  flush();
  return chunks;
}

export function canReadAloud() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

export function readAloud(
  element: HTMLElement,
  onFinish: (error?: string) => void,
) {
  const synthesis = window.speechSynthesis;
  const nodes: { node: Text; start: number; end: number }[] = [];
  let text = "";
  function visit(node: Node) {
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
  const chunks = speechChunks(text);
  const highlights =
    typeof CSS !== "undefined" &&
    "highlights" in CSS &&
    typeof Highlight !== "undefined"
      ? CSS.highlights
      : undefined;
  let fallback: Element | null = null;
  let finished = false;
  let utterance: SpeechSynthesisUtterance | undefined;

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

  function finish(error?: string) {
    if (finished) return;
    finished = true;
    if (utterance) {
      utterance.onstart = null;
      utterance.onboundary = null;
      utterance.onend = null;
      utterance.onerror = null;
    }
    clearHighlight();
    synthesis.cancel();
    onFinish(error);
  }

  function speak(index: number) {
    if (finished) return;
    const chunk = chunks[index];
    if (!chunk) {
      finish();
      return;
    }
    utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.lang = element.closest("[lang]")?.getAttribute("lang") || "en";
    const current = utterance;
    current.onstart = () => {
      if (!finished && utterance === current) highlight(chunk.start, chunk.end);
    };
    current.onboundary = (event) => {
      if (finished || utterance !== current || event.name !== "word") return;
      // Some voices provide a zero charLength; find the word ourselves.
      const word = chunk.text.slice(event.charIndex).match(/^\S+/)?.[0];
      if (word)
        highlight(
          chunk.start + event.charIndex,
          chunk.start + event.charIndex + word.length,
        );
    };
    current.onend = () => {
      if (utterance === current) speak(index + 1);
    };
    current.onerror = () => {
      if (utterance === current)
        finish("Could not read this answer aloud. Please try again.");
    };
    try {
      synthesis.speak(current);
    } catch {
      finish("Could not read this answer aloud. Please try again.");
    }
  }

  synthesis.cancel();
  speak(0);
  return () => finish();
}
