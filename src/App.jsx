import React, { useEffect, useState } from "react";
import { listCharacters, sendChat, me, logout } from "./api";
import LoginForm from "./LoginForm";

// Simple, mobile-friendly character picker
function CharacterPicker({ items, selectedId, onChange }) {
  if (!items?.length) return null;
  return (
    <select
      className="select"
      value={selectedId || ""}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ minWidth: 220 }}
      aria-label="Choose a character"
      title="Choose a character"
    >
      {items.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("start"); // 'start' | 'chat'
  const [characters, setCharacters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // On mount: check if logged in and preload characters
  useEffect(() => {
    me()
      .then((u) => {
        setUser(u);
        setView("chat");
        refreshCharacters();
      })
      .catch(() => {});
  }, []);

  const refreshCharacters = async () => {
    try {
      const data = await listCharacters();
      setCharacters(data);
      // If nothing selected yet or selected disappeared, pick the first
      if (data.length) {
        if (!selected || !data.find((c) => c.id === selected.id)) {
          setSelected(data[0]);
        }
      } else {
        setSelected(null);
      }
    } catch (e) {
      console.error("Failed to load characters", e);
    }
  };

  const handleSelectCharacter = (id) => {
    const ch = characters.find((c) => c.id === id) || null;
    setSelected(ch);
    // Clear local display when switching characters (backend still keeps history)
    setMessages([]);
  };

  const handleSend = async () => {
    if (!input || !selected) return;
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);

    const toSend = input;
    setInput("");
    setLoading(true);

    try {
      const res = await sendChat(selected.id, toSend);
      const botMsg = { role: "assistant", content: res.reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      alert("Error sending message");
    } finally {
      setLoading(false);
    }
  };

  if (view === "start") {
    return (
      <div className="container center">
        <LoginForm
          onSuccess={async () => {
            const u = await me();
            setUser(u);
            setView("chat");
            await refreshCharacters();
          }}
        />
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header with character picker + logout */}
      <div className="header" style={{ gap: 12, flexWrap: "wrap" }}>
        <div className="brand" style={{ marginRight: "auto" }}>
          Welcome, {user?.email || "User"}
          {selected ? ` — Chat with ${selected.name}` : ""}
        </div>

        <CharacterPicker
          items={characters}
          selectedId={selected?.id || ""}
          onChange={handleSelectCharacter}
        />

        <button
          className="button small"
          onClick={() => {
            logout();
            setUser(null);
            setView("start");
          }}
        >
          Logout
        </button>
      </div>

      {/* Optional: “About this character” summary */}
      {selected && (
        <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
          <div className="label">About {selected.name}</div>
          <div className="meta" style={{ margin: "6px 0" }}>
            EI: {selected.ei_level}/10 &nbsp;·&nbsp; CI: {selected.ci_level}/10
          </div>
          {selected.description && <div>{selected.description}</div>}
        </div>
      )}

      {/* Chat area */}
      <div className="chat">
        <div className="messages">
          {messages.map((m, i) => (
            <div
              className={`bubble ${m.role === "user" ? "user" : "bot"}`}
              key={i}
            >
              {m.content}
            </div>
          ))}
        </div>

        <div className="composer">
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selected ? `Message ${selected.name}…` : "Choose a character…"
            }
            disabled={loading || !selected}
          />
          <button
            className="button"
            onClick={handleSend}
            disabled={loading || !input || !selected}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
