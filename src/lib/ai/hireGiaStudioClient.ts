import { matchPrompt } from "./hireGiaMatcher";
import { getAssistantPromptLabels } from "@/lib/taxonomy";

type HireGiaMode = "guide" | "role";

type StudioElements = {
  input: HTMLTextAreaElement;
  submit: HTMLButtonElement;
  clear: HTMLButtonElement;
  responseWrap: HTMLElement;
  responseTitle: HTMLElement;
  guideWrap: HTMLElement;
  guideIntro: HTMLElement;
  guideEvidence: HTMLElement;
  guideNextPages: HTMLElement;
  guideLimitsWrap: HTMLElement;
  guideLimits: HTMLElement;
  roleWrap: HTMLElement;
  roleFit: HTMLElement;
  roleIntro: HTMLElement;
  roleThemesWrap: HTMLElement;
  roleThemes: HTMLElement;
  roleEvidence: HTMLElement;
  roleGapsWrap: HTMLElement;
  roleGaps: HTMLElement;
  roleNextPages: HTMLElement;
  roleLimitsWrap: HTMLElement;
  roleLimits: HTMLElement;
  error: HTMLElement;
  prompts: HTMLElement;
};

const promptMap: Record<HireGiaMode, string[]> = {
  guide: getAssistantPromptLabels(["capability"]),
  role: getAssistantPromptLabels(["problem"]),
};

function createEvidenceList(items: Array<{ title: string; url: string; description?: string }>) {
  const wrap = document.createElement("div");
  wrap.className = "hire-gia-response__list";
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "hire-gia-response__item";
    const link = document.createElement("a");
    link.href = item.url;
    link.textContent = item.title;
    row.appendChild(link);

    if (item.description) {
      const description = document.createElement("p");
      description.textContent = item.description;
      row.appendChild(description);
    }

    wrap.appendChild(row);
  });
  return wrap;
}

function createExploreList(items: Array<{ title: string; url: string }>) {
  const wrap = document.createElement("div");
  wrap.className = "hire-gia-response__list";
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "hire-gia-response__item";
    const link = document.createElement("a");
    link.href = item.url;
    link.textContent = item.title;
    row.appendChild(link);
    wrap.appendChild(row);
  });
  return wrap;
}

function applyChipSelection(prompts: HTMLElement, selectedPrompts: string[]) {
  prompts.querySelectorAll<HTMLButtonElement>("[data-prompt]").forEach((button) => {
    const prompt = button.getAttribute("data-prompt") || "";
    const isSelected = selectedPrompts.includes(prompt);
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
}

function composePrompt(mode: HireGiaMode, prompt: string, selectedPrompts: string[]) {
  if (!selectedPrompts.length) return prompt;

  const phrase = selectedPrompts.join(", ");
  if (mode === "role") return `${prompt}\n\nPay special attention to: ${phrase}.`;
  return `${prompt}\n\nFocus on: ${phrase}.`;
}

async function resolveResult(mode: HireGiaMode, prompt: string, apiUrl: string) {
  if (apiUrl) {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, prompt }),
    });

    if (!response.ok) {
      throw new Error(
        "The assistant couldn’t reach the API. Falling back to local matching may be safer for now."
      );
    }

    return await response.json();
  }

  return matchPrompt(mode, prompt);
}

function getElements(root: HTMLElement): StudioElements | null {
  const elements = {
    input: root.querySelector<HTMLTextAreaElement>("[data-hire-gia-input]"),
    submit: root.querySelector<HTMLButtonElement>("[data-hire-gia-submit]"),
    clear: root.querySelector<HTMLButtonElement>("[data-hire-gia-clear]"),
    responseWrap: root.querySelector<HTMLElement>("[data-hire-gia-response]"),
    responseTitle: root.querySelector<HTMLElement>("[data-response-title]"),
    guideWrap: root.querySelector<HTMLElement>("[data-guide-response]"),
    guideIntro: root.querySelector<HTMLElement>("[data-guide-intro]"),
    guideEvidence: root.querySelector<HTMLElement>("[data-guide-evidence]"),
    guideNextPages: root.querySelector<HTMLElement>("[data-guide-next-pages]"),
    guideLimitsWrap: root.querySelector<HTMLElement>("[data-guide-limits-wrap]"),
    guideLimits: root.querySelector<HTMLElement>("[data-guide-limits]"),
    roleWrap: root.querySelector<HTMLElement>("[data-role-response]"),
    roleFit: root.querySelector<HTMLElement>("[data-role-fit-label]"),
    roleIntro: root.querySelector<HTMLElement>("[data-role-intro]"),
    roleThemesWrap: root.querySelector<HTMLElement>("[data-role-themes-wrap]"),
    roleThemes: root.querySelector<HTMLElement>("[data-role-themes]"),
    roleEvidence: root.querySelector<HTMLElement>("[data-role-evidence]"),
    roleGapsWrap: root.querySelector<HTMLElement>("[data-role-gaps-wrap]"),
    roleGaps: root.querySelector<HTMLElement>("[data-role-gaps]"),
    roleNextPages: root.querySelector<HTMLElement>("[data-role-next-pages]"),
    roleLimitsWrap: root.querySelector<HTMLElement>("[data-role-limits-wrap]"),
    roleLimits: root.querySelector<HTMLElement>("[data-role-limits]"),
    error: root.querySelector<HTMLElement>("[data-hire-gia-error]"),
    prompts: root.querySelector<HTMLElement>("[data-hire-gia-prompts]"),
  };

  return Object.values(elements).every(Boolean) ? (elements as StudioElements) : null;
}

function setPromptChips(
  prompts: HTMLElement,
  mode: HireGiaMode,
  selectedPrompts: string[],
  onToggle: (prompt: string) => void
) {
  prompts.innerHTML = "";

  promptMap[mode].forEach((text) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hire-gia-studio__chip";
    button.dataset.prompt = text;
    button.textContent = text;
    button.addEventListener("click", () => onToggle(text));
    prompts.appendChild(button);
  });

  applyChipSelection(prompts, selectedPrompts);
}

function renderGuide(elements: StudioElements, result: any) {
  elements.guideWrap.hidden = false;
  elements.guideIntro.textContent = result.intro;
  elements.guideEvidence.innerHTML = "";
  elements.guideEvidence.appendChild(createEvidenceList(result.evidence || []));
  elements.guideNextPages.innerHTML = "";
  elements.guideNextPages.appendChild(createExploreList(result.nextPages || []));
  elements.guideLimitsWrap.hidden = !result.limits;
  elements.guideLimits.textContent = result.limits || "";
}

function renderRole(elements: StudioElements, result: any) {
  elements.roleWrap.hidden = false;
  elements.roleFit.textContent = result.fitLabel;
  elements.roleIntro.textContent = result.intro;

  elements.roleThemes.innerHTML = "";
  (result.matchedThemes || []).forEach((theme: string) => {
    const chip = document.createElement("span");
    chip.className = "hire-gia-response__chip";
    chip.textContent = theme;
    elements.roleThemes.appendChild(chip);
  });
  elements.roleThemesWrap.hidden = !(result.matchedThemes || []).length;

  elements.roleEvidence.innerHTML = "";
  elements.roleEvidence.appendChild(createEvidenceList(result.evidence || []));

  elements.roleGaps.innerHTML = "";
  (result.gaps || []).forEach((gap: string) => {
    const li = document.createElement("li");
    li.textContent = gap;
    elements.roleGaps.appendChild(li);
  });
  elements.roleGapsWrap.hidden = !(result.gaps || []).length;

  elements.roleNextPages.innerHTML = "";
  elements.roleNextPages.appendChild(createExploreList(result.nextPages || []));
  elements.roleLimitsWrap.hidden = !result.limits;
  elements.roleLimits.textContent = result.limits || "";
}

function initStudio(root: HTMLElement) {
  const elements = getElements(root);
  if (!elements) return;

  const bootstrap = JSON.parse(root.getAttribute("data-bootstrap") || "{}") as { apiUrl?: string };
  const tabs = root.querySelectorAll<HTMLElement>("[data-mode]");

  let mode: HireGiaMode = "guide";
  let selectedPrompts: string[] = [];

  const syncTabs = () => {
    tabs.forEach((tab) => {
      const active = (tab.getAttribute("data-mode") || "guide") === mode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
  };

  const togglePrompt = (prompt: string) => {
    if (selectedPrompts.includes(prompt)) {
      selectedPrompts = selectedPrompts.filter((item) => item !== prompt);
    } else {
      selectedPrompts = [...selectedPrompts, prompt];
    }

    applyChipSelection(elements.prompts, selectedPrompts);
  };

  const resetResults = () => {
    elements.responseWrap.hidden = true;
    elements.guideWrap.hidden = true;
    elements.roleWrap.hidden = true;
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      mode = (tab.getAttribute("data-mode") as HireGiaMode) || "guide";
      selectedPrompts = [];
      syncTabs();
      setPromptChips(elements.prompts, mode, selectedPrompts, togglePrompt);
    });
  });

  syncTabs();
  setPromptChips(elements.prompts, mode, selectedPrompts, togglePrompt);

  const handleSubmit = async () => {
    const prompt = elements.input.value.trim();
    elements.error.hidden = true;
    elements.error.textContent = "";

    if (!prompt) {
      elements.error.hidden = false;
      elements.error.textContent =
        "Add a question or role brief first so the assistant has something concrete to respond to.";
      return;
    }

    elements.submit.setAttribute("disabled", "disabled");
    elements.submit.textContent = "Generating...";

    try {
      const finalPrompt = composePrompt(mode, prompt, selectedPrompts);
      const result = await resolveResult(mode, finalPrompt, bootstrap.apiUrl || "");

      elements.responseWrap.hidden = false;
      elements.guideWrap.hidden = true;
      elements.roleWrap.hidden = true;
      elements.responseTitle.textContent = result.title;

      if (result.mode === "guide") {
        renderGuide(elements, result);
      } else {
        renderRole(elements, result);
      }
    } catch (error) {
      elements.error.hidden = false;
      elements.error.textContent =
        error instanceof Error ? error.message : "Something went wrong while generating the answer.";
    } finally {
      elements.submit.removeAttribute("disabled");
      elements.submit.textContent = "Generate answer";
    }
  };

  elements.submit.addEventListener("click", handleSubmit);
  elements.input.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") handleSubmit();
  });

  elements.clear.addEventListener("click", () => {
    elements.input.value = "";
    selectedPrompts = [];
    applyChipSelection(elements.prompts, selectedPrompts);
    elements.error.hidden = true;
    elements.error.textContent = "";
    resetResults();
    elements.input.focus();
  });
}

export function initHireGiaStudios() {
  document.querySelectorAll<HTMLElement>("[data-hire-gia-studio]").forEach(initStudio);
}
