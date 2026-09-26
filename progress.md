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
- [ ] Supabase 프로젝트 & 인증 + 기록 저장 (사용자 키 필요)

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
2. OpenAI API 키 발급 + 사용 한도 설정 → `.env.local`의 `OPENAI_API_KEY`
3. Supabase 프로젝트 생성 → URL, anon key, service_role key
4. Vercel 프로젝트 생성 + GitHub 연동

## 열린 질문 (기본값으로 진행 중, 변경 가능)
- 대화 모델: 개발 `gpt-4o-mini` / 실사용 `gpt-4o`
- 로그인 방식: 이메일+비밀번호
- UI 언어: 한국어
- 음성: Whisper 녹음-전송 (Realtime 보류)
- 『토끼전』 원문 앱 내 제공 여부 (저작권 확인)

## 참고
- 원본 엑셀은 휴지통에 보관(복구 가능). 데이터는 `설계원리.md`에 보존.
