document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document
      .querySelectorAll("[data-filter]")
      .forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
    let count = 0;
    document.querySelectorAll(".case").forEach((card) => {
      card.hidden =
        button.dataset.filter !== "all" &&
        !card.dataset.tags.split(" ").includes(button.dataset.filter);
      if (!card.hidden) count++;
    });
    document.getElementById("filterStatus").textContent =
      `${count} ${count === 1 ? "engagement" : "engagements"} shown`;
  });
});
const copyButton = document.getElementById("copyEmail");
let copyTimeout;
copyButton?.addEventListener("click", async () => {
  const status = document.getElementById("copyStatus");
  clearTimeout(copyTimeout);
  try {
    await navigator.clipboard.writeText("anupojuprudhvi@gmail.com");
    status.textContent = "Email address copied.";
    copyTimeout = setTimeout(() => {
      status.textContent = "";
    }, 4000);
  } catch {
    status.textContent = "Please select and copy the email address above.";
  }
});
