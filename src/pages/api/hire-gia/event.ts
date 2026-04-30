import type { APIRoute } from "astro";

import { logAssistantEvent } from "@/lib/ai/hireGiaServer";

export const prerender = false;

const allowedEvents = new Set([
  "response_link_clicked",
  "tab_changed",
  "prompt_chip_clicked",
  "query_cleared",
]);

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body.sessionId !== "string" || typeof body.eventType !== "string") {
    return json({ error: "Invalid event payload." }, { status: 400 });
  }

  if (!allowedEvents.has(body.eventType)) {
    return json({ error: "Unsupported event type." }, { status: 400 });
  }

  try {
    await logAssistantEvent({
      sessionId: body.sessionId,
      queryId: typeof body.queryId === "string" ? body.queryId : null,
      eventType: body.eventType as
        | "response_link_clicked"
        | "tab_changed"
        | "prompt_chip_clicked"
        | "query_cleared",
      pagePath: typeof body.pagePath === "string" ? body.pagePath : null,
      targetUrl: typeof body.targetUrl === "string" ? body.targetUrl : null,
      targetLabel: typeof body.targetLabel === "string" ? body.targetLabel : null,
      mode: typeof body.mode === "string" ? body.mode : null,
      metadata:
        typeof body.metadata === "object" && body.metadata && !Array.isArray(body.metadata)
          ? (body.metadata as Record<string, unknown>)
          : {},
    });

    return json({ ok: true });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Event tracking failed." },
      { status: 500 }
    );
  }
};
