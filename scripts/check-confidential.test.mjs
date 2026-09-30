import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadTerms, mask, rulesFor, scan } from "./check-confidential.mjs";

// Fixtures are assembled at runtime so this file never trips the scanner it tests.
const ACCOUNT = ["4938", "1726", "0154"];
const ACCESS_KEY = "AKIA" + "IOSFODNN7EXAMPLE";
const BEDROCK_KEY = "ABSK" + "ZmFrZS1rZXktZm9yLXRlc3RzLW9ubHk=";

const rules = rulesFor(["Acme", "ZZT", "Example Corp"]);
const hits = (text) => scan(text, rules).map((finding) => finding.match);

test("client names match whole words in any case, never inside other words", () => {
  assert.deepEqual(hits("Migrated ACME's tolling stack for zzt and example corp."), ["ACME", "zzt", "example corp"]);
  assert.deepEqual(hits("Acmeville, ZZTop, and example corporation are fine."), []);
  assert.deepEqual(hits("dev-acme-vpc"), ["acme"]);
});

test("AWS account numbers are caught, AWS documentation placeholders are allowed", () => {
  assert.deepEqual(hits(`arn:aws:iam::${ACCOUNT.join("")}:role/deploy`), [ACCOUNT.join("")]);
  assert.deepEqual(hits(`Account ${ACCOUNT.join("-")} owns the VPC`), [ACCOUNT.join("-")]);
  assert.deepEqual(hits("arn:aws:iam::123456789012:role/x and 111122223333"), []);
  assert.deepEqual(hits(`timestamp 1727712000000 and version 1.${ACCOUNT.join("")}`), []);
});

test("AWS keys are caught", () => {
  assert.deepEqual(hits(`key ${ACCESS_KEY} here`), [ACCESS_KEY]);
  assert.deepEqual(hits(BEDROCK_KEY), [BEDROCK_KEY]);
});

test("findings report line numbers and are masked for logs", () => {
  assert.deepEqual(scan("clean\nsecond line mentions Acme", rules), [
    { line: 2, rule: "client name (term #1 in .confidential-terms)", match: "Acme" },
  ]);
  assert.equal(mask(ACCOUNT.join("")), "********0154");
  assert.equal(mask("Acme"), "A***");
});

test("terms load from the ignored file and the environment, skipping comments and blanks", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "confidential-"));
  const file = path.join(dir, ".confidential-terms");
  try {
    fs.writeFileSync(file, "# Clients, agencies, and partners\nAcme\n\n  # indented, comment\nZZT\n");
    assert.deepEqual(loadTerms({ env: { CONFIDENTIAL_TERMS: "Example Corp, Acme" }, file }), ["Example Corp", "Acme", "ZZT"]);
    assert.deepEqual(loadTerms({ env: {}, file: path.join(dir, "missing") }), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
