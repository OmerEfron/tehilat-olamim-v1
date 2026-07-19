"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "@/lib/protocol";
import { useLocale } from "@/lib/locale";

type ChatPanelProps = {
  messages: ChatMessage[];
  playerId: string | null;
  onSend: (text: string) => void;
};

export function ChatPanel({ messages, playerId, onSend }: ChatPanelProps) {
  const { copy } = useLocale();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    onSend(clean);
    setText("");
  };

  return (
    <aside className="chat-panel" aria-label={copy.chat}>
      <h2 className="chat-title">{copy.chat}</h2>
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 ? (
          <p className="chat-empty">{copy.chatEmpty}</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`chat-line ${m.playerId === playerId ? "is-me" : ""}`}
            >
              <span className="chat-name">{m.name}</span>
              <span className="chat-text">{m.text}</span>
            </div>
          ))
        )}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          placeholder={copy.chatPlaceholder}
          aria-label={copy.chat}
        />
        <button type="submit" className="chat-send">
          {copy.send}
        </button>
      </form>
    </aside>
  );
}
