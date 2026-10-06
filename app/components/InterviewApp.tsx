"use client";

import { useRef, useState } from "react";
import {
  CHARACTERS,
  MAX_QUESTIONS,
  getCharacter,
  type CharacterId,
} from "@/lib/story/characters";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function InterviewApp() {
  const [selected, setSelected] = useState<CharacterId | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0); // 현재 인물에게 한 질문 수
  const listRef = useRef<HTMLDivElement>(null);

  const character = selected ? getCharacter(selected) : undefined;
  const done = count >= MAX_QUESTIONS;

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }

  // 인물 선택(언제든 전환 가능) → 자기소개부터 새로 시작
  function selectCharacter(id: CharacterId) {
    if (loading) return;
    if (id === selected && !done) return; // 같은 인물(진행 중)이면 유지
    const c = getCharacter(id)!;
    setSelected(id);
    setMessages([{ role: "assistant", content: c.intro }]);
    setCount(0);
    setInput("");
    scrollToBottom();
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || !selected || done) return;

    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, character: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "오류");
      const reply: string = data.reply || "";
      const newCount = count + 1;
      const after: Message[] = [...next, { role: "assistant", content: reply }];
      if (newCount >= MAX_QUESTIONS) {
        after.push({
          role: "assistant",
          content: `(인터뷰가 끝났어요! 질문 ${MAX_QUESTIONS}개를 모두 했어요. 위에서 다른 인물을 골라 또 인터뷰해 보세요.)`,
        });
      }
      setMessages(after);
      setCount(newCount);
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "⚠️ 대답을 받지 못했어요. 잠시 후 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="chat-wrap page">
      <header className="chat-header">
        <a href="/" className="chat-back">
          ← 홈
        </a>
        <span className="chat-title">🎙️ 인물 인터뷰</span>
        {character && (
          <span className="chat-step">
            질문 {Math.min(count, MAX_QUESTIONS)} / {MAX_QUESTIONS}
          </span>
        )}
      </header>

      {/* 인물 선택 — 언제든 전환 가능 */}
      <div className="iv-chars">
        {CHARACTERS.map((c) => (
          <button
            key={c.id}
            className={`iv-char ${selected === c.id ? "active" : ""}`}
            onClick={() => selectCharacter(c.id)}
            disabled={loading}
          >
            <span className="iv-char-emoji">{c.emoji}</span>
            <span className="iv-char-name">{c.name}</span>
          </button>
        ))}
      </div>

      <div className="chat-list" ref={listRef}>
        {!selected && (
          <div className="iv-empty">인물을 골라서 인터뷰(질문)해 보세요.</div>
        )}
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
          placeholder={
            !selected
              ? "먼저 인물을 선택하세요."
              : done
                ? "인터뷰가 끝났어요. 다른 인물을 골라 보세요."
                : `${character?.name}에게 궁금한 것을 물어보세요. (Enter 전송)`
          }
          rows={2}
          disabled={!selected || done}
        />
        <button
          className="send-btn"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim() || !selected || done}
        >
          전송
        </button>
      </div>
    </div>
  );
}
