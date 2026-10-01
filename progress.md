# progress.md — 진행 상태 & 다음 단계

> 매 작업 사이클마다 갱신. 계획은 [`plan.md`](plan.md).

_최종 갱신: 2026-09-26_

## 현재 상태
- [x] 설계원리 문서 확보 (`설계원리.md`) — 6개 원리·지침
- [x] 작업 계획 수립 (`plan.md`)
- [x] 하네스 문서 뼈대 (`CLAUDE.md`, `AGENTS.md`, `architecture.md`, `progress.md`)
- [x] 개발 도구 설치 (git, Node.js LTS, GitHub CLI)
- [x] git 저장소 초기화 (`main`)
- [x] Next.js 스켈레톤 + 로컬 빌드 (Next 15.5.26, build 통과)
- [x] GitHub 원격 연결 & 첫 푸시 (`sunhyun337/rabbit`)
- [x] OpenAI 키 설정 + 크레딧 충전 (로컬 `.env.local`)
- [x] **Phase 2: 설계원리 기반 대화 엔진 — 로컬에서 end-to-end 작동 확인** ✅
- [x] **Phase 3: 음성(STT/TTS) — API·UI 구현, 엔드포인트 검증** ✅ (마이크 UX는 실제 브라우저에서)
- [x] **Vercel 배포 완료** ✅ → https://rabbit-sunhyun1.vercel.app (프로덕션 대화 작동 확인, 자동배포 연동)
- [x] **홈: 『토끼전』 주요 장면 5개** 소개 + **챗봇을 홈 오른쪽 패널로** 배치(2단 레이아웃) ✅
- [x] **게임: 「두루마리 여정」 횡스크롤 플랫포머** — 토끼가 달리며 장면 5개(두루마리) 수집, 각 장면 원문·어휘 대화창 ✅ (`/game`)
- [x] **인증 UI(회원가입/로그인, 이메일+비밀번호)** + 미들웨어 게이팅(`/chat`,`/game`) 구현 ✅ — **Supabase 키 설정 시 활성화**(현재는 키 없음 → 게이팅 미적용, 앱 정상 동작)
- [ ] Supabase 프로젝트 생성 + 키 입력(활성화) & 기록 저장(RLS) (사용자 키 필요)

## Phase 진행
- **Phase 0 (셋업)**: 도구·git·푸시 완료. 외부 서비스(OpenAI/Supabase/Vercel) 키 연동 대기.
- **Phase 1 (뼈대·인증)**: Next.js 스켈레톤 완료. Supabase Auth는 키 확보 후.
- **Phase 2 (대화 엔진)**: 완료 — 설계원리 파싱 → 프롬프트 생성 → `/api/chat` → 대화 UI, 로컬 검증 완료.
- **Phase 3 (음성)**: 완료 — `/api/tts`(mp3), `/api/stt`(Whisper), 마이크 녹음 + 음성 재생 UI. curl 왕복 검증.
- **다음 (인증/배포)**: Supabase 로그인·기록 저장, Vercel 배포. 둘 다 사용자 계정/키 필요.

## 알려진 이슈 / 메모
- 배포(Vercel) 시 `설계원리.md`를 서버 런타임에서 fs로 읽음 → 서버리스 번들에 포함되는지 확인 필요(파일 트레이싱).
- TTS 기본 음성 `alloy`의 한국어 발음 품질 점검 필요(필요 시 voice/model 조정).
- 음성 자동재생은 브라우저 정책상 사용자 상호작용 후 허용(실패 시 텍스트로 폴백, 조용히 무시).

## 사용자 조치 필요 (Blocking)
1. ~~GitHub 푸시 인증~~ ✅ 완료 (sunhyun337)
2. ~~OpenAI API 키~~ ✅ 완료
3. **Supabase 프로젝트 생성 → URL, anon key, service_role key** 를 `.env.local`(+Vercel 환경변수)에 입력
   → 입력하면 회원가입/로그인이 실제로 작동하고, `/chat`·`/game`이 로그인 사용자 전용으로 게이팅됨.
   (Supabase 대시보드 > Authentication > Providers > Email 활성화. 빠른 테스트는 "Confirm email" 끄기)
4. ~~Vercel 프로젝트 생성 + GitHub 연동~~ ✅ 완료

## 열린 질문 (기본값으로 진행 중, 변경 가능)
- 대화 모델: 개발 `gpt-4o-mini` / 실사용 `gpt-4o`
- 로그인 방식: 이메일+비밀번호
- UI 언어: 한국어
- 음성: Whisper 녹음-전송 (Realtime 보류)
- 『토끼전』 원문 앱 내 제공 여부 (저작권 확인)

## 참고
- 원본 엑셀은 휴지통에 보관(복구 가능). 데이터는 `설계원리.md`에 보존.
