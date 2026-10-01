import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** 이메일 확인 링크(코드)를 세션으로 교환한 뒤 원래 목적지로 이동. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
