# architecture.md — 기술 설계

> 상위 계획은 [`plan.md`](plan.md), 규칙은 [`CLAUDE.md`](CLAUDE.md) 참고.

## 1. 구성도
```
[브라우저]  ──텍스트/음성──►  [Next.js @ Vercel]  ──►  [OpenAI API]
                                    │  api/chat, api/stt, api/tts
                                    ▼
                              [Supabase] Auth · Postgres · Storage
```
- OpenAI 키는 **서버 라우트에만** 존재. 클라이언트는 절대 직접 호출하지 않는다.

## 2. 디렉터리 (목표)
```
app/
  layout.tsx, page.tsx, globals.css
  (auth)/login, (auth)/signup        # 로그인/회원가입
  chat/                              # 말하기 대화 화면
  api/
    chat/route.ts                    # 튜터 응답 (OpenAI Chat)
    stt/route.ts                     # 음성→텍스트 (Whisper)
    tts/route.ts                     # 텍스트→음성 (TTS)
lib/
  prompt/                            # 설계원리.md → 시스템 프롬프트
  openai/                            # OpenAI 클라이언트
  supabase/                          # 서버/클라이언트 Supabase
supabase/
  migrations/                        # DB 스키마 (SQL)
```

## 3. 대화 상태 머신 (설계원리 = 단계)
`sessions.current_principle`(1~6)로 현재 단계를 추적한다. 각 단계에서 해당 원리의 지침만 활성화한 시스템 프롬프트를 구성한다.

| 단계 | 원리 | 전이 조건(예) |
|---|---|---|
| 1 | 서사 이해 | 주요 사건을 자기 말로 설명 완료 |
| 2 | 언어·내용 통합 비계 | (상시 병행) 어휘 이해 확인 |
| 3 | 인물 관점 탐구 | 세 인물의 가치 설명 |
| 4 | 근거 기반 주제 추론 | 근거를 들어 해석 제시 |
| 5 | 상호문화 가치 성찰 | 자기 문화와 비교 |
| 6 | 작품 재구성 | 결말/선택 변형 + 최종 해석 |

## 4. 프롬프트 생성 파이프라인
1. `설계원리.md` 파싱 → 원리/지침 구조화(JSON).
2. 현재 단계 + 4급 제약 + 대화 이력 → 시스템 프롬프트 조립.
3. OpenAI Chat 호출 → 응답 저장 → (음성 모드면) TTS.

## 5. 데이터 모델 (요약)
`profiles`, `sessions`, `messages`, `feedback`, `progress` — 상세 컬럼은 `plan.md` §4.
- 모든 테이블 RLS 활성화, `user_id = auth.uid()` 정책.
- 음성 파일: Storage 비공개 버킷 + 서명 URL.

## 6. 보안·비용
- 서버 라우트에서 세션 검증(Supabase) 후에만 OpenAI 호출.
- 요청당 최대 토큰·일일 호출 상한.
- STT/TTS 실패 시 텍스트 모드로 폴백.

## 7. 배포
- GitHub `main` → Vercel 자동 배포.
- 환경변수는 Vercel 프로젝트 설정 + 로컬 `.env.local`.
