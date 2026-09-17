export const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* --------------------------------------------------------- inline markdown */
// Two phases, matching the historical processing order (code spans first,
// so a `code span` is still recognized even when it sits inside a
// **bold** span — several playbooks rely on that, e.g. "**Always include
// `versions.tf`...**"), but now with every plain-text segment properly
// escaped, including the text *inside* a bold/link span. The old
// implementation was three independent global .replace() calls that only
// escaped the text each pattern itself captured (code content, link URLs);
// anything left over in between — ordinary prose — was emitted raw, so a
// bare "&", "<", or ">" passed straight into the generated HTML.
//
// Phase 1 pulls code spans out into placeholders (rendered to their final,
// already-escaped <code> markup up front) so phase 2 can treat the rest of
// the string as plain text to escape without re-escaping that markup.
const CODE_SPAN = /`([^`]+)`/g;
const OTHER_SPANS = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
const PLACEHOLDER = /\u0000(\d+)\u0000/g;

export const inline = (s) => {
  const codeSpans = [];
  const withPlaceholders = s.replace(
    CODE_SPAN,
    (_, code) => `\u0000${codeSpans.push(`<code>${esc(code)}</code>`) - 1}\u0000`,
  );

  let out = "";
  let last = 0;
  for (const m of withPlaceholders.matchAll(OTHER_SPANS)) {
    out += esc(withPlaceholders.slice(last, m.index));
    const [, bold, linkText, linkUrl] = m;
    if (bold !== undefined) out += `<b>${esc(bold)}</b>`;
    else out += `<a href="${esc(linkUrl)}">${esc(linkText)}</a>`;
    last = m.index + m[0].length;
  }
  out += esc(withPlaceholders.slice(last));

  // esc() leaves the \u0000 markers untouched (they aren't &, <, >, or "),
  // so they survive phase 2 no matter which segment they ended up in.
  return out.replace(PLACEHOLDER, (_, i) => codeSpans[Number(i)]);
};

/**
 * JSON.stringify for embedding inside `<script type="application/ld+json">`.
 * Plain JSON.stringify escapes quotes but not "<", so a title or summary
 * containing the literal text "</script>" would close the tag early and
 * spill the rest of the JSON (and whatever follows it) into the page as
 * raw markup. Escaping every "<" as \u003c is invisible to JSON parsers
 * but makes that byte sequence impossible to form in the output.
 */
export const jsonLd = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

/** Paragraph text that may contain inline markdown but no block structure. */
export const para = (s) =>
  s
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${inline(p.replace(/\n/g, " ").trim())}</p>`)
    .join("\n");

