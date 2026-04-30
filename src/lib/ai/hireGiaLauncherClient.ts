const SESSION_STORAGE_KEY = "hire-gia-session-id";

function getPagePath() {
  return window.location.pathname;
}

async function syncSession(action: "start" | "end") {
  const sessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);

  const response = await fetch("/api/hire-gia/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      sessionId,
      pagePath: getPagePath(),
      locale: navigator.language || document.documentElement.lang || "en-AU",
    }),
  });

  if (!response.ok) return;

  const payload = (await response.json()) as { sessionId?: string };
  if (action === "start" && payload.sessionId) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, payload.sessionId);
  }
}

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
    void syncSession("start");
  };

  const closeSheet = () => {
    sheet.classList.remove("is-open");
    overlay.setAttribute("hidden", "");
    sheet.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    void syncSession("end");
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
