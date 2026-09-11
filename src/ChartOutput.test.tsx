import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { formatChartValue, parseChartSpec } from "./chart-spec";
import { MessageContent } from "./MessageContent";

const example = {
  type: "line",
  title: "Growth of €10,000 at 5% compound interest",
  xKey: "year",
  yKey: "balance",
  xLabel: "Year",
  yLabel: "Balance (EUR)",
  description: "Illustrative annual compounding at 5%.",
  data: [
    { year: "0", balance: 10000 },
    { year: "1", balance: 10500 },
    { year: "2", balance: 11025 },
    { year: "3", balance: 11576.25 },
  ],
};
function render(text: string, streaming = false) {
  return renderToStaticMarkup(
    <MessageContent
      text={text}
      messageId="chart-answer"
      sources={[]}
      streaming={streaming}
    />,
  );
}
function fence(value: unknown, language = "bp-chart") {
  return `\`\`\`${language}\n${JSON.stringify(value)}\n\`\`\``;
}

test("renders the screenshot example as a chart card with its exact values", () => {
  const html = render(fence(example));
  assert.ok(html.includes('data-chart-type="line"'));
  assert.ok(html.includes(example.title));
  assert.ok(html.includes("€11,576.25"));
  assert.ok(html.includes("View chart data"));
  assert.ok(!html.includes('"xKey"'));
  assert.deepEqual(
    parseChartSpec(JSON.stringify(example))?.data.map((row) => row.label),
    ["0", "1", "2", "3"],
  );
});

test("supports all six BuildPrompt chart types and both fence names", () => {
  for (const type of ["line", "area", "bar", "pie", "donut", "scatter"]) {
    for (const language of ["bp-chart", "buildprompt-chart", "json"]) {
      const html = render(fence({ ...example, type }, language));
      assert.ok(
        html.includes(`data-chart-type="${type}"`),
        `${type} / ${language}`,
      );
    }
  }
});

test("keeps citations across charts and renders multiple charts in one answer", () => {
  const text = `Before[^1].\n\n${fence(example)}\n\nBetween[^1].\n\n${fence({ ...example, type: "bar" })}\n\nAfter.\n\n[^1]: terms.md | p. 2 | Example assumptions.`;
  const html = render(text);
  assert.equal(html.match(/class="chat-chart"/g)?.length, 2);
  assert.equal(html.match(/class="citation-badge"/g)?.length, 2);
  assert.equal(html.match(/class="citation-card"/g)?.length, 1);
  assert.ok(html.indexOf("Before") < html.indexOf("chat-chart"));
  assert.ok(html.indexOf("After.") > html.lastIndexOf("chart-data"));
});

test("handles partial streams, invalid chart data and unrelated code without crashing", () => {
  const incomplete = '```bp-chart\n{"type":"line","data":[';
  assert.ok(render(incomplete, true).includes("Preparing chart"));
  assert.ok(!render(incomplete, true).includes('"data"'));
  assert.ok(render(incomplete).includes("This chart could not be displayed"));
  assert.ok(
    render(fence({ name: "ordinary JSON" }, "json")).includes("ordinary JSON"),
  );
  assert.ok(
    !render(fence(example, "javascript")).includes('class="chat-chart"'),
  );
  assert.ok(
    render(fence({ ...example, data: [] })).includes(
      "View supplied chart data",
    ),
  );
});

test("rejects misleading or unsafe values without silently dropping rows", () => {
  for (const value of [
    { ...example, type: "unknown" },
    { ...example, yKey: "missing" },
    {
      ...example,
      data: [
        { year: "0", balance: 10000 },
        { year: "1", balance: null },
      ],
    },
    {
      ...example,
      data: [
        { year: "0", balance: 10000 },
        { year: "1", balance: "not a number" },
      ],
    },
    {
      ...example,
      type: "pie",
      data: [
        { year: "A", balance: 10 },
        { year: "B", balance: -1 },
      ],
    },
    {
      ...example,
      type: "donut",
      data: [
        { year: "A", balance: 0 },
        { year: "B", balance: 0 },
      ],
    },
    {
      ...example,
      type: "scatter",
      data: [
        { year: "A", balance: 1 },
        { year: "B", balance: 2 },
      ],
    },
    {
      ...example,
      data: Array.from({ length: 81 }, (_, i) => ({ year: i, balance: i })),
    },
  ])
    assert.equal(parseChartSpec(JSON.stringify(value)), undefined);
  assert.equal(
    parseChartSpec('{"type":"line","data":[{"x":0,"y":1e999},{"x":1,"y":2}]}'),
    undefined,
  );
});

test("supports upstream aliases and numeric strings while preserving percentage units", () => {
  const spec = parseChartSpec(
    JSON.stringify({
      chartType: "bar",
      data: [
        { name: "A", value: "10,000" },
        { name: "B", value: "11,576.25" },
      ],
    }),
  );
  assert.deepEqual(
    spec?.data.map((row) => row.value),
    [10000, 11576.25],
  );
  assert.equal(formatChartValue(0.5, "Rate (%)"), "0.5%");
  assert.equal(formatChartValue(11576.25, "Balance (EUR)"), "€11,576.25");
  const duplicate = parseChartSpec(
    JSON.stringify({
      ...example,
      data: [
        { year: "A", balance: 2 },
        { year: "A", balance: 2 },
      ],
    }),
  );
  assert.notEqual(duplicate?.data[0].key, duplicate?.data[1].key);
});
