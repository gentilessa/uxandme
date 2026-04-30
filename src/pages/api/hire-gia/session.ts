import type { APIRoute } from "astro";

import {
  createAssistantSession,
  endAssistantSession,
  getRequestContext,
  logAssistantEvent,
} from "@/lib/ai/hireGiaServer";

export const prerender = false;

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
  let body: {
    action?: string;
    sessionId?: string;
    pagePath?: string;
    locale?: string;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const context = getRequestContext(request);
  context.pagePath = typeof body.pagePath === "string" ? body.pagePath : null;
  context.locale = typeof body.locale === "string" ? body.locale : null;

  try {
    if (body.action === "start") {
      try {
        const sessionId =
          (await createAssistantSession(body.sessionId || null, context, {
            source: "hire-gia",
          })) || null;

        if (sessionId) {
          await logAssistantEvent({
            sessionId,
            eventType: "assistant_opened",
            pagePath: context.pagePath,
            metadata: { source: "launcher" },
          });
        }

        return json({ sessionId, ok: true });
      } catch (error) {
        return json(
          {
            ok: true,
            sessionId: null,
            warning: error instanceof Error ? error.message : "Session tracking unavailable.",
          },
          { status: 200 }
        );
      }
    }

    if (body.action === "end" && body.sessionId) {
      try {
        await logAssistantEvent({
          sessionId: body.sessionId,
          eventType: "assistant_closed",
          pagePath: context.pagePath,
        });
        await endAssistantSession(body.sessionId);
      } catch {
        // Session tracking is best-effort only.
      }
      return json({ ok: true });
    }

    return json({ error: "Unsupported session action." }, { status: 400 });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Session tracking failed." },
      { status: 500 }
    );
  }
};
