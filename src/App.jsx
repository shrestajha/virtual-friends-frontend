import React, { useEffect, useState, useRef } from "react";
import { getMyCharacters, sendChat, me, logout } from "./api";
import LoginForm from "./LoginForm";
import CharacterSwitcher from "./components/CharacterSwitcher";
import CharacterProfile from "./components/CharacterProfile";
import Survey from "./components/Survey";

const MAX_MESSAGES = 15;

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("start"); // 'start' | 'chat' | 'survey'
  const [characters, setCharacters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Count user messages from state
  useEffect(() => {
    const count = messages.filter(m => m.role === "user").length;
    setUserMessageCount(count);
    
    // Show survey after 15 user messages
    if (count >= MAX_MESSAGES && view === "chat") {
      setView("survey");
    }
  }, [messages, view]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const data = await getMyCharacters();
      
      // Ensure we have an array
      const characterArray = Array.isArray(data) ? data : (data.characters || []);
      
      if (characterArray.length === 0) {
        console.warn("No assigned characters found");
        setCharacters([]);
        setSelected(null);
        return;
      }

      // Store in localStorage for persistence
      localStorage.setItem("assignedCharacters", JSON.stringify(characterArray));
      
      setCharacters(characterArray);
      
      // Select first character if none selected
      if (!selected || !characterArray.find((c) => c.id === selected.id)) {
        setSelected(characterArray[0]);
      }
    } catch (e) {
      console.error("Failed to load characters", e);
      // Try to load from localStorage as fallback
      const stored = localStorage.getItem("assignedCharacters");
      if (stored) {
        try {
          const storedChars = JSON.parse(stored);
          if (Array.isArray(storedChars) && storedChars.length > 0) {
            setCharacters(storedChars);
            if (!selected || !storedChars.find((c) => c.id === selected.id)) {
              setSelected(storedChars[0]);
            }
            return;
          }
        } catch (parseError) {
          console.error("Failed to parse stored characters", parseError);
        }
      }
      setCharacters([]);
      setSelected(null);
    }
  };

  const handleSelectCharacter = (id) => {
    const ch = characters.find((c) => c.id === id) || null;
    setSelected(ch);
    // Clear local display when switching characters (backend still keeps history)
    setMessages([]);
  };

  const handleSend = async () => {
    if (!input.trim() || !selected || userMessageCount >= MAX_MESSAGES) return;
    
    const userMsg = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);

    const toSend = input.trim();
    setInput("");
    setLoading(true);

    try {
      const res = await sendChat(selected.id, toSend);
      const botMsg = { role: "assistant", content: res.reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      alert("Error sending message");
      // Remove the user message if send failed
      setMessages((prev) => prev.filter((m, i) => i !== prev.length - 1 || m.role !== "user"));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Show login form
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

  // Show survey after 15 messages
  if (view === "survey") {
    return <Survey />;
  }

  // Show chat interface
  return (
    <div className="container">
      {/* Header with logout */}
      <div className="header">
        <div className="brand" style={{ marginRight: "auto" }}>
          Welcome, {user?.email || "User"}
        </div>
        <div style={{ fontSize: "14px", color: "var(--muted)", marginRight: "12px" }}>
          Messages: {userMessageCount}/{MAX_MESSAGES}
        </div>
        <button
          className="button small"
          onClick={() => {
            logout();
            setUser(null);
            setView("start");
            setMessages([]);
            setUserMessageCount(0);
          }}
        >
          Logout
        </button>
      </div>

      {/* Character Switcher */}
      <CharacterSwitcher
        characters={characters}
        selectedId={selected?.id}
        onSelect={handleSelectCharacter}
      />

      {/* Character Profile */}
      <CharacterProfile character={selected} />

      {/* Chat area */}
      <div className="chat">
        <div className="messages">
          {messages.length === 0 && selected && (
            <div className="meta" style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
              Start a conversation with {selected.name}...
            </div>
          )}
          {messages.map((m, i) => (
            <div
              className={`bubble ${m.role === "user" ? "user" : "bot"}`}
              key={i}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="bubble bot">
              <span style={{ opacity: 0.6 }}>Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="composer">
          <textarea
            className="textarea"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize textarea
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              selected 
                ? userMessageCount >= MAX_MESSAGES
                  ? "You have reached the message limit"
                  : `Message ${selected.name}… (Press Enter to send, Shift+Enter for new line)`
                : "Choose a character…"
            }
            disabled={loading || !selected || userMessageCount >= MAX_MESSAGES}
            rows={1}
            style={{
              resize: "none",
              minHeight: "44px",
              maxHeight: "120px",
              overflowY: "auto"
            }}
          />
          <button
            className="button"
            onClick={handleSend}
            disabled={loading || !input.trim() || !selected || userMessageCount >= MAX_MESSAGES}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
