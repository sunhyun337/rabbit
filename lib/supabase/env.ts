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
