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

/** Fenced blocks wider than this (in characters) overflow a phone screen. */
const WIDE_FENCE = 44;

const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
const isTableSeparator = (l) => /^\s*\|(\s*:?-{3,}:?\s*\|)+\s*$/.test(l);

/** Split "| a | b \| c |" into ["a", "b | c"], honouring escaped pipes. */
function splitRow(line) {
  const cells = [];
  let cell = "";
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  for (let k = 0; k < inner.length; k++) {
    if (inner[k] === "\\" && inner[k + 1] === "|") {
      cell += "|";
      k++;
    } else if (inner[k] === "|") {
      cells.push(cell.trim());
      cell = "";
    } else cell += inner[k];
  }
  cells.push(cell.trim());
  return cells;
}

function renderTable(header, align, rows) {
  // A class, not style="": the CSP allows no inline CSS.
  const style = (k) => (align[k] ? ` class="align-${align[k]}"` : "");
  const head = header.map((h, k) => `<th scope="col"${style(k)}>${inline(h)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${header
          .map((h, k) => `<td data-label="${esc(h.replace(/[`*]/g, ""))}"${style(k)}>${inline(r[k] ?? "")}</td>`)
          .join("")}</tr>`,
    )
    .join("\n");
  return `<div class="table-wrap"><table class="md-table">\n<thead><tr>${head}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table></div>`;
}

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/**
 * A ```flow fence becomes a CSS-only flow diagram: boxes joined by labelled
 * arrows, read top to bottom, so it reflows on a phone and needs no script.
 *
 *   title: Caption for the figure
 *   Name | optional detail        a box ("* Name" highlights it)
 *   -> label                      an arrow down to the next item
 *   group: Label ... end          a labelled boundary (VPC, cluster, account)
 *   paths ... path: Label ... end side-by-side alternatives (stack on phones)
 *   loop: label                   a note that the flow repeats from the top
 */
function flowDiagram(source) {
  let title = "";
  let loop = "";
  const root = { children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const fail = (msg, line) => { throw new Error(`flow diagram: ${msg}${line ? ` ("${line.trim()}")` : ""}`); };

  for (const raw of source) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^title:\s*(.+)$/))) title = m[1];
    else if ((m = line.match(/^loop:\s*(.+)$/))) loop = m[1];
    else if ((m = line.match(/^group:\s*(.+)$/))) {
      const group = { type: "group", label: m[1], children: [] };
      top().children.push(group);
      stack.push(group);
    } else if (line === "paths") {
      const paths = { type: "paths", children: [] };
      top().children.push(paths);
      stack.push(paths);
    } else if ((m = line.match(/^path:\s*(.+)$/))) {
      // A new path closes the previous one; both belong to the enclosing "paths".
      if (top().type === "path") stack.pop();
      if (top().type !== "paths") fail("path: must sit inside a paths block", line);
      const path = { type: "path", label: m[1], children: [] };
      top().children.push(path);
      stack.push(path);
    } else if (line === "end") {
      if (top().type === "path") stack.pop();
      if (stack.length === 1) fail("end without a matching group or paths", line);
      stack.pop();
    } else if ((m = line.match(/^->\s*(.*)$/))) top().children.push({ type: "edge", label: m[1] });
    else {
      const highlight = line.startsWith("* ");
      const [name, ...detail] = line.replace(/^\*\s+/, "").split("|");
      top().children.push({ type: "node", name: name.trim(), detail: detail.join("|").trim(), highlight });
    }
  }
  if (stack.length !== 1) fail("a group or paths block is missing its end");
  if (!title) fail("add a title: line so the figure has a caption");

  const render = (items) => items.map((it) => {
    if (it.type === "node")
      return `<div class="flow-node${it.highlight ? " is-key" : ""}"><strong>${inline(it.name)}</strong>${it.detail ? `<span>${inline(it.detail)}</span>` : ""}</div>`;
    if (it.type === "edge")
      return `<div class="flow-edge"><span class="flow-arrow" aria-hidden="true"></span>${it.label ? `<span class="flow-edge-label">${inline(it.label)}</span>` : ""}</div>`;
    if (it.type === "group")
      return `<div class="flow-group"><span class="flow-group-label">${inline(it.label)}</span>${render(it.children)}</div>`;
    if (it.type === "paths")
      return `<div class="flow-paths">${render(it.children)}</div>`;
    return `<div class="flow-path"><span class="flow-path-label">${inline(it.label)}</span>${render(it.children)}</div>`;
  }).join("");

  return `<figure class="flow">
<figcaption class="flow-title">${inline(title)}</figcaption>
<div class="flow-body">${render(root.children)}${loop ? `<div class="flow-loop"><span aria-hidden="true">↻</span> ${inline(loop)}</div>` : ""}</div>
</figure>`;
}

/**
 * A ```quiz fence becomes a self-check quiz. Without JavaScript it's a plain
 * list of questions, each with its answer behind a "Show answer" toggle;
 * assets/quiz.js turns it into a shuffled, one-question-at-a-time quiz that
 * pops up as the reader nears the end of the page.
 *
 *   Q: Question text                a concept question...
 *   S: A situation, then a question ...or a scenario question, labelled as one
 *   - A wrong option                at least two options...
 *   * The correct option            ...exactly one of them marked "*"
 *   = Why the answer is right       an explanation, shown after answering
 */
function quizBlock(source) {
  const questions = [];
  const fail = (msg, line) => { throw new Error(`quiz: ${msg}${line ? ` ("${line.trim()}")` : ""}`); };
  for (const raw of source) {
    const line = raw.trim();
    if (!line) continue;
    const current = questions[questions.length - 1];
    let m;
    if ((m = line.match(/^([QS]):\s*(.+)$/)))
      questions.push({ kind: m[1] === "S" ? "Scenario" : "Concept", prompt: m[2], options: [], why: "" });
    else if (!current) fail("start each question with a Q: or S: line", line);
    else if ((m = line.match(/^([-*])\s+(.+)$/))) current.options.push({ text: m[2], correct: m[1] === "*" });
    else if ((m = line.match(/^=\s*(.+)$/))) current.why = current.why ? `${current.why} ${m[1]}` : m[1];
    else fail("each line must start with Q:, S:, -, *, or =", line);
  }
  if (!questions.length) fail("add at least one question");
  for (const q of questions) {
    if (q.options.length < 2) fail("each question needs at least two options", q.prompt);
    if (q.options.filter((o) => o.correct).length !== 1) fail("mark exactly one option correct with *", q.prompt);
    if (!q.why) fail("add an explanation line starting with =", q.prompt);
  }

  const items = questions.map((q) => {
    const answer = q.options.findIndex((o) => o.correct);
    return `<li class="lp-quiz-q" data-answer="${answer}" data-kind="${q.kind}">
<p class="lp-quiz-kind">${q.kind}</p>
<p class="lp-quiz-prompt">${inline(q.prompt)}</p>
<ol class="lp-quiz-options" type="A">${q.options.map((o) => `<li>${inline(o.text)}</li>`).join("")}</ol>
<details class="lp-quiz-answer"><summary>Show answer</summary><p><b>${inline(q.options[answer].text)}</b></p><p class="lp-quiz-why">${inline(q.why)}</p></details>
</li>`;
  }).join("\n");
  return `<div class="lp-quiz" data-quiz>
<p class="lp-quiz-intro">${questions.length} questions. Decide on your answer to each, then check it.</p>
<ol class="lp-quiz-list">
${items}
</ol>
</div>`;
}

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
      if (fence[1] === "flow") {
        out.push(flowDiagram(buf));
        continue;
      }
      if (fence[1] === "quiz") {
        out.push(quizBlock(buf));
        continue;
      }
      const lang = fence[1] ? ` class="language-${esc(fence[1])}"` : "";
      const pre = `<pre class="code"><code${lang}>${esc(buf.join("\n"))}</code></pre>`;
      // Wide diagrams can't reflow on a phone. Say so, instead of silently
      // clipping the right-hand side (the hint is only shown on small screens).
      const widest = Math.max(0, ...buf.map((l) => [...l].length));
      out.push(
        widest > WIDE_FENCE
          ? `<figure class="wide-block">${pre}<figcaption class="scroll-hint">Scroll sideways to see the full diagram →</figcaption></figure>`
          : pre,
      );
      continue;
    }

    // Pipe table: a header row, a separator row of dashes (with optional
    // ":" alignment markers), then body rows. Rendered as a real <table> so
    // it is accessible and can reflow on small screens.
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map((c) =>
        c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : "",
      );
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(renderTable(header, align, rows));
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

    // paragraph — always consumes the current line, so a stray "| … |"
    // line that isn't a real table still renders as text instead of stalling.
    const buf = [line.trim()];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isList(lines[i]) &&
      !isOrderedList(lines[i]) &&
      !isTableRow(lines[i]) &&
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

