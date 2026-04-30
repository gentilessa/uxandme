import { matchPrompt } from "./hireGiaMatcher";
import { getAssistantPromptLabels } from "@/lib/taxonomy";

type HireGiaMode = "guide" | "role";
const SESSION_STORAGE_KEY = "hire-gia-session-id";

type StudioElements = {
  input: HTMLTextAreaElement;
  submit: HTMLButtonElement;
  clear: HTMLButtonElement;
  intro: HTMLElement;
  fieldLabel: HTMLElement;
  responseWrap: HTMLElement;
  responseLoading: HTMLElement;
  responseContent: HTMLElement;
  responseHeadline: HTMLElement;
  responseSummary: HTMLElement;
  responseSession: HTMLElement;
  fitWrap: HTMLElement;
  roleFit: HTMLElement;
  worthKnowingWrap: HTMLElement;
  worthKnowing: HTMLElement;
  themesWrap: HTMLElement;
  themesHeading: HTMLElement;
  roleThemes: HTMLElement;
  evidenceHeading: HTMLElement;
  roleEvidence: HTMLElement;
  roleGapsWrap: HTMLElement;
  roleGaps: HTMLElement;
  caveatsWrap: HTMLElement;
  caveats: HTMLElement;
  roleLimits: HTMLElement;
  fullReviewLink: HTMLAnchorElement;
  tryAgain: HTMLButtonElement;
  error: HTMLElement;
  prompts: HTMLElement;
};

type AssistantResult = {
  mode: HireGiaMode;
  title: string;
  headline?: string;
  summary: string;
  detailSummary?: string;
  text?: string;
  fitLabel?: string;
  matchedThemes?: Array<{ label: string; strength: number; reason: string }>;
  evidence?: Array<{
    title: string;
    url: string;
    description?: string;
    evidenceType?: "direct" | "adjacent";
  }>;
  gaps?: string[];
  caveats?: string[];
  worthKnowing?: string;
  visualSnapshot?: { kind: "radar" | "bars"; labels: string[]; values: number[]; max: number };
  nextPages?: Array<{ title: string; url: string; why?: string }>;
  limits?: string;
  queryId?: string;
  sessionId?: string;
  blocked?: boolean;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stripMarkdown(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderRichText(value: string) {
  const safe = escapeHtml(value);
  return safe
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function toPanelSummary(summary: string, headline: string) {
  const cleaned = headline && summary.toLowerCase().startsWith(headline.toLowerCase())
    ? summary.slice(headline.length).trim().replace(/^[\s,:.-]+/, "")
    : summary;

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const compact = sentences.slice(0, 2).join(" ").trim() || cleaned;
  if (compact.length <= 340) return compact;

  return `${compact.slice(0, 337).replace(/\s+\S*$/, "")}…`;
}

const promptMap: Record<HireGiaMode, string[]> = {
  guide: getAssistantPromptLabels(["capability"]).slice(0, 5),
  role: getAssistantPromptLabels(["problem"]),
};

const modeContent: Record<
  HireGiaMode,
  { label: string; placeholder: string; submitLabel: string; intro: string }
> = {
  guide: {
    label: "What would you like to know?",
    placeholder:
      "e.g. What experience does Gia have with design systems, AI-assisted workflows, or complex operational products?",
    submitLabel: "Get Answer",
    intro:
      "Review Gia’s work without digging blindly through the portfolio. Ask about projects, strengths, experience areas, or paste a job description for an evidence-backed fit read.",
  },
  role: {
    label: "What would you like to know?",
    placeholder:
      "Paste a job description, hiring brief, or product/design challenge for an evidence-backed fit review.",
    submitLabel: "Review Fit",
    intro:
      "Review Gia’s work without digging blindly through the portfolio. Ask about projects, strengths, experience areas, or paste a job description for an evidence-backed fit read.",
  },
};

function createEvidenceList(
  items: Array<{
    title: string;
    url: string;
    description?: string;
    evidenceType?: "direct" | "adjacent";
  }>
) {
  const wrap = document.createDocumentFragment();

  const getLinkLabel = (url: string) => {
    if (url.includes("/articles/")) return "View";
    if (url.includes("/about/")) return "View";
    return "View case study";
  };

  items.forEach((item) => {
    const row = document.createElement("article");
    row.className = "assistant-evidence-card";

    const header = document.createElement("div");
    header.className = "assistant-evidence-card__top";

    const title = document.createElement("h3");
    title.textContent = item.title;
    header.appendChild(title);

    const tag = document.createElement("span");
    tag.className = `sl-badge note small assistant-evidence-card__badge assistant-evidence-card__badge--${item.evidenceType || "direct"}`;
    tag.textContent = item.evidenceType === "adjacent" ? "Adjacent" : "Direct";
    header.appendChild(tag);
    row.appendChild(header);

    if (item.description) {
      const description = document.createElement("p");
      description.textContent = item.description;
      row.appendChild(description);
    }

    const link = document.createElement("a");
    link.href = item.url;
    link.className = "assistant-evidence-card__link";
    link.innerHTML = `${getLinkLabel(item.url)} <span aria-hidden="true">›</span>`;
    link.addEventListener("click", () => {
      trackEvent({
        eventType: "response_link_clicked",
        targetUrl: item.url,
        targetLabel: item.title,
      });
    });
    row.appendChild(link);

    wrap.appendChild(row);
  });

  return wrap;
}

function createExploreList(items: Array<{ title: string; url: string; why?: string }>) {
  const wrap = document.createDocumentFragment();

  items.forEach((item) => {
    const row = document.createElement("a");
    row.className = "assistant-article-card";
    row.href = item.url;

    const icon = document.createElement("span");
    icon.className = "assistant-article-card__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "▣";
    row.appendChild(icon);

    const copy = document.createElement("span");
    copy.className = "assistant-article-card__copy";
    const title = document.createElement("span");
    title.className = "assistant-article-card__title";
    title.textContent = item.title;
    copy.appendChild(title);

    if (item.why) {
      const description = document.createElement("span");
      description.className = "assistant-article-card__description";
      description.textContent = item.why;
      copy.appendChild(description);
    }

    row.appendChild(copy);

    const arrow = document.createElement("span");
    arrow.className = "assistant-article-card__arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";
    row.appendChild(arrow);
    row.addEventListener("click", () => {
      trackEvent({
        eventType: "response_link_clicked",
        targetUrl: item.url,
        targetLabel: item.title,
      });
    });
    wrap.appendChild(row);
  });

  return wrap;
}

function createThemeList(items: Array<{ label: string; strength: number; reason: string }>) {
  const wrap = document.createDocumentFragment();

  items.forEach((item) => {
    const row = document.createElement("span");
    row.className = "sl-badge note medium hire-gia-response__theme-badge";
    row.textContent = item.label;
    wrap.appendChild(row);
  });

  return wrap;
}

function createBulletCards(items: string[]) {
  const wrap = document.createDocumentFragment();
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "hire-gia-response__card";
    const body = document.createElement("p");
    body.textContent = item;
    card.appendChild(body);
    wrap.appendChild(card);
  });
  return wrap;
}

function createRadarChart(radar: { labels: string[]; values: number[]; max: number }) {
  const size = 260;
  const center = size / 2;
  const radius = 86;
  const levels = 4;
  const angleStep = (Math.PI * 2) / radar.labels.length;

  const polarPoint = (value: number, index: number, scale = 1) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const distance = radius * scale * (value / radar.max);
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  };

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Fit snapshot radar chart");

  for (let level = 1; level <= levels; level += 1) {
    const ring = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    const points = radar.labels
      .map((_, index) => {
        const point = polarPoint(radar.max, index, level / levels);
        return `${point.x},${point.y}`;
      })
      .join(" ");
    ring.setAttribute("points", points);
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "color-mix(in srgb, var(--sl-color-white) 10%, transparent)");
    ring.setAttribute("stroke-width", "1");
    svg.appendChild(ring);
  }

  radar.labels.forEach((label, index) => {
    const axisPoint = polarPoint(radar.max, index);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", `${center}`);
    line.setAttribute("y1", `${center}`);
    line.setAttribute("x2", `${axisPoint.x}`);
    line.setAttribute("y2", `${axisPoint.y}`);
    line.setAttribute("stroke", "color-mix(in srgb, var(--sl-color-white) 10%, transparent)");
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);

    const textPoint = polarPoint(radar.max, index, 1.18);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", `${textPoint.x}`);
    text.setAttribute("y", `${textPoint.y}`);
    text.setAttribute("fill", "var(--sl-color-gray-3)");
    text.setAttribute("font-size", "10");
    text.setAttribute("text-anchor", "middle");
    text.textContent = label;
    svg.appendChild(text);
  });

  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon.setAttribute(
    "points",
    radar.values
      .map((value, index) => {
        const point = polarPoint(value, index);
        return `${point.x},${point.y}`;
      })
      .join(" ")
  );
  polygon.setAttribute("fill", "color-mix(in srgb, var(--sl-color-accent) 28%, transparent)");
  polygon.setAttribute("stroke", "var(--sl-color-accent)");
  polygon.setAttribute("stroke-width", "2");
  svg.appendChild(polygon);

  return svg;
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

function getSessionId() {
  return window.localStorage.getItem(SESSION_STORAGE_KEY);
}

function trackEvent(payload: Record<string, unknown>) {
  const sessionId = getSessionId();
  if (!sessionId) return;

  void fetch("/api/hire-gia/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      pagePath: window.location.pathname,
      ...payload,
    }),
  });
}

async function resolveResult(
  mode: HireGiaMode,
  prompt: string,
  apiUrl: string,
  selectedPrompts: string[]
) {
  if (apiUrl) {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        prompt,
        selectedPrompts,
        sessionId: getSessionId(),
        pagePath: window.location.pathname,
        locale: navigator.language || document.documentElement.lang || "en-AU",
      }),
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
    intro: root.querySelector<HTMLElement>("[data-hire-gia-intro]"),
    fieldLabel: root.querySelector<HTMLElement>("[data-hire-gia-label]"),
    responseWrap: root.querySelector<HTMLElement>("[data-hire-gia-response]"),
    responseLoading: root.querySelector<HTMLElement>("[data-response-loading]"),
    responseContent: root.querySelector<HTMLElement>("[data-response-content]"),
    responseHeadline: root.querySelector<HTMLElement>("[data-response-headline]"),
    responseSummary: root.querySelector<HTMLElement>("[data-response-summary]"),
    responseSession: root.querySelector<HTMLElement>("[data-response-session]"),
    fitWrap: root.querySelector<HTMLElement>("[data-fit-wrap]"),
    roleFit: root.querySelector<HTMLElement>("[data-role-fit-label]"),
    worthKnowingWrap: root.querySelector<HTMLElement>("[data-worth-knowing-wrap]"),
    worthKnowing: root.querySelector<HTMLElement>("[data-worth-knowing]"),
    themesWrap: root.querySelector<HTMLElement>("[data-themes-wrap]"),
    themesHeading: root.querySelector<HTMLElement>("[data-themes-heading]"),
    roleThemes: root.querySelector<HTMLElement>("[data-role-themes]"),
    evidenceHeading: root.querySelector<HTMLElement>("[data-evidence-heading]"),
    roleEvidence: root.querySelector<HTMLElement>("[data-role-evidence]"),
    roleGapsWrap: root.querySelector<HTMLElement>("[data-role-gaps-wrap]"),
    roleGaps: root.querySelector<HTMLElement>("[data-role-gaps]"),
    caveatsWrap: root.querySelector<HTMLElement>("[data-caveats-wrap]"),
    caveats: root.querySelector<HTMLElement>("[data-caveats]"),
    roleLimits: root.querySelector<HTMLElement>("[data-role-limits]"),
    fullReviewLink: root.querySelector<HTMLAnchorElement>("[data-full-review-link]"),
    tryAgain: root.querySelector<HTMLButtonElement>("[data-try-again]"),
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

function renderResult(elements: StudioElements, result: AssistantResult) {
  elements.responseLoading.hidden = true;
  elements.responseContent.hidden = false;
  const matchedThemes = (result.matchedThemes || [])
    .filter((theme) => hasText(theme.label))
    .map((theme) => ({
      ...theme,
      label: stripMarkdown(theme.label.trim()),
      reason: hasText(theme.reason) ? stripMarkdown(theme.reason.trim()) : theme.reason,
    }));
  const evidenceItems = (result.evidence || []).filter(
    (item) => hasText(item.title) && hasText(item.url) && hasText(item.description)
  ).map((item) => ({
    ...item,
    title: stripMarkdown(item.title.trim()),
    description: hasText(item.description) ? stripMarkdown(item.description.trim()) : item.description,
  }));
  const gaps = (result.gaps || []).filter(hasText).map((item) => stripMarkdown(item.trim()));
  const caveats = (result.caveats || []).filter(hasText).map((item) => stripMarkdown(item.trim()));
  const eyebrow = result.mode === "role" ? "Evidence-backed fit assessment" : "";
  const titleRaw = hasText(result.title) ? result.title.trim() : "";
  const headlineRaw = hasText(result.headline) ? result.headline.trim() : titleRaw;
  const summaryRaw = hasText(result.summary) ? result.summary.trim() : "";
  const headline = stripMarkdown(headlineRaw);
  const panelSummaryRaw = toPanelSummary(summaryRaw, headlineRaw);
  const showHeadline = !!headline;

  elements.responseHeadline.hidden = !showHeadline;
  elements.responseHeadline.innerHTML = showHeadline ? renderRichText(headlineRaw) : "";
  elements.responseSummary.innerHTML = renderRichText(panelSummaryRaw);

  elements.fitWrap.hidden = !result.fitLabel;
  if (result.fitLabel) {
    elements.roleFit.classList.remove("success", "caution", "tip");
    elements.roleFit.classList.add(
      result.fitLabel === "Strong"
        ? "success"
        : result.fitLabel === "Moderate"
          ? "caution"
          : "tip"
    );
    elements.roleFit.textContent = `${result.fitLabel} match`;
  } else {
    elements.roleFit.classList.remove("success", "caution", "tip");
    elements.roleFit.textContent = "";
  }

  elements.worthKnowingWrap.hidden = !hasText(result.worthKnowing);
  elements.worthKnowing.textContent = hasText(result.worthKnowing) ? stripMarkdown(result.worthKnowing) : "";

  elements.themesHeading.textContent =
    result.mode === "role" ? "Strategic alignment" : "Connected strengths";
  elements.themesWrap.hidden = !matchedThemes.length;
  elements.roleThemes.innerHTML = "";
  if (matchedThemes.length) {
    elements.roleThemes.appendChild(createThemeList(matchedThemes));
  }

  elements.evidenceHeading.textContent =
    result.mode === "role" ? "Supporting evidence" : "Strongest evidence";
  elements.roleEvidence.parentElement?.toggleAttribute("hidden", !evidenceItems.length);
  elements.roleEvidence.innerHTML = "";
  if (evidenceItems.length) {
    elements.roleEvidence.appendChild(createEvidenceList(evidenceItems));
  }

  elements.roleGapsWrap.hidden = !(result.mode === "role" && gaps.length);
  elements.roleGaps.innerHTML = "";
  if (result.mode === "role" && gaps.length) {
    elements.roleGaps.appendChild(createBulletCards(gaps));
  }

  elements.caveatsWrap.hidden = !caveats.length;
  elements.caveats.innerHTML = "";
  if (caveats.length) {
    const list = document.createElement("div");
    list.className = "hire-gia-response__stack";
    caveats.forEach((caveat) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = caveat;
      list.appendChild(paragraph);
    });
    elements.caveats.appendChild(list);
  }

  elements.roleLimits.hidden = !result.limits;
  elements.roleLimits.textContent = result.limits ? stripMarkdown(result.limits) : "";
}

function initStudio(root: HTMLElement) {
  const elements = getElements(root);
  if (!elements) return;

  const bootstrap = JSON.parse(root.getAttribute("data-bootstrap") || "{}") as { apiUrl?: string };
  const tabs = root.querySelectorAll<HTMLElement>("[data-mode]");

  let mode: HireGiaMode = "guide";
  let selectedPrompts: string[] = [];

  const syncModeUi = () => {
    const copy = modeContent[mode];
    root.dataset.mode = mode;
    elements.input.placeholder = copy.placeholder;
    elements.submit.textContent = copy.submitLabel;
    elements.fieldLabel.textContent = copy.label;
    elements.intro.textContent = copy.intro;
  };

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
    trackEvent({
      eventType: "prompt_chip_clicked",
      targetLabel: prompt,
      mode,
      metadata: { selected: selectedPrompts.includes(prompt) },
    });
  };

  const resetResults = () => {
    root.dataset.hasResult = "false";
    elements.responseWrap.hidden = true;
    elements.responseLoading.hidden = true;
    elements.responseContent.hidden = false;
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      mode = (tab.getAttribute("data-mode") as HireGiaMode) || "guide";
      selectedPrompts = [];
      syncTabs();
      setPromptChips(elements.prompts, mode, selectedPrompts, togglePrompt);
      syncModeUi();
      trackEvent({
        eventType: "tab_changed",
        mode,
      });
    });
  });

  syncTabs();
  setPromptChips(elements.prompts, mode, selectedPrompts, togglePrompt);
  syncModeUi();
  resetResults();

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
    elements.submit.textContent = "Generating…";

    try {
      const finalPrompt = composePrompt(mode, prompt, selectedPrompts);
      const result = (await resolveResult(
        mode,
        finalPrompt,
        bootstrap.apiUrl || "",
        selectedPrompts
      )) as AssistantResult;

      if (result.sessionId) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, result.sessionId);
      }

      root.dataset.hasResult = "true";
      elements.responseWrap.hidden = false;
      elements.responseLoading.hidden = false;
      elements.responseContent.hidden = true;
      if (result.sessionId) {
        elements.responseSession.hidden = false;
        elements.responseSession.textContent = "Saved result";
      } else {
        elements.responseSession.hidden = true;
      }
      renderResult(elements, result);

      if (result.queryId) {
        elements.fullReviewLink.hidden = false;
        elements.fullReviewLink.href = `/assistant/review/${result.queryId}/`;
      } else {
        elements.fullReviewLink.hidden = true;
      }
    } catch (error) {
      elements.responseLoading.hidden = true;
      elements.responseContent.hidden = false;
      elements.error.hidden = false;
      elements.error.textContent =
        error instanceof Error ? error.message : "Something went wrong while generating the answer.";
    } finally {
      elements.submit.removeAttribute("disabled");
      elements.submit.textContent = modeContent[mode].submitLabel;
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
    trackEvent({
      eventType: "query_cleared",
      mode,
    });
    elements.input.focus();
  });

  elements.tryAgain.addEventListener("click", () => {
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
