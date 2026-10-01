import { createBrowserClient } from "@supabase/ssr";

/** 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트. anon 키만 사용(공개 가능). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** 클라이언트에서 Supabase 환경변수가 설정됐는지 확인. */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
