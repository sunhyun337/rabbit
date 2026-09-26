"use client";

import { useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const GREETING: Message = {
  role: "assistant",
  content:
    "안녕하세요! 저는 『토끼전』으로 함께 말하기를 연습하는 튜터예요. 😊\n먼저 여쭤볼게요. 『토끼전』 이야기를 들어 본 적 있나요? 알고 있는 내용을 편하게 말해 주세요.",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPrinciple, setCurrentPrinciple] = useState(1);

  // 음성 관련 상태
  const [speakOn, setSpeakOn] = useState(true); // 에이전트 응답 음성 재생
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
    if (!trimmed || loading) return;

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

  // ===== 마이크 녹음 → STT =====
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
        await sendMessage(data.text); // 인식된 말을 바로 전송
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

  const micLabel = recording ? "■ 녹음 중지" : sttBusy ? "인식 중…" : "🎤 말하기";

  return (
    <main className="chat-wrap">
      <header className="chat-header">
        <a href="/" className="chat-back">
          ← 홈
        </a>
        <span className="chat-title">🐰 토끼전 말하기</span>
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
          placeholder="말하거나 입력해 보세요. (Enter 전송)"
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
    </main>
  );
}
