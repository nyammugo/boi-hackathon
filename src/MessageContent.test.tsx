import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MessageContent, parseCitation } from "./MessageContent";

const sources = [
  { id: "fc8c7b70-93e5-440f-9d32-d5c6080a1d13", name: "terms.md" },
];
const answer =
  "€9,800 is allocated[^1]. More detail[^1].\n\n[^1]: terms.md | p. 2 | Charge and levy are deducted.\n    Protection is conditional.";
function render(text = answer, messageId = "answer-a") {
  return renderToStaticMarkup(
    <MessageContent text={text} messageId={messageId} sources={sources} />,
  );
}

test("renders repeated citations as badges and one source card with a real document link", () => {
  const html = render();
  assert.equal(html.match(/class="citation-badge"/g)?.length, 2);
  assert.equal(html.match(/class="citation-card"/g)?.length, 1);
  assert.ok(html.includes("p. 2"));
  assert.ok(
    html.includes("Charge and levy are deducted.\nProtection is conditional."),
  );
  assert.ok(html.includes(`/api/sources/${sources[0].id}`));
  assert.ok(!html.includes("↩"));
  assert.ok(!html.includes("[^1]"));
});

test("isolates citation targets between messages", () => {
  const first = render();
  const second = render(answer, "answer-b");
  assert.ok(first.includes('aria-controls="citation-answer-a-fn-1"'));
  assert.ok(second.includes('id="citation-answer-b-fn-1"'));
  assert.ok(!second.includes("citation-answer-a"));
});

test("keeps unresolved streaming references and code examples as text", () => {
  assert.ok(render("Still streaming[^1]").includes("Still streaming[^1]"));
  const code = render("`[^1]`\n\n```md\n[^1]: terms.md | example\n```");
  assert.ok(code.includes("[^1]: terms.md | example"));
  assert.ok(!code.includes('class="citation-badge"'));
});

test("does not invent links for missing or ambiguous document names", () => {
  assert.equal(parseCitation("missing.md | excerpt", sources).file, undefined);
  assert.equal(
    parseCitation("terms.md | excerpt", [
      ...sources,
      { id: "other", name: "terms.md" },
    ]).file,
    undefined,
  );
  const html = render("Answer[^1]\n\n[^1]: missing.md | Unavailable excerpt.");
  assert.ok(html.includes("Document link unavailable"));
  assert.ok(!html.includes('href="/api/sources/'));
});

test("renders source content as text rather than executing source HTML", () => {
  const html = render(
    "Answer[^1]\n\n[^1]: unknown.md | <script>alert(1)</script>",
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("javascript:"));
});
