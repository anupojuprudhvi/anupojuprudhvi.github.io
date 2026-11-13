// Fails when a commit message carries agent attribution (workspace AGENTS.md section 5, rule 1).
//
//   node scripts/check-commit-messages.mjs <base> <head>   commits in base..head (CI)
//   node scripts/check-commit-messages.mjs                 the latest commit
//
// The commit-msg hook strips these lines locally, but cloud agent sessions commit on a
// remote machine and never run local hooks, so CI is the only place that catches them.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// Keep in step with .githooks/commit-msg.
const ATTRIBUTION = [
  /^\s*co-authored-by:/im,
  /^\s*claude-session:/im,
  /claude\.ai\/code\//i,
  /noreply@anthropic\.com/i,
  /generated (with|by) .*(claude|gemini|cline|copilot|cursor|codex|chatgpt|openai|anthropic|\bai\b)/i,
  /🤖/u,
];

export const findAttribution = (message) => ATTRIBUTION.find((pattern) => pattern.test(message));

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const ZERO = /^0+$/;

const exists = (rev) => {
  try { git("cat-file", "-e", `${rev}^{commit}`); return true; } catch { return false; }
};

export function checkRange(base, head) {
  // A new branch (all-zero base) or a force-push (base no longer exists) has no usable
  // range, so check the head commit alone rather than failing or skipping.
  const ranged = base && !ZERO.test(base) && exists(base);
  const revs = (ranged ? git("rev-list", `${base}..${head}`) : git("rev-list", "-n", "1", head)).split("\n").filter(Boolean);
  return revs.filter((sha) => findAttribution(git("log", "-1", "--format=%B", sha))).map((sha) => sha.slice(0, 10));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base, head = "HEAD"] = process.argv.slice(2);
  const bad = checkRange(base, head);
  if (bad.length) {
    console.error(`Agent attribution found in ${bad.length} commit message(s): ${bad.join(", ")}`);
    console.error("Remove Co-Authored-By / Claude-Session / 'Generated with' lines (workspace AGENTS.md section 5).");
    process.exit(1);
  }
  console.log("Commit messages carry no agent attribution.");
}
