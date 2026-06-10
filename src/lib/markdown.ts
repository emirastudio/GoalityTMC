import sanitizeHtml from "sanitize-html";

// Minimal markdown → HTML for tournament news posts.
//
// Why hand-rolled (no `marked` / `markdown-it`): we only need a small
// subset — paragraphs, bold/italic, links, lists, h3 — and we already
// own a sanitize step. Adding a parser dep is more surface than the
// 60-line state machine below. The output ALWAYS passes through
// sanitize-html with a strict allowlist, so any escape from the
// markdown stage is contained.
//
// Supported syntax (V1):
//   **bold**, *italic*, `code`
//   [text](https://url)
//   - bullet list / 1. ordered list
//   ### Heading
//   Paragraphs separated by blank line
//   Single newlines render as <br/>

const ALLOWED_TAGS = ["p", "br", "strong", "em", "code", "a", "ul", "ol", "li", "h3"];
const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "target", "rel"],
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  // `code` first (so its content isn't re-processed for emphasis)
  out = out.replace(/`([^`\n]+?)`/g, (_, code: string) => `<code>${code}</code>`);
  // [label](url) — url is already escaped; force rel/target for safety
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  // **bold**
  out = out.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  // *italic* (after **bold** so we don't eat their stars)
  out = out.replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");
  return out;
}

function paragraphs(block: string): string {
  // Single newlines inside a paragraph become <br/>.
  return block
    .split(/\n/)
    .map((line) => renderInline(line))
    .join("<br/>");
}

export function markdownToHtml(input: string): string {
  if (!input) return "";
  const blocks = input.replace(/\r\n?/g, "\n").trim().split(/\n{2,}/);
  const html: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Heading: ### Title
    const h3 = /^###\s+(.+)$/.exec(trimmed);
    if (h3) {
      html.push(`<h3>${renderInline(h3[1])}</h3>`);
      continue;
    }

    // Bullet list (every line starts with "- " or "* ")
    if (/^[-*]\s+/.test(trimmed) && trimmed.split("\n").every((l) => /^[-*]\s+/.test(l.trim()))) {
      const items = trimmed
        .split("\n")
        .map((l) => l.trim().replace(/^[-*]\s+/, ""))
        .map((l) => `<li>${renderInline(l)}</li>`)
        .join("");
      html.push(`<ul>${items}</ul>`);
      continue;
    }

    // Ordered list (every line starts with "1. ")
    if (/^\d+\.\s+/.test(trimmed) && trimmed.split("\n").every((l) => /^\d+\.\s+/.test(l.trim()))) {
      const items = trimmed
        .split("\n")
        .map((l) => l.trim().replace(/^\d+\.\s+/, ""))
        .map((l) => `<li>${renderInline(l)}</li>`)
        .join("");
      html.push(`<ol>${items}</ol>`);
      continue;
    }

    html.push(`<p>${paragraphs(trimmed)}</p>`);
  }

  // Final pass through sanitize-html with strict allowlist.
  return sanitizeHtml(html.join("\n"), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    // Keep http(s) and mailto only; drop javascript:, data:, etc.
    allowedSchemes: ["http", "https", "mailto"],
  });
}

// Strip markdown to plain text for email preheaders / OG descriptions.
export function markdownToPlain(input: string, max = 280): string {
  if (!input) return "";
  const stripped = input
    .replace(/\r\n?/g, "\n")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → text
    .replace(/[*`_#>-]+/g, "") // formatting marks
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > max ? `${stripped.slice(0, max - 1).trimEnd()}…` : stripped;
}
