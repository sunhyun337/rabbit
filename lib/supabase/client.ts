import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, hasSupabaseConfig } from "./env";

/** 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트. anon 키만 사용(공개 가능). */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** 클라이언트에서 Supabase 설정이 준비됐는지 확인(공개 기본값 포함). */
export function hasSupabaseEnv(): boolean {
  return hasSupabaseConfig;
}
