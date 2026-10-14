/**
 * 환경변수 값에서 비ASCII/공백/개행 등 유효하지 않은 문자를 제거한다.
 * Supabase URL과 JWT 키는 모두 출력 가능한 ASCII(! ~ ~)만 포함하므로,
 * 대시보드에 값을 붙여넣는 과정에서 섞여 들어간 보이지 않는 문자
 * (예: 줄바꿈, 비분리 공백, 제로폭 문자 등 non ISO-8859-1 코드포인트)로 인해
 * fetch 헤더 생성이 실패("String contains non ISO-8859-1 code point")하는 것을 방지한다.
 */
export function cleanEnv(v: string | undefined): string {
  return (v ?? "").replace(/[^\x21-\x7E]/g, "");
}

/**
 * Supabase 프로젝트 공개 정보(URL + anon 키).
 * anon 키는 애초에 클라이언트 번들에 노출되도록 설계된 "공개값"이며(RLS로 보호),
 * 비밀키가 아니다. 따라서 환경변수가 비어 있거나 손상돼도 로그인이 작동하도록
 * 기본값(fallback)으로 코드에 둔다. (※ service_role 비밀키는 절대 여기 두지 않는다.)
 */
const FALLBACK_SUPABASE_URL = "https://edzkbvxobbbbmmpxqtuu.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkemtidnhvYmJiYm1tcHhxdHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MjY1OTYsImV4cCI6MjEwNzAwMjU5Nn0.hHx532tJin6vS1uu2UqIU0EpM96PR0BioRcsYsl9Z44";

/** 사용할 Supabase URL (환경변수 우선, 없으면 공개 기본값). */
export const SUPABASE_URL =
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || FALLBACK_SUPABASE_URL;

/** 사용할 Supabase anon 키 (환경변수 우선, 없으면 공개 기본값). */
export const SUPABASE_ANON_KEY =
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  FALLBACK_SUPABASE_ANON_KEY;

/** 로그인에 필요한 Supabase 공개 설정이 준비됐는지(기본값이 있으므로 항상 true). */
export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
