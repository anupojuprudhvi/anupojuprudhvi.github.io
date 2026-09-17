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
    const sitemap = read("sitemap.xml");
    const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
    const initialIndex = JSON.parse(read("assets/case-studies.json"));
    const initialProjects = JSON.parse(read("content/projects.json"));
    // Markdown overviews use the shared layout and derive links from the project.
    const overviewSource = "content/overviews/telecom.md";
    const overview = read(overviewSource);
    fs.writeFileSync(file(overviewSource), overview.replace(/title: .*/, "title: Updated overview") + "\n## Additional context\n\nOverview body marker.\n");
    succeeds();
    assert.match(read("case-studies/telecom/index.html"), /Updated overview/);
    assert.match(read("case-studies/telecom/index.html"), /Overview body marker/);
    for (const entry of initialIndex.filter((item) => item.project === "telecom"))
      assert(read("case-studies/telecom/index.html").includes(path.basename(entry.url)));
    const beforeAmbiguousOverview = read("case-studies/telecom/index.html");
    fs.writeFileSync(file("content/overviews/telecom.html"), "Duplicate overview");
    assert.match(run().stderr, /exactly one HTML or Markdown overview/);
    assert.equal(read("case-studies/telecom/index.html"), beforeAmbiguousOverview);
    fs.unlinkSync(file("content/overviews/telecom.html"));
    fs.writeFileSync(file(overviewSource), overview.replace(/summary: .*/, ""));
    assert.match(run().stderr, /overview requires title and summary/);
    fs.writeFileSync(file(overviewSource), overview);
    succeeds();
    let initialLearningPathPages = 0;
    if (fs.existsSync(file("content/learning-paths/tracks.json"))) {
      const tracks = JSON.parse(read("content/learning-paths/tracks.json"));
      if (fs.existsSync(file("content/learning-paths/index.html"))) initialLearningPathPages += 1;
      for (const track of tracks) {
        const trackDir = file(`content/learning-paths/${track.id}`);
        if (fs.existsSync(trackDir)) {
          const trackFiles = fs.readdirSync(trackDir).filter((f) => f.endsWith(".md"));
          initialLearningPathPages += trackFiles.length;
        }
      }
    }
    assert.equal(locations.length, initialIndex.length + initialProjects.length + 2 + initialLearningPathPages);
    assert.equal(new Set(locations).size, locations.length);
    assert(locations.includes("https://anupojuprudhvi.github.io/"));
    assert(locations.includes("https://anupojuprudhvi.github.io/case-studies/"));
    if (initialLearningPathPages > 0) {
      assert(locations.includes("https://anupojuprudhvi.github.io/learning-paths/"));
      assert(locations.includes("https://anupojuprudhvi.github.io/learning-paths/terraform/index.html"));
      assert(locations.includes("https://anupojuprudhvi.github.io/learning-paths/terraform/01-enterprise-module-design.html"));
      assert.match(read("learning-paths/terraform/01-enterprise-module-design.html"), /Enterprise Repository &amp; Module Layout/);
    }
    assert.match(read("robots.txt"), /Sitemap: https:\/\/anupojuprudhvi.github.io\/sitemap.xml/);
    fs.writeFileSync(file("sitemap.xml"), "stale sitemap");
    assert.equal(run("--check").status, 1);
    assert.equal(read("sitemap.xml"), "stale sitemap", "check must not rewrite sitemap");
    succeeds();
    assert.equal(read("sitemap.xml"), sitemap, "sitemap generation must be deterministic");
    const home = read("index.html");
    fs.writeFileSync(file("index.html"), home + "<!-- stale -->");
    assert.equal(run("--check").status, 1);
    assert.equal(read("index.html"), home + "<!-- stale -->", "check must not rewrite files");
    succeeds();

    const source = "content/case-studies/telecom/second-study.md";
    fs.writeFileSync(file(source), "---\ntitle: Second & new study\nproject: telecom\nsummary: A new study.\nlayer: A new layer\norder: 15\n---\n\n## Architecture\n\nA test narrative.\n");
    succeeds();
    const index = JSON.parse(read("assets/case-studies.json"));
    assert.equal(index.filter((item) => item.project === "telecom").length, initialIndex.filter((item) => item.project === "telecom").length + 1);
    assert.match(read("sitemap.xml"), /\/telecom\/second-study.html<\/loc>/);
    assert.match(read("case-studies/telecom/index.html"), /second-study.html/);
    assert.match(read("case-studies/index.html"), /data-uc-filter="layer:A new layer"/);
    assert.match(read("case-studies/telecom/second-study.html"), /Second &amp; new study/);
    assert.match(read("case-studies/telecom/second-study.html"), /aurora-global-database-modernization.html/);
    const originalStudy = read("case-studies/telecom/aurora-global-database-modernization.html");
    assert.match(originalStudy, /second-study.html/, "existing stories must inherit generated next-study navigation");
    assert.match(originalStudy, /property="og:title"/);
    assert.match(originalStudy, /name="twitter:card"/);
    assert.match(read("case-studies/telecom/serverless-ha-failover-engine.html"), /assets\/failover-diagram.js/);
    const clinicalStudy = read("case-studies/healthcare/clinical-platform-modernization-and-cost-optimization.html");
    assert.match(clinicalStudy, /property="og:title"/);
    assert.match(clinicalStudy, /assets\/cache-diagram.js/);

    // A rename must replace derived links and remove only obsolete generated pages.
    fs.writeFileSync(file("case-studies/telecom/manual.html"), "A file the generator does not own.");
    fs.renameSync(file(source), file(source.replace("second-study", "renamed-study")));
    assert.equal(run("--check").status, 1);
    succeeds();
    assert.equal(fs.existsSync(file("case-studies/telecom/second-study.html")), false);
    assert.match(read("case-studies/telecom/index.html"), /renamed-study.html/);
    assert.match(read("sitemap.xml"), /\/telecom\/renamed-study.html<\/loc>/);
    assert.doesNotMatch(read("sitemap.xml"), /second-study|manual.html/);
    assert.equal(read("case-studies/telecom/manual.html"), "A file the generator does not own.");

    const projects = JSON.parse(read("content/projects.json"));
    projects[0].name = "Updated telecom name";
    fs.writeFileSync(file("content/projects.json"), JSON.stringify(projects));
    succeeds();
    for (const output of ["index.html", "case-studies/telecom/index.html", "case-studies/telecom/renamed-study.html", "assets/case-studies.json"])
      assert.match(read(output), /Updated telecom name/);
    succeeds("--check");

    projects.reverse();
    fs.writeFileSync(file("content/projects.json"), JSON.stringify(projects));
    succeeds();
    const labels = [...read("index.html").matchAll(/<div class="tag">(.*?)<\/div>/g)].map((match) => match[1]);
    const expectedLabels = projects.map((p, i) => `${String(i + 1).padStart(2, "0")} / ${p.name.replaceAll("&", "&amp;")}`);
    assert.deepEqual(labels, expectedLabels);

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
    assert.doesNotMatch(read("sitemap.xml"), /renamed-study/);

    const testModule = "content/learning-paths/terraform/99-temporary-module.md";
    fs.writeFileSync(file(testModule), "---\ntitle: Temporary Module\ntrack: terraform\nmodule: 99\nsummary: Temporary module test.\n---\n\n## Content\n\nTemporary.\n");
    succeeds();
    assert.equal(fs.existsSync(file("learning-paths/terraform/99-temporary-module.html")), true);
    fs.unlinkSync(file(testModule));
    succeeds();
    assert.equal(fs.existsSync(file("learning-paths/terraform/99-temporary-module.html")), false);

    const homeSource = read("content/home.html");
    fs.writeFileSync(file("content/home.html"), homeSource.replace('rel="canonical"', 'rel="alternate"'));
    assert.match(run().stderr, /expected exactly one canonical URL/);
    fs.writeFileSync(file("content/home.html"), homeSource.replace('href="https://anupojuprudhvi.github.io/"', 'href="https://example.com/"'));
    assert.match(run().stderr, /invalid or duplicate canonical URL/);
    fs.writeFileSync(file("content/home.html"), homeSource);

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
