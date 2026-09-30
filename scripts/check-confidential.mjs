// Blocks client names, AWS account numbers, and AWS keys from reaching the repository.
//
//   node scripts/check-confidential.mjs            every tracked and untracked (non-ignored) file
//   node scripts/check-confidential.mjs --staged   what the next commit contains (pre-commit hook)
//   node scripts/check-confidential.mjs --changed  everything that differs from HEAD (agent gate)
//
// Client names come from the git-ignored .confidential-terms file (one per line, # comments)
// or the CONFIDENTIAL_TERMS environment variable (newline or comma separated). They must never
// live in a tracked file: this repository is public. Findings are masked in the output so a CI
// log never republishes what it caught.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const TERMS_FILE = ".confidential-terms";
const MODES = ["--all", "--staged", "--changed"];
const SKIP = new Set(["package-lock.json", TERMS_FILE]);
// Placeholder account IDs that AWS documentation uses.
const EXAMPLE_ACCOUNTS = new Set(["123456789012", "111122223333", "444455556666", "000000000000"]);

const PATTERNS = [
  {
    rule: "AWS account number",
    regex: /(?<![\w.-])(?:\d{12}|\d{4}-\d{4}-\d{4})(?![\w-])/g,
    allow: (match) => EXAMPLE_ACCOUNTS.has(match.replaceAll("-", "")),
  },
  { rule: "AWS access key ID", regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { rule: "Bedrock API key", regex: /\bABSK[A-Za-z0-9+/=]{20,}/g },
];

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function loadTerms({ env = process.env, file = TERMS_FILE } = {}) {
  const raw = [env.CONFIDENTIAL_TERMS ?? "", existsSync(file) ? readFileSync(file, "utf8") : ""].join("\n");
  const lines = raw.split("\n").filter((line) => !line.trim().startsWith("#"));
  const terms = lines.flatMap((line) => line.split(",")).map((term) => term.trim()).filter(Boolean);
  return [...new Set(terms)];
}

export function rulesFor(terms) {
  return [
    ...PATTERNS,
    // Whole-word, case-insensitive: "Acme" matches "ACME's" but not "Acmeville".
    ...terms.map((term, i) => ({
      rule: `client name (term #${i + 1} in ${TERMS_FILE})`,
      regex: new RegExp(`(?<![\\p{L}\\p{N}])${escape(term)}(?![\\p{L}\\p{N}])`, "giu"),
    })),
  ];
}

export function scan(text, rules) {
  const findings = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const { rule, regex, allow } of rules) {
      for (const [match] of line.matchAll(regex)) {
        if (!allow?.(match)) findings.push({ line: i + 1, rule, match });
      }
    }
  });
  return findings;
}

export const mask = (match) => (/\d{4}$/.test(match) ? `********${match.slice(-4)}` : `${match[0]}${"*".repeat(match.length - 1)}`);

const git = (...args) => execFileSync("git", args, { maxBuffer: 256 * 1024 * 1024 });
const list = (...args) => git(...args, "-z").toString("utf8").split("\0").filter(Boolean);

function filesFor(mode) {
  if (mode === "--staged") return list("diff", "--cached", "--name-only", "--diff-filter=ACMR");
  const untracked = list("ls-files", "--others", "--exclude-standard");
  if (mode === "--changed") return [...new Set([...list("diff", "HEAD", "--name-only", "--diff-filter=ACMR"), ...untracked])];
  return [...list("ls-files", "--cached"), ...untracked];
}

function contentOf(mode, file) {
  if (mode === "--staged") return git("show", `:${file}`);
  return existsSync(file) ? readFileSync(file) : null;
}

export function main(argv = process.argv.slice(2), env = process.env) {
  const mode = argv[0] ?? "--all";
  if (!MODES.includes(mode)) {
    console.error(`Usage: node scripts/check-confidential.mjs [${MODES.join("|")}]`);
    return 2;
  }
  const terms = loadTerms({ env });
  if (!terms.length) {
    if (!env.CI) {
      console.error(`No client names configured. Create ${TERMS_FILE} (git-ignored) with one client, agency, or project name per line.`);
      return 1;
    }
    console.warn("::warning::CONFIDENTIAL_TERMS is not set; scanning for AWS account numbers and keys only.");
  }
  const rules = rulesFor(terms);
  const files = filesFor(mode).filter((file) => !SKIP.has(file));
  let count = 0;
  const report = (where, { rule, match }) => {
    console.error(`${where}: ${rule}: ${mask(match)}`);
    count++;
  };
  for (const file of files) {
    for (const finding of scan(file, rules)) report(`${file} (file path)`, finding);
    const content = contentOf(mode, file);
    if (!content || content.includes(0)) continue; // deleted or binary
    for (const finding of scan(content.toString("utf8"), rules)) report(`${file}:${finding.line}`, finding);
  }
  if (count) {
    console.error(
      `\n${count} confidential match(es). Replace them with anonymized, industry-level wording ` +
        `(see "Client anonymity and confidential data" in AGENTS.md). Never bypass this check with --no-verify.`,
    );
    return 1;
  }
  console.log(`Confidentiality scan passed: ${files.length} files, ${terms.length} client terms, ${mode.slice(2)}.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
