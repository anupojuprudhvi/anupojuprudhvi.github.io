import { esc, inline } from "./html.mjs";

export function parseFrontMatter(raw, file) {
  if (!raw.startsWith("---"))
    throw new Error(`${file}: missing front matter (--- on line 1)`);
  const end = raw.indexOf("\n---", 3);
  if (end === -1) throw new Error(`${file}: front matter not closed`);
  const head = raw.slice(4, end);
  const body = raw.slice(end + 4).replace(/^\n+/, "");

  const data = {};
  const lines = head.split("\n");
  let i = 0;

  const indentOf = (l) => l.match(/^\s*/)[0].length;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const m = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!m) throw new Error(`${file}: cannot parse front-matter line: ${line}`);
    const [, key, rest] = m;

    if (rest === "|" || rest === ">") {
      // block scalar
      const buf = [];
      i++;
      while (i < lines.length && (!lines[i].trim() || indentOf(lines[i]) >= 2)) {
        buf.push(lines[i].slice(2));
        i++;
      }
      data[key] = buf.join(rest === ">" ? " " : "\n").trim();
    } else if (rest.startsWith("[")) {
      // inline list
      data[key] = rest
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      i++;
    } else if (rest === "") {
      // block list — either scalars or simple objects
      const arr = [];
      i++;
      while (i < lines.length && lines[i].trim().startsWith("-")) {
        const first = lines[i].trim().slice(1).trim();
        const kv = first.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
        if (kv) {
          const obj = { [kv[1]]: kv[2] };
          i++;
          while (
            i < lines.length &&
            !lines[i].trim().startsWith("-") &&
            lines[i].trim() &&
            indentOf(lines[i]) >= 4
          ) {
            const kv2 = lines[i].trim().match(/^([A-Za-z][\w-]*):\s*(.*)$/);
            if (kv2) obj[kv2[1]] = kv2[2];
            i++;
          }
          arr.push(obj);
        } else {
          arr.push(first);
          i++;
        }
      }
      data[key] = arr;
    } else {
      data[key] = rest;
      i++;
    }
  }
  return { data, body };
}

/* ------------------------------------------------------- body → HTML blocks */
export function renderBody(body) {
  if (!body.trim()) return "";
  // Rich pages hand us finished sections — pass them through untouched.
  if (body.trimStart().startsWith("<section")) return body.trim();

  const sections = [];
  let current = { eyebrow: "", title: "", lines: [] };
  const flush = () => {
    if (current.title || current.lines.some((l) => l.trim()))
      sections.push(current);
  };

  for (const line of body.split("\n")) {
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2 && !line.startsWith("###")) {
      flush();
      const [eyebrow, ...rest] = h2[1].split("·");
      current = rest.length
        ? { eyebrow: eyebrow.trim(), title: rest.join("·").trim(), lines: [] }
        : { eyebrow: "", title: h2[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  flush();

  return sections.map(renderSection).join("\n");
}

function renderSection(sec) {
  const inner = renderBlocks(sec.lines.join("\n"));
  const head =
    (sec.eyebrow
      ? `<div class="section-eyebrow">${esc(sec.eyebrow)}</div>\n`
      : "") + (sec.title ? `<h2>${inline(sec.title)}</h2>\n` : "");
  if (!head && !inner.trim()) return "";
  return `<section>\n<div class="wrap">\n${head}${inner}\n</div>\n</section>`;
}

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/** Block-level markdown inside a section. */
function renderBlocks(text) {
  const out = [];
  const lines = text.split("\n");
  let i = 0;

  const isList = (l) => /^\s*-\s+/.test(l);
  const isOrderedList = (l) => /^\s*\d+\.\s+/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code block ("```" ... "```", optional language after the
    // opening fence) — kept verbatim as <pre><code>. Must run before the
    // raw-HTML and paragraph branches below: a fence doesn't start with
    // "<", so it would otherwise fall through into the paragraph branch,
    // which joins lines with spaces and silently destroys any ASCII-art
    // diagram or preformatted listing inside it.
    const fence = line.match(/^\s*```(\S*)\s*$/);
    if (fence) {
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume the closing fence
      const lang = fence[1] ? ` class="language-${esc(fence[1])}"` : "";
      out.push(`<pre class="code"><code${lang}>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // Raw HTML block — passes through verbatim. Tracks the tag opened on
    // the first line and keeps consuming lines (blank ones included, so a
    // real-world <pre> code sample may contain blank lines) until that
    // tag's closing tag appears. Void/self-closing elements, or a line
    // whose tag name can't be identified, fall back to the simpler
    // "until the next blank line" rule.
    if (/^\s*</.test(line)) {
      const tagMatch = line.match(/^\s*<([a-zA-Z][\w-]*)/);
      const tag = tagMatch && tagMatch[1].toLowerCase();
      const closeRe = tag && new RegExp(`</\\s*${tag}\\s*>`, "i");
      const selfClosing =
        !tag || VOID_TAGS.has(tag) || /\/>/.test(line) || (closeRe && closeRe.test(line));

      const buf = [line];
      i++;
      if (selfClosing) {
        while (i < lines.length && lines[i].trim()) {
          buf.push(lines[i]);
          i++;
        }
      } else {
        while (i < lines.length && !closeRe.test(lines[i])) {
          buf.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          buf.push(lines[i]); // the line with the closing tag
          i++;
        }
      }
      out.push(buf.join("\n"));
      continue;
    }

    // "### Heading" immediately followed by a list → collapsible notes
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j < lines.length && isList(lines[j])) {
        const items = [];
        while (j < lines.length && (isList(lines[j]) || !lines[j].trim())) {
          if (isList(lines[j]))
            items.push(lines[j].replace(/^\s*-\s+/, "").trim());
          j++;
        }
        out.push(
          `<details class="implementation-notes">\n<summary>${inline(
            h3[1],
          )}</summary>\n<ul>\n${items
            .map((t) => `<li>${inline(t)}</li>`)
            .join("\n")}\n</ul>\n</details>`,
        );
        i = j;
        continue;
      }
      out.push(`<h3>${inline(h3[1])}</h3>`);
      i++;
      continue;
    }

    // plain and ordered lists ("- ", "1. ") — a soft-wrapped line with no
    // marker of its own continues the previous item, matching how authors
    // wrap prose elsewhere in these files.
    if (isList(line) || isOrderedList(line)) {
      const ordered = isOrderedList(line);
      const marker = ordered ? isOrderedList : isList;
      const otherMarker = ordered ? isList : isOrderedList;
      const stripRe = ordered ? /^\s*\d+\.\s+/ : /^\s*-\s+/;
      const items = [];
      while (i < lines.length) {
        if (marker(lines[i])) {
          items.push(lines[i].replace(stripRe, "").trim());
          i++;
        } else if (!lines[i].trim()) {
          // blank line ends the list unless the next line continues it
          let k = i + 1;
          while (k < lines.length && !lines[k].trim()) k++;
          if (k < lines.length && marker(lines[k])) { i++; continue; }
          break;
        } else if (
          items.length &&
          !otherMarker(lines[i]) &&
          !/^#{2,3}\s/.test(lines[i]) &&
          !/^\s*</.test(lines[i])
        ) {
          // continuation of the current item's wrapped text
          items[items.length - 1] += " " + lines[i].trim();
          i++;
        } else {
          break;
        }
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>\n${items.map((t) => `<li>${inline(t)}</li>`).join("\n")}\n</${tag}>`);
      continue;
    }

    // paragraph
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isList(lines[i]) &&
      !isOrderedList(lines[i]) &&
      !/^#{2,3}\s/.test(lines[i]) &&
      !/^\s*</.test(lines[i])
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    if (buf.length) out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}

