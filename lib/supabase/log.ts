import { createClient, hasSupabaseEnv } from "./server";

export interface LogEntry {
  feature: string; // practice | interview | chat | quiz | game
  mode?: string | null;
  turn_role?: "user" | "assistant" | null;
  content?: string | null;
  input_method?: "voice" | "text" | null;
  scene?: string | null;
  meta?: Record<string, unknown>;
  session_id?: string | null;
}

/**
 * 현재 로그인 사용자의 활동을 activity_logs에 기록.
 * - 로그인/환경 미설정이면 조용히 무시(앱 동작에 영향 없음).
 * - 쿠키 세션 기반 클라이언트라 RLS에 의해 '본인 행'만 삽입됨.
 */
export async function logActivity(entries: LogEntry[]): Promise<void> {
  if (!hasSupabaseEnv() || !entries.length) return;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const rows = entries.map((e) => ({
      user_id: user.id,
      session_id: e.session_id ?? null,
      feature: e.feature,
      mode: e.mode ?? null,
      turn_role: e.turn_role ?? null,
      content: e.content ?? null,
      input_method: e.input_method ?? null,
      scene: e.scene ?? null,
      meta: e.meta ?? {},
    }));
    await supabase.from("activity_logs").insert(rows);
  } catch (err) {
    console.error("[logActivity]", err instanceof Error ? err.message : err);
  }
}
