export function initHireGiaLauncher() {
  const launcherRoot = document.querySelector<HTMLElement>("[data-hire-gia-launcher]");
  if (!launcherRoot) return;

  const openButton = launcherRoot.querySelector<HTMLButtonElement>("[data-hire-gia-open]");
  const closeButton = launcherRoot.querySelector<HTMLButtonElement>("[data-hire-gia-close]");
  const overlay = launcherRoot.querySelector<HTMLElement>("[data-hire-gia-overlay]");
  const sheet = launcherRoot.querySelector<HTMLElement>("[data-hire-gia-sheet]");

  if (!openButton || !closeButton || !overlay || !sheet) return;

  const openSheet = () => {
    sheet.classList.add("is-open");
    overlay.removeAttribute("hidden");
    sheet.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
  };

  const closeSheet = () => {
    sheet.classList.remove("is-open");
    overlay.setAttribute("hidden", "");
    sheet.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
  };

  openButton.addEventListener("click", openSheet);
  closeButton.addEventListener("click", closeSheet);
  overlay.addEventListener("click", closeSheet);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sheet.classList.contains("is-open")) {
      closeSheet();
    }
  });
}

