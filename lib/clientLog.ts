export interface ClientLogEntry {
  feature: string;
  mode?: string | null;
  turn_role?: "user" | "assistant" | null;
  content?: string | null;
  input_method?: "voice" | "text" | null;
  scene?: string | null;
  meta?: Record<string, unknown>;
  session_id?: string | null;
}

/** 브라우저에서 활동을 서버(/api/log)로 보낸다. 실패해도 조용히 무시. */
export function sendLog(entries: ClientLogEntry[]): void {
  if (!entries.length) return;
  try {
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* 무시 */
  }
}

/** 활동 묶음(session) 식별자 생성. */
export function newLogId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
