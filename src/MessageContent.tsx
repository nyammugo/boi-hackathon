import { BookOpen, ChevronDown, ExternalLink } from "lucide-react";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChartOutput } from "./ChartOutput";
import { parseChartSpec } from "./chart-spec";

export type SourceFile = { id: string; name: string };

// BuildPrompt's citation format: filename | optional page label | excerpt.
export function parseCitation(raw: string, sources: SourceFile[]) {
  const parts = raw.trim().split(/\s+\|\s+/);
  const title = (parts.shift() || "Source").replace(/^["'“”]+|["'“”]+$/g, "");
  const page = /^(?:p{1,2}\.?|pages?)\s*\d+(?:\s*[-–]\s*\d+)?$/i.test(
    parts[0] || "",
  )
    ? parts.shift()
    : undefined;
  const matches = sources.filter((source) => source.name === title);
  return {
    title,
    page,
    excerpt: parts.join(" | "),
    file: matches.length === 1 ? matches[0] : undefined,
  };
}

type ContentNode = {
  type: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: ContentNode[];
};
function citationText(node: ContentNode): string {
  if (node.properties?.dataFootnoteBackref !== undefined) return "";
  if (node.type === "text") return node.value || "";
  return node.children?.map(citationText).join("") || "";
}

export function MessageContent({
  text,
  messageId,
  sources,
  streaming = false,
}: {
  text: string;
  messageId: string;
  sources: SourceFile[];
  streaming?: boolean;
}) {
  const [expanded, setExpanded] = useState<string>();

  function reveal(id: string) {
    setExpanded(id);
    requestAnimationFrame(() => {
      const card = document.getElementById(id);
      card?.scrollIntoView({ block: "nearest" });
      card?.querySelector("button")?.focus({ preventScroll: true });
    });
  }

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      remarkRehypeOptions={{
        clobberPrefix: `citation-${messageId}-`,
        footnoteLabel: "Sources",
      }}
      components={{
        pre: ({ node, children, ...props }) => {
          const code = node?.children.find(
            (child) => child.type === "element" && child.tagName === "code",
          );
          const classes =
            code?.type === "element" ? code.properties.className : undefined;
          const chartBlock =
            Array.isArray(classes) &&
            classes.some((name) =>
              /^(?:language-bp-chart|language-buildprompt-chart)$/i.test(
                String(name),
              ),
            );
          const jsonBlock =
            Array.isArray(classes) && classes.includes("language-json");
          if (code && (chartBlock || jsonBlock)) {
            const spec = parseChartSpec(citationText(code));
            if (spec) return <ChartOutput spec={spec} />;
            if (chartBlock && streaming)
              return (
                <div className="chart-pending" role="status">
                  Preparing chart…
                </div>
              );
            if (chartBlock)
              return (
                <div className="chart-fallback">
                  <p>This chart could not be displayed.</p>
                  <details>
                    <summary>View supplied chart data</summary>
                    <pre {...props}>{children}</pre>
                  </details>
                </div>
              );
          }
          return <pre {...props}>{children}</pre>;
        },
        h2: ({ node, children, ...props }) => (
          <h2
            {...props}
            id={
              node?.properties.id === "footnote-label"
                ? `citation-${messageId}-label`
                : props.id
            }
          >
            {children}
          </h2>
        ),
        a: ({ node, children, href, ...props }) => {
          if (node?.properties.dataFootnoteRef && href?.startsWith("#")) {
            const id = decodeURIComponent(href.slice(1));
            return (
              <button
                type="button"
                className="citation-badge"
                aria-label={`View source ${children}`}
                aria-controls={id}
                aria-expanded={expanded === id}
                onClick={() => reveal(id)}
              >
                {children}
              </button>
            );
          }
          return (
            <a {...props} href={href}>
              {children}
            </a>
          );
        },
        li: ({ node, children, ...props }) => {
          const id = String(node?.properties.id || "");
          if (!id.startsWith(`citation-${messageId}-fn-`) || !node)
            return <li {...props}>{children}</li>;
          const citation = parseCitation(citationText(node), sources);
          const open = expanded === id;
          return (
            <li id={id} className="citation-card">
              <button
                type="button"
                className="citation-summary"
                aria-expanded={open}
                aria-controls={`${id}-content`}
                onClick={() => setExpanded(open ? undefined : id)}
              >
                <BookOpen size={17} aria-hidden="true" />
                <span>
                  <strong>{citation.title}</strong>
                  {citation.page && <small>{citation.page}</small>}
                </span>
                <ChevronDown
                  size={16}
                  className={open ? "is-expanded" : ""}
                  aria-hidden="true"
                />
              </button>
              <div
                id={`${id}-content`}
                className="citation-detail"
                hidden={!open}
              >
                {citation.excerpt && (
                  <blockquote>{citation.excerpt}</blockquote>
                )}
                {citation.file ? (
                  <a
                    className="citation-document"
                    href={`/api/sources/${citation.file.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open document <ExternalLink size={13} aria-hidden="true" />
                  </a>
                ) : (
                  <p className="citation-unavailable">
                    Document link unavailable. The source name and excerpt are
                    shown above.
                  </p>
                )}
              </div>
            </li>
          );
        },
      }}
    >
      {text}
    </Markdown>
  );
}
