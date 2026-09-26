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
  const listRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, currentPrinciple }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "오류");
      setMessages([...next, { role: "assistant", content: data.reply }]);
      if (data.currentPrinciple) setCurrentPrinciple(data.currentPrinciple);
    } catch (e) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "⚠️ 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <main className="chat-wrap">
      <header className="chat-header">
        <a href="/" className="chat-back">
          ← 홈
        </a>
        <span className="chat-title">🐰 토끼전 말하기</span>
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
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="한국어로 말해 보세요. (Enter 전송, Shift+Enter 줄바꿈)"
          rows={2}
        />
        <button onClick={send} disabled={loading || !input.trim()}>
          전송
        </button>
      </div>
    </main>
  );
}
