# 🐰 토끼전 말하기 도우미 (rabbit)

한국어능력 4급(TOPIK 4) 외국인 학습자를 위한 고전 『토끼전』 기반 **말하기 연습 AI 에이전트**.
에이전트의 교수 행동은 [`설계원리.md`](설계원리.md)의 6개 설계원리·지침에 근거합니다.

## 방법론: 하네스 엔지니어링
"AI가 일관된 품질로 일할 수 있는 환경·규칙 자체를 설계"하는 방식.
- 헌법: [`설계원리.md`](설계원리.md)(교수) · [`CLAUDE.md`](CLAUDE.md)(개발)
- 구조: [`architecture.md`](architecture.md) · [`AGENTS.md`](AGENTS.md)
- 진행: [`progress.md`](progress.md) · 계획: [`plan.md`](plan.md)

## 기술 스택
- Next.js (App Router) + TypeScript — Vercel 배포
- Supabase — Auth, Postgres, Storage
- OpenAI API — Chat, Whisper(STT), TTS

## 로컬 실행
```bash
npm install
cp .env.local.example .env.local   # 키 입력 후
npm run dev
```

## 환경변수
[`.env.local.example`](.env.local.example) 참고. **비밀키는 커밋하지 마세요.**

## 상태
초기 스켈레톤 단계. 다음 단계는 [`progress.md`](progress.md) 참고.
