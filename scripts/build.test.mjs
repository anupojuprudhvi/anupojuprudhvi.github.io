import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

test("one source updates pages, project lists, filters, search, and cleanup", () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-build-"));
  const file = (name) => path.join(sandbox, name);
  const read = (name) => fs.readFileSync(file(name), "utf8");
  const run = (...args) => spawnSync(process.execPath, ["scripts/build.mjs", ...args], { cwd: sandbox, encoding: "utf8" });
  const succeeds = (...args) => {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
  };
  try {
    for (const dir of ["scripts", "content"]) fs.cpSync(dir, file(dir), { recursive: true });
    succeeds();
    succeeds("--check");
    const home = read("index.html");
    fs.writeFileSync(file("index.html"), home + "<!-- stale -->");
    assert.equal(run("--check").status, 1);
    assert.equal(read("index.html"), home + "<!-- stale -->", "check must not rewrite files");
    succeeds();

    const source = "content/case-studies/telecom/second-study.md";
    fs.writeFileSync(file(source), "---\ntitle: Second & new study\nproject: telecom\nsummary: A new study.\nlayer: A new layer\norder: 20\n---\n\n## Architecture\n\nA test narrative.\n");
    succeeds();
    const index = JSON.parse(read("assets/case-studies.json"));
    assert.equal(index.filter((item) => item.project === "telecom").length, 2);
    assert.match(read("case-studies/telecom/index.html"), /second-study.html/);
    assert.match(read("case-studies/index.html"), /data-uc-filter="layer:A new layer"/);
    assert.match(read("case-studies/telecom/second-study.html"), /Second &amp; new study/);
    assert.match(read("case-studies/telecom/second-study.html"), /zero-downtime-database-modernization-and-failover.html/);

    // A rename must replace derived links and remove only obsolete generated pages.
    fs.writeFileSync(file("case-studies/telecom/manual.html"), "A file the generator does not own.");
    fs.renameSync(file(source), file(source.replace("second-study", "renamed-study")));
    assert.equal(run("--check").status, 1);
    succeeds();
    assert.equal(fs.existsSync(file("case-studies/telecom/second-study.html")), false);
    assert.match(read("case-studies/telecom/index.html"), /renamed-study.html/);
    assert.equal(read("case-studies/telecom/manual.html"), "A file the generator does not own.");

    const projects = JSON.parse(read("content/projects.json"));
    projects[0].name = "Updated telecom name";
    fs.writeFileSync(file("content/projects.json"), JSON.stringify(projects));
    succeeds();
    for (const output of ["index.html", "case-studies/telecom/index.html", "case-studies/telecom/renamed-study.html", "assets/case-studies.json"])
      assert.match(read(output), /Updated telecom name/);
    succeeds("--check");

    // A new project needs registry metadata, its pitch, and a study, not build-code edits.
    projects.push({ id: "new-project", name: "Another project" });
    fs.writeFileSync(file("content/projects.json"), JSON.stringify(projects));
    fs.writeFileSync(file("content/engagements/new-project.html"), '<article class="case"><h3>{{projectName}}</h3><a href="{{engagementUrl}}">Explore case studies</a></article>');
    fs.mkdirSync(file("content/case-studies/new-project"));
    fs.writeFileSync(file("content/case-studies/new-project/first-study.md"), "---\ntitle: First study\nproject: new-project\nsummary: New project narrative.\n---\n\n## Architecture\n\nDetails.\n");
    succeeds();
    assert.match(read("index.html"), /Another project/);
    assert.match(read("case-studies/new-project/index.html"), /first-study.html/);
    fs.unlinkSync(file("content/case-studies/telecom/renamed-study.md"));
    succeeds();
    assert.equal(fs.existsSync(file("case-studies/telecom/renamed-study.html")), false);
    assert.doesNotMatch(read("case-studies/telecom/index.html"), /renamed-study/);

    const before = read("index.html");
    fs.writeFileSync(file("content/projects.json"), "{invalid json");
    assert.equal(run().status, 1);
    assert.equal(read("index.html"), before, "invalid metadata must fail before writing outputs");
  } finally {
    // The only recursive cleanup target is this test's newly created temp directory.
    assert.equal(path.dirname(sandbox), path.resolve(os.tmpdir()));
    assert(path.basename(sandbox).startsWith("portfolio-build-"));
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});
