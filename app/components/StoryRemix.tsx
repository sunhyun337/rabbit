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
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seq = useRef(0);

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
      setStories((prev) => [
        {
          id: ++seq.current,
          title,
          body: body.length ? body : [full],
          change: changeLabel(change),
          mood: moodLabel(mood),
          full,
        },
        ...prev,
      ]);
    } catch {
      setStories((prev) => [
        {
          id: ++seq.current,
          title: "⚠️ 이야기를 만들지 못했어요",
          body: ["잠시 후 다시 시도해 주세요."],
          change: changeLabel(change),
          mood: moodLabel(mood),
          full: "",
        },
        ...prev,
      ]);
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
    <div className="remix-wrap">
      <header className="remix-header">
        <a href="/" className="chat-back">
          ← 홈
        </a>
        <span className="chat-title">✨ 이야기 바꾸기</span>
      </header>

      <div className="remix-card">
        <h2 className="remix-q">이야기를 어떻게 바꿔 볼까요?</h2>

        <div className="remix-selects">
          <label className="remix-field">
            <span className="remix-field-label">이야기 변화</span>
            <select
              className="remix-select"
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

          <label className="remix-field">
            <span className="remix-field-label">분위기 변화</span>
            <select
              className="remix-select"
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
        </div>

        <label className="remix-field">
          <span className="remix-field-label">꼭 넣고 싶은 이야기 (선택)</span>
          <textarea
            className="remix-textarea"
            rows={3}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="예: 자라가 사실 용궁의 비밀 지도를 숨기고 있었으면 좋겠어요"
          />
        </label>

        <button className="btn big remix-go" onClick={unfold} disabled={loading}>
          {loading ? "이야기를 펼치는 중…" : "✨ 새로운 이야기 펼치기"}
        </button>
      </div>

      <h2 className="remix-shelf-title">📚 내가 바꾼 이야기 책장</h2>
      {stories.length === 0 && !loading && (
        <div className="remix-empty">
          아직 바꾼 이야기가 없어요. 첫 번째 이야기를 펼쳐 보세요!
        </div>
      )}

      <div className="remix-stories">
        {stories.map((s) => (
          <article key={s.id} className="remix-story">
            <div className="remix-story-top">
              <h3>{s.title}</h3>
              {s.full && (
                <button className="world-listen" onClick={() => listen(s)}>
                  {playingId === s.id ? "⏹ 멈춤" : "🔊 듣기"}
                </button>
              )}
            </div>
            <div className="remix-tags">
              <span className="remix-tag">{s.change}</span>
              <span className="remix-tag mood">{s.mood}</span>
            </div>
            {s.body.map((p, i) => (
              <p key={i} className="remix-para">
                {p}
              </p>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}
