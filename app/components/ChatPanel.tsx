"use client";

import { useRef, useState } from "react";
import StorySynopsis from "./StorySynopsis";
import { STAGE_QUESTIONS } from "@/lib/story/stages";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const GREETING: Message = {
  role: "assistant",
  content:
    "안녕하세요! 😊\n1. 「📖 줄거리」를 읽어 보세요.\n2. 대화 연습을 하세요.\n3. 자라를 이겨라, 게임으로 Go, Go, Go!!",
};

interface Props {
  /** "page" = 전체 화면(/chat), "side" = 오른쪽 사이드 패널(홈) */
  variant?: "page" | "side";
  /** 로그인 여부. false면 로그인 안내 오버레이 표시. */
  authed?: boolean;
}

export default function ChatPanel({ variant = "page", authed = true }: Props) {
  // 대화 페이지(/chat)는 인사말 없이 단계 버튼만 보여 준다. 홈 오른쪽 패널은 환영 인사 유지.
  const [messages, setMessages] = useState<Message[]>(
    variant === "side" ? [GREETING] : [],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPrinciple, setCurrentPrinciple] = useState(1);
  const [done, setDone] = useState(false);

  // 단계(설계원리 1~6) 진행 상태 — 학습자가 '원하는 단계'를 자유롭게 고른다.
  const [completed, setCompleted] = useState<number[]>([]); // 마친 단계들(✓ 표시용)
  const completedRef = useRef<number[]>([]);
  const [activeStage, setActiveStage] = useState(0); // 진행 중 단계(0=대기)
  const activeStageRef = useRef(0);
  const qIdxRef = useRef(0); // 진행 중 단계에서 답한 질문 수

  const [speakOn, setSpeakOn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [sttBusy, setSttBusy] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }

  async function playTTS(text: string) {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      /* 음성 재생 실패는 무시(텍스트로 폴백) */
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || done) return;

    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, currentPrinciple }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "오류");
      const reply: string = data.reply || "";
      setMessages([...next, { role: "assistant", content: reply }]);
      if (data.currentPrinciple) setCurrentPrinciple(data.currentPrinciple);
      if (speakOn && reply) playTTS(reply);
      advanceAfterAnswer();
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "⚠️ 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  // 장면 질문 칩 → 튜터가 그 질문을 던지고, 학습자가 답한다.
  function askQuestion(q: string) {
    if (loading || !authed) return;
    setMessages((prev) => [...prev, { role: "assistant", content: q }]);
    scrollToBottom();
    if (speakOn) playTTS(q);
  }

  // 안내 문구(질문 아님)를 말풍선으로 추가
  function injectInfo(text: string) {
    setMessages((prev) => [...prev, { role: "assistant", content: text }]);
    scrollToBottom();
  }

  // 단계 버튼 클릭 → 해당 단계의 첫 질문을 던진다(진행 중이어도 자유롭게 전환).
  function startStage(n: number) {
    if (loading || !authed) return;
    if (activeStageRef.current === n) return; // 이미 진행 중인 단계면 그대로
    activeStageRef.current = n;
    qIdxRef.current = 0;
    setActiveStage(n);
    setCurrentPrinciple(n);
    askQuestion(STAGE_QUESTIONS[n - 1].questions[0]);
  }

  // 학습자가 현재 단계 질문에 답해 피드백을 받은 뒤 다음으로 진행
  function advanceAfterAnswer() {
    const s = activeStageRef.current;
    if (s === 0) return; // 자유 입력 — 단계 제어 없음
    const qs = STAGE_QUESTIONS[s - 1].questions;
    const answered = qIdxRef.current + 1; // 방금 답한 질문 번호
    qIdxRef.current = answered;
    if (answered < qs.length) {
      setTimeout(() => askQuestion(qs[answered]), 700);
      return;
    }
    // 이 단계의 질문을 모두 완료
    activeStageRef.current = 0;
    setActiveStage(0);
    if (!completedRef.current.includes(s)) {
      completedRef.current = [...completedRef.current, s];
      setCompleted(completedRef.current);
    }
    const allDone = completedRef.current.length >= STAGE_QUESTIONS.length;
    setTimeout(
      () =>
        injectInfo(
          allDone
            ? "모든 단계를 마쳤어요. 정말 잘했어요! 🎉 다시 연습하고 싶은 단계를 눌러도 좋아요."
            : `좋아요! '${s}단계'를 마쳤어요. 원하는 다른 단계를 눌러 계속해 보세요.`,
        ),
      700,
    );
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        await transcribe(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      alert("마이크를 사용할 수 없습니다. 브라우저 권한을 확인해 주세요.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribe(blob: Blob) {
    setSttBusy(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "speech.webm");
      const res = await fetch("/api/stt", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.text) {
        await sendMessage(data.text);
      } else {
        alert(data?.error || "음성을 인식하지 못했어요. 다시 말해 주세요.");
      }
    } catch {
      alert("음성 인식 중 문제가 발생했어요.");
    } finally {
      setSttBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const micLabel = recording ? "■ 중지" : sttBusy ? "인식 중…" : "🎤 말하기";

  return (
    <div className={`chat-wrap ${variant}`}>
      <header className="chat-header">
        {variant === "page" && (
          <a href="/" className="chat-back">
            ← 홈
          </a>
        )}
        <span className="chat-title">🐰 토끼전 말하기</span>
        <StorySynopsis label="📖 줄거리" className="chat-story-btn" />
        <button
          className={`speak-toggle ${speakOn ? "on" : ""}`}
          onClick={() => setSpeakOn((v) => !v)}
          title="에이전트 음성 재생 켜기/끄기"
        >
          {speakOn ? "🔊" : "🔇"}
        </button>
        <span className="chat-step">{currentPrinciple} / 6 단계</span>
      </header>

      <div className="chat-list" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="bubble assistant typing">…</div>}
        {done && (
          <div className="chat-done">
            ✅ 질문 12개(6단계 × 2개)를 모두 마쳤어요. 오늘 말하기 연습, 수고했어요!
          </div>
        )}

        {!done && variant !== "side" && (
          <div className="stage-steps">
            <p className="stage-steps-lead">
              <b>원하는 단계 버튼</b>을 눌러 말하기를 연습해요. 어느 단계부터
              시작해도 좋아요. (단계마다 질문 5개)
            </p>
            <div className="stage-steps-row">
              {STAGE_QUESTIONS.map((s) => {
                const isActive = activeStage === s.no;
                const isDone = completed.includes(s.no);
                const state = isActive ? "current" : isDone ? "done" : "";
                const clickable = !loading && authed && !isActive;
                return (
                  <button
                    key={s.no}
                    className={`stage-step ${state}`}
                    onClick={() => startStage(s.no)}
                    disabled={!clickable}
                    title={s.title}
                  >
                    <span className="stage-step-no">{s.no}단계</span>
                    <span className="stage-step-name">
                      {isDone ? "✓ " : ""}
                      {s.short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="chat-input">
        <button
          className={`mic-btn ${recording ? "recording" : ""}`}
          onClick={recording ? stopRecording : startRecording}
          disabled={sttBusy || loading || !authed || done}
        >
          {micLabel}
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            done ? "대화 연습을 모두 마쳤어요 🎉" : "말하거나 입력해 보세요. (Enter 전송)"
          }
          rows={2}
          disabled={!authed || done}
        />
        <button
          className="send-btn"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim() || !authed || done}
        >
          전송
        </button>
      </div>

      {!authed && (
        <div className="chat-lock">
          <div className="chat-lock-box">
            <p>🔒 회원가입 후 대화를 이용할 수 있어요.</p>
            <a className="btn" href="/login?next=/">
              로그인 / 회원가입
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
