/* Case-study library: filter chips + free-text search over the rendered cards. */
(() => {
  const grid = document.getElementById("ucGrid");
  if (!grid) return;
  const cards = [...grid.querySelectorAll(".uc-card")];
  const search = document.getElementById("ucSearch");
  const status = document.getElementById("ucStatus");
  const empty = document.getElementById("ucEmpty");
  const chips = [...document.querySelectorAll("[data-uc-filter]")];

  let active = "all";

  const haystack = new Map(
    cards.map((c) => [c, c.textContent.toLowerCase() + " " + (c.dataset.tags || "")]),
  );

  function matchesFilter(card) {
    if (active === "all") return true;
    const [kind, value] = active.split(":");
    if (kind === "project") return card.dataset.project === value;
    if (kind === "layer") return card.dataset.layer === value;
    return true;
  }

  function apply() {
    const q = (search?.value || "").trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const card of cards) {
      const text = haystack.get(card);
      const ok =
        matchesFilter(card) && terms.every((t) => text.includes(t));
      card.hidden = !ok;
      if (ok) shown++;
    }
    status.textContent = `${shown} case stud${shown === 1 ? "y" : "ies"}${
      q ? ` matching “${q}”` : ""
    }`;
    if (empty) empty.hidden = shown !== 0;
  }

  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      active = chip.dataset.ucFilter;
      chips.forEach((c) =>
        c.setAttribute("aria-pressed", String(c === chip)),
      );
      apply();
    }),
  );

  search?.addEventListener("input", apply);
  apply();
})();
