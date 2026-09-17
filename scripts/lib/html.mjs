export const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* --------------------------------------------------------- inline markdown */
export const inline = (s) =>
  s
    .replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => `<a href="${esc(url)}">${text}</a>`);

/** Paragraph text that may contain inline markdown but no block structure. */
export const para = (s) =>
  s
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${inline(p.replace(/\n/g, " ").trim())}</p>`)
    .join("\n");

