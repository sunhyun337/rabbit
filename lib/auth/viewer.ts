import type { User } from "@supabase/supabase-js";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { isTeacherEmail } from "./teacher";

export interface Viewer {
  user: User | null;
  isTeacher: boolean;
}

/**
 * 현재 로그인 사용자와 교사 여부를 반환.
 * 교사 = TEACHER_EMAILS에 포함(이메일) 또는 profiles.role = 'teacher'(DB).
 */
export async function getViewer(): Promise<Viewer> {
  if (!hasSupabaseEnv()) return { user: null, isTeacher: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isTeacher: false };

  let teacher = isTeacherEmail(user.email);
  if (!teacher && hasAdminEnv()) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      teacher = data?.role === "teacher";
    } catch {
      /* 프로필 조회 실패는 무시(교사 아님 처리) */
    }
  }
  return { user, isTeacher: teacher };
}
