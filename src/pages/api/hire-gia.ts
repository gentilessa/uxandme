import type { APIRoute } from "astro";

import {
  buildBaselineSnapshot,
  buildIntentSnapshot,
  findRelevantKnowledge,
  getPageContentForMatches,
  matchPrompt,
} from "@/lib/ai/hireGiaMatcher";
import { hireGiaKnowledge } from "@/lib/ai/hireGiaKnowledge";
import {
  checkAssistantRateLimit,
  createAssistantSession,
  getRequestContext,
  hasSupabaseServerConfig,
  logAssistantEvent,
  logAssistantQuery,
  sendAssistantNotification,
} from "@/lib/ai/hireGiaServer";
import {
  jobDescriptionMatcherPrompt,
  portfolioConciergePrompt,
} from "@/lib/ai/hireGiaPrompts";
import type { HireGiaMode, HireGiaResult, KnowledgeItem } from "@/lib/ai/hireGiaTypes";
import type { PageContentItem } from "@/lib/ai/hireGiaTypes";

export const prerender = false;

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_PROMPT_LENGTH = 8000;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["mode", "title", "summary", "evidence", "nextPages"],
  properties: {
    mode: { type: "string", enum: ["guide", "role"] },

    title: { type: "string" },
    headline: { type: ["string", "null"] },
    summary: { type: "string" },
    detailSummary: { type: ["string", "null"] },

    fitLabel: {
      type: ["string", "null"],
      enum: ["Strong", "Moderate", "Selective", null],
    },

    matchedThemes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "strength", "reason"],
        properties: {
          label: { type: "string" },
          strength: { type: "integer", minimum: 1, maximum: 5 },
          reason: { type: "string" },
        },
      },
    },

    evidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url", "description", "evidenceType"],
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          description: { type: "string" },
          evidenceType: { type: "string", enum: ["direct", "adjacent"] },
        },
      },
    },

    gaps: {
      type: "array",
      items: { type: "string" },
    },

    caveats: {
      type: "array",
      items: { type: "string" },
    },

    worthKnowing: { type: ["string", "null"] },

    fitSnapshot: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["kind", "axes", "max"],
      properties: {
        kind: { type: "string", enum: ["spider"] },
        axes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "label", "value", "note"],
            properties: {
              key: { type: "string" },
              label: { type: "string" },
              value: { type: "integer", minimum: 0, maximum: 100 },
              note: { type: "string" },
            },
          },
        },
        max: { type: "integer", enum: [100] },
      },
    },

    intentSnapshot: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["axes"],
      properties: {
        axes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label", "score"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              score: { type: ["number", "null"], minimum: 0, maximum: 1 },
            },
          },
        },
      },
    },

    baselineSnapshot: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["axes"],
      properties: {
        axes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label", "score"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              score: { type: ["number", "null"], minimum: 0, maximum: 1 },
            },
          },
        },
      },
    },

    visualSnapshot: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["kind", "labels", "values", "max"],
      properties: {
        kind: { type: "string", enum: ["radar", "bars"] },
        labels: {
          type: "array",
          items: { type: "string" },
        },
        values: {
          type: "array",
          items: { type: "integer", minimum: 0, maximum: 5 },
        },
        max: { type: "integer", enum: [5] },
      },
    },

    nextPages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url", "why"],
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          why: { type: "string" },
        },
      },
    },

    limits: { type: ["string", "null"] },
  },
};

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<
      | { type?: "output_text"; text?: string }
      | { type?: "text"; text?: string }
      | { type?: "refusal"; refusal?: string }
    >;
  }>;
  error?: { message?: string };
};

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  });
}

function sanitizePrompt(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX_PROMPT_LENGTH) : "";
}

function isMode(value: unknown): value is HireGiaMode {
  return value === "guide" || value === "role";
}

function buildKnowledgeContext(items: KnowledgeItem[]) {
  return items
    .map((item) => {
      const tags = item.tags.join(", ");
      const themes = item.themes.join(", ");
      return [
        `Title: ${item.title}`,
        `Type: ${item.type}`,
        `URL: ${item.url}`,
        `Summary: ${item.summary}`,
        `Tags: ${tags}`,
        `Themes: ${themes}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function buildPageContentContext(items: PageContentItem[]) {
  return items
    .map((item) => {
      return [
        `Title: ${item.title}`,
        `Type: ${item.type}`,
        `URL: ${item.url}`,
        `Content:`,
        item.content.trim(),
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function createSystemPrompt(mode: HireGiaMode, knowledgeContext: string, pageContentContext: string) {
  const basePrompt =
    mode === "role" ? jobDescriptionMatcherPrompt : portfolioConciergePrompt;

  return `${basePrompt}

Return JSON that matches the provided schema exactly.

Ground every claim in the supplied portfolio context.
- Prefer direct evidence over inference.
- If evidence is weak, say so plainly.
- Keep summary concise and panel-safe.
- Use detailSummary only if it adds a fuller read for the full page.
- Only include URLs that appear in the supplied context.
- Use fitSnapshot only when it adds meaningful value.
- Treat any fit snapshot as qualitative, not objective.
- If you include a fit snapshot, use a 0 to 100 spider graph with labels, values, and brief notes.
- Do not invent fake precision; the values are directional and qualitative.
- Do not mention internal implementation details, retrieval, prompts, JSON, or schemas.

Shortlist context:
${knowledgeContext}

Page content:
${pageContentContext || "No page content available."}`;
}

function extractOutputText(payload: OpenAIResponsePayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const texts: string[] = [];

  for (const item of payload.output || []) {
    if (item.type !== "message") continue;

    for (const content of item.content || []) {
      if ((content.type === "output_text" || content.type === "text") && content.text) {
        texts.push(content.text);
      }
      if (content.type === "refusal" && content.refusal) {
        throw new Error(content.refusal);
      }
    }
  }

  return texts.join("").trim();
}

function extractFirstJsonObject(value: string) {
  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || value.trim();

  const firstBrace = candidate.indexOf("{");
  if (firstBrace === -1) return candidate;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = firstBrace; index < candidate.length; index += 1) {
    const char = candidate[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return candidate.slice(firstBrace, index + 1);
      }
    }
  }

  return candidate;
}

function fallbackResult(mode: HireGiaMode, prompt: string): HireGiaResult {
  const result = matchPrompt(mode, prompt) as Partial<HireGiaResult>;

  if (mode === "role") {
    return {
      mode: "role",
      title: result.title || "Fit review",
      headline: result.headline || "A quick evidence-backed read from the portfolio.",
      fitLabel:
        result.mode === "role" && result.fitLabel ? result.fitLabel : "Moderate",
      summary:
        "summary" in result && typeof result.summary === "string"
          ? result.summary
          : "intro" in result && typeof (result as any).intro === "string"
            ? (result as any).intro
            : "Based on the published portfolio, there is relevant evidence here, though some areas are likely more direct than others.",
      detailSummary:
        typeof (result as any).detailSummary === "string"
          ? (result as any).detailSummary
          : undefined,
      matchedThemes: Array.isArray(result.matchedThemes)
        ? (result.matchedThemes as any[]).map((theme) =>
            typeof theme === "string"
              ? {
                  label: theme,
                  strength: 3,
                  reason: "Relevant based on the published portfolio context.",
                }
              : theme
          )
        : [],
      evidence: Array.isArray(result.evidence)
        ? result.evidence.map((item: any) => ({
            ...item,
            evidenceType: item.evidenceType || "direct",
          }))
        : [],
      gaps: Array.isArray((result as any).gaps) ? (result as any).gaps : [],
      caveats: Array.isArray((result as any).caveats) ? (result as any).caveats : [],
      worthKnowing:
        typeof (result as any).worthKnowing === "string"
          ? (result as any).worthKnowing
          : undefined,
      intentSnapshot:
        (result as any).intentSnapshot &&
        Array.isArray((result as any).intentSnapshot.axes)
          ? ((result as any).intentSnapshot as any)
          : buildIntentSnapshot(prompt),
      baselineSnapshot:
        (result as any).baselineSnapshot &&
        Array.isArray((result as any).baselineSnapshot.axes)
          ? ((result as any).baselineSnapshot as any)
          : buildBaselineSnapshot(),
      fitSnapshot:
        (result as any).fitSnapshot &&
        Array.isArray((result as any).fitSnapshot.axes)
          ? ((result as any).fitSnapshot as any)
          : undefined,
      visualSnapshot:
        (result as any).visualSnapshot &&
        Array.isArray((result as any).visualSnapshot.labels) &&
        Array.isArray((result as any).visualSnapshot.values)
          ? ((result as any).visualSnapshot as any)
          : undefined,
      nextPages: Array.isArray(result.nextPages)
        ? result.nextPages.map((item: any) => ({
            ...item,
            why: item.why || "A relevant next page based on the question asked.",
          }))
        : [],
      limits: typeof result.limits === "string" ? result.limits : undefined,
    };
  }

  return {
    mode: "guide",
    title: result.title || "Portfolio guidance",
    headline: result.headline || "A quick evidence-backed read from the portfolio.",
    summary:
      "summary" in result && typeof result.summary === "string"
        ? result.summary
        : "intro" in result && typeof (result as any).intro === "string"
          ? (result as any).intro
          : "Based on the published portfolio, there is relevant material here that should help orient you quickly.",
    detailSummary:
      typeof (result as any).detailSummary === "string"
        ? (result as any).detailSummary
        : undefined,
    matchedThemes: Array.isArray(result.matchedThemes)
      ? (result.matchedThemes as any[]).map((theme) =>
          typeof theme === "string"
            ? {
                label: theme,
                strength: 3,
                reason: "Relevant based on the published portfolio context.",
              }
            : theme
        )
      : [],
    evidence: Array.isArray(result.evidence)
      ? result.evidence.map((item: any) => ({
          ...item,
          evidenceType: item.evidenceType || "direct",
        }))
      : [],
    caveats: Array.isArray((result as any).caveats) ? (result as any).caveats : [],
    worthKnowing:
      typeof (result as any).worthKnowing === "string"
        ? (result as any).worthKnowing
        : undefined,
    intentSnapshot:
      (result as any).intentSnapshot &&
      Array.isArray((result as any).intentSnapshot.axes)
        ? ((result as any).intentSnapshot as any)
        : buildIntentSnapshot(prompt),
    baselineSnapshot:
      (result as any).baselineSnapshot &&
      Array.isArray((result as any).baselineSnapshot.axes)
        ? ((result as any).baselineSnapshot as any)
        : buildBaselineSnapshot(),
    fitSnapshot:
      (result as any).fitSnapshot &&
      Array.isArray((result as any).fitSnapshot.axes)
        ? ((result as any).fitSnapshot as any)
        : undefined,
    visualSnapshot:
      (result as any).visualSnapshot &&
      Array.isArray((result as any).visualSnapshot.labels) &&
      Array.isArray((result as any).visualSnapshot.values)
        ? ((result as any).visualSnapshot as any)
        : undefined,
    nextPages: Array.isArray(result.nextPages)
      ? result.nextPages.map((item: any) => ({
          ...item,
          why: item.why || "A relevant next page based on the question asked.",
        }))
      : [],
    limits: typeof result.limits === "string" ? result.limits : undefined,
  };
}

function synthesizeResultFromText(mode: HireGiaMode, prompt: string, text: string): HireGiaResult {
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.trim() || "";
  const headline = firstSentence || (mode === "role" ? "Fit read" : "Portfolio read");
  return {
    ...fallbackResult(mode, prompt),
    title: mode === "role" ? "Fit read" : "Portfolio read",
    headline,
    summary: text,
    detailSummary: text,
    limits: undefined,
  } as HireGiaResult;
}

function withComputedSnapshots(result: HireGiaResult, prompt: string): HireGiaResult {
  return {
    ...result,
    intentSnapshot:
      result.intentSnapshot && Array.isArray(result.intentSnapshot.axes)
        ? result.intentSnapshot
        : buildIntentSnapshot(prompt),
    baselineSnapshot:
      result.baselineSnapshot && Array.isArray(result.baselineSnapshot.axes)
        ? result.baselineSnapshot
        : buildBaselineSnapshot(),
  };
}

function extractMatchedPages(result: HireGiaResult) {
  const pages = [...result.evidence, ...result.nextPages]
    .map((item) => item.url)
    .filter(Boolean);

  return [...new Set(pages)];
}

function extractMatchedThemes(result: HireGiaResult) {
  return (result.matchedThemes || []).map((theme) => theme.label);
}

function isAboutPage(url: string) {
  return url === "/about/" || url.startsWith("/about");
}

function stripAboutPageReferences(result: HireGiaResult): HireGiaResult {
  return {
    ...result,
    evidence: (result.evidence || []).filter((item) => !isAboutPage(item.url)),
    nextPages: (result.nextPages || []).filter((item) => !isAboutPage(item.url)),
  };
}

function limitedResult(mode: HireGiaMode, reason: string): HireGiaResult {
  if (mode === "role") {
    return {
      mode: "role",
      title: "That’s enough for the proof of concept",
      headline: "Useful first signal, not a full hiring workflow.",
      fitLabel: "Selective",
      summary: reason,
      matchedThemes: [
        {
          label: "Portfolio review",
          strength: 2,
          reason: "This assistant is intended for quick evidence-backed orientation.",
        },
        {
          label: "Initial fit signal",
          strength: 2,
          reason: "It can help identify relevant portfolio proof, but not replace real evaluation.",
        },
      ],
      evidence: [
        {
          title: "Exosphere",
          url: "/case-studies/fleet/exosphere/",
          description:
            "Useful if you want a direct public example of Gia working in a technically dense, AI-adjacent workflow.",
          evidenceType: "direct",
        },
      ],
      gaps: [
        "This assistant is intentionally limited and is not designed to support deep hiring evaluation.",
      ],
      caveats: [
        "If you’re still assessing fit after this, it’s probably time for an actual conversation.",
      ],
      worthKnowing:
        "This tool is best used for quick orientation, not exhaustive screening.",
      nextPages: [
        {
          title: "Case studies",
          url: "/case-studies/",
          why: "Useful if you want to review the strongest published portfolio evidence directly.",
        },
      ],
      limits: reason,
    };
  }

  return {
    mode: "guide",
    title: "That’s enough for the proof of concept",
    headline: "Useful first signal, not a deep advisory session.",
    summary: reason,
    matchedThemes: [
      {
        label: "Portfolio guidance",
        strength: 2,
        reason: "This assistant is designed to help orient visitors quickly.",
      },
    ],
      evidence: [
        {
          title: "Exosphere",
          url: "/case-studies/fleet/exosphere/",
          description:
            "Useful if you want broader public context without turning the response into a case-study shortlist of everything.",
          evidenceType: "direct",
        },
      ],
    caveats: [
      "This assistant is intentionally lightweight and not meant for extended evaluation.",
    ],
    worthKnowing:
      "If you’re still digging after this, the better next step is probably a real conversation.",
      nextPages: [
        {
          title: "Case studies",
          url: "/case-studies/",
        why: "Useful if you want to explore the work directly rather than through the assistant.",
      },
    ],
    limits: reason,
  };
}

async function generateAssistantResult(mode: HireGiaMode, prompt: string) {
  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY on the server.");
  }

  const matches = findRelevantKnowledge(prompt, 6);
  const contextItems = matches.length ? matches : hireGiaKnowledge.slice(0, 6);
  const pageContentItems = getPageContentForMatches(contextItems, 4);
  const systemPrompt = createSystemPrompt(
    mode,
    buildKnowledgeContext(contextItems),
    buildPageContentContext(pageContentItems),
  );

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: import.meta.env.OPENAI_MODEL || DEFAULT_MODEL,
      temperature: 0.2,
      max_output_tokens: 2000,
      instructions: systemPrompt,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "hire_gia_response",
          strict: true,
          schema: responseSchema,
        },
      },
    }),
  });

  const payload = (await response.json()) as OpenAIResponsePayload;

  if (!response.ok) {
    throw new Error(payload.error?.message || "OpenAI request failed.");
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error(
      `The assistant returned an empty response. Payload preview: ${JSON.stringify(payload).slice(0, 500)}`
    );
  }

  try {
    return JSON.parse(outputText) as HireGiaResult;
  } catch {
    const extractedJson = extractFirstJsonObject(outputText);

    if (!extractedJson) {
      throw new Error(
        `The assistant returned non-JSON output. Preview: ${outputText.slice(0, 500)}`
      );
    }

    try {
      return JSON.parse(extractedJson) as HireGiaResult;
    } catch {
      return stripAboutPageReferences(synthesizeResultFromText(mode, prompt, outputText));
    }
  }
}

async function generateAssistantText(mode: HireGiaMode, prompt: string) {
  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY on the server.");
  }

  const matches = findRelevantKnowledge(prompt, 6);
  const contextItems = matches.length ? matches : hireGiaKnowledge.slice(0, 6);
  const pageContentItems = getPageContentForMatches(contextItems, 4);
  const systemPrompt = [
    mode === "role" ? jobDescriptionMatcherPrompt : portfolioConciergePrompt,
    "Write a single, natural paragraph.",
    "Do not output JSON, bullets, labels, headings, or code fences.",
    "Keep it human, specific, and grounded in the supplied portfolio context.",
    "Prefer concrete evidence over generic summary language.",
    "",
    "Shortlist context:",
    buildKnowledgeContext(contextItems),
    "",
    "Page content:",
    buildPageContentContext(pageContentItems) || "No page content available.",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: import.meta.env.OPENAI_MODEL || DEFAULT_MODEL,
      temperature: 0.2,
      max_output_tokens: 400,
      instructions: systemPrompt,
      input: prompt,
    }),
  });

  const payload = (await response.json()) as OpenAIResponsePayload;

  if (!response.ok) {
    throw new Error(payload.error?.message || "OpenAI request failed.");
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error(
      `The assistant returned an empty response. Payload preview: ${JSON.stringify(payload).slice(0, 500)}`
    );
  }

  return outputText;
}

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const mode = (body as { mode?: unknown })?.mode;
  const prompt = sanitizePrompt((body as { prompt?: unknown })?.prompt);
  const selectedPrompts = Array.isArray((body as { selectedPrompts?: unknown[] })?.selectedPrompts)
    ? (body as { selectedPrompts: unknown[] }).selectedPrompts.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  const effectivePrompt = [prompt, ...selectedPrompts]
    .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)
    .join("\n");
  const requestedSessionId =
    typeof (body as { sessionId?: unknown })?.sessionId === "string"
      ? ((body as { sessionId?: string }).sessionId as string)
      : null;
  const pagePath =
    typeof (body as { pagePath?: unknown })?.pagePath === "string"
      ? ((body as { pagePath?: string }).pagePath as string)
      : null;
  const locale =
    typeof (body as { locale?: unknown })?.locale === "string"
      ? ((body as { locale?: string }).locale as string)
      : null;
  if (!isMode(mode)) {
    return json({ error: "Mode must be either 'guide' or 'role'." }, { status: 400 });
  }

  if (!prompt) {
    return json({ error: "Prompt is required." }, { status: 400 });
  }

  const context = getRequestContext(request);
  context.pagePath = pagePath;
  context.locale = locale;

  try {
    const canUseSupabase = hasSupabaseServerConfig();
    let sessionId = requestedSessionId;
    try {
      if (canUseSupabase) {
        sessionId =
          (await createAssistantSession(requestedSessionId, context, { source: "hire-gia" })) ||
          requestedSessionId;
      }
    } catch {}

    const limit = canUseSupabase
      ? await checkAssistantRateLimit(sessionId || null, mode, context.ipAddress)
      : { blocked: false, reason: null as string | null };
    if (limit.blocked && limit.reason) {
      const blockedResult = withComputedSnapshots(limitedResult(mode, limit.reason), effectivePrompt);
      const blockedQueryId =
        canUseSupabase && sessionId
          ? await logAssistantQuery({
          sessionId,
          mode,
          prompt: effectivePrompt,
          selectedPrompts,
          result: blockedResult,
          matchedPages: extractMatchedPages(blockedResult),
          matchedThemes: extractMatchedThemes(blockedResult),
          usedFallback: false,
          latencyMs: 0,
          pagePath,
          metadata: { blocked: true },
        })
          : null;

      if (canUseSupabase && sessionId) {
        await logAssistantEvent({
          sessionId,
          queryId: blockedQueryId,
          eventType: "query_submitted",
          pagePath,
          mode,
          metadata: { blocked: true },
        });
      }

      try {
        if (canUseSupabase && sessionId) {
          await sendAssistantNotification({
            sessionId,
            mode,
            prompt: effectivePrompt,
            result: blockedResult,
            matchedPages: extractMatchedPages(blockedResult),
            matchedThemes: extractMatchedThemes(blockedResult),
            usedFallback: false,
            context,
            limited: true,
            limitReason: limit.reason,
          });
        }
      } catch {}

      return json({ ...blockedResult, sessionId, queryId: blockedQueryId, blocked: true });
    }

    const startedAt = Date.now();
    let result: HireGiaResult;
    let usedFallback = false;

    try {
      result = withComputedSnapshots(
        stripAboutPageReferences(await generateAssistantResult(mode, effectivePrompt)),
        effectivePrompt,
      );
    } catch {
      const text = await generateAssistantText(mode, effectivePrompt);
      result = withComputedSnapshots(
        stripAboutPageReferences(synthesizeResultFromText(mode, effectivePrompt, text)),
        effectivePrompt,
      );
    }

    const matchedPages = extractMatchedPages(result);
    const matchedThemes = extractMatchedThemes(result);
    const latencyMs = Date.now() - startedAt;

    const queryId =
      canUseSupabase && sessionId
        ? await logAssistantQuery({
            sessionId,
            mode,
            prompt: effectivePrompt,
            selectedPrompts,
            result,
            matchedPages,
            matchedThemes,
            usedFallback,
            latencyMs,
            pagePath,
          }).catch(() => null)
        : null;

    try {
      if (canUseSupabase && sessionId) {
        await logAssistantEvent({
          sessionId,
          queryId,
          eventType: "query_submitted",
          pagePath,
          mode,
        });
      }
    } catch {}

    try {
      if (canUseSupabase && sessionId) {
        await sendAssistantNotification({
          sessionId,
          mode,
          prompt: effectivePrompt,
          result,
          matchedPages,
          matchedThemes,
          usedFallback,
          context,
          limited: false,
        });
      }
    } catch {}

    return json({ ...result, sessionId, queryId, usedFallback });
  } catch (error) {
    try {
      const text = await generateAssistantText(mode, effectivePrompt);
      const result = withComputedSnapshots(
        stripAboutPageReferences(synthesizeResultFromText(mode, effectivePrompt, text)),
        effectivePrompt,
      );
      const canUseSupabase = hasSupabaseServerConfig();
      const context = getRequestContext(request);
      let sessionId = requestedSessionId;
      try {
        if (canUseSupabase) {
          sessionId =
            (await createAssistantSession(requestedSessionId, context, { source: "hire-gia" })) ||
            requestedSessionId;
        }
      } catch {}
      const matchedPages = extractMatchedPages(result);
      const matchedThemes = extractMatchedThemes(result);
      const queryId =
        canUseSupabase && sessionId
          ? await logAssistantQuery({
              sessionId,
              mode,
              prompt: effectivePrompt,
              selectedPrompts,
              result,
              matchedPages,
              matchedThemes,
              usedFallback: false,
              latencyMs: 0,
              pagePath,
            }).catch(() => null)
          : null;

      try {
        if (canUseSupabase && sessionId) {
          await logAssistantEvent({
            sessionId,
            queryId,
            eventType: "query_submitted",
            pagePath,
            mode,
          });
        }
      } catch {}

      return json({
        ...result,
        sessionId,
        queryId,
        limits: undefined,
        usedFallback: false,
      });
    } catch {
      const fallback = withComputedSnapshots(
        stripAboutPageReferences(
          synthesizeResultFromText(mode, effectivePrompt, "A direct read from the published work.")
        ),
        effectivePrompt,
      );
      return json(
        {
          ...fallback,
          limits: fallback.limits || undefined,
          usedFallback: false,
        },
        { status: 200 }
      );
    }
  }
};
