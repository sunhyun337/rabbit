import { NextResponse } from "next/server";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** 연구 데이터 활용 동의 기록. 회원가입 직후 클라이언트가 호출. */
export async function POST() {
  if (!hasSupabaseEnv()) return NextResponse.json({ ok: false });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (hasAdminEnv()) {
    try {
      const admin = createAdminClient();
      await admin.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          research_consent: true,
          consent_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    } catch (err) {
      console.error("[consent]", err instanceof Error ? err.message : err);
    }
  }
  return NextResponse.json({ ok: true });
}
