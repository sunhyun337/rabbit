import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, hasSupabaseConfig } from "./env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/** 서버 컴포넌트/라우트용 Supabase 클라이언트. (Next 15: cookies()는 async) */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서 호출되면 set이 막힐 수 있음 — 미들웨어가 세션을 갱신하므로 무시.
          }
        },
      },
    },
  );
}

/** 서버에서 Supabase 설정이 준비됐는지 확인(공개 기본값 포함). */
export function hasSupabaseEnv(): boolean {
  return hasSupabaseConfig;
}
