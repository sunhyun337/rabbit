/** TEACHER_EMAILS 환경변수(쉼표 구분)에 등록된 교사 이메일 목록. */
export function teacherEmails(): string[] {
  return (process.env.TEACHER_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** 이메일이 교사로 지정됐는지(환경변수 기준). */
export function isTeacherEmail(email?: string | null): boolean {
  if (!email) return false;
  return teacherEmails().includes(email.toLowerCase());
}
