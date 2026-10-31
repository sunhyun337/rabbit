import { NextResponse } from "next/server";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * 교수님 점검용 "테스트 계정으로 로그인".
 * 비밀번호는 클라이언트 번들·페이지 소스에 노출하지 않고 서버 환경변수에서만 읽는다.
 * (DEMO_PASSWORD는 서버 전용. 이메일은 비밀이 아니므로 기본값을 둔다.)
 */
const DEMO_EMAIL = process.env.DEMO_EMAIL || "teacher.demo@gmail.com";

export async function POST() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "인증이 아직 설정되지 않았습니다." }, { status: 503 });
  }
  const password = process.env.DEMO_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: "테스트 계정이 아직 설정되지 않았습니다. (관리자: DEMO_PASSWORD 설정 필요)" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password,
  });
  if (error) {
    return NextResponse.json(
      { error: "테스트 로그인에 실패했습니다. 잠시 후 다시 시도하세요." },
      { status: 401 },
    );
  }
  return NextResponse.json({ ok: true });
}
