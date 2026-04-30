import type { HireGiaMode, HireGiaResult } from "./hireGiaTypes";

const SESSION_LIMIT = 3;
const ROLE_LIMIT_PER_SESSION = 1;
const IP_DAILY_LIMIT = 6;

type RequestContext = {
  ipAddress: string | null;
  countryCode: string | null;
  region: string | null;
  timezone: string | null;
  referrer: string | null;
  userAgent: string | null;
  pagePath: string | null;
  locale: string | null;
};

type QueryLogInput = {
  sessionId: string;
  mode: HireGiaMode;
  prompt: string;
  selectedPrompts: string[];
  result: HireGiaResult;
  matchedPages: string[];
  matchedThemes: string[];
  usedFallback: boolean;
  latencyMs: number;
  pagePath: string | null;
  metadata?: Record<string, unknown>;
};

type EventInput = {
  sessionId: string;
  queryId?: string | null;
  eventType:
    | "assistant_opened"
    | "assistant_closed"
    | "response_link_clicked"
    | "tab_changed"
    | "prompt_chip_clicked"
    | "query_submitted"
    | "query_cleared";
  pagePath?: string | null;
  targetUrl?: string | null;
  targetLabel?: string | null;
  mode?: string | null;
  metadata?: Record<string, unknown>;
};

type SessionRow = {
  id: string;
};

type SessionLookupRow = {
  id: string;
};

type QueryLookupRow = {
  id: string;
  mode?: string;
};

type StoredQueryRow = {
  id: string;
  mode: HireGiaMode;
  response_payload: HireGiaResult;
  created_at: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return { url, serviceRoleKey };
}

export function hasSupabaseServerConfig() {
  return !!getSupabaseConfig();
}

function encodeValue(value: string) {
  return encodeURIComponent(value);
}

async function supabaseRequest<T>(
  path: string,
  init: RequestInit = {},
  prefer?: string
): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Missing Supabase server credentials.");
  }

  const headers = new Headers(init.headers);
  headers.set("apikey", config.serviceRoleKey);
  headers.set("Authorization", `Bearer ${config.serviceRoleKey}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (prefer) {
    headers.set("Prefer", prefer);
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed: ${text || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getRequestContext(request: Request): RequestContext {
  const forwardedFor =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip");

  return {
    ipAddress: forwardedFor?.split(",")[0]?.trim() || null,
    countryCode: request.headers.get("x-vercel-ip-country"),
    region: request.headers.get("x-vercel-ip-country-region"),
    timezone: request.headers.get("x-vercel-ip-timezone"),
    referrer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
    pagePath: null,
    locale: null,
  };
}

export async function createAssistantSession(
  requestedSessionId: string | null,
  context: RequestContext,
  metadata: Record<string, unknown> = {}
) {
  const rows = await supabaseRequest<SessionRow[]>(
    "assistant_sessions",
    {
      method: "POST",
      body: JSON.stringify({
        ...(requestedSessionId ? { id: requestedSessionId } : {}),
        page_path: context.pagePath,
        locale: context.locale,
        country_code: context.countryCode,
        region: context.region,
        timezone: context.timezone,
        referrer: context.referrer,
        user_agent: context.userAgent,
        ip_address: context.ipAddress,
        metadata,
      }),
    },
    "return=representation,resolution=merge-duplicates"
  );

  return rows[0]?.id || requestedSessionId;
}

export async function endAssistantSession(sessionId: string) {
  await supabaseRequest(
    `assistant_sessions?id=eq.${encodeValue(sessionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ ended_at: new Date().toISOString() }),
    },
    "return=minimal"
  );
}

export async function logAssistantEvent(input: EventInput) {
  await supabaseRequest(
    "assistant_click_events",
    {
      method: "POST",
      body: JSON.stringify({
        session_id: input.sessionId,
        query_id: input.queryId || null,
        event_type: input.eventType,
        page_path: input.pagePath || null,
        target_url: input.targetUrl || null,
        target_label: input.targetLabel || null,
        mode: input.mode || null,
        metadata: input.metadata || {},
      }),
    },
    "return=minimal"
  );
}

export async function logAssistantQuery(input: QueryLogInput) {
  const rows = await supabaseRequest<Array<{ id: string }>>(
    "assistant_queries",
    {
      method: "POST",
      body: JSON.stringify({
        session_id: input.sessionId,
        mode: input.mode,
        user_prompt: input.prompt,
        selected_prompts: input.selectedPrompts,
        response_title: input.result.title,
        response_intro: input.result.summary,
        response_payload: input.result,
        matched_pages: input.matchedPages,
        matched_themes: input.matchedThemes,
        provider: "openai",
        model: import.meta.env.OPENAI_MODEL || "gpt-4o-mini",
        used_fallback: input.usedFallback,
        latency_ms: input.latencyMs,
        page_path: input.pagePath,
        metadata: input.metadata || {},
      }),
    },
    "return=representation"
  );

  return rows[0]?.id || null;
}

export async function checkAssistantRateLimit(
  sessionId: string | null,
  mode: HireGiaMode,
  ipAddress: string | null
) {
  if (!sessionId) {
    return { blocked: false, reason: null as string | null };
  }

  const sessionQueries = await supabaseRequest<QueryLookupRow[]>(
    `assistant_queries?session_id=eq.${encodeValue(sessionId)}&select=id,mode`
  );

  if (sessionQueries.length >= SESSION_LIMIT) {
    return {
      blocked: true,
      reason:
        "This assistant is a lightweight proof of concept, so it only supports a few questions per session. If you want a deeper conversation, please contact Gia directly.",
    };
  }

  if (mode === "role") {
    const roleQueries = sessionQueries.filter((item) => item.mode === "role");
    if (roleQueries.length >= ROLE_LIMIT_PER_SESSION) {
      return {
        blocked: true,
        reason:
          "This proof of concept only supports one role-matching request per session. If you’d like a deeper fit discussion, please contact Gia directly.",
      };
    }
  }

  if (!ipAddress) {
    return { blocked: false, reason: null as string | null };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sessions = await supabaseRequest<SessionLookupRow[]>(
    `assistant_sessions?ip_address=eq.${encodeValue(ipAddress)}&created_at=gte.${encodeValue(
      since
    )}&select=id`
  );

  const sessionIds = sessions.map((item) => item.id).filter(Boolean);
  if (!sessionIds.length) {
    return { blocked: false, reason: null as string | null };
  }

  const ipQueries = await supabaseRequest<QueryLookupRow[]>(
    `assistant_queries?session_id=in.(${sessionIds.map(encodeValue).join(",")})&select=id`
  );

  if (ipQueries.length >= IP_DAILY_LIMIT) {
    return {
      blocked: true,
      reason:
        "This assistant is capped to a small number of questions each day. If the work feels promising, the next step is to contact Gia directly rather than using this like an interview tool.",
    };
  }

  return { blocked: false, reason: null as string | null };
}

export async function sendAssistantNotification(args: {
  sessionId: string;
  mode: HireGiaMode;
  prompt: string;
  result: HireGiaResult;
  matchedPages: string[];
  matchedThemes: string[];
  usedFallback: boolean;
  context: RequestContext;
  limited: boolean;
  limitReason?: string | null;
}) {
  const token = import.meta.env.POSTMARK_SERVER_TOKEN;
  const to = import.meta.env.POSTMARK_TO_EMAIL;
  const from = import.meta.env.POSTMARK_FROM_EMAIL;

  if (!token || !to || !from) {
    return;
  }

  const subjectPrefix = args.limited ? "[Assistant limit]" : "[Assistant query]";
  const locale = args.context.locale ? `${args.context.locale} (browser locale)` : "-";
  const textBody = [
    `${subjectPrefix} ${args.mode}`,
    "",
    `Session: ${args.sessionId}`,
    `Page: ${args.context.pagePath || "-"}`,
    `Locale: ${locale}`,
    `Country: ${args.context.countryCode || "-"}`,
    `Region: ${args.context.region || "-"}`,
    `Timezone: ${args.context.timezone || "-"}`,
    `Fallback used: ${args.usedFallback ? "yes" : "no"}`,
    `Matched pages: ${args.matchedPages.join(", ") || "-"}`,
    `Matched themes: ${args.matchedThemes.join(", ") || "-"}`,
    "",
    "Prompt:",
    args.prompt,
    "",
    "Response title:",
    args.result.title,
    "",
    "Response summary:",
    args.result.summary,
    ...(args.limitReason ? ["", "Limit message:", args.limitReason] : []),
  ].join("\n");

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: from,
      To: to,
      Subject: `${subjectPrefix} ${args.mode} on ${args.context.pagePath || "/"}`,
      TextBody: textBody,
      MessageStream: "outbound",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Postmark request failed: ${text || response.statusText}`);
  }
}

export async function getAssistantQueryById(queryId: string) {
  const rows = await supabaseRequest<StoredQueryRow[]>(
    `assistant_queries?id=eq.${encodeValue(queryId)}&select=id,mode,response_payload,created_at`
  );

  return rows[0] || null;
}
