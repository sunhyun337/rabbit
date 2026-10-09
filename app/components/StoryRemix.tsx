"use client";

import { useRef, useState } from "react";
import {
  CHANGE_OPTIONS,
  MOOD_OPTIONS,
  changeLabel,
  moodLabel,
} from "@/lib/story/remixOptions";

interface MadeStory {
  id: number;
  title: string;
  body: string[];
  change: string;
  mood: string;
  full: string; // TTS용 전체 텍스트
}

export default function StoryRemix() {
  const [change, setChange] = useState(CHANGE_OPTIONS[0].id);
  const [mood, setMood] = useState(MOOD_OPTIONS[0].id);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [stories, setStories] = useState<MadeStory[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seq = useRef(0);

  const current =
    stories.find((s) => s.id === activeId) ?? stories[0] ?? null;

  async function unfold() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          change: changeLabel(change),
          mood: moodLabel(mood),
          custom: custom.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "오류");
      const full: string = (data.reply || "").trim();
      const lines = full.split("\n").map((l: string) => l.trim()).filter(Boolean);
      const title = lines[0] || "새로운 토끼전 이야기";
      const body = lines.slice(1);
      const id = ++seq.current;
      setStories((prev) => [
        {
          id,
          title,
          body: body.length ? body : [full],
          change: changeLabel(change),
          mood: moodLabel(mood),
          full,
        },
        ...prev,
      ]);
      setActiveId(id);
    } catch {
      const id = ++seq.current;
      setStories((prev) => [
        {
          id,
          title: "⚠️ 이야기를 만들지 못했어요",
          body: ["잠시 후 다시 시도해 주세요."],
          change: changeLabel(change),
          mood: moodLabel(mood),
          full: "",
        },
        ...prev,
      ]);
      setActiveId(id);
    } finally {
      setLoading(false);
    }
  }

  async function listen(s: MadeStory) {
    if (!s.full) return;
    if (playingId === s.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: s.full }),
      });
      if (!res.ok) throw new Error("tts");
      const url = URL.createObjectURL(await res.blob());
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlayingId(null);
      };
      await audio.play();
      setPlayingId(s.id);
    } catch {
      alert("음성을 재생하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <div className="remix2-wrap">
      <header className="remix2-header">
        <a href="/" className="chat-back">
          ← 홈
        </a>
        <span className="chat-title">✨ 이야기 바꾸기</span>
      </header>

      <div className="remix2-grid">
        {/* 왼쪽: 바꾸기 옵션 */}
        <section className="remix2-left">
          <div className="remix2-intro">
            <h2 className="remix2-q">이야기를 원하는 대로 바꿔 보세요.</h2>
            <p className="remix2-sub">
              바꿀 내용과 분위기를 고르고 펼치면, 오른쪽 책에 새로운 『토끼전』이
              적혀요.
            </p>
          </div>

          <label className="remix2-field">
            <span className="remix2-field-label">① 이야기 변화</span>
            <select
              className="remix2-select"
              value={change}
              onChange={(e) => setChange(e.target.value)}
            >
              {CHANGE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="remix2-field">
            <span className="remix2-field-label">② 분위기 변화</span>
            <select
              className="remix2-select"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
            >
              {MOOD_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="remix2-field">
            <span className="remix2-field-label">③ 꼭 넣고 싶은 이야기 (선택)</span>
            <textarea
              className="remix2-textarea"
              rows={3}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="예: 자라가 사실 용궁의 비밀 지도를 숨기고 있었으면 좋겠어요"
            />
          </label>

          <button className="remix2-go" onClick={unfold} disabled={loading}>
            {loading ? "이야기를 펼치는 중…" : "✨ 새로운 이야기 펼치기"}
          </button>

          {stories.length > 0 && (
            <div className="remix2-history">
              <div className="remix2-history-title">
                📚 내가 바꾼 이야기 ({stories.length})
              </div>
              <div className="remix2-history-list">
                {stories.map((s) => (
                  <button
                    key={s.id}
                    className={`remix2-history-item ${
                      current?.id === s.id ? "active" : ""
                    }`}
                    onClick={() => setActiveId(s.id)}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 오른쪽: 책 */}
        <section className="remix2-right">
          <div className={`remix2-book ${current ? "open" : ""}`}>
            {current ? (
              <>
                <div className="remix2-book-head">
                  <div className="remix2-tags">
                    <span className="remix2-tag">{current.change}</span>
                    <span className="remix2-tag mood">{current.mood}</span>
                  </div>
                  {current.full && (
                    <button
                      className="remix2-listen"
                      onClick={() => listen(current)}
                    >
                      {playingId === current.id ? "⏹ 멈춤" : "🔊 듣기"}
                    </button>
                  )}
                </div>
                <h3 className="remix2-book-title">{current.title}</h3>
                <div className="remix2-book-text">
                  {current.body.map((p, i) => (
                    <p key={i} className="remix2-para">
                      {p}
                    </p>
                  ))}
                </div>
              </>
            ) : loading ? (
              <div className="remix2-placeholder">
                <div className="remix2-placeholder-emoji">✨</div>
                이야기를 펼치는 중…
              </div>
            ) : (
              <div className="remix2-placeholder">
                <div className="remix2-placeholder-emoji">📖</div>
                왼쪽에서 이야기를 골라 펼쳐 보세요.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
