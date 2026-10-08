"use client";

import { useRef, useState } from "react";
import { SCENES, SCENE_IMG } from "./StorySynopsis";
import { renderGlossed } from "./glossify";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Mode {
  id: string;
  emoji: string;
  name: string;
  intro: string;
}

const MODES: Mode[] = [
  {
    id: "tutor",
    emoji: "👩‍🏫",
    name: "선생님",
    intro: "안녕하세요! 줄거리를 보면서 궁금한 점이 있으면 물어보세요.",
  },
];

// 대화 묶음(session) 식별자 생성
function newSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export default function SpeakingPractice() {
  const [idx, setIdx] = useState(0);
  const mode = "tutor";
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: MODES[0].intro },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speakOn, setSpeakOn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [sttBusy, setSttBusy] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string>(newSessionId());

  const scene = SCENES[idx];
  const last = SCENES.length - 1;

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
      const url = URL.createObjectURL(await res.blob());
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      /* 음성 재생 실패는 무시 */
    }
  }

  async function sendMessage(text: string, method: "voice" | "text" = "text") {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    scrollToBottom();
    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          mode,
          scene: `${scene.title} — ${scene.text.slice(0, 140)}`,
          sessionId: sessionIdRef.current,
          inputMethod: method,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "오류");
      const reply: string = data.reply || "";
      setMessages([...next, { role: "assistant", content: reply }]);
      if (speakOn && reply) playTTS(reply);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "⚠️ 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요." },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
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
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
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
      if (res.ok && data.text) await sendMessage(data.text, "voice");
      else alert(data?.error || "음성을 인식하지 못했어요. 다시 말해 주세요.");
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
  const img = SCENE_IMG[idx];

  return (
    <div className="practice-wrap">
      <header className="practice-header">
        <a href="/" className="chat-back">
          ← 홈
        </a>
        <span className="chat-title">🗣️ 말하기 연습</span>
        <span className="practice-sub">줄거리를 보며 이야기해요</span>
      </header>

      <div className="practice-grid">
        {/* 왼쪽: 줄거리 */}
        <section className="practice-left">
          <div className="story-art">
            {img ? (
              <img className="story-img" src={img} alt={scene.title} />
            ) : (
              <div className="practice-noimg">{scene.title}</div>
            )}
          </div>
          <div className="story-body">
            <h3>{scene.title}</h3>
            <p className="story-text">{renderGlossed(scene.text, scene.words)}</p>
            <p className="story-hint">💡 밑줄 친 단어에 마우스를 올리면 뜻이 나와요.</p>
          </div>
          <div className="story-dots">
            {SCENES.map((_, i) => (
              <button
                key={i}
                className={`story-dot ${i === idx ? "on" : ""}`}
                onClick={() => setIdx(i)}
                aria-label={`${i + 1}번 장면`}
              />
            ))}
          </div>
          <div className="story-nav">
            <button
              className="btn ghost"
              onClick={() => setIdx((v) => Math.max(0, v - 1))}
              disabled={idx === 0}
            >
              ◀ 이전
            </button>
            <span className="story-count">
              {idx + 1} / {SCENES.length}
            </span>
            <button
              className="btn"
              onClick={() => setIdx((v) => Math.min(last, v + 1))}
              disabled={idx === last}
            >
              다음 ▶
            </button>
          </div>
        </section>

        {/* 오른쪽: 말하기 챗봇 */}
        <section className="practice-right">
          <div className="practice-modes">
            <span className="practice-mode active">
              <span className="practice-mode-emoji">{MODES[0].emoji}</span>
              {MODES[0].name}
            </span>
            <button
              className={`speak-toggle ${speakOn ? "on" : ""}`}
              onClick={() => setSpeakOn((v) => !v)}
              title="음성 재생 켜기/끄기"
            >
              {speakOn ? "🔊" : "🔇"}
            </button>
          </div>

          <div className="chat-list" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="bubble assistant typing">…</div>}
          </div>

          <div className="chat-input">
            <button
              className={`mic-btn ${recording ? "recording" : ""}`}
              onClick={recording ? stopRecording : startRecording}
              disabled={sttBusy || loading}
            >
              {micLabel}
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="줄거리를 보면서 궁금한 점을 물어보세요. (Enter 전송)"
              rows={2}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
            >
              전송
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
