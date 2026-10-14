import { createClient as createJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { cleanEnv, SUPABASE_URL } from "./env";

/** 서비스롤(service_role) 환경변수가 설정됐는지 — 교사 대시보드/연구 데이터 조회에 필요. */
export function hasAdminEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/**
 * 서버 전용 Supabase 관리자 클라이언트.
 * RLS를 우회하므로 절대 클라이언트 번들/응답에 노출하지 말 것.
 * (교사 본인 확인 후, 전체 학생 데이터를 읽을 때만 사용)
 */
export function createAdminClient(): SupabaseClient {
  return createJsClient(
    SUPABASE_URL,
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
